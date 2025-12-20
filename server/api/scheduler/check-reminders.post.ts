import { db, COLLECTION_REMINDERS, COLLECTION_NOTIFICATION_LOGS } from '../../utils/firestore';
import { sendLineBroadcast } from '../../utils/line';
import { FieldValue } from 'firebase-admin/firestore';
import { config } from 'dotenv';

export default defineEventHandler(async (event) => {
  config();
  const now = new Date();

  try {
    // 1. 配信対象を取得 (nextRunAt <= now && enabled == true)
    const snapshot = await db.collection(COLLECTION_REMINDERS)
      .where('enabled', '==', true)
      .where('nextRunAt', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('[Job] No reminders match the criteria.');
      return { message: 'No reminders to process' };
    }

    // 2. 全アイテムを集約
    const allItems: { id: string, name: string, freq: number, userId: string }[] = [];
    const involvedUserIds = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      allItems.push({ 
        id: doc.id, 
        name: data.itemName, 
        freq: data.frequencyDays,
        userId: data.userId
      });
      if (data.userId) involvedUserIds.add(data.userId);
    });

    const itemNames = allItems.map(i => `・${i.name}`).join('\n');
    const message = `そろそろ買い出しの時期ですよ！🛒\n\n対象の項目:\n${itemNames}\n\n在庫を確認して買い出しに行きましょう。`;

    // 3. Broadcast 送信
    const lineResult = await sendLineBroadcast(message);
    const results = [];

    if (lineResult.success) {
      const batch = db.batch();
      
      // 更新処理
      allItems.forEach(item => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + item.freq);
        batch.update(db.collection(COLLECTION_REMINDERS).doc(item.id), {
          nextRunAt: nextDate,
          lastRunAt: FieldValue.serverTimestamp()
        });
      });

      // ログ処理 (関わったユーザーごとに成功ログを残す)
      involvedUserIds.forEach(userId => {
        const userItems = allItems.filter(i => i.userId === userId).map(i => i.name);
        const logRef = db.collection(COLLECTION_NOTIFICATION_LOGS).doc();
        batch.set(logRef, {
          userId,
          runAt: FieldValue.serverTimestamp(),
          status: 'success',
          type: 'broadcast',
          targetItems: userItems
        });
      });

      await batch.commit();
      results.push({ status: 'success', broadcast: true, count: allItems.length });
    } else {
      // 失敗ログ
      console.error(`[Job] LINE broadcast failed: ${lineResult.error}`);
       await db.collection(COLLECTION_NOTIFICATION_LOGS).add({
          userId: 'system',
          runAt: FieldValue.serverTimestamp(),
          status: 'failed',
          type: 'broadcast',
          targetItems: allItems.map(i => i.name),
          message: lineResult.error
        });
      results.push({ status: 'failed', error: lineResult.error });
    }

    return { results };

  } catch (error: any) {
    console.error('[Job] Fatal error:', error);
    throw createError({ statusCode: 500, message: 'Job failed: ' + error.message });
  }
});