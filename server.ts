import express from 'express';
import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const projectRoot = process.cwd();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));

// Check if the frontend build directory exists before attempting to serve it.
const fePath = path.join(projectRoot, 'dist');
const frontendExists = fs.existsSync(fePath) && fs.existsSync(path.join(fePath, 'index.html'));

if (frontendExists) {
  console.log('✅ Frontend build found, serving static files from:', fePath);
  app.use(express.static(fePath));
} else {
  console.warn('⚠️ Frontend build not found. API-only mode enabled.');
  console.warn('   Run "npm run build" to serve the frontend.');
}

// Helper to get the Gemini API key from environment variables
function getApiKey() {
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

  return `Edit this image according to the following instruction: ${instruction}\n\nMaintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}\n\nPreserve image quality and ensure the edit looks professional and realistic.`;
}

// Helper to build the segmentation prompt
function buildSegmentationPrompt(query: string): string {
  return `Analyze this image and create a segmentation mask for: ${query}\n\nReturn a JSON object with this exact structure:\n{\n  "masks": [\n    {\n      "label": "description of the segmented object",\n      "box_2d": [x, y, width, height],\n      "mask": "base64-encoded binary mask image"\n    }\n  ]\n}\n\nOnly segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;
}

// API routes
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
    const result = await genAI.models.generateContent({ model: "gemini-2.5-flash-image-preview", contents });
    const images = result.response.candidates[0].content.parts
      .filter((part: any) => part.inlineData)
      .map((part: any) => part.inlineData.data);
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
    const result = await genAI.models.generateContent({ model: "gemini-2.5-flash-image-preview", contents });
    const images = result.response.candidates[0].content.parts
      .filter((part: any) => part.inlineData)
      .map((part: any) => part.inlineData.data);
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
    const result = await genAI.models.generateContent({ model: "gemini-2.5-flash-image-preview", contents });
    const responseText = result.response.candidates[0].content.parts[0].text;
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Error in /api/segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve the frontend, but only if it exists.
if (frontendExists) {
  app.get('/:path(*)', (req, res) => {
    res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`✅ Backend server listening on http://localhost:${port}`);
});