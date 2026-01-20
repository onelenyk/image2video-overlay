import { create } from "zustand";
import type {
  CanvasElement,
  OverlayElement,
  ArrowElement,
  SvgElement,
  SavedSvg,
  RecordingSettings,
  ArrowType,
} from "../types";

interface AppState {
  // Elements
  elements: CanvasElement[];
  activeElementId: string | null;
  
  // Background image
  backgroundImage: HTMLImageElement | null;
  backgroundDataUrl: string | null;
  
  // Saved templates
  savedSvgs: SavedSvg[];
  
  // Recording
  recordingSettings: RecordingSettings;
  isRecording: boolean;
  
  // Counter for generating IDs
  elementCounter: number;
  
  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  setActiveElement: (id: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  setBackgroundImage: (image: HTMLImageElement | null, dataUrl: string | null) => void;
  
  addSavedSvg: (svg: SavedSvg) => void;
  
  setRecordingSettings: (settings: Partial<RecordingSettings>) => void;
  setIsRecording: (isRecording: boolean) => void;
  
  // Helper to create new overlay
  createOverlay: () => OverlayElement;
  createArrow: (arrowType: ArrowType, color: string, opacity: number) => ArrowElement;
  createSvgElement: (svgContent: string, color: string, opacity: number) => SvgElement;
  
  // Get active element
  getActiveElement: () => CanvasElement | undefined;
  
  // Get only overlay elements
  getOverlays: () => OverlayElement[];
  
  // Reset
  reset: () => void;
}

const createInitialOverlay = (id: string, counter: number): OverlayElement => ({
  id,
  type: "overlay",
  position: { x: 30 + counter * 5, y: 40 + counter * 10 },
  size: { width: 100, height: 100 },
  rotation: 0,
  zIndex: 10,
  color: "#ef4444",
  opacity: 0.4,
  label: "Zone 06",
  showLabel: true,
  labelColor: "#ffffff",
  fontSize: 14,
  borderWidth: 2,
  animationType: "anim-pulse",
  animationDuration: 1.5,
  animationEnabled: false,
  isHidden: false,
  isLooping: false,
});

const initialOverlay = createInitialOverlay("overlay-1", 1);

export const useStore = create<AppState>((set, get) => ({
  elements: [initialOverlay],
  activeElementId: "overlay-1",
  backgroundImage: null,
  backgroundDataUrl: null,
  savedSvgs: [],
  recordingSettings: {
    qualityPreset: "native",
    bitrate: 10,
    fps: 30,
    videoFormat: "mp4",
    durationMode: "animation",
    videoDuration: 3,
  },
  isRecording: false,
  elementCounter: 1,

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      activeElementId: element.id,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } as CanvasElement : el
      ),
    })),

  deleteElement: (id) =>
    set((state) => {
      const newElements = state.elements.filter((el) => el.id !== id);
      const overlays = newElements.filter((el) => el.type === "overlay");
      // Don't allow deleting the last overlay
      if (state.elements.find((el) => el.id === id)?.type === "overlay" && overlays.length === 0) {
        return state;
      }
      return {
        elements: newElements,
        activeElementId:
          state.activeElementId === id
            ? overlays[0]?.id ?? newElements[0]?.id ?? null
            : state.activeElementId,
      };
    }),

  setActiveElement: (id) => set({ activeElementId: id }),

  bringToFront: (id) =>
    set((state) => {
      const maxZ = Math.max(...state.elements.map((el) => el.zIndex));
      return {
        elements: state.elements.map((el) =>
          el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        ),
      };
    }),

  sendToBack: (id) =>
    set((state) => {
      const minZ = Math.min(...state.elements.map((el) => el.zIndex));
      return {
        elements: state.elements.map((el) =>
          el.id === id ? { ...el, zIndex: Math.max(1, minZ - 1) } : el
        ),
      };
    }),

  setBackgroundImage: (image, dataUrl) =>
    set({ backgroundImage: image, backgroundDataUrl: dataUrl }),

  addSavedSvg: (svg) =>
    set((state) => ({ savedSvgs: [...state.savedSvgs, svg] })),

  setRecordingSettings: (settings) =>
    set((state) => ({
      recordingSettings: { ...state.recordingSettings, ...settings },
    })),

  setIsRecording: (isRecording) => set({ isRecording }),

  createOverlay: () => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    const id = `overlay-${newCounter}`;
    set({ elementCounter: newCounter });
    return createInitialOverlay(id, newCounter);
  },

  createArrow: (arrowType, color, opacity) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `arrow-${newCounter}`,
      type: "arrow" as const,
      position: { x: 15, y: 15 },
      size: { width: 60, height: 60 },
      rotation: 0,
      zIndex: 100,
      color,
      opacity,
      arrowType,
    };
  },

  createSvgElement: (svgContent, color, opacity) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `svg-${newCounter}`,
      type: "svg" as const,
      position: { x: 15, y: 15 },
      size: { width: 60, height: 60 },
      rotation: 0,
      zIndex: 100,
      color,
      opacity,
      svgContent,
    };
  },

  getActiveElement: () => {
    const state = get();
    return state.elements.find((el) => el.id === state.activeElementId);
  },

  getOverlays: () => {
    const state = get();
    return state.elements.filter((el): el is OverlayElement => el.type === "overlay");
  },

  reset: () =>
    set({
      elements: [createInitialOverlay("overlay-1", 1)],
      activeElementId: "overlay-1",
      backgroundImage: null,
      backgroundDataUrl: null,
      elementCounter: 1,
    }),
}));
