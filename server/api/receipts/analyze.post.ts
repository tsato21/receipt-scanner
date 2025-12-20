import { VertexAI } from '@google-cloud/vertexai';
import { config } from 'dotenv';

let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (vertexAI) return vertexAI;

  config();

  const project = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GCP_LOCATION || 'us-central1';

  if (!project) {
    console.error('[VertexAI] PROJECT_ID is missing from environment variables');
    return null;
  }

  vertexAI = new VertexAI({ project, location });
  return vertexAI;
}

export default defineEventHandler(async (event) => {
  const instance = getVertexAI();
  if (!instance) {
    throw createError({ 
      statusCode: 500, 
      message: 'Vertex AI not configured (PROJECT_ID missing).'
    });
  }
  
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No image provided' });
    }
  
      const file = formData.find(f => f.name === 'image');
      if (!file) {
         throw createError({ statusCode: 400, message: 'Image field missing' });
      }
    
      const mimeType = file.type || 'image/jpeg';
      // Use the alias 'gemini-1.5-flash' which points to the latest stable version
      const model = instance.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const imagePart = {
    inlineData: {
      data: file.data.toString('base64'),
      mimeType
    }
  };

  const prompt = `
    画像はレシートです。以下の情報をJSON形式で抽出してください。
    - date (YYYY-MM-DD形式)
    - storeName (店舗名)
    - total (合計金額、数値。カンマを含めないこと。例: 1250)
    - items (明細の配列。各要素は {name: 商品名, price: 単価(数値、カンマなし)})
    - categoryName (カテゴリ推測。例: 食費, 日用品, 交通費, 交際費, その他)
    
    重要：数値フィールドには絶対にカンマや円記号を含めないでください。JSONのみを出力してください。
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('No response from Gemini');
    }

    return JSON.parse(text);

  } catch (e: any) {
    console.error('Gemini API Error:', e);
    throw createError({ statusCode: 500, message: 'Failed to analyze receipt: ' + e.message });
  }
});
