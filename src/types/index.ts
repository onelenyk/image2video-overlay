export type AnimationType =
  | "anim-pulse"
  | "anim-bounce"
  | "anim-fade"
  | "anim-shake"
  | "anim-flash"
  | "anim-spin"
  | "anim-zoom"
  | "anim-float";

export type ArrowType = "simple" | "diagonal" | "right" | "curved" | "double";

export type ElementType = "overlay" | "arrow" | "svg";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  rotation: number;
  zIndex: number;
  color: string;
  opacity: number;
}

export interface OverlayElement extends BaseElement {
  type: "overlay";
  label: string;
  showLabel: boolean;
  labelColor: string;
  fontSize: number;
  borderWidth: number;
  animationType: AnimationType;
  animationDuration: number;
  animationEnabled: boolean;
  isHidden: boolean;
  isLooping: boolean;
}

export interface ArrowElement extends BaseElement {
  type: "arrow";
  arrowType: ArrowType;
}

export interface SvgElement extends BaseElement {
  type: "svg";
  svgContent: string;
  cachedImageUrl?: string;
}

export type CanvasElement = OverlayElement | ArrowElement | SvgElement;

export interface SavedSvg {
  name: string;
  content: string;
  color: string;
  opacity: number;
}

export type QualityPreset = "720" | "1080" | "1440" | "4k" | "native";

export type VideoFormat = "webm-vp9" | "webm-vp8" | "webm" | "mp4";

export type DurationMode = "animation" | "custom";

export interface RecordingSettings {
  qualityPreset: QualityPreset;
  bitrate: number;
  fps: number;
  videoFormat: VideoFormat;
  durationMode: DurationMode;
  videoDuration: number; // in seconds (used when durationMode is "custom")
}

export const QUALITY_PRESETS: Record<Exclude<QualityPreset, "native">, [number, number]> = {
  "720": [1280, 720],
  "1080": [1920, 1080],
  "1440": [2560, 1440],
  "4k": [3840, 2160],
};

export const ARROW_PATHS: Record<ArrowType, string> = {
  simple: "M11 5V14L7.5 10.5L6 12L12 18L18 12L16.5 10.5L13 14V5H11Z",
  diagonal: "M19 19V9L15.5 12.5L12 9L5 16L6.5 17.5L12 12L14 14L10 18L11.5 19.5L15 16V19H19Z",
  right: "M5 13h12.5l-3.5 3.5 1.5 1.5 6-6-6-6-1.5 1.5 3.5 3.5H5v2z",
  curved: "M20 12c0-4.4-3.6-8-8-8S4 7.6 4 12v4l-2-2-1.4 1.4L4.3 19l3.7-3.6L6.6 14l-2.6 2.6v-4.6c0-3.3 2.7-6 6-6s6 2.7 6 6H20z",
  double: "M21 12l-4-4v3H7V8l-4 4 4 4v-3h10v3l4-4z",
};
