import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGenAIInstance } from './_lib/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, referenceImages } = req.body;
    const genAI = getGenAIInstance();

    const contents: any[] = [{ text: prompt }];
    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach((image: string) => {
        contents.push({ inlineData: { mimeType: 'image/png', data: image } });
      });
    }

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents,
    });

    // Correctly access the candidates from the result object
    const images: string[] = result.candidates[0].content.parts
      .filter((part: any) => part.inlineData)
      .map((part: any) => part.inlineData.data);

    return res.status(200).json({ images });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    return res.status(500).json({ error: error.message });
  }
}