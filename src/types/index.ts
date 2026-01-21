// Animation types
export type AnimationType =
  | "anim-pulse"
  | "anim-bounce"
  | "anim-fade"
  | "anim-shake"
  | "anim-flash"
  | "anim-spin"
  | "anim-zoom"
  | "anim-float"
  | "anim-train"      // Train/pulse traveling along the line path
  | "anim-train-loop" // Train traveling in a loop (goes back)
  | "anim-dash";      // Animated dashed line (marching ants)

// Position and Size
export interface Position {
  x: number;
  y: number;
}

// Connection reference - for connecting lines to other elements
export interface ConnectionRef {
  elementId: string;           // ID of the element to connect to
  vertexIndex?: number;        // For polygons: which vertex (0-based index)
  endpoint?: "start" | "end";  // For lines: which endpoint
}

export interface Size {
  width: number;
  height: number;
}

// ============================================
// OVERLAY TYPES
// ============================================

export type OverlayType = "rectangle" | "line" | "polygon" | "point";

// Train animation settings
export interface TrainAnimationSettings {
  trainLength: number;      // Length of the train as a fraction of the path (0.05 to 0.5)
  glowIntensity: number;    // Glow effect intensity (0 to 1)
  glowSize: number;         // Glow size in pixels (0 to 20)
  trainColor: string;       // Train color (or "inherit" to use element color)
  fadeTrail: boolean;       // Whether to show a fading trail behind the train
}

// Default train animation settings
export const DEFAULT_TRAIN_SETTINGS: TrainAnimationSettings = {
  trainLength: 0.15,
  glowIntensity: 0.3,
  glowSize: 8,
  trainColor: "inherit",
  fadeTrail: false,
};

// Base properties shared by all overlays
export interface BaseOverlay {
  id: string;
  type: "overlay";
  overlayType: OverlayType;
  zIndex: number;
  color: string;
  opacity: number;
  rotation: number;
  // Animation (available for all overlay types)
  animationType: AnimationType;
  animationDuration: number;
  animationEnabled: boolean; // Animation included in export
  animationPreview: boolean; // Show animation on preview canvas
  isLooping: boolean;
  // Train animation specific settings
  trainSettings: TrainAnimationSettings;
}

// Rectangle overlay (current overlay type)
export interface RectangleOverlay extends BaseOverlay {
  overlayType: "rectangle";
  position: Position;
  size: Size;
  label: string;
  showLabel: boolean;
  labelColor: string;
  fontSize: number;
  borderWidth: number;
  isHidden: boolean;
}

// Point overlay - a single draggable point
export interface PointOverlay extends BaseOverlay {
  overlayType: "point";
  position: Position;
  radius: number;
  label: string;
  showLabel: boolean;
  labelColor: string;
  fontSize: number;
}

// Line endpoint type - can be a position or a connection to another element
export type LineEndpoint = Position | ConnectionRef;

// Line overlay - connects two points or positions
export interface LineOverlay extends BaseOverlay {
  overlayType: "line";
  startPoint: LineEndpoint;  // Position or connection to point/line/polygon
  endPoint: LineEndpoint;    // Position or connection to point/line/polygon
  strokeWidth: number;
}

// Polygon overlay - multiple vertices forming a shape
export interface PolygonOverlay extends BaseOverlay {
  overlayType: "polygon";
  points: Position[];  // Array of vertex positions
  closed: boolean;     // Whether the polygon is closed
  strokeWidth: number;
  fillEnabled: boolean;
}

// Union type for all overlays
export type OverlayElement = RectangleOverlay | PointOverlay | LineOverlay | PolygonOverlay;

// ============================================
// COMPONENT TYPES
// ============================================

export type ComponentType = "image" | "drawing";
export type ImageFormat = "svg" | "png";
export type DrawingMode = "freehand" | "straight";

