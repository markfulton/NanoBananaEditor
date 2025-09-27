import { useMutation } from '@tanstack/react-query';
import { geminiService, GenerationRequest, EditRequest } from '../services/geminiService';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/imageUtils';
import { Generation, Edit, Asset } from '../types';
import { toast } from 'react-hot-toast';

export const useImageGeneration = () => {
  const { addGeneration, setIsGenerating, setCanvasImage, setError } = useAppStore();

  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      const images = await geminiService.generateImage(request);
      return { images, request };
    },
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
    },
    onSuccess: ({ images, request }) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: base64.slice(0, 32)
        }));

        const generation: Generation = {
          id: generateId(),
          prompt: request.prompt,
          parameters: {
            aspectRatio: '1:1',
            seed: request.seed,
            temperature: request.temperature
          },
          sourceAssets: request.referenceImages ? request.referenceImages.map((img) => ({
            id: generateId(),
            type: 'original' as const,
            url: `data:image/png;base64,${img}`,
            mime: 'image/png',
            width: 1024,
            height: 1024,
            checksum: img.slice(0, 32)
          })) : [],
          outputAssets,
          modelVersion: 'gemini-2.5-flash-image-preview',
          timestamp: Date.now()
        };

        addGeneration(generation);
        setCanvasImage(outputAssets[0].url);
        toast.success('Image generated successfully!');
      } else {
        toast.error('Generation returned no images.');
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Generation failed:', error);
      toast.error(`Generation failed: ${errorMessage}`);
      setError(errorMessage);
      setIsGenerating(false);
    }
  });

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error
  };
};

export const useImageEditing = () => {
  const { 
    addEdit, 
    setIsGenerating, 
    setCanvasImage, 
    canvasImage, 
    editReferenceImages,
    brushStrokes,
    selectedGenerationId,
    currentProject,
    seed,
    temperature,
    setError
  } = useAppStore();

  const editMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const sourceImage = canvasImage;
      if (!sourceImage) throw new Error('No image to edit');
      
      const base64Image = sourceImage.includes('base64,') 
        ? sourceImage.split('base64,')[1] 
        : sourceImage;
      
      const referenceImages = editReferenceImages
        .filter(img => img.includes('base64,'))
        .map(img => img.split('base64,')[1]);
      
      let maskImage: string | undefined;
      
      if (brushStrokes.length > 0) {
        const tempImg = new Image();
        tempImg.src = sourceImage;
        await new Promise<void>((resolve) => { tempImg.onload = () => resolve(); });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'white';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        brushStrokes.forEach(stroke => {
          if (stroke.points.length >= 4) {
            ctx.lineWidth = stroke.brushSize;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0], stroke.points[1]);
            for (let i = 2; i < stroke.points.length; i += 2) {
              ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
            }
            ctx.stroke();
          }
        });
        
        const maskDataUrl = canvas.toDataURL('image/png');
        maskImage = maskDataUrl.split('base64,')[1];
      }
      
      const request: EditRequest = {
        instruction,
        originalImage: base64Image,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        maskImage,
        temperature,
        seed
      };
      
      const images = await geminiService.editImage(request);
      return { images };
    },
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
    },
    onSuccess: ({ images }, instruction) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: base64.slice(0, 32)
        }));

        const edit: Edit = {
          id: generateId(),
          parentGenerationId: selectedGenerationId || (currentProject?.generations[currentProject.generations.length - 1]?.id || ''),
          maskAssetId: brushStrokes.length > 0 ? generateId() : undefined,
          maskReferenceAsset: undefined,
          instruction,
          outputAssets,
          timestamp: Date.now()
        };

        addEdit(edit);
        
        const { selectEdit, selectGeneration } = useAppStore.getState();
        setCanvasImage(outputAssets[0].url);
        selectEdit(edit.id);
        selectGeneration(null);
        toast.success('Edit applied successfully!');
      } else {
        toast.error('Edit returned no images.');
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Edit failed:', error);
      toast.error(`Edit failed: ${errorMessage}`);
      setError(errorMessage);
      setIsGenerating(false);
    }
  });

  return {
    edit: editMutation.mutate,
    isEditing: editMutation.isPending,
    error: editMutation.error
  };
};