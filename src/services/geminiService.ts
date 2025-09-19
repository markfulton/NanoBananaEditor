import { GoogleGenAI } from '@google/genai';

// Note: In production, this should be handled via a backend proxy
const getApiKey = () => {
  const storedKey = localStorage.getItem('gemini-api-key');
  return storedKey || import.meta.env.VITE_GEMINI_API_KEY || 'demo-key';
};

export interface GeminiError {
  type: 'api_key_invalid' | 'quota_exceeded' | 'network_error' | 'invalid_request' | 'unknown_error';
  message: string;
  userMessage: string;
}

const parseGeminiError = (error: any): GeminiError => {
  const errorMessage = error.message || error.toString();
  
  // API Key related errors
  if (errorMessage.includes('API_KEY_INVALID') || 
      errorMessage.includes('invalid API key') ||
      errorMessage.includes('PERMISSION_DENIED') ||
      error.status === 401 || 
      error.status === 403) {
    return {
      type: 'api_key_invalid',
      message: errorMessage,
      userMessage: 'Invalid API key. Please check your Gemini API key in settings.'
    };
  }
  
  // Quota exceeded
  if (errorMessage.includes('QUOTA_EXCEEDED') || 
      errorMessage.includes('quota exceeded') ||
      error.status === 429) {
    return {
      type: 'quota_exceeded',
      message: errorMessage,
      userMessage: 'API quota exceeded. Please wait and try again later, or check your billing in Google AI Studio.'
    };
  }
  
  // Network errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      error.name === 'NetworkError') {
    return {
      type: 'network_error',
      message: errorMessage,
      userMessage: 'Network error. Please check your internet connection and try again.'
    };
  }
  
  // Invalid request format
  if (errorMessage.includes('INVALID_ARGUMENT') || 
      errorMessage.includes('invalid') ||
      error.status === 400) {
    return {
      type: 'invalid_request',
      message: errorMessage,
      userMessage: 'Invalid request format. Please try again with different settings.'
    };
  }
  
  // Unknown error
  return {
    type: 'unknown_error',
    message: errorMessage,
    userMessage: 'An unexpected error occurred. Please try again.'
  };
};

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export class GeminiService {
  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const genAI = new GoogleGenAI({ apiKey: getApiKey() });
      const contents: any[] = [{ text: request.prompt }];
      
      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents,
      });

      const images: string[] = [];

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error generating image:', error);
      const geminiError = parseGeminiError(error);
      throw geminiError;
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const genAI = new GoogleGenAI({ apiKey: getApiKey() });
      const contents = [
        { text: this.buildEditPrompt(request) },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.originalImage,
          },
        },
      ];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      if (request.maskImage) {
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: request.maskImage,
          },
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents,
      });

      const images: string[] = [];

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error editing image:', error);
      const geminiError = parseGeminiError(error);
      throw geminiError;
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      const genAI = new GoogleGenAI({ apiKey: getApiKey() });
      const prompt = [
        { text: `Analyze this image and create a segmentation mask for: ${request.query}

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

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.` },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.image,
          },
        },
      ];

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: prompt,
      });

      const responseText = response.candidates[0].content.parts[0].text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error segmenting image:', error);
      const geminiError = parseGeminiError(error);
      throw geminiError;
    }
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: GeminiError }> {
    try {
      const tempGenAI = new GoogleGenAI({ apiKey });
      
      // Simple test request to validate the API key
      const response = await tempGenAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: [{ text: "Test" }],
      });
      
      return { valid: true };
    } catch (error) {
      console.error('API key validation failed:', error);
      const geminiError = parseGeminiError(error);
      return { valid: false, error: geminiError };
    }
  }

  private buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage 
      ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
      : "";

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
  }
}

export const geminiService = new GeminiService();