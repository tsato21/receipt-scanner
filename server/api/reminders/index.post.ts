import { db, COLLECTION_REMINDERS } from '../../utils/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { config } from 'dotenv';

export default defineEventHandler(async (event) => {
  config();
  const body = await readBody(event);
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  const { id, itemName, frequencyDays, nextRunAt, enabled } = body;
  const lineUserId = process.env.LINE_USER_ID;

  if (!itemName || !frequencyDays || !nextRunAt || !lineUserId) {
    console.error('[Reminders] Missing fields:', { itemName, frequencyDays, nextRunAt, lineUserId });
    throw createError({ statusCode: 400, message: 'Missing required fields or LINE_USER_ID not configured' });
  }

  const reminderData = {
    userId: userEmail,
    lineUserId,
    itemName,
    frequencyDays: Number(frequencyDays),
    nextRunAt: new Date(nextRunAt),
    enabled: enabled !== false,
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    if (id) {
      await db.collection(COLLECTION_REMINDERS).doc(id).update(reminderData);
      return { id, message: 'Reminder updated' };
    } else {
      const newDoc = await db.collection(COLLECTION_REMINDERS).add({
        ...reminderData,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { id: newDoc.id, message: 'Reminder created' };
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: 'Failed to save reminder: ' + error.message });
  }
});
