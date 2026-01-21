import { useRef, useCallback, useState } from "react";
import { useStore } from "../store/useStore";
import type { 
  OverlayElement,
  RectangleOverlay,
  PointOverlay,
  LineOverlay,
  PolygonOverlay,
  ComponentElement,
  ImageComponent,
  DrawingComponent,
  Position,
  LineEndpoint
} from "../types";
import { hexToRgba } from "../utils/color";
import { replaceCurrentColorInSvgXml } from "../utils/svg";
import { resolveEndpoint } from "../utils/connections";
import { getAnimationState, isLineAnimation, type AnimationState } from "../utils/animation";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

// Catmull-Rom spline for smooth curves (same as DrawingElement)
function drawCatmullRomSpline(
  ctx: CanvasRenderingContext2D,
  points: Position[],
  tension: number = 0.5
) {
  if (points.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 6;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 6;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 6;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

export function useRecording() {
  const {
    backgroundImage,
    recordingSettings,
    isRecording,
    setIsRecording,
  } = useStore();

  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const recordingInfoRef = useRef<{ mimeType: string; extension: string }>({
    mimeType: "video/webm",
    extension: "webm",
  });
  const recordingStartTimeRef = useRef<number>(0);
  
  // MP4 encoding refs
  const mp4MuxerRef = useRef<Muxer<ArrayBufferTarget> | null>(null);
  const videoEncoderRef = useRef<VideoEncoder | null>(null);
  const frameCountRef = useRef<number>(0);
  const mp4FramesRef = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);

  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    return canvasRef.current;
  }, []);

  const getCanvasSize = useCallback((): [number, number] => {
    if (backgroundImage) {
      // H.264 requires even dimensions, so round up to nearest even number
      // Image will be scaled slightly to fit (imperceptible ~0.08% zoom for 1px)
      const width = Math.ceil(backgroundImage.width / 2) * 2;
      const height = Math.ceil(backgroundImage.height / 2) * 2;
      return [width, height];
    }
    return [1920, 1080];
  }, [backgroundImage]);

  const cacheImages = useCallback(async () => {
    const elements = useStore.getState().elements;
    const imageComponents = elements.filter(
      (el): el is ImageComponent => el.type === "component" && (el as ComponentElement).componentType === "image"
    );

    for (const img of imageComponents) {
      if (!imageCacheRef.current.has(img.id)) {
        try {
          if (img.format === "svg") {
            const color = hexToRgba(img.color, img.opacity);
            let svgData = img.content;
            svgData = replaceCurrentColorInSvgXml(svgData, color);

            const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const image = new Image();
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject();
              image.src = url;
            });

            imageCacheRef.current.set(img.id, image);
          } else if (img.format === "png") {
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject();
              image.src = img.content;
            });

            imageCacheRef.current.set(img.id, image);
          }
        } catch (e) {
          console.error("Failed to cache image:", e);
        }
      }
    }
  }, []);

  // Helper to get point position (resolves connection references)
  const getPointPosition = useCallback((pointRef: LineEndpoint): Position => {
    const elements = useStore.getState().elements;
    const resolved = resolveEndpoint(pointRef, elements);
    return resolved ?? { x: 50, y: 50 };
  }, []);

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, containerRect: DOMRect) => {
      const elements = useStore.getState().elements;
      const currentTime = performance.now();
      const elapsedTime = currentTime - recordingStartTimeRef.current;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (backgroundImage) {
        // Scale image to fit canvas (tiny zoom if dimensions were rounded)
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      }

      const sx = canvas.width / containerRect.width;
      const sy = canvas.height / containerRect.height;

      const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

      sortedElements.forEach((element) => {
        if (element.type === "overlay") {
          const overlay = element as OverlayElement;

          // Get animation state if enabled
          let animState: AnimationState | null = null;
          if ((overlay as any).animationEnabled && (overlay as any).animationType) {
            const animDuration = (overlay as any).animationDuration * 1000;
            const progress = (elapsedTime % animDuration) / animDuration;
            animState = getAnimationState((overlay as any).animationType, progress, (overlay as any).opacity || 1);
          }

          switch (overlay.overlayType) {
            case "rectangle": {
              const rect = overlay as RectangleOverlay;
              if (rect.isHidden) return;

              let x = (rect.position.x / 100) * containerRect.width * sx;
              let y = (rect.position.y / 100) * containerRect.height * sy;
              let w = rect.size.width * sx;
              let h = rect.size.height * sy;
              let opacity = rect.opacity;
              let additionalRotation = 0;

              if (animState) {
                const centerX = x + w / 2;
                const centerY = y + h / 2;

                w *= animState.scale;
                h *= animState.scale;
                x = centerX - w / 2;
                y = centerY - h / 2;

                x += animState.translateX * sx;
                y += animState.translateY * sy;

                opacity = animState.opacity;
                additionalRotation = animState.rotation;
              }

              ctx.save();
              ctx.globalAlpha = opacity;

              const totalRotation = rect.rotation + additionalRotation;
              if (totalRotation) {
                ctx.translate(x + w / 2, y + h / 2);
                ctx.rotate((totalRotation * Math.PI) / 180);
                ctx.translate(-(x + w / 2), -(y + h / 2));
              }

              const bgColor = hexToRgba(rect.color, 1);
              ctx.fillStyle = bgColor;
              ctx.fillRect(x, y, w, h);

              if (rect.borderWidth > 0) {
                ctx.strokeStyle = rect.color;
                ctx.lineWidth = rect.borderWidth * sx;
                ctx.strokeRect(x, y, w, h);
              }

              if (rect.showLabel && rect.label) {
                ctx.fillStyle = rect.labelColor;
                ctx.font = `bold ${rect.fontSize * sy}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(rect.label, x + w / 2, y + h / 2);
              }

              ctx.restore();
              break;
            }

            case "point": {
              const point = overlay as PointOverlay;
              let x = (point.position.x / 100) * containerRect.width * sx;
              let y = (point.position.y / 100) * containerRect.height * sy;
              let radius = point.radius * sx;
              let opacity = point.opacity;

              if (animState) {
                x += animState.translateX * sx;
                y += animState.translateY * sy;
                radius *= animState.scale;
                opacity = animState.opacity;
              }

              ctx.save();
              ctx.globalAlpha = opacity;

              // Draw point circle
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fillStyle = point.color;
              ctx.fill();
              ctx.strokeStyle = "white";
              ctx.lineWidth = 2 * sx;
              ctx.stroke();

              // Draw label
              if (point.showLabel && point.label) {
                ctx.fillStyle = point.labelColor;
                ctx.font = `bold ${point.fontSize * sy}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(point.label, x, y + radius + 4 * sy);
              }

              ctx.restore();
              break;
            }

            case "line": {
              const line = overlay as LineOverlay;
              const lineStartPos = getPointPosition(line.startPoint);
              const lineEndPos = getPointPosition(line.endPoint);

              let x1 = (lineStartPos.x / 100) * containerRect.width * sx;
              let y1 = (lineStartPos.y / 100) * containerRect.height * sy;
              let x2 = (lineEndPos.x / 100) * containerRect.width * sx;
              let y2 = (lineEndPos.y / 100) * containerRect.height * sy;
              let opacity = line.opacity;

              // Check if this is a line-specific animation
              const isTrainAnim = isLineAnimation((line as any).animationType);

              if (animState && !isTrainAnim) {
                // Calculate line center for scale/rotation transforms
                const centerX = (x1 + x2) / 2;
                const centerY = (y1 + y2) / 2;
                
                // Apply scale around center
                if (animState.scale !== 1) {
                  x1 = centerX + (x1 - centerX) * animState.scale;
                  y1 = centerY + (y1 - centerY) * animState.scale;
                  x2 = centerX + (x2 - centerX) * animState.scale;
                  y2 = centerY + (y2 - centerY) * animState.scale;
                }
                
                // Apply rotation around center
                if (animState.rotation !== 0) {
                  const radians = (animState.rotation * Math.PI) / 180;
                  const cos = Math.cos(radians);
                  const sin = Math.sin(radians);
                  
                  const dx1 = x1 - centerX;
                  const dy1 = y1 - centerY;
                  x1 = centerX + dx1 * cos - dy1 * sin;
                  y1 = centerY + dx1 * sin + dy1 * cos;
                  
                  const dx2 = x2 - centerX;
                  const dy2 = y2 - centerY;
                  x2 = centerX + dx2 * cos - dy2 * sin;
                  y2 = centerY + dx2 * sin + dy2 * cos;
                }
                
                // Apply translation
                x1 += animState.translateX * sx;
                y1 += animState.translateY * sy;
                x2 += animState.translateX * sx;
                y2 += animState.translateY * sy;
                
                opacity = animState.opacity;
              }

              ctx.save();

              // Draw the main line (dimmed for train animation)
              ctx.globalAlpha = isTrainAnim && (line as any).animationEnabled ? opacity * 0.3 : opacity;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = line.color;
              ctx.lineWidth = line.strokeWidth * sx;
              ctx.lineCap = "round";
              ctx.stroke();

              // Draw train animation if enabled
              if (isTrainAnim && (line as any).animationEnabled) {
                const animDuration = (line as any).animationDuration * 1000;
                let progress = (elapsedTime % animDuration) / animDuration;
                
                // Get train settings
                const trainSettings = (line as any).trainSettings || {
                  trainLength: 0.15,
                  glowIntensity: 0.3,
                  glowSize: 8,
                  trainColor: "inherit",
                };
                const trainColor = trainSettings.trainColor === "inherit" ? line.color : trainSettings.trainColor;
                
                // For train-loop, make it go back and forth
                if ((line as any).animationType === "anim-train-loop") {
                  progress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
                }

                if ((line as any).animationType === "anim-train" || (line as any).animationType === "anim-train-loop") {
                  // Calculate train segment
                  const halfTrain = trainSettings.trainLength / 2;
                  const segStart = Math.max(0, progress - halfTrain);
                  const segEnd = Math.min(1, progress + halfTrain);

                  const trainX1 = x1 + (x2 - x1) * segStart;
                  const trainY1 = y1 + (y2 - y1) * segStart;
                  const trainX2 = x1 + (x2 - x1) * segEnd;
                  const trainY2 = y1 + (y2 - y1) * segEnd;

                  // Soft glow effect - draw multiple layers to simulate CSS blur
                  if (trainSettings.glowIntensity > 0 && trainSettings.glowSize > 0) {
                    const glowLayers = 4;
                    for (let i = glowLayers; i >= 1; i--) {
                      ctx.save();
                      const layerRatio = i / glowLayers;
                      ctx.globalAlpha = trainSettings.glowIntensity * (1 - layerRatio) * 0.5;
                      ctx.beginPath();
                      ctx.moveTo(trainX1, trainY1);
                      ctx.lineTo(trainX2, trainY2);
                      ctx.strokeStyle = trainColor;
                      ctx.lineWidth = (line.strokeWidth + trainSettings.glowSize * layerRatio * 2) * sx;
                      ctx.lineCap = "round";
                      ctx.filter = `blur(${trainSettings.glowSize * layerRatio * sx}px)`;
                      ctx.stroke();
                      ctx.restore();
                    }
                  }

                  // Bright core (white)
                  ctx.globalAlpha = 0.9;
                  ctx.beginPath();
                  ctx.moveTo(trainX1, trainY1);
                  ctx.lineTo(trainX2, trainY2);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = line.strokeWidth * sx;
                  ctx.lineCap = "round";
                  ctx.stroke();

                  // Colored overlay
                  ctx.globalAlpha = 1;
                  ctx.beginPath();
                  ctx.moveTo(trainX1, trainY1);
                  ctx.lineTo(trainX2, trainY2);
                  ctx.strokeStyle = trainColor;
                  ctx.lineWidth = Math.max(1, (line.strokeWidth - 1)) * sx;
                  ctx.lineCap = "round";
                  ctx.stroke();
                } else if ((line as any).animationType === "anim-dash") {
                  // Marching dash animation
                  ctx.globalAlpha = 0.8;
                  ctx.beginPath();
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(x2, y2);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = line.strokeWidth * sx;
                  ctx.lineCap = "round";
                  ctx.setLineDash([10 * sx, 10 * sx]);
                  ctx.lineDashOffset = -progress * 100 * sx;
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
              }

              ctx.restore();
              break;
            }

            case "polygon": {
              const polygon = overlay as PolygonOverlay;
              if (polygon.points.length === 0) return;

              // Check if this is a line-specific animation
              const isPolyTrainAnim = isLineAnimation((polygon as any).animationType);

              ctx.save();
              
              // Get animation values (only for non-train animations)
              const scale = (!isPolyTrainAnim && animState?.scale) ? animState.scale : 1;
              const translateX = (!isPolyTrainAnim && animState?.translateX) ? animState.translateX : 0;
              const translateY = (!isPolyTrainAnim && animState?.translateY) ? animState.translateY : 0;
              const rotation = (!isPolyTrainAnim && animState?.rotation) ? animState.rotation : 0;
              const opacity = (!isPolyTrainAnim && animState) ? animState.opacity : polygon.opacity;

              // Calculate base points in canvas coordinates
              let canvasPoints = polygon.points.map(p => ({
                x: (p.x / 100) * containerRect.width * sx,
                y: (p.y / 100) * containerRect.height * sy,
              }));

              // Apply scale and rotation around center if needed
              if (scale !== 1 || rotation !== 0) {
                // Calculate center of polygon
                const centerX = canvasPoints.reduce((sum, p) => sum + p.x, 0) / canvasPoints.length;
                const centerY = canvasPoints.reduce((sum, p) => sum + p.y, 0) / canvasPoints.length;
                
                const radians = (rotation * Math.PI) / 180;
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);
                
                canvasPoints = canvasPoints.map(p => {
                  // Translate to origin
                  let x = p.x - centerX;
                  let y = p.y - centerY;
                  
                  // Scale
                  x *= scale;
                  y *= scale;
                  
                  // Rotate
                  const rotatedX = x * cos - y * sin;
                  const rotatedY = x * sin + y * cos;
                  
                  // Translate back and apply translation
                  return {
                    x: rotatedX + centerX + translateX * sx,
                    y: rotatedY + centerY + translateY * sy,
                  };
                });
              } else {
                // Just apply translation
                canvasPoints = canvasPoints.map(p => ({
                  x: p.x + translateX * sx,
                  y: p.y + translateY * sy,
                }));
              }

              // Draw fill if enabled (and not affected by train animation)
              if (polygon.fillEnabled && polygon.closed) {
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                canvasPoints.forEach((p, i) => {
                  if (i === 0) ctx.moveTo(p.x, p.y);
                  else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fillStyle = hexToRgba(polygon.color, 1);
                ctx.fill();
              }

              // Draw strokes (dimmed for train animation)
              ctx.globalAlpha = isPolyTrainAnim && (polygon as any).animationEnabled 
                ? (polygon.opacity * 0.3) 
                : opacity;
              
              ctx.beginPath();
              canvasPoints.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              });
              if (polygon.closed) ctx.closePath();

              ctx.strokeStyle = polygon.color;
              ctx.lineWidth = polygon.strokeWidth * sx;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.stroke();

              // Draw train animation if enabled
              if (isPolyTrainAnim && (polygon as any).animationEnabled && polygon.points.length >= 2) {
                const animDuration = (polygon as any).animationDuration * 1000;
                let progress = (elapsedTime % animDuration) / animDuration;
                
                // Get train settings
                const trainSettings = (polygon as any).trainSettings || {
                  trainLength: 0.15,
                  glowIntensity: 0.3,
                  glowSize: 8,
                  trainColor: "inherit",
                };
                const trainColor = trainSettings.trainColor === "inherit" ? polygon.color : trainSettings.trainColor;
                
                // For train-loop, make it go back and forth
                if ((polygon as any).animationType === "anim-train-loop") {
                  progress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
                }

                // Calculate total path length
                let totalLength = 0;
                const pointsToTraverse = [...canvasPoints];
                if (polygon.closed && canvasPoints.length >= 3) {
                  pointsToTraverse.push(canvasPoints[0]);
                }
                
                const segmentLengths: number[] = [];
                for (let i = 0; i < pointsToTraverse.length - 1; i++) {
                  const dx = pointsToTraverse[i + 1].x - pointsToTraverse[i].x;
                  const dy = pointsToTraverse[i + 1].y - pointsToTraverse[i].y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  segmentLengths.push(len);
                  totalLength += len;
                }

                // Get position at progress
                const getPositionAtProgress = (prog: number) => {
                  const targetDist = prog * totalLength;
                  let accDist = 0;
                  for (let i = 0; i < segmentLengths.length; i++) {
                    if (accDist + segmentLengths[i] >= targetDist) {
                      const t = (targetDist - accDist) / segmentLengths[i];
                      return {
                        x: pointsToTraverse[i].x + (pointsToTraverse[i + 1].x - pointsToTraverse[i].x) * t,
                        y: pointsToTraverse[i].y + (pointsToTraverse[i + 1].y - pointsToTraverse[i].y) * t,
                      };
                    }
                    accDist += segmentLengths[i];
                  }
                  return pointsToTraverse[pointsToTraverse.length - 1];
                };

                if ((polygon as any).animationType === "anim-train" || (polygon as any).animationType === "anim-train-loop") {
                  const halfTrain = trainSettings.trainLength / 2;
                  const segStart = Math.max(0, progress - halfTrain);
                  const segEnd = Math.min(1, progress + halfTrain);

                  const trainStart = getPositionAtProgress(segStart);
                  const trainEnd = getPositionAtProgress(segEnd);

                  // Soft glow effect - draw multiple layers to simulate CSS blur
                  if (trainSettings.glowIntensity > 0 && trainSettings.glowSize > 0) {
                    const glowLayers = 4;
                    for (let i = glowLayers; i >= 1; i--) {
                      ctx.save();
                      const layerRatio = i / glowLayers;
                      ctx.globalAlpha = trainSettings.glowIntensity * (1 - layerRatio) * 0.5;
                      ctx.beginPath();
                      ctx.moveTo(trainStart.x, trainStart.y);
                      ctx.lineTo(trainEnd.x, trainEnd.y);
                      ctx.strokeStyle = trainColor;
                      ctx.lineWidth = (polygon.strokeWidth + trainSettings.glowSize * layerRatio * 2) * sx;
                      ctx.lineCap = "round";
                      ctx.filter = `blur(${trainSettings.glowSize * layerRatio * sx}px)`;
                      ctx.stroke();
                      ctx.restore();
                    }
                  }

                  // Bright core (white)
                  ctx.globalAlpha = 0.9;
                  ctx.beginPath();
                  ctx.moveTo(trainStart.x, trainStart.y);
                  ctx.lineTo(trainEnd.x, trainEnd.y);
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = polygon.strokeWidth * sx;
                  ctx.lineCap = "round";
                  ctx.stroke();

                  // Colored overlay
                  ctx.globalAlpha = 1;
                  ctx.beginPath();
                  ctx.moveTo(trainStart.x, trainStart.y);
                  ctx.lineTo(trainEnd.x, trainEnd.y);
                  ctx.strokeStyle = trainColor;
                  ctx.lineWidth = Math.max(1, (polygon.strokeWidth - 1)) * sx;
                  ctx.lineCap = "round";
                  ctx.stroke();
                } else if ((polygon as any).animationType === "anim-dash") {
                  // Marching dash animation
                  ctx.globalAlpha = 0.8;
                  ctx.beginPath();
                  canvasPoints.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                  });
                  if (polygon.closed) ctx.closePath();
                  ctx.strokeStyle = "#ffffff";
                  ctx.lineWidth = polygon.strokeWidth * sx;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.setLineDash([10 * sx, 10 * sx]);
                  ctx.lineDashOffset = -progress * 100 * sx;
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
              }

              ctx.restore();
              break;
            }
          }
        } else if (element.type === "component") {
          const component = element as ComponentElement;

          // Get animation state if enabled
          let animState: AnimationState | null = null;
          if ((component as any).animationEnabled && (component as any).animationType) {
            const animDuration = (component as any).animationDuration * 1000;
            const progress = (elapsedTime % animDuration) / animDuration;
            animState = getAnimationState((component as any).animationType, progress, (component as any).opacity || 1);
          }

          switch (component.componentType) {
            case "image": {
              const img = component as ImageComponent;
              const cachedImage = imageCacheRef.current.get(img.id);
              if (cachedImage && cachedImage.complete) {
                let x = (img.position.x / 100) * containerRect.width * sx;
                let y = (img.position.y / 100) * containerRect.height * sy;
                let w = img.size.width * sx;
                let h = img.size.height * sy;
                let opacity = img.opacity;
                let additionalRotation = 0;

                if (animState) {
                  const centerX = x + w / 2;
                  const centerY = y + h / 2;

                  w *= animState.scale;
                  h *= animState.scale;
                  x = centerX - w / 2;
                  y = centerY - h / 2;

                  x += animState.translateX * sx;
                  y += animState.translateY * sy;

                  opacity = animState.opacity;
                  additionalRotation = animState.rotation;
                }

                ctx.save();
                ctx.globalAlpha = opacity;

                const totalRotation = img.rotation + additionalRotation;
                if (totalRotation) {
                  ctx.translate(x + w / 2, y + h / 2);
                  ctx.rotate((totalRotation * Math.PI) / 180);
                  ctx.translate(-(x + w / 2), -(y + h / 2));
                }

                ctx.drawImage(cachedImage, x, y, w, h);
                ctx.restore();
              }
              break;
            }

            case "drawing": {
              const drawing = component as DrawingComponent;
              if (drawing.path.length < 2) return;

              let x = (drawing.position.x / 100) * containerRect.width * sx;
              let y = (drawing.position.y / 100) * containerRect.height * sy;
              let w = drawing.size.width * sx;
              let h = drawing.size.height * sy;
              let opacity = drawing.opacity;
              let additionalRotation = 0;

              if (animState) {
                const centerX = x + w / 2;
                const centerY = y + h / 2;

                w *= animState.scale;
                h *= animState.scale;
                x = centerX - w / 2;
                y = centerY - h / 2;

                x += animState.translateX * sx;
                y += animState.translateY * sy;

                opacity = animState.opacity;
                additionalRotation = animState.rotation;
              }

              ctx.save();
              ctx.globalAlpha = opacity;

              const totalRotation = drawing.rotation + additionalRotation;
              if (totalRotation) {
                ctx.translate(x + w / 2, y + h / 2);
                ctx.rotate((totalRotation * Math.PI) / 180);
                ctx.translate(-(x + w / 2), -(y + h / 2));
              }

              // Transform path points to canvas coordinates
              const scaleX = w / drawing.size.width;
              const scaleY = h / drawing.size.height;
              const transformedPoints = drawing.path.map((p) => ({
                x: x + p.x * scaleX,
                y: y + p.y * scaleY,
              }));

              if (drawing.drawingMode === "freehand") {
                drawCatmullRomSpline(ctx, transformedPoints, drawing.smoothing * 3);
              } else {
                ctx.beginPath();
                transformedPoints.forEach((p, i) => {
                  if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                  } else {
                    ctx.lineTo(p.x, p.y);
                  }
                });
              }

              ctx.strokeStyle = drawing.color;
              ctx.lineWidth = drawing.strokeWidth * sx;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.stroke();

              ctx.restore();
              break;
            }
          }
        }
      });
    },
    [backgroundImage, getPointPosition]
  );

  // Check if WebCodecs API is available for MP4 encoding
  const isWebCodecsSupported = useCallback(() => {
    return typeof VideoEncoder !== "undefined";
  }, []);

  const startRecording = useCallback(async () => {
    const canvas = getCanvas();
    const [width, height] = getCanvasSize();
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await cacheImages();

    const canvasWrapper = document.getElementById("canvas-wrapper");
    if (!canvasWrapper) return;
    const containerRect = canvasWrapper.getBoundingClientRect();

    const { fps, bitrate, videoFormat } = recordingSettings;
    const useMp4 = videoFormat === "mp4" && isWebCodecsSupported();

    if (useMp4) {
      // Use WebCodecs + mp4-muxer for native MP4 encoding
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: "avc",
          width,
          height,
        },
        fastStart: "in-memory",
      });
      mp4MuxerRef.current = muxer;

      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => console.error("VideoEncoder error:", e),
      });

      // Choose H.264 level based on resolution
      // Level 4.0 (0x28) = up to 2097152 pixels (e.g., 1920x1088)
      // Level 5.1 (0x33) = up to 8912896 pixels (e.g., 4096x2304)
      // Level 5.2 (0x34) = up to 8912896 pixels at higher framerate
      const pixels = width * height;
      let codec = "avc1.640028"; // Level 4.0 - default
      if (pixels > 2097152) {
        codec = "avc1.640033"; // Level 5.1 - for larger resolutions
      }
      if (pixels > 8912896) {
        codec = "avc1.640034"; // Level 5.2 - for very large resolutions
      }

      await encoder.configure({
        codec,
        width,
        height,
        bitrate: bitrate * 1000000,
        framerate: fps,
      });

      videoEncoderRef.current = encoder;
      frameCountRef.current = 0;
      
      // Create a separate canvas for MP4 frames
      const mp4Canvas = document.createElement("canvas");
      mp4Canvas.width = width;
      mp4Canvas.height = height;
      const mp4Ctx = mp4Canvas.getContext("2d");
      if (mp4Ctx) {
        mp4FramesRef.current = { canvas: mp4Canvas, ctx: mp4Ctx };
      }

      setIsRecording(true);
      recordingStartTimeRef.current = performance.now();

      const frameInterval = 1000 / fps;
      let lastFrameTime = performance.now();

      const encodeFrame = () => {
        if (!videoEncoderRef.current || videoEncoderRef.current.state !== "configured") {
          return;
        }

        const now = performance.now();
        if (now - lastFrameTime >= frameInterval) {
          renderFrame(ctx, canvas, containerRect);
          
          const frame = new VideoFrame(canvas, {
            timestamp: frameCountRef.current * (1000000 / fps), // microseconds
          });
          
          videoEncoderRef.current.encode(frame, { keyFrame: frameCountRef.current % 30 === 0 });
          frame.close();
          
          frameCountRef.current++;
          lastFrameTime = now;
        }

        animationFrameRef.current = requestAnimationFrame(encodeFrame);
      };

      encodeFrame();
    } else {
      // Fall back to MediaRecorder for WebM
      chunksRef.current = [];
      setIsRecording(true);
      recordingStartTimeRef.current = performance.now();

      const stream = canvas.captureStream(fps);

      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      }

      recordingInfoRef.current = { mimeType, extension: "webm" };

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: bitrate * 1000000,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `plan-asset-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start(100);

      const animate = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
          return;
        }
        renderFrame(ctx, canvas, containerRect);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    }
  }, [getCanvas, getCanvasSize, recordingSettings, renderFrame, setIsRecording, cacheImages, isWebCodecsSupported]);

  const stopRecording = useCallback(async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const { videoFormat } = recordingSettings;
    const useMp4 = videoFormat === "mp4" && isWebCodecsSupported();

    if (useMp4 && videoEncoderRef.current && mp4MuxerRef.current) {
      setIsConverting(true);
      setConversionProgress(50);

      try {
        await videoEncoderRef.current.flush();
        videoEncoderRef.current.close();
        
        mp4MuxerRef.current.finalize();
        const buffer = mp4MuxerRef.current.target.buffer;
        
        setConversionProgress(100);

        const blob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `plan-asset-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("MP4 finalization error:", e);
      } finally {
        setIsConverting(false);
        setConversionProgress(0);
        videoEncoderRef.current = null;
        mp4MuxerRef.current = null;
        mp4FramesRef.current = null;
      }

      setIsRecording(false);
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData();
      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
      }, 50);
    } else {
      setIsRecording(false);
    }
  }, [setIsRecording, recordingSettings, isWebCodecsSupported]);

  const recordAutoLoop = useCallback(
    async (durationMs: number) => {
      await startRecording();
      setTimeout(() => {
        stopRecording();
      }, durationMs + 100);
    },
    [startRecording, stopRecording]
  );

  const downloadPng = useCallback(async () => {
    const canvasWrapper = document.getElementById("canvas-wrapper");
    if (!canvasWrapper) return;

    const html2canvas = (await import("html2canvas")).default;

    document.body.classList.add("taking-screenshot");
    const canvas = await html2canvas(canvasWrapper, {
      backgroundColor: "#1e293b",
      scale: 2,
    });
    const a = document.createElement("a");
    a.download = "plan.png";
    a.href = canvas.toDataURL();
    a.click();
    document.body.classList.remove("taking-screenshot");
  }, []);

  return {
    isRecording,
    isConverting,
    conversionProgress,
    startRecording,
    stopRecording,
    recordAutoLoop,
    downloadPng,
  };
}
