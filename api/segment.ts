import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGenAIInstance, buildSegmentationPrompt } from './_lib/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, query } = req.body;
    const genAI = getGenAIInstance();

    const contents = [
      { text: buildSegmentationPrompt(query) },
      { inlineData: { mimeType: 'image/png', data: image } },
    ];

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents,
    });

    // Correctly access the candidates from the result object
    const responseText = result.candidates[0].content.parts[0].text;

    try {
      const jsonResponse = JSON.parse(responseText);
      return res.status(200).json(jsonResponse);
    } catch (e) {
      return res.status(200).send(responseText);
    }

  } catch (error: any) {
    console.error('Error in /api/segment:', error);
    return res.status(500).json({ error: error.message });
  }
}