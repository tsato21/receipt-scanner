import { db, COLLECTION_RECEIPTS, COLLECTION_STORES, COLLECTION_CATEGORIES } from '../../utils/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_CATEGORIES } from '../../../types/index';
import { config } from 'dotenv';

export default defineEventHandler(async (event) => {
  // Ensure env vars are loaded
  config();

  const body = await readBody(event);
  const headers = getHeaders(event);
  
  console.log('[POST /api/receipts] Received body:', JSON.stringify(body));

  // 1. User Email
  const userEmail = headers['cf-access-authenticated-user-email'] || 'dev-user@example.com';

  // Destructure
  let { storeId, storeName, categoryId, categoryName, newCategoryName, date, total, items } = body;

  const parseSafeNumber = (val: any) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return Number(val.replace(/[^0-9.-]/g, '')) || 0;
      return 0;
  };

  const numericTotal = parseSafeNumber(total);
  const sanitizedItems = (items || []).map((item: any) => ({
      name: item.name || '不明',
      price: parseSafeNumber(item.price)
  }));

  const targetCategoryName = categoryName || newCategoryName;

  // 1.5. Category Resolution Logic
  if (!categoryId && targetCategoryName) {
      try {
          const catQuery = await db.collection(COLLECTION_CATEGORIES)
              .where('name', '==', targetCategoryName)
              .limit(1)
              .get();

          if (!catQuery.empty) {
              categoryId = catQuery.docs[0].id;
          } else {
              const allCats = await db.collection(COLLECTION_CATEGORIES).get();
              const usedColors = allCats.docs.map(d => d.data().color);
              const palette = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
              const availableColor = palette.find(c => !usedColors.includes(c)) || `#${Math.floor(Math.random()*16777215).toString(16)}`;

              const defaultCat = DEFAULT_CATEGORIES.find(c => c.name === targetCategoryName);
              const newCatRef = await db.collection(COLLECTION_CATEGORIES).add({
                  name: targetCategoryName,
                  color: defaultCat?.color || availableColor,
                  createdAt: FieldValue.serverTimestamp()
              });
              categoryId = newCatRef.id;
          }
      } catch (e) {
          console.error("Failed to resolve category", e);
      }
  }
  
  // 2. Store Logic & Name Resolution
  console.log(`[Store Debug] Received storeId: ${storeId}, storeName: ${storeName}`);

  if (storeId) {
    const storeDoc = await db.collection(COLLECTION_STORES).doc(storeId).get();
    if (storeDoc.exists) {
        const storeData = storeDoc.data();
        // IDがある場合はDBの名前を優先
        storeName = storeData?.name;
        
        await storeDoc.ref.update({
            lastUsedAt: FieldValue.serverTimestamp(),
            defaultCategoryId: categoryId || storeData?.defaultCategoryId || null
        });
        console.log(`[Store Debug] Resolved name from DB: ${storeName}`);
    }
  } else if (storeName && storeName !== 'Unknown' && storeName !== '不明な店舗') {
    // IDがなく、有効な名前がある場合は新規作成（または既存を名前で検索）
    try {
        const existingStore = await db.collection(COLLECTION_STORES).where('name', '==', storeName).limit(1).get();
        if (!existingStore.empty) {
            storeId = existingStore.docs[0].id;
            await existingStore.docs[0].ref.update({ lastUsedAt: FieldValue.serverTimestamp() });
        } else {
            const newStoreRef = await db.collection(COLLECTION_STORES).add({
                name: storeName,
                defaultCategoryId: categoryId || null,
                lastUsedAt: FieldValue.serverTimestamp()
            });
            storeId = newStoreRef.id;
        }
    } catch (e) {
        console.error("Failed to process store by name", e);
    }
  }

  // 3. Save Receipt
  const receiptData = {
    userId: userEmail,
    date: date ? new Date(date) : new Date(),
    storeId: storeId || null,
    storeName: storeName || '不明な店舗',
    categoryId: categoryId || null,
    total: numericTotal,
    items: sanitizedItems,
    createdAt: FieldValue.serverTimestamp()
  };

  try {
      const receiptRef = await db.collection(COLLECTION_RECEIPTS).add(receiptData);
      return { id: receiptRef.id, message: 'Receipt saved', storeName };
  } catch (error: any) {
      console.error('[POST /api/receipts] Firestore Save Error:', error);
      throw createError({ 
          statusCode: 500, 
          message: 'Failed to save to database: ' + error.message 
      });
  }
});