// Base properties shared by all components
export interface BaseComponent {
  id: string;
  type: "component";
  componentType: ComponentType;
  position: Position;
  size: Size;
  rotation: number;
  zIndex: number;
  color: string;
  opacity: number;
  // Animation (available for all component types)
  animationType: AnimationType;
  animationDuration: number;
  animationEnabled: boolean; // Animation included in export
  animationPreview: boolean; // Show animation on preview canvas
  isLooping: boolean;
  // Train animation specific settings
  trainSettings: TrainAnimationSettings;
}

// Image component - SVG or PNG
export interface ImageComponent extends BaseComponent {
  componentType: "image";
  content: string;      // SVG string or PNG data URL
  format: ImageFormat;
}

// Drawing component - freehand or straight line drawing
export interface DrawingComponent extends BaseComponent {
  componentType: "drawing";
  path: Position[];       // Array of points forming the path
  drawingMode: DrawingMode;
  strokeWidth: number;
  smoothing: number;      // Curve smoothing for freehand (0-1)
}

// Union type for all components
export type ComponentElement = ImageComponent | DrawingComponent;

// ============================================
// CANVAS ELEMENT (all element types)
// ============================================

export type CanvasElement = OverlayElement | ComponentElement;

// Helper type to check element kind
export type ElementKind = "overlay" | "component";

// ============================================
// EDITOR STATE
// ============================================

export type EditorMode = 
  | "select"           // Default selection/manipulation mode
  | "draw-freehand"    // Freehand drawing mode
  | "draw-straight"    // Straight line drawing mode
  | "polygon-create";  // Polygon vertex creation mode

// ============================================
// SAVED TEMPLATES
// ============================================

export interface SavedImage {
  name: string;
  content: string;
  format: ImageFormat;
  color: string;
  opacity: number;
}

// Legacy alias for compatibility
export type SavedSvg = SavedImage;

// ============================================
// RECORDING SETTINGS
// ============================================

export type QualityPreset = "720" | "1080" | "1440" | "4k" | "native";
export type VideoFormat = "webm-vp9" | "webm-vp8" | "webm" | "mp4";
export type DurationMode = "animation" | "custom";

export interface RecordingSettings {
  qualityPreset: QualityPreset;
  bitrate: number;
  fps: number;
  videoFormat: VideoFormat;
  durationMode: DurationMode;
  videoDuration: number;
  backgroundColor: string;
}

export const QUALITY_PRESETS: Record<Exclude<QualityPreset, "native">, [number, number]> = {
  "720": [1280, 720],
  "1080": [1920, 1080],
  "1440": [2560, 1440],
  "4k": [3840, 2160],
};

// ============================================
// TYPE GUARDS
// ============================================

export function isOverlay(element: CanvasElement): element is OverlayElement {
  return element.type === "overlay";
}

export function isComponent(element: CanvasElement): element is ComponentElement {
  return element.type === "component";
}

export function isRectangleOverlay(element: CanvasElement): element is RectangleOverlay {
  return element.type === "overlay" && (element as OverlayElement).overlayType === "rectangle";
}

export function isPointOverlay(element: CanvasElement): element is PointOverlay {
  return element.type === "overlay" && (element as OverlayElement).overlayType === "point";
}

export function isLineOverlay(element: CanvasElement): element is LineOverlay {
  return element.type === "overlay" && (element as OverlayElement).overlayType === "line";
}

export function isPolygonOverlay(element: CanvasElement): element is PolygonOverlay {
  return element.type === "overlay" && (element as OverlayElement).overlayType === "polygon";
}

export function isImageComponent(element: CanvasElement): element is ImageComponent {
  return element.type === "component" && (element as ComponentElement).componentType === "image";
}

export function isDrawingComponent(element: CanvasElement): element is DrawingComponent {
  return element.type === "component" && (element as ComponentElement).componentType === "drawing";
}

// Check if a line endpoint is a connection reference (vs a plain position)
export function isConnectionRef(endpoint: LineEndpoint): endpoint is ConnectionRef {
  return typeof endpoint === "object" && "elementId" in endpoint;
}

// Check if a line endpoint is a plain position
export function isPosition(endpoint: LineEndpoint): endpoint is Position {
  return typeof endpoint === "object" && "x" in endpoint && !("elementId" in endpoint);
}
