import { useState, useEffect, useRef, useCallback } from "react";
import type { AnimationType } from "../types";
import { getAnimationState, isLineAnimation, type AnimationState } from "../utils/animation";

interface UseAnimationOptions {
  animationType: AnimationType;
  animationDuration: number;
  animationPreview: boolean;
  baseOpacity: number;
}

interface UseAnimationResult {
  animState: AnimationState | null;
  progress: number;
}

/**
 * Hook for managing element animations.
 * Provides animation state based on progress, synchronized with requestAnimationFrame.
 */
export function useAnimation({
  animationType,
  animationDuration,
  animationPreview,
  baseOpacity,
}: UseAnimationOptions): UseAnimationResult {
  const [progress, setProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // Don't run animation if preview is disabled
    if (!animationPreview) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setProgress(0);
      return;
    }

    const duration = animationDuration * 1000; // Convert to ms
    animationStartTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartTimeRef.current;
      const newProgress = (elapsed % duration) / duration;
      setProgress(newProgress);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationPreview, animationDuration]);

  // Calculate animation state (only for non-line animations)
  const animState = animationPreview && !isLineAnimation(animationType)
    ? getAnimationState(animationType, progress, baseOpacity)
    : null;

  return { animState, progress };
}

/**
 * Hook specifically for line/polygon train animations.
 * Returns progress value for train position along path.
 */
export function useTrainAnimation({
  animationType,
  animationDuration,
  animationPreview,
}: {
  animationType: AnimationType;
  animationDuration: number;
  animationPreview: boolean;
}): number {
  const [progress, setProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const isTrainAnim = animationPreview && isLineAnimation(animationType);
    
    if (!isTrainAnim) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setProgress(0);
      return;
    }

    const duration = animationDuration * 1000;
    animationStartTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartTimeRef.current;
      let newProgress = (elapsed % duration) / duration;
      
      // For train-loop, make it go back and forth
      if (animationType === "anim-train-loop") {
        newProgress = newProgress < 0.5 ? newProgress * 2 : 2 - newProgress * 2;
      }
      
      setProgress(newProgress);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationPreview, animationType, animationDuration]);

  return progress;
}

/**
 * Get inline styles for animated elements.
 * Converts AnimationState to React CSSProperties.
 */
export function getAnimationStyles(
  animState: AnimationState | null,
  baseRotation: number = 0
): React.CSSProperties {
  if (!animState) {
    return {
      transform: baseRotation !== 0 ? `rotate(${baseRotation}deg)` : undefined,
    };
  }

  const transforms: string[] = [];
  
  if (animState.translateX !== 0 || animState.translateY !== 0) {
    transforms.push(`translate(${animState.translateX}px, ${animState.translateY}px)`);
  }
  
  if (animState.scale !== 1) {
    transforms.push(`scale(${animState.scale})`);
  }
  
  const totalRotation = baseRotation + animState.rotation;
  if (totalRotation !== 0) {
    transforms.push(`rotate(${totalRotation}deg)`);
  }
  
  return {
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    opacity: animState.opacity,
  };
}
