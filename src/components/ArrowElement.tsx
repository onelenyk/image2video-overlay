import { useRef, useCallback } from "react";
import type { ArrowElement as ArrowElementType } from "../types";
import { ARROW_PATHS } from "../types";
import { useStore } from "../store/useStore";
import { hexToRgba } from "../utils/color";

interface ArrowElementProps {
  element: ArrowElementType;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ArrowElement({ element, containerRef }: ArrowElementProps) {
  const { activeElementId, setActiveElement, updateElement } = useStore();
  const elementRef = useRef<HTMLDivElement>(null);
  const isActive = activeElementId === element.id;

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

    const state = useStore.getState();
    const currentElement = state.elements.find(el => el.id === element.id);
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
  }, [element.id, setActiveElement, updateElement, containerRef, getCoords]);

  const color = hexToRgba(element.color, element.opacity);

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
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-lg">
        <path d={ARROW_PATHS[element.arrowType]} />
      </svg>
      <div className="resize-handle" />
    </div>
  );
}
