import { GoogleGenAI } from '@google/genai';

// Helper to get the Gemini API key from environment variables
export function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }
  return apiKey;
}

// Helper to build the edit prompt
export function buildEditPrompt(instruction: string, hasMask: boolean): string {
  const maskInstruction = hasMask
    ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
    : "";

  return `Edit this image according to the following instruction: ${instruction}\n\nMaintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}\n\nPreserve image quality and ensure the edit looks professional and realistic.`;
}

// Helper to build the segmentation prompt
export function buildSegmentationPrompt(query: string): string {
  return `Analyze this image and create a segmentation mask for: ${query}\n\nReturn a JSON object with this exact structure:\n{\n  "masks": [\n    {\n      "label": "description of the segmented object",\n      "box_2d": [x, y, width, height],\n      "mask": "base64-encoded binary mask image"\n    }\n  ]\n}\n\nOnly segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;
}

// Re-usable instance of the GenAI client
export function getGenAIInstance() {
  return new GoogleGenAI({ apiKey: getApiKey() });
}