export interface Asset {
  id: string;
  type: 'original' | 'mask' | 'output';
  url: string;
  mime: string;
  width: number;
  height: number;
  checksum: string;
}

export interface Generation {
  id: string;
  prompt: string;
  parameters: {
    seed?: number;
    temperature?: number;
  };
  sourceAssets: Asset[];
  outputAssets: Asset[];
  modelVersion: string;
  timestamp: number;
  costEstimate?: number;
}

export interface Edit {
  id: string;
  parentGenerationId: string;
  maskAssetId?: string;
  maskReferenceAsset?: Asset;
  instruction: string;
  outputAssets: Asset[];
  timestamp: number;
}

export interface Project {
  id: string;
  title: string;
  generations: Generation[];
  edits: Edit[];
  createdAt: number;
  updatedAt: number;
}

export interface SegmentationMask {
  id: string;
  imageData: ImageData;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  feather: number;
}

export interface BrushStroke {
  id: string;
  points: number[];
  brushSize: number;
  color: string;
}

export interface PromptHint {
  category: 'subject' | 'scene' | 'action' | 'style' | 'camera';
  text: string;
  example: string;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: 'left' | 'center' | 'right';
  fontStyle: 'normal' | 'bold' | 'italic';
  textDecoration: '' | 'underline' | 'line-through';
  rotation: number;
  width?: number;
  scaleX?: number;
  scaleY?: number;
}