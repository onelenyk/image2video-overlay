import { create } from "zustand";
import type {
  CanvasElement,
  OverlayElement,
  RectangleOverlay,
  PointOverlay,
  LineOverlay,
  PolygonOverlay,
  ImageComponent,
  DrawingComponent,
  SavedImage,
  RecordingSettings,
  Position,
  EditorMode,
  ImageFormat,
  DrawingMode,
  LineEndpoint,
} from "../types";
import { DEFAULT_TRAIN_SETTINGS } from "../types";

interface AppState {
  // Elements
  elements: CanvasElement[];
  activeElementId: string | null;
  
  // Background image
  backgroundImage: HTMLImageElement | null;
  backgroundDataUrl: string | null;
  
  // Saved templates
  savedImages: SavedImage[];
  
  // Recording
  recordingSettings: RecordingSettings;
  isRecording: boolean;
  
  // Editor mode
  editorMode: EditorMode;
  currentDrawingPath: Position[];
  activePolygonId: string | null;
  
  // Counter for generating IDs
  elementCounter: number;
  
  // Actions - Elements
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  setActiveElement: (id: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Actions - Background
  setBackgroundImage: (image: HTMLImageElement | null, dataUrl: string | null) => void;
  
  // Actions - Saved templates
  addSavedImage: (image: SavedImage) => void;
  
  // Actions - Recording
  setRecordingSettings: (settings: Partial<RecordingSettings>) => void;
  setIsRecording: (isRecording: boolean) => void;
  
  // Actions - Editor mode
  setEditorMode: (mode: EditorMode) => void;
  addDrawingPoint: (point: Position) => void;
  clearDrawingPath: () => void;
  setActivePolygonId: (id: string | null) => void;
  
  // Creators - Overlays
  createRectangle: () => RectangleOverlay;
  createPoint: (position?: Position) => PointOverlay;
  createLine: (startPoint: LineEndpoint, endPoint: LineEndpoint) => LineOverlay;
  createPolygon: (points?: Position[]) => PolygonOverlay;
  
  // Creators - Components
  createImageComponent: (content: string, format: ImageFormat, color: string, opacity: number) => ImageComponent;
  createDrawingComponent: (path: Position[], mode: DrawingMode, color: string, opacity: number) => DrawingComponent;
  
  // Polygon helpers
  addPolygonVertex: (polygonId: string, point: Position) => void;
  insertPolygonVertex: (polygonId: string, afterIndex: number, point: Position) => void;
  removePolygonVertex: (polygonId: string, vertexIndex: number) => void;
  closePolygon: (polygonId: string) => void;
  finishPolygonOpen: (polygonId: string) => void; // Finish polygon without closing it (polyline)
  
  // Line helpers - connect endpoints to other elements
  connectLineEndpoint: (lineId: string, endpoint: "start" | "end", connection: LineEndpoint) => void;
  disconnectLineEndpoint: (lineId: string, endpoint: "start" | "end", position: Position) => void;
  
  // Getters
  getActiveElement: () => CanvasElement | undefined;
  getOverlays: () => OverlayElement[];
  getRectangles: () => RectangleOverlay[];
  getPoints: () => PointOverlay[];
  getPointById: (id: string) => PointOverlay | undefined;
  
  // Reset
  reset: () => void;
}

const createInitialRectangle = (id: string, counter: number): RectangleOverlay => ({
  id,
  type: "overlay",
  overlayType: "rectangle",
  position: { x: 30 + counter * 5, y: 40 + counter * 10 },
  size: { width: 100, height: 100 },
  rotation: 0,
  zIndex: 10,
  color: "#ef4444",
  opacity: 0.4,
  label: `Zone ${String(counter).padStart(2, "0")}`,
  showLabel: true,
  labelColor: "#ffffff",
  fontSize: 14,
  borderWidth: 2,
  animationType: "anim-pulse",
  animationDuration: 1.5,
  animationEnabled: false,
  animationPreview: false,
  isHidden: false,
  isLooping: false,
  trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
});

const initialRectangle = createInitialRectangle("overlay-1", 1);

export const useStore = create<AppState>((set, get) => ({
  elements: [initialRectangle],
  activeElementId: "overlay-1",
  backgroundImage: null,
  backgroundDataUrl: null,
  savedImages: [],
  recordingSettings: {
    qualityPreset: "native",
    bitrate: 10,
    fps: 30,
    videoFormat: "mp4",
    durationMode: "animation",
    videoDuration: 3,
  },
  isRecording: false,
  editorMode: "select",
  currentDrawingPath: [],
  activePolygonId: null,
  elementCounter: 1,

  // Element actions
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
      return {
        elements: newElements,
        activeElementId:
          state.activeElementId === id
            ? newElements[0]?.id ?? null
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

  // Background
  setBackgroundImage: (image, dataUrl) =>
    set({ backgroundImage: image, backgroundDataUrl: dataUrl }),

  // Saved templates
  addSavedImage: (image) =>
    set((state) => ({ savedImages: [...state.savedImages, image] })),

  // Recording
  setRecordingSettings: (settings) =>
    set((state) => ({
      recordingSettings: { ...state.recordingSettings, ...settings },
    })),

  setIsRecording: (isRecording) => set({ isRecording }),

  // Editor mode
  setEditorMode: (mode) => set({ editorMode: mode, currentDrawingPath: [], activePolygonId: null }),
  
  addDrawingPoint: (point) =>
    set((state) => ({
      currentDrawingPath: [...state.currentDrawingPath, point],
    })),
    
  clearDrawingPath: () => set({ currentDrawingPath: [] }),
  
  setActivePolygonId: (id) => set({ activePolygonId: id }),

  // Creators - Overlays
  createRectangle: () => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    const id = `rectangle-${newCounter}`;
    set({ elementCounter: newCounter });
    return createInitialRectangle(id, newCounter);
  },

  createPoint: (position) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `point-${newCounter}`,
      type: "overlay" as const,
      overlayType: "point" as const,
      position: position || { x: 50, y: 50 },
      radius: 8,
      rotation: 0,
      zIndex: 50,
      color: "#3b82f6",
      opacity: 1,
      label: `P${newCounter}`,
      showLabel: true,
      labelColor: "#ffffff",
      fontSize: 10,
      animationType: "anim-pulse" as const,
      animationDuration: 1.5,
      animationEnabled: false,
      animationPreview: false,
      isLooping: false,
      trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
    };
  },

  createLine: (startPoint, endPoint) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `line-${newCounter}`,
      type: "overlay" as const,
      overlayType: "line" as const,
      startPoint,
      endPoint,
      strokeWidth: 3,
      rotation: 0,
      zIndex: 40,
      color: "#10b981",
      opacity: 1,
      animationType: "anim-pulse" as const,
      animationDuration: 1.5,
      animationEnabled: false,
      animationPreview: false,
      isLooping: false,
      trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
    };
  },

  createPolygon: (points) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `polygon-${newCounter}`,
      type: "overlay" as const,
      overlayType: "polygon" as const,
      points: points || [],
      closed: false,
      strokeWidth: 2,
      fillEnabled: true,
      rotation: 0,
      zIndex: 30,
      color: "#8b5cf6",
      opacity: 0.4,
      animationType: "anim-pulse" as const,
      animationDuration: 1.5,
      animationEnabled: false,
      animationPreview: false,
      isLooping: false,
      trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
    };
  },

  // Creators - Components
  createImageComponent: (content, format, color, opacity) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    return {
      id: `image-${newCounter}`,
      type: "component" as const,
      componentType: "image" as const,
      position: { x: 15, y: 15 },
      size: { width: 60, height: 60 },
      rotation: 0,
      zIndex: 100,
      color,
      opacity,
      content,
      format,
      animationType: "anim-pulse" as const,
      animationDuration: 1.5,
      animationEnabled: false,
      animationPreview: false,
      isLooping: false,
      trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
    };
  },

  createDrawingComponent: (path, mode, color, opacity) => {
    const state = get();
    const newCounter = state.elementCounter + 1;
    set({ elementCounter: newCounter });
    
    // Calculate bounding box from path (in percentage coordinates)
    const xs = path.map((p) => p.x);
    const ys = path.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    
    return {
      id: `drawing-${newCounter}`,
      type: "component" as const,
      componentType: "drawing" as const,
      position: { x: minX, y: minY }, // Top-left corner in percentage
      size: { width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) }, // Size in percentage units
      rotation: 0,
      zIndex: 100,
      color,
      opacity,
      path: path.map((p) => ({ x: p.x - minX, y: p.y - minY })), // Normalize path to local coords (relative to position)
      drawingMode: mode,
      strokeWidth: 3,
      smoothing: 0.5,
      animationType: "anim-pulse" as const,
      animationDuration: 1.5,
      animationEnabled: false,
      animationPreview: false,
      isLooping: false,
      trainSettings: { ...DEFAULT_TRAIN_SETTINGS },
    };
  },

  // Polygon helpers
  addPolygonVertex: (polygonId, point) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === polygonId && el.type === "overlay" && (el as OverlayElement).overlayType === "polygon") {
          const polygon = el as PolygonOverlay;
          return { ...polygon, points: [...polygon.points, point] };
        }
        return el;
      }),
    })),

  insertPolygonVertex: (polygonId, afterIndex, point) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === polygonId && el.type === "overlay" && (el as OverlayElement).overlayType === "polygon") {
          const polygon = el as PolygonOverlay;
          const newPoints = [...polygon.points];
          newPoints.splice(afterIndex + 1, 0, point);
          return { ...polygon, points: newPoints };
        }
        return el;
      }),
    })),

  removePolygonVertex: (polygonId, vertexIndex) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === polygonId && el.type === "overlay" && (el as OverlayElement).overlayType === "polygon") {
          const polygon = el as PolygonOverlay;
          // Don't allow removing if it would leave less than 2 points
          if (polygon.points.length <= 2) return el;
          const newPoints = polygon.points.filter((_, i) => i !== vertexIndex);
          // If polygon was closed and now has less than 3 points, unclose it
          const shouldClose = polygon.closed && newPoints.length >= 3;
          return { ...polygon, points: newPoints, closed: shouldClose };
        }
        return el;
      }),
    })),

  closePolygon: (polygonId) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === polygonId && el.type === "overlay" && (el as OverlayElement).overlayType === "polygon") {
          return { ...el, closed: true };
        }
        return el;
      }),
    })),

  finishPolygonOpen: (polygonId) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === polygonId && el.type === "overlay" && (el as OverlayElement).overlayType === "polygon") {
          // Keep closed as false - it's already false by default, but make sure fill is disabled for polylines
          return { ...el, closed: false, fillEnabled: false };
        }
        return el;
      }),
    })),

  // Line helpers - connect endpoints to other elements
  connectLineEndpoint: (lineId, endpoint, connection) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === lineId && el.type === "overlay" && (el as OverlayElement).overlayType === "line") {
          const line = el as LineOverlay;
          if (endpoint === "start") {
            return { ...line, startPoint: connection };
          } else {
            return { ...line, endPoint: connection };
          }
        }
        return el;
      }),
    })),

  disconnectLineEndpoint: (lineId, endpoint, position) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === lineId && el.type === "overlay" && (el as OverlayElement).overlayType === "line") {
          const line = el as LineOverlay;
          if (endpoint === "start") {
            return { ...line, startPoint: position };
          } else {
            return { ...line, endPoint: position };
          }
        }
        return el;
      }),
    })),

  // Getters
  getActiveElement: () => {
    const state = get();
    return state.elements.find((el) => el.id === state.activeElementId);
  },

  getOverlays: () => {
    const state = get();
    return state.elements.filter((el): el is OverlayElement => el.type === "overlay");
  },

  getRectangles: () => {
    const state = get();
    return state.elements.filter(
      (el): el is RectangleOverlay =>
        el.type === "overlay" && (el as OverlayElement).overlayType === "rectangle"
    );
  },

  getPoints: () => {
    const state = get();
    return state.elements.filter(
      (el): el is PointOverlay =>
        el.type === "overlay" && (el as OverlayElement).overlayType === "point"
    );
  },

  getPointById: (id) => {
    const state = get();
    const element = state.elements.find((el) => el.id === id);
    if (element?.type === "overlay" && (element as OverlayElement).overlayType === "point") {
      return element as PointOverlay;
    }
    return undefined;
  },

  // Reset
  reset: () =>
    set({
      elements: [createInitialRectangle("overlay-1", 1)],
      activeElementId: "overlay-1",
      backgroundImage: null,
      backgroundDataUrl: null,
      elementCounter: 1,
      editorMode: "select",
      currentDrawingPath: [],
      activePolygonId: null,
    }),
}));

// Legacy alias for backward compatibility
export const addSavedSvg = (svg: SavedImage) => useStore.getState().addSavedImage(svg);
