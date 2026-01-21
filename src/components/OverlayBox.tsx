import { useRef, useCallback } from "react";
import type { RectangleOverlay } from "../types";
import { useStore } from "../store/useStore";
import { hexToRgba } from "../utils/color";
import { useAnimation, getAnimationStyles } from "../hooks/useAnimation";

interface OverlayBoxProps {
  element: RectangleOverlay;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function OverlayBox({ element, containerRef }: OverlayBoxProps) {
  const { activeElementId, setActiveElement, updateElement, editorMode } = useStore();
  const elementRef = useRef<HTMLDivElement>(null);
  const isActive = activeElementId === element.id;

  // Use JS-based animation instead of CSS
  const { animState } = useAnimation({
    animationType: element.animationType,
    animationDuration: element.animationDuration,
    animationPreview: element.animationPreview,
    baseOpacity: element.opacity,
  });

  // Drag state - use refs to avoid re-renders during drag
  const dragState = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const getCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (editorMode !== "select") return;
    
    e.preventDefault();
    e.stopPropagation();
    setActiveElement(element.id);

    const el = elementRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const target = e.target as HTMLElement;
    const handle = el.querySelector(".resize-handle");
    const coords = "touches" in e 
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

    if (handle && (target === handle || handle.contains(target))) {
      dragState.current.isResizing = true;
    } else {
      dragState.current.isDragging = true;
    }

    // Get current values from the store
    const state = useStore.getState();
    const currentElement = state.elements.find(el => el.id === element.id) as RectangleOverlay | undefined;
    if (!currentElement) return;

    dragState.current.startX = coords.x;
    dragState.current.startY = coords.y;
    dragState.current.startLeft = currentElement.position.x;
    dragState.current.startTop = currentElement.position.y;
    dragState.current.startWidth = currentElement.size.width;
    dragState.current.startHeight = currentElement.size.height;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const coords = getCoords(e);
      const containerRect = container.getBoundingClientRect();

      if (dragState.current.isDragging) {
        const deltaX = coords.x - dragState.current.startX;
        const deltaY = coords.y - dragState.current.startY;
        const newX = dragState.current.startLeft + (deltaX / containerRect.width) * 100;
        const newY = dragState.current.startTop + (deltaY / containerRect.height) * 100;

        updateElement(element.id, {
          position: { x: newX, y: newY },
        });
      } else if (dragState.current.isResizing) {
        const deltaX = coords.x - dragState.current.startX;
        const deltaY = coords.y - dragState.current.startY;
        const newWidth = Math.max(20, dragState.current.startWidth + deltaX);
        const newHeight = Math.max(20, dragState.current.startHeight + deltaY);

        updateElement(element.id, {
          size: { width: newWidth, height: newHeight },
        });
      }
    };

    const handleEnd = () => {
      dragState.current.isDragging = false;
      dragState.current.isResizing = false;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
  }, [element.id, setActiveElement, updateElement, containerRef, getCoords, editorMode]);

  // Get animation styles (transform and opacity)
  const animStyles = getAnimationStyles(animState, element.rotation);
  const bgColor = hexToRgba(element.color, animState?.opacity ?? element.opacity);

  return (
    <div
      ref={elementRef}
      className={`overlay-box draggable ${isActive ? "active" : ""} ${
        element.isHidden ? "hidden-box" : ""
      }`}
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: element.size.width,
        height: element.size.height,
        backgroundColor: bgColor,
        borderColor: element.color,
        borderWidth: element.borderWidth,
        zIndex: element.zIndex,
        ...animStyles,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {element.showLabel && (
        <span
          className="overlay-label text-white font-bold select-none pointer-events-none text-center"
          style={{
            color: element.labelColor,
            fontSize: element.fontSize,
          }}
        >
          {element.label}
        </span>
      )}
      <div className="resize-handle" />
    </div>
  );
}
