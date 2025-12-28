import { readMultipartFormData } from 'h3';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { db, COLLECTION_STATEMENT_FORMATS } from '../../utils/firestore';
import { StatementFormat } from '../../../types';

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  const body = await readMultipartFormData(event);
  if (!body || body.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' });
  }

  const file = body.find(item => item.name === 'file');
  if (!file) {
    throw createError({ statusCode: 400, message: 'File field missing' });
  }

  // Decode content (Assume Shift_JIS for Japanese CSVs, fallback to UTF-8 if needed by try-catch or detection logic if complex)
  // Most Japanese bank CSVs are Shift_JIS.
  let csvContent = iconv.decode(file.data, 'Shift_JIS');
  
  // Simple check: if Shift_JIS decoding results in replacement characters often or looks wrong, might be UTF-8
  // But for now, we follow the requirement to use Shift_JIS.
  // Note: iconv-lite doesn't throw on invalid sequences usually, it uses replacement chars.
  
  // If the file was actually UTF-8 with BOM, Shift_JIS decode might look messy but let's stick to instruction first.
  // However, if we want to be safe, we can check for common UTF-8 BOM or patterns.
  // Let's assume Shift_JIS as requested.
  
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    throw createError({ statusCode: 400, message: 'Empty CSV' });
  }

  // Use csv-parse just for the first line
  const records = parse(lines[0], {
    relax_quotes: true,
    skip_empty_lines: true
  });
  
  if (records.length === 0) {
      throw createError({ statusCode: 400, message: 'Invalid CSV header' });
  }

  const header = records[0] as string[];
  const headerSignature = header.join(',');

  // Search for existing format
  const snapshot = await db.collection(COLLECTION_STATEMENT_FORMATS)
    .where('userId', '==', userEmail)
    .where('headerSignature', '==', headerSignature)
    .limit(1)
    .get();

  let detectedFormat: StatementFormat | null = null;
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    detectedFormat = { id: doc.id, ...doc.data() } as StatementFormat;
  }

  return {
    header,
    headerSignature,
    detectedFormat
  };
});
