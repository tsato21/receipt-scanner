import { db, COLLECTION_RECEIPTS } from '../../utils/firestore';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const monthStr = query.month as string; // YYYY-MM
  const period = query.period as string; // 1m, 3m, 1y, all
  const customStart = query.startDate as string;
  const customEnd = query.endDate as string;
  
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
      endDate = new Date();
      startDate = new Date();
      if (period === '1m') startDate.setMonth(startDate.getMonth() - 1);
      if (period === '3m') startDate.setMonth(startDate.getMonth() - 3);
      if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
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
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      };
    })
    // Filter by date range if applicable
    .filter((r: any) => {
        if (!startDate || !endDate) return true;
        return r.date >= startDate && r.date <= endDate;
    })
    // Sort by date desc
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

  return receipts;

  return filtered;
});
