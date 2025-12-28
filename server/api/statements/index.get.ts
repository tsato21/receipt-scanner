import { db, COLLECTION_STATEMENTS, toJsDate } from '../../utils/firestore';
import { Statement } from '../../../types';

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  const snapshot = await db.collection(COLLECTION_STATEMENTS)
    .where('userId', '==', userEmail)
    .orderBy('createdAt', 'desc')
    .get();

  const statements = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      rangeStart: toJsDate(data.rangeStart),
      rangeEnd: toJsDate(data.rangeEnd),
      createdAt: toJsDate(data.createdAt)
    } as Statement;
  });

  return statements;
});
