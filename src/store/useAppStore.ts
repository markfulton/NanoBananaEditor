import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { BrushStroke, HistoryItem, ImageRef, Mode } from '../types';
import { DEFAULT_MODEL, MODELS, currentModelId, resolveSize, type ImageSize, type ModelId, type ThinkingLevel } from '../lib/models';

const MAX_HISTORY = 80;

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

export interface GenerationSettings {
  model: ModelId;
  size: ImageSize;
  aspectRatio: string | null;
  thinkingLevel: ThinkingLevel;
  useSearch: boolean;
  variants: 1 | 2 | 4;
  temperature: number;
  seed: number | null;
  keepConversation: boolean;
}

interface AppState {
  hydrated: boolean;

  // Mode and composer
  mode: Mode;
  prompt: string;
  references: ImageRef[];
  settings: GenerationSettings;
  showAdvanced: boolean;

  // Canvas
  canvasImage: ImageRef | null;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  brushStrokes: BrushStroke[];
  brushSize: number;
  brushErase: boolean;
  showMasks: boolean;
  compareMode: boolean;

  // Generation
  isGenerating: boolean;
  generatingCount: number;
  generatingStartedAt: number | null;

  // History
  history: HistoryItem[];
  selectedId: string | null;

  // Panels
  showComposer: boolean;
  showHistory: boolean;

  // Actions
  setMode: (mode: Mode) => void;
  setPrompt: (prompt: string) => void;
  addReference: (ref: ImageRef) => boolean;
  removeReference: (id: string) => void;
  clearReferences: () => void;
  updateSettings: (patch: Partial<GenerationSettings>) => void;
  setModel: (model: ModelId) => void;
  setShowAdvanced: (v: boolean) => void;

  setCanvasImage: (ref: ImageRef | null) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;
  addBrushStroke: (stroke: BrushStroke) => void;
  undoBrushStroke: () => void;
  clearBrushStrokes: () => void;
  setBrushSize: (size: number) => void;
  setBrushErase: (erase: boolean) => void;
  setShowMasks: (show: boolean) => void;
  setCompareMode: (v: boolean) => void;

  setGenerating: (count: number) => void;

  addHistoryItems: (items: HistoryItem[]) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  selectItem: (id: string | null) => void;

  setShowComposer: (v: boolean) => void;
  setShowHistory: (v: boolean) => void;
  clearSession: () => void;
}

const defaultSettings: GenerationSettings = {
  model: DEFAULT_MODEL,
  size: MODELS[DEFAULT_MODEL].defaultSize,
  aspectRatio: '1:1',
  thinkingLevel: 'MINIMAL',
  useSearch: false,
  variants: 1,
  temperature: 1,
  seed: null,
  keepConversation: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      mode: 'generate',
      prompt: '',
      references: [],
      settings: defaultSettings,
      showAdvanced: false,

      canvasImage: null,
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },
      brushStrokes: [],
      brushSize: 40,
      brushErase: false,
      showMasks: true,
      compareMode: false,

      isGenerating: false,
      generatingCount: 0,
      generatingStartedAt: null,

      history: [],
      selectedId: null,

      showComposer: true,
      showHistory: true,

      setMode: (mode) => set({ mode, compareMode: false }),
      setPrompt: (prompt) => set({ prompt }),
      addReference: (ref) => {
        const { references, settings } = get();
        const cap = MODELS[settings.model].maxInputImages - (get().mode === 'generate' ? 0 : 3);
        if (references.length >= Math.max(1, cap)) return false;
        set({ references: [...references, ref] });
        return true;
      },
      removeReference: (id) => set((s) => ({ references: s.references.filter((r) => r.id !== id) })),
      clearReferences: () => set({ references: [] }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setModel: (model) =>
        set((s) => {
          const spec = MODELS[model];
          return {
            settings: {
              ...s.settings,
              model,
              size: resolveSize(model, s.settings.size),
              aspectRatio:
                s.settings.aspectRatio && spec.aspectRatios.includes(s.settings.aspectRatio)
                  ? s.settings.aspectRatio
                  : '1:1',
              useSearch: spec.supportsSearch ? s.settings.useSearch : false,
            },
            references: s.references.slice(0, spec.maxInputImages),
          };
        }),
      setShowAdvanced: (showAdvanced) => set({ showAdvanced }),

      setCanvasImage: (canvasImage) =>
        set({ canvasImage, canvasZoom: 1, canvasPan: { x: 0, y: 0 }, brushStrokes: [], compareMode: false }),
      setCanvasZoom: (canvasZoom) => set({ canvasZoom }),
      setCanvasPan: (canvasPan) => set({ canvasPan }),
      resetView: () => set({ canvasZoom: 1, canvasPan: { x: 0, y: 0 } }),
      addBrushStroke: (stroke) => set((s) => ({ brushStrokes: [...s.brushStrokes, stroke] })),
      undoBrushStroke: () => set((s) => ({ brushStrokes: s.brushStrokes.slice(0, -1) })),
      clearBrushStrokes: () => set({ brushStrokes: [] }),
      setBrushSize: (brushSize) => set({ brushSize }),
      setBrushErase: (brushErase) => set({ brushErase }),
      setShowMasks: (showMasks) => set({ showMasks }),
      setCompareMode: (compareMode) => set({ compareMode }),

      setGenerating: (count) =>
        set({
          isGenerating: count > 0,
          generatingCount: count,
          generatingStartedAt: count > 0 ? get().generatingStartedAt ?? Date.now() : null,
        }),

      addHistoryItems: (items) =>
        set((s) => ({ history: [...items, ...s.history].slice(0, MAX_HISTORY) })),
      removeHistoryItem: (id) =>
        set((s) => ({
          history: s.history.filter((h) => h.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      clearHistory: () => set({ history: [], selectedId: null }),
      selectItem: (selectedId) => set({ selectedId }),

      setShowComposer: (showComposer) => set({ showComposer }),
      setShowHistory: (showHistory) => set({ showHistory }),
      clearSession: () =>
        set({
          prompt: '',
          references: [],
          canvasImage: null,
          brushStrokes: [],
          selectedId: null,
          compareMode: false,
          canvasZoom: 1,
          canvasPan: { x: 0, y: 0 },
        }),
    }),
    {
      name: 'nb-editor-v2',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        settings: s.settings,
        history: s.history,
        mode: s.mode,
        prompt: s.prompt,
        showComposer: s.showComposer,
        showHistory: s.showHistory,
        brushSize: s.brushSize,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Saved settings and history can name a model this editor no longer
        // offers (Nano Banana 2 became 2.1 on 2026-10-07). Move them onto the
        // current id so every MODELS[...] lookup finds a spec.
        const model = currentModelId(state.settings.model) ?? DEFAULT_MODEL;
        useAppStore.setState({
          hydrated: true,
          settings: { ...state.settings, model, size: resolveSize(model, state.settings.size) },
          history: state.history.map((item) => ({ ...item, model: currentModelId(item.model) ?? DEFAULT_MODEL })),
        });
      },
    }
  )
);

export const selectSelectedItem = (s: AppState): HistoryItem | undefined =>
  s.history.find((h) => h.id === s.selectedId);
