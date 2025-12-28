import { db, COLLECTION_RECEIPTS, toJsDate } from '../../utils/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const monthStr = query.month as string; // YYYY-MM
  const period = query.period as string; // 1m, 3m, 1y, all
  const customStart = query.startDate as string;
  const customEnd = query.endDate as string;
  const closingDay = query.closingDay ? parseInt(query.closingDay as string) : null;
  
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else if (customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
  } else if (period && period !== 'all') {
      endDate = new Date(); // Today
      startDate = new Date();
      
      if (closingDay) {
          // Calculate start date based on accounting period logic
          // If today is past closing day (e.g. 21st), period started on 21st of this month.
          // If today is before/on closing day (e.g. 15th), period started on 21st of last month.
          const todayDay = startDate.getDate();
          
          if (todayDay > closingDay) {
              startDate.setDate(closingDay + 1);
          } else {
              startDate.setMonth(startDate.getMonth() - 1);
              startDate.setDate(closingDay + 1);
          }
          
          // Adjust for 3m/1y relative to this 1m start date
          if (period === '3m') startDate.setMonth(startDate.getMonth() - 2);
          if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1); // 1y usually means current + past 11 months? Or just 12 months range. 
          // Let's assume 1y = 12 accounting periods. So start date - 11 months.
          if (period === '1y') startDate.setMonth(startDate.getMonth() + 1); // Reset logic: 1y is -1 year usually.
          // Wait, logic above:
          // 1m: Start is X.
          // 3m: Start is X - 2 months.
          // 1y: Start is X - 11 months.
          // Current logic in standard flow: 
          // 1m: -1 month
          // 3m: -3 months (from today)
          // 1y: -1 year (from today)
          
          // Let's align:
          if (period === '1y') startDate.setMonth(startDate.getMonth() - 11);

      } else {
          // Standard logic (Sliding window)
          if (period === '1m') startDate.setMonth(startDate.getMonth() - 1);
          if (period === '3m') startDate.setMonth(startDate.getMonth() - 3);
          if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
      }
  }

  // Fetch receipts by userId
  const snapshot = await db.collection(COLLECTION_RECEIPTS)
    .where('userId', '==', userEmail)
    .get();

  const receipts = snapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          date: toJsDate(data.date),
          createdAt: toJsDate(data.createdAt)
      };
    })
    // Filter by date range if applicable
    .filter((r: any) => {
        if (!startDate || !endDate) return true;
        // Normalize time for comparison
        const rDate = new Date(r.date);
        rDate.setHours(0,0,0,0);
        
        const sDate = new Date(startDate!);
        sDate.setHours(0,0,0,0);
        
        const eDate = new Date(endDate!);
        eDate.setHours(23,59,59,999);
        
        return rDate >= sDate && rDate <= eDate;
    })
    // Sort by date desc
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

  return receipts;
});
