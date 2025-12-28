import { readMultipartFormData } from 'h3';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { db, COLLECTION_STATEMENT_FORMATS, COLLECTION_STATEMENTS, COLLECTION_RECEIPTS, toJsDate } from '../../utils/firestore';
import { Statement, StatementFormat, StatementItem, Receipt } from '../../../types';

const DATE_SEARCH_BUFFER_DAYS = 7;

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  const body = await readMultipartFormData(event);
  if (!body) throw createError({ statusCode: 400, message: 'No data' });

  const file = body.find(item => item.name === 'file');
  const mappingPart = body.find(item => item.name === 'mapping');
  const formatNamePart = body.find(item => item.name === 'formatName');
  const startDatePart = body.find(item => item.name === 'startDate');
  const endDatePart = body.find(item => item.name === 'endDate');

  if (!file) throw createError({ statusCode: 400, message: 'No file' });

  // Decode as Shift_JIS
  const csvContent = iconv.decode(file.data, 'Shift_JIS');
  
  const mappingJson = mappingPart ? mappingPart.data.toString() : null;
  const formatName = formatNamePart ? formatNamePart.data.toString() : null;
  const customStartDate = startDatePart ? startDatePart.data.toString() : null;
  const customEndDate = endDatePart ? endDatePart.data.toString() : null;

  // 1. Get Header & Parse All
  const allRecords = parse(csvContent, {
    columns: true, // Auto-map columns based on header
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true
  });
  
  if (allRecords.length === 0) throw createError({ statusCode: 400, message: 'Empty CSV' });

  // Re-read header to generate signature
  const header = Object.keys(allRecords[0]);
  const headerSignature = header.join(',');

  // 2. Resolve Format
  let format: StatementFormat | null = null;
  
  // Try to find existing
  const formatSnapshot = await db.collection(COLLECTION_STATEMENT_FORMATS)
    .where('userId', '==', userEmail)
    .where('headerSignature', '==', headerSignature)
    .limit(1)
    .get();

  if (!formatSnapshot.empty) {
    const doc = formatSnapshot.docs[0];
    format = { id: doc.id, ...doc.data() } as StatementFormat;
  } else {
    // Register new format if mapping provided
    if (mappingJson && formatName) {
      const mapping = JSON.parse(mappingJson);
      const newFormat: StatementFormat = {
        userId: userEmail,
        name: formatName,
        headerSignature,
        columnMapping: mapping
      };
      const ref = await db.collection(COLLECTION_STATEMENT_FORMATS).add(newFormat);
      format = { id: ref.id, ...newFormat };
    }
  }

  if (!format) {
    throw createError({ statusCode: 422, message: 'Format unknown and no mapping provided' });
  }

  // 3. Process Items
  const items: StatementItem[] = [];
  let totalAmount = 0;
  let matchedAmount = 0;
  
  // Determine Receipts Search Range
  let searchStart: Date;
  let searchEnd: Date;

  if (customStartDate && customEndDate) {
      searchStart = new Date(customStartDate);
      searchEnd = new Date(customEndDate);
      // Ensure full day coverage
      searchStart.setHours(0, 0, 0, 0);
      searchEnd.setHours(23, 59, 59, 999);
  } else {
      // Fallback: Use CSV date range (with some buffer)
      const dates: Date[] = [];
      for (const r of allRecords) {
          const d = new Date(r[format.columnMapping.dateColumn]);
          if (!isNaN(d.getTime())) {
              dates.push(d);
          }
      }
      if (dates.length === 0) throw createError({ statusCode: 400, message: 'No valid dates found' });
      searchStart = new Date(Math.min(...dates.map(d => d.getTime())));
      searchEnd = new Date(Math.max(...dates.map(d => d.getTime())));
      // Add buffer to catch edge cases if relying on CSV only
      searchStart.setDate(searchStart.getDate() - DATE_SEARCH_BUFFER_DAYS);
      searchEnd.setDate(searchEnd.getDate() + DATE_SEARCH_BUFFER_DAYS);
      searchStart.setHours(0,0,0,0);
      searchEnd.setHours(23,59,59,999);
  }

  // Fetch receipts in range
  const receiptsSnapshot = await db.collection(COLLECTION_RECEIPTS)
    .where('userId', '==', userEmail)
    .where('date', '>=', searchStart)
    .where('date', '<=', searchEnd)
    .get();
    
  const receipts = receiptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
          id: doc.id, 
          ...data,
          date: toJsDate(data.date)
      } as Receipt;
  });

  const usedReceiptIds = new Set<string>();

  for (const row of allRecords) {
    const rawDate = row[format.columnMapping.dateColumn];
    const rawAmount = row[format.columnMapping.amountColumn];
    const desc = row[format.columnMapping.descColumn];

    // Normalize amount
    let amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount)) continue; // Skip invalid amount rows

    // Normalize date
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) continue; // Skip invalid date rows
    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

    totalAmount += amount;

    // Find match
    const match = receipts.find(r => {
        if (usedReceiptIds.has(r.id!)) return false;
        
        const rDateStr = r.date.toISOString().split('T')[0];
        // Match conditions: exact date, exact amount
        return rDateStr === dateStr && r.total === amount;
    });

    if (match) {
        usedReceiptIds.add(match.id!);
        matchedAmount += amount;
        items.push({
            date: dateStr,
            description: desc,
            amount: amount,
            status: 'matched',
            matchedReceiptId: match.id
        });
    } else {
        items.push({
            date: dateStr,
            description: desc,
            amount: amount,
            status: 'unmatched'
        });
    }
  }

  const unmatchedAmount = totalAmount - matchedAmount;

  // 4. Save Statement
  const statement: Statement = {
    userId: userEmail,
    formatId: format.id!,
    title: `${format.name} (${searchStart.toISOString().split('T')[0]} ~ ${searchEnd.toISOString().split('T')[0]})`,
    rangeStart: searchStart,
    rangeEnd: searchEnd,
    summary: {
      totalAmount,
      matchedAmount,
      unmatchedAmount
    },
    items,
    createdAt: new Date()
  };

  const res = await db.collection(COLLECTION_STATEMENTS).add(statement);
  return { id: res.id, ...statement };
});
