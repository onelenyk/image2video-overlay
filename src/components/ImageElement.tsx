import { useRef, useCallback, useMemo } from "react";
import type { ImageComponent } from "../types";
import { useStore } from "../store/useStore";
import { hexToRgba } from "../utils/color";
import { prepareSvgForDisplay } from "../utils/svg";
import { useAnimation, getAnimationStyles } from "../hooks/useAnimation";

interface ImageElementProps {
  element: ImageComponent;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ImageElement({ element, containerRef }: ImageElementProps) {
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (editorMode !== "select") return;

      e.preventDefault();
      e.stopPropagation();
      setActiveElement(element.id);

      const el = elementRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      const target = e.target as HTMLElement;
      const handle = el.querySelector(".resize-handle");
      const coords =
        "touches" in e
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };

      if (handle && (target === handle || handle.contains(target))) {
        dragState.current.isResizing = true;
      } else {
        dragState.current.isDragging = true;
      }

      const state = useStore.getState();
      const currentElement = state.elements.find((el) => el.id === element.id) as ImageComponent;
      if (!currentElement) return;

      dragState.current.startX = coords.x;
      dragState.current.startY = coords.y;
      dragState.current.startLeft = currentElement.position.x;
      dragState.current.startTop = currentElement.position.y;
      dragState.current.startWidth = currentElement.size.width;
      dragState.current.startHeight = currentElement.size.height;

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const moveCoords = getCoords(moveEvent);
        const containerRect = container.getBoundingClientRect();

        if (dragState.current.isDragging) {
          const deltaX = moveCoords.x - dragState.current.startX;
          const deltaY = moveCoords.y - dragState.current.startY;
          const newX = dragState.current.startLeft + (deltaX / containerRect.width) * 100;
          const newY = dragState.current.startTop + (deltaY / containerRect.height) * 100;

          updateElement(element.id, {
            position: { x: newX, y: newY },
          });
        } else if (dragState.current.isResizing) {
          const deltaX = moveCoords.x - dragState.current.startX;
          const deltaY = moveCoords.y - dragState.current.startY;
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
    },
    [element.id, setActiveElement, updateElement, containerRef, getCoords, editorMode]
  );

  // Get animation styles
  const animStyles = getAnimationStyles(animState, element.rotation);
  const currentOpacity = animState?.opacity ?? element.opacity;
  const color = hexToRgba(element.color, currentOpacity);

  // Prepare content based on format
  const content = useMemo(() => {
    if (element.format === "svg") {
      return prepareSvgForDisplay(element.content);
    }
    return null;
  }, [element.content, element.format]);

  return (
    <div
      ref={elementRef}
      className={`draggable arrow-instance ${isActive ? "active" : ""}`}
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        width: element.size.width,
        height: element.size.height,
        color: color,
        zIndex: element.zIndex,
        ...animStyles,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {element.format === "svg" ? (
        <div
          className="w-full h-full"
          style={{ color }}
          dangerouslySetInnerHTML={{ __html: content || "" }}
        />
      ) : (
        <img
          src={element.content}
          alt=""
          className="w-full h-full object-contain pointer-events-none"
          style={{ opacity: currentOpacity }}
          draggable={false}
        />
      )}

      {/* Resize handle */}
      {isActive && (
        <div className="resize-handle absolute w-4 h-4 bg-white border-2 border-black rounded-full -bottom-2 -right-2 cursor-nwse-resize z-10" />
      )}
    </div>
  );
}
