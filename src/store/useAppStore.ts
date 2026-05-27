import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project, Generation, Edit, SegmentationMask, BrushStroke, TextLayer } from '../types';

interface AppState {
  // Current project
  currentProject: Project | null;
  
  // Canvas state
  canvasImage: string | null;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  
  // Upload state
  uploadedImages: string[];
  editReferenceImages: string[];
  
  // Brush strokes for painting masks
  brushStrokes: BrushStroke[];
  brushSize: number;
  showMasks: boolean;
  
  // Generation state
  isGenerating: boolean;
  currentPrompt: string;
  temperature: number;
  seed: number | null;
  
  // History and variants
  selectedGenerationId: string | null;
  selectedEditId: string | null;
  showHistory: boolean;
  
  // Panel visibility
  showPromptPanel: boolean;
  
  // UI state
  selectedTool: 'generate' | 'edit' | 'mask' | 'text';

  // Text layers state
  textLayers: TextLayer[];
  selectedTextId: string | null;
  textHistory: TextLayer[][];
  textHistoryIndex: number;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setCanvasImage: (url: string | null) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;
  
  addUploadedImage: (url: string) => void;
  removeUploadedImage: (index: number) => void;
  clearUploadedImages: () => void;
  
  addEditReferenceImage: (url: string) => void;
  removeEditReferenceImage: (index: number) => void;
  clearEditReferenceImages: () => void;
  
  addBrushStroke: (stroke: BrushStroke) => void;
  clearBrushStrokes: () => void;
  setBrushSize: (size: number) => void;
  setShowMasks: (show: boolean) => void;
  
  setIsGenerating: (generating: boolean) => void;
  setCurrentPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setSeed: (seed: number | null) => void;
  
  addGeneration: (generation: Generation) => void;
  addEdit: (edit: Edit) => void;
  selectGeneration: (id: string | null) => void;
  selectEdit: (id: string | null) => void;
  setShowHistory: (show: boolean) => void;
  
  setShowPromptPanel: (show: boolean) => void;

  setSelectedTool: (tool: 'generate' | 'edit' | 'mask' | 'text') => void;

  // Text layer actions
  addTextLayer: (layer: TextLayer) => void;
  updateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  deleteTextLayer: (id: string) => void;
  selectTextLayer: (id: string | null) => void;
  clearTextLayers: () => void;
  undoText: () => void;
  redoText: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      canvasImage: null,
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },
      
      uploadedImages: [],
      editReferenceImages: [],
      
      brushStrokes: [],
      brushSize: 20,
      showMasks: true,
      
      isGenerating: false,
      currentPrompt: '',
      temperature: 0.7,
      seed: null,
      
      selectedGenerationId: null,
      selectedEditId: null,
      showHistory: true,
      
      showPromptPanel: true,

      selectedTool: 'generate',

      textLayers: [],
      selectedTextId: null,
      textHistory: [[]],
      textHistoryIndex: 0,
      
      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      setCanvasImage: (url) => set({ canvasImage: url }),
      setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
      setCanvasPan: (pan) => set({ canvasPan: pan }),
      
      addUploadedImage: (url) => set((state) => ({ 
        uploadedImages: [...state.uploadedImages, url] 
      })),
      removeUploadedImage: (index) => set((state) => ({ 
        uploadedImages: state.uploadedImages.filter((_, i) => i !== index) 
      })),
      clearUploadedImages: () => set({ uploadedImages: [] }),
      
      addEditReferenceImage: (url) => set((state) => ({ 
        editReferenceImages: [...state.editReferenceImages, url] 
      })),
      removeEditReferenceImage: (index) => set((state) => ({ 
        editReferenceImages: state.editReferenceImages.filter((_, i) => i !== index) 
      })),
      clearEditReferenceImages: () => set({ editReferenceImages: [] }),
      
      addBrushStroke: (stroke) => set((state) => ({ 
        brushStrokes: [...state.brushStrokes, stroke] 
      })),
      clearBrushStrokes: () => set({ brushStrokes: [] }),
      setBrushSize: (size) => set({ brushSize: size }),
      setShowMasks: (show) => set({ showMasks: show }),
      
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
      setTemperature: (temp) => set({ temperature: temp }),
      setSeed: (seed) => set({ seed: seed }),
      
      addGeneration: (generation) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          generations: [...state.currentProject.generations, generation],
          updatedAt: Date.now()
        } : null
      })),
      
      addEdit: (edit) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          edits: [...state.currentProject.edits, edit],
          updatedAt: Date.now()
        } : null
      })),
      
      selectGeneration: (id) => set({ selectedGenerationId: id }),
      selectEdit: (id) => set({ selectedEditId: id }),
      setShowHistory: (show) => set({ showHistory: show }),
      
      setShowPromptPanel: (show) => set({ showPromptPanel: show }),

      setSelectedTool: (tool) => set({ selectedTool: tool }),

      // Text layer actions
      addTextLayer: (layer) => set((state) => {
        const newLayers = [...state.textLayers, layer];
        const newHistory = state.textHistory.slice(0, state.textHistoryIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newLayers)));
        return {
          textLayers: newLayers,
          selectedTextId: layer.id,
          textHistory: newHistory,
          textHistoryIndex: newHistory.length - 1,
        };
      }),
      updateTextLayer: (id, updates) => set((state) => {
        const newLayers = state.textLayers.map((layer) =>
          layer.id === id ? { ...layer, ...updates } : layer
        );
        const newHistory = state.textHistory.slice(0, state.textHistoryIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newLayers)));
        return {
          textLayers: newLayers,
          textHistory: newHistory,
          textHistoryIndex: newHistory.length - 1,
        };
      }),
      deleteTextLayer: (id) => set((state) => {
        const newLayers = state.textLayers.filter((layer) => layer.id !== id);
        const newHistory = state.textHistory.slice(0, state.textHistoryIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newLayers)));
        return {
          textLayers: newLayers,
          selectedTextId: state.selectedTextId === id ? null : state.selectedTextId,
          textHistory: newHistory,
          textHistoryIndex: newHistory.length - 1,
        };
      }),
      selectTextLayer: (id) => set({ selectedTextId: id }),
      clearTextLayers: () => set({ textLayers: [], selectedTextId: null, textHistory: [[]], textHistoryIndex: 0 }),
      undoText: () => set((state) => {
        if (state.textHistoryIndex > 0) {
          const newIndex = state.textHistoryIndex - 1;
          return {
            textLayers: JSON.parse(JSON.stringify(state.textHistory[newIndex])),
            textHistoryIndex: newIndex,
            selectedTextId: null,
          };
        }
        return state;
      }),
      redoText: () => set((state) => {
        if (state.textHistoryIndex < state.textHistory.length - 1) {
          const newIndex = state.textHistoryIndex + 1;
          return {
            textLayers: JSON.parse(JSON.stringify(state.textHistory[newIndex])),
            textHistoryIndex: newIndex,
            selectedTextId: null,
          };
        }
        return state;
      }),
    }),
    { name: 'nano-banana-store' }
  )
);