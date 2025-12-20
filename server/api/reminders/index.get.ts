import { db, COLLECTION_REMINDERS } from '../../utils/firestore';
import { config } from 'dotenv';

export default defineEventHandler(async (event) => {
  config();
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  try {
    const snapshot = await db.collection(COLLECTION_REMINDERS)
      .where('userId', '==', userEmail)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextRunAt: doc.data().nextRunAt?.toDate ? doc.data().nextRunAt.toDate() : doc.data().nextRunAt,
      lastRunAt: doc.data().lastRunAt?.toDate ? doc.data().lastRunAt.toDate() : doc.data().lastRunAt,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
    }));
  } catch (error: any) {
    throw createError({ statusCode: 500, message: 'Failed to fetch reminders: ' + error.message });
  }
});
