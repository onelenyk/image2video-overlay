import { useRef, useCallback, useState } from "react";
import { useStore } from "../store/useStore";
import { ARROW_PATHS } from "../types";
import type { OverlayElement, ArrowElement, SvgElement, AnimationType } from "../types";
import { hexToRgba } from "../utils/color";
import { replaceCurrentColorInSvgXml } from "../utils/svg";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

// Animation functions that return transform values based on progress (0-1)
interface AnimationState {
  scale: number;
  opacity: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

function getAnimationState(
  animationType: AnimationType,
  progress: number,
  baseOpacity: number
): AnimationState {
  const state: AnimationState = {
    scale: 1,
    opacity: baseOpacity,
    translateX: 0,
    translateY: 0,
    rotation: 0,
  };

  // Easing function for smooth animations
  const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  switch (animationType) {
    case "anim-pulse":
      if (progress < 0.5) {
        const t = progress * 2;
        state.scale = 1 + 0.1 * easeInOut(t);
        state.opacity = baseOpacity + (0.8 - baseOpacity) * easeInOut(t);
      } else {
        const t = (progress - 0.5) * 2;
        state.scale = 1.1 - 0.1 * easeInOut(t);
        state.opacity = 0.8 - (0.8 - baseOpacity) * easeInOut(t);
      }
      break;

    case "anim-bounce":
      if (progress < 0.5) {
        state.translateY = -15 * easeInOut(progress * 2);
      } else {
        state.translateY = -15 * (1 - easeInOut((progress - 0.5) * 2));
      }
      break;

    case "anim-fade":
      state.opacity = 0.1 + 0.8 * progress;
      break;

    case "anim-shake":
      const shakeProgress = (progress * 3) % 1;
      if (shakeProgress < 0.25) {
        state.translateX = -5 * (shakeProgress / 0.25);
      } else if (shakeProgress < 0.5) {
        state.translateX = -5 + 10 * ((shakeProgress - 0.25) / 0.25);
      } else if (shakeProgress < 0.75) {
        state.translateX = 5 - 10 * ((shakeProgress - 0.5) / 0.25);
      } else {
        state.translateX = -5 + 5 * ((shakeProgress - 0.75) / 0.25);
      }
      break;

    case "anim-flash":
      const flashProgress = (progress * 2) % 1;
      if (flashProgress < 0.5) {
        state.opacity = 0.8 - 0.7 * (flashProgress * 2);
      } else {
        state.opacity = 0.1 + 0.7 * ((flashProgress - 0.5) * 2);
      }
      break;

    case "anim-spin":
      state.rotation = 360 * progress;
      break;

    case "anim-zoom":
      if (progress < 0.5) {
        state.scale = 0.9 + 0.3 * easeInOut(progress * 2);
      } else {
        state.scale = 1.2 - 0.3 * easeInOut((progress - 0.5) * 2);
      }
      break;

    case "anim-float":
      if (progress < 0.33) {
        const t = progress / 0.33;
        state.translateX = 5 * easeInOut(t);
        state.translateY = -10 * easeInOut(t);
      } else if (progress < 0.66) {
        const t = (progress - 0.33) / 0.33;
        state.translateX = 5 - 10 * easeInOut(t);
        state.translateY = -10 + 15 * easeInOut(t);
      } else {
        const t = (progress - 0.66) / 0.34;
        state.translateX = -5 + 5 * easeInOut(t);
        state.translateY = 5 - 5 * easeInOut(t);
      }
      break;
  }

  return state;
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
  const svgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
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

  const cacheSvgImages = useCallback(async () => {
    const elements = useStore.getState().elements;
    const svgElements = elements.filter((el): el is SvgElement => el.type === "svg");

    for (const svg of svgElements) {
      if (!svgImageCacheRef.current.has(svg.id)) {
        try {
          const color = hexToRgba(svg.color, svg.opacity);
          let svgData = svg.svgContent;
          svgData = replaceCurrentColorInSvgXml(svgData, color);

          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });

          svgImageCacheRef.current.set(svg.id, img);
        } catch (e) {
          console.error("Failed to cache SVG:", e);
        }
      }
    }
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
          if (overlay.isHidden) return;

          let x = (overlay.position.x / 100) * containerRect.width * sx;
          let y = (overlay.position.y / 100) * containerRect.height * sy;
          let w = overlay.size.width * sx;
          let h = overlay.size.height * sy;
          let opacity = overlay.opacity;
          let additionalRotation = 0;

          if (overlay.animationEnabled && overlay.animationType) {
            const animDuration = overlay.animationDuration * 1000;
            const progress = (elapsedTime % animDuration) / animDuration;
            const animState = getAnimationState(overlay.animationType, progress, overlay.opacity);

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

          const totalRotation = overlay.rotation + additionalRotation;
          if (totalRotation) {
            ctx.translate(x + w / 2, y + h / 2);
            ctx.rotate((totalRotation * Math.PI) / 180);
            ctx.translate(-(x + w / 2), -(y + h / 2));
          }

          const bgColor = hexToRgba(overlay.color, 1);
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, w, h);

          if (overlay.borderWidth > 0) {
            ctx.strokeStyle = overlay.color;
            ctx.lineWidth = overlay.borderWidth * sx;
            ctx.strokeRect(x, y, w, h);
          }

          if (overlay.showLabel && overlay.label) {
            ctx.fillStyle = overlay.labelColor;
            ctx.font = `bold ${overlay.fontSize * sy}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(overlay.label, x + w / 2, y + h / 2);
          }

          ctx.restore();
        } else if (element.type === "arrow") {
          const arrow = element as ArrowElement;
          const x = (arrow.position.x / 100) * containerRect.width * sx;
          const y = (arrow.position.y / 100) * containerRect.height * sy;
          const w = arrow.size.width * sx;
          const h = arrow.size.height * sy;

          ctx.save();
          ctx.globalAlpha = arrow.opacity;

          if (arrow.rotation) {
            ctx.translate(x + w / 2, y + h / 2);
            ctx.rotate((arrow.rotation * Math.PI) / 180);
            ctx.translate(-(x + w / 2), -(y + h / 2));
          }

          ctx.fillStyle = arrow.color;
          const pathStr = ARROW_PATHS[arrow.arrowType];
          const path = new Path2D(pathStr);
          ctx.translate(x, y);
          ctx.scale(w / 24, h / 24);
          ctx.fill(path);

          ctx.restore();
        } else if (element.type === "svg") {
          const svg = element as SvgElement;
          const cachedImage = svgImageCacheRef.current.get(svg.id);
          if (cachedImage && cachedImage.complete) {
            const x = (svg.position.x / 100) * containerRect.width * sx;
            const y = (svg.position.y / 100) * containerRect.height * sy;
            const w = svg.size.width * sx;
            const h = svg.size.height * sy;

            ctx.save();
            ctx.globalAlpha = svg.opacity;

            if (svg.rotation) {
              ctx.translate(x + w / 2, y + h / 2);
              ctx.rotate((svg.rotation * Math.PI) / 180);
              ctx.translate(-(x + w / 2), -(y + h / 2));
            }

            ctx.drawImage(cachedImage, x, y, w, h);
            ctx.restore();
          }
        }
      });
    },
    [backgroundImage]
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

    await cacheSvgImages();

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
  }, [getCanvas, getCanvasSize, recordingSettings, renderFrame, setIsRecording, cacheSvgImages, isWebCodecsSupported]);

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
