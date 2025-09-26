import express from 'express';
import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';

const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));

// Helper to get the Gemini API key from environment variables
function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }
  return apiKey;
}

// Helper to build the edit prompt
function buildEditPrompt(instruction: string, hasMask: boolean): string {
  const maskInstruction = hasMask
    ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
    : "";

  return `Edit this image according to the following instruction: ${instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
}

// Helper to build the segmentation prompt
function buildSegmentationPrompt(query: string): string {
  return `Analyze this image and create a segmentation mask for: ${query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;
}

app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, referenceImages } = req.body;
    const genAI = new GoogleGenAI({ apiKey: getApiKey() });

    const contents: any[] = [{ text: prompt }];
    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach((image: string) => {
        contents.push({ inlineData: { mimeType: "image/png", data: image } });
      });
    }

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const images: string[] = result.candidates[0].content.parts
      .filter(part => part.inlineData)
      .map(part => part.inlineData.data);

    res.json({ images });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/edit', async (req: Request, res: Response) => {
  try {
    const { instruction, originalImage, referenceImages, maskImage } = req.body;
    const genAI = new GoogleGenAI({ apiKey: getApiKey() });

    const contents: any[] = [
      { text: buildEditPrompt(instruction, !!maskImage) },
      { inlineData: { mimeType: "image/png", data: originalImage } },
    ];

    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach((image: string) => {
        contents.push({ inlineData: { mimeType: "image/png", data: image } });
      });
    }

    if (maskImage) {
      contents.push({ inlineData: { mimeType: "image/png", data: maskImage } });
    }

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const images: string[] = result.candidates[0].content.parts
      .filter(part => part.inlineData)
      .map(part => part.inlineData.data);

    res.json({ images });
  } catch (error: any) {
    console.error('Error in /api/edit:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/segment', async (req: Request, res: Response) => {
  try {
    const { image, query } = req.body;
    const genAI = new GoogleGenAI({ apiKey: getApiKey() });

    const contents = [
      { text: buildSegmentationPrompt(query) },
      { inlineData: { mimeType: "image/png", data: image } },
    ];

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const responseText = result.candidates[0].content.parts[0].text;
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Error in /api/segment:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});