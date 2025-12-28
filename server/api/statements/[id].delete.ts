import { db, COLLECTION_STATEMENTS } from '../../utils/firestore';

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';
  const id = event.context.params?.id;

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID required' });
  }

  const docRef = db.collection(COLLECTION_STATEMENTS).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw createError({ statusCode: 404, message: 'Statement not found' });
  }

  const data = doc.data();
  if (data?.userId !== userEmail) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  await docRef.delete();

  return { success: true };
});
