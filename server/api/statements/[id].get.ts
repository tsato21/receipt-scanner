import { db, COLLECTION_STATEMENTS, toJsDate } from '../../utils/firestore';
import { Statement } from '../../../types';

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';
  const id = event.context.params?.id;

  if (!id) {
      throw createError({ statusCode: 400, message: 'ID required' });
  }

  const doc = await db.collection(COLLECTION_STATEMENTS).doc(id).get();
  
  if (!doc.exists) {
      throw createError({ statusCode: 404, message: 'Statement not found' });
  }

  const data = doc.data();
  if (data?.userId !== userEmail) {
      throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  return {
      id: doc.id,
      ...data,
      rangeStart: toJsDate(data.rangeStart),
      rangeEnd: toJsDate(data.rangeEnd),
      createdAt: toJsDate(data.createdAt)
  } as Statement;
});
