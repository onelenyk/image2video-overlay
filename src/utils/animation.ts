import type { AnimationType } from "../types";

// Animation state values for a given progress point
export interface AnimationState {
  scale: number;
  opacity: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

// Easing function for smooth animations (matches CSS ease-in-out)
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Get animation state based on animation type and progress.
 * This is the single source of truth for all animations - used by both
 * preview components and recording.
 * 
 * @param animationType - The type of animation
 * @param progress - Animation progress from 0 to 1 (within single cycle)
 * @param baseOpacity - The element's base opacity
 * @returns AnimationState with transform values
 */
export function getAnimationState(
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

  // Define opacity variation range relative to baseOpacity
  // Animations will vary opacity by ±40% of baseOpacity, clamped to valid range
  const opacityRange = baseOpacity * 0.4;
  const minOpacity = Math.max(0.05, baseOpacity - opacityRange);
  const maxOpacity = Math.min(1, baseOpacity + opacityRange);

  switch (animationType) {
    case "anim-pulse":
      // Pulse: scale 1 -> 1.1 -> 1, opacity varies around baseOpacity
      if (progress < 0.5) {
        const t = easeInOut(progress * 2);
        state.scale = 1 + 0.1 * t;
        state.opacity = baseOpacity + (maxOpacity - baseOpacity) * t;
      } else {
        const t = easeInOut((progress - 0.5) * 2);
        state.scale = 1.1 - 0.1 * t;
        state.opacity = maxOpacity - (maxOpacity - baseOpacity) * t;
      }
      break;

    case "anim-bounce":
      // Bounce: translate Y 0 -> -15px -> 0 (no opacity change)
      if (progress < 0.5) {
        state.translateY = -15 * easeInOut(progress * 2);
      } else {
        state.translateY = -15 * (1 - easeInOut((progress - 0.5) * 2));
      }
      break;

    case "anim-fade":
      // Fade: opacity varies between minOpacity and maxOpacity
      if (progress < 0.5) {
        state.opacity = minOpacity + (maxOpacity - minOpacity) * (progress * 2);
      } else {
        state.opacity = maxOpacity - (maxOpacity - minOpacity) * ((progress - 0.5) * 2);
      }
      break;

    case "anim-shake":
      // Shake: rapid horizontal movement (3 cycles per duration, no opacity change)
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
      // Flash: opacity varies between minOpacity and maxOpacity (2 cycles per duration)
      const flashProgress = (progress * 2) % 1;
      if (flashProgress < 0.5) {
        state.opacity = maxOpacity - (maxOpacity - minOpacity) * (flashProgress * 2);
      } else {
        state.opacity = minOpacity + (maxOpacity - minOpacity) * ((flashProgress - 0.5) * 2);
      }
      break;

    case "anim-spin":
      // Spin: rotate 0 -> 360 degrees
      state.rotation = 360 * progress;
      break;

    case "anim-zoom":
      // Zoom: scale 0.9 -> 1.2 -> 0.9
      if (progress < 0.5) {
        state.scale = 0.9 + 0.3 * easeInOut(progress * 2);
      } else {
        state.scale = 1.2 - 0.3 * easeInOut((progress - 0.5) * 2);
      }
      break;

    case "anim-float":
      // Float: gentle floating movement in an arc
      if (progress < 0.33) {
        const t = easeInOut(progress / 0.33);
        state.translateX = 5 * t;
        state.translateY = -10 * t;
      } else if (progress < 0.66) {
        const t = easeInOut((progress - 0.33) / 0.33);
        state.translateX = 5 - 10 * t;
        state.translateY = -10 + 15 * t;
      } else {
        const t = easeInOut((progress - 0.66) / 0.34);
        state.translateX = -5 + 5 * t;
        state.translateY = 5 - 5 * t;
      }
      break;

    // Line-specific animations don't use AnimationState transforms
    case "anim-train":
    case "anim-train-loop":
    case "anim-dash":
      // These are handled separately in line/polygon rendering
      break;
  }

  return state;
}

/**
 * Check if animation type is a line-specific animation (train, dash).
 * These animations animate along a path rather than transforming the element.
 */
export function isLineAnimation(animType: AnimationType): boolean {
  return animType === "anim-train" || animType === "anim-train-loop" || animType === "anim-dash";
}

/**
 * Hook-friendly animation state calculator.
 * Returns inline styles that can be applied to elements.
 */
export function getAnimationStyles(
  animationType: AnimationType,
  progress: number,
  baseOpacity: number,
  baseRotation: number = 0
): React.CSSProperties {
  const state = getAnimationState(animationType, progress, baseOpacity);
  
  const transforms: string[] = [];
  
  if (state.translateX !== 0 || state.translateY !== 0) {
    transforms.push(`translate(${state.translateX}px, ${state.translateY}px)`);
  }
  
  if (state.scale !== 1) {
    transforms.push(`scale(${state.scale})`);
  }
  
  const totalRotation = baseRotation + state.rotation;
  if (totalRotation !== 0) {
    transforms.push(`rotate(${totalRotation}deg)`);
  }
  
  return {
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    opacity: state.opacity,
  };
}
