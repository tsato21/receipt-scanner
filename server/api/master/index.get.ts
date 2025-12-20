import { db, COLLECTION_STORES, COLLECTION_CATEGORIES } from '../../utils/firestore';
// @ts-ignore
import { DEFAULT_CATEGORIES } from '../../../types/index';

export default defineEventHandler(async (event) => {
  try {
    // Fetch stores
    const storesSnap = await db.collection(COLLECTION_STORES)
      .orderBy('lastUsedAt', 'desc')
      .get();
    
    const stores = storesSnap.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            name: data.name,
            defaultCategoryId: data.defaultCategoryId,
            // Convert Firestore Timestamp to Date/ISO string if needed, 
            // but Nuxt/Nitro might handle JSON serialization.
            // Firestore timestamps are objects.
            lastUsedAt: data.lastUsedAt?.toDate ? data.lastUsedAt.toDate() : data.lastUsedAt 
        };
    });

    // Fetch categories
    const categoriesSnap = await db.collection(COLLECTION_CATEGORIES).get();
    let categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (categories.length === 0) {
        // Seed Firestore with defaults if empty
        const batch = db.batch();
        DEFAULT_CATEGORIES.forEach(cat => {
            const ref = db.collection(COLLECTION_CATEGORIES).doc();
            batch.set(ref, {
                ...cat,
                createdAt: new Date()
            });
        });
        await batch.commit();
        
        // Fetch again to get real IDs
        const freshSnap = await db.collection(COLLECTION_CATEGORIES).get();
        categories = freshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return {
      stores,
      categories
    };
  } catch (error: any) {
    throw createError({ statusCode: 500, message: 'Failed to fetch master data: ' + error.message });
  }
});
