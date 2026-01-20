import { useRef, useCallback } from "react";
import type { PointOverlay } from "../types";
import { useStore } from "../store/useStore";

interface PointElementProps {
  element: PointOverlay;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PointElement({ element, containerRef }: PointElementProps) {
  const { activeElementId, setActiveElement, updateElement, editorMode } = useStore();
  const elementRef = useRef<HTMLDivElement>(null);
  const isActive = activeElementId === element.id;

  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
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

      const container = containerRef.current;
      if (!container) return;

      const coords =
        "touches" in e
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };

      dragState.current.isDragging = true;
      dragState.current.startX = coords.x;
      dragState.current.startY = coords.y;

      const state = useStore.getState();
      const currentElement = state.elements.find((el) => el.id === element.id) as PointOverlay;
      if (!currentElement) return;

      dragState.current.startLeft = currentElement.position.x;
      dragState.current.startTop = currentElement.position.y;

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        moveEvent.preventDefault();

        const moveCoords = getCoords(moveEvent);
        const containerRect = container.getBoundingClientRect();

        const deltaX = ((moveCoords.x - dragState.current.startX) / containerRect.width) * 100;
        const deltaY = ((moveCoords.y - dragState.current.startY) / containerRect.height) * 100;

        const newX = Math.max(0, Math.min(100, dragState.current.startLeft + deltaX));
        const newY = Math.max(0, Math.min(100, dragState.current.startTop + deltaY));

        updateElement(element.id, { position: { x: newX, y: newY } });
      };

      const handleEnd = () => {
        dragState.current.isDragging = false;
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

  const animClass = element.animationPreview ? element.animationType : "";

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move touch-none ${isActive ? "ring-2 ring-white ring-offset-1 ring-offset-transparent" : ""} ${animClass}`}
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: element.zIndex,
        ["--anim-duration" as string]: `${element.animationDuration}s`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Point circle */}
      <div
        className="rounded-full border-2 border-white shadow-lg"
        style={{
          width: element.radius * 2,
          height: element.radius * 2,
          backgroundColor: element.color,
          opacity: element.opacity,
        }}
      />
      
      {/* Label */}
      {element.showLabel && element.label && (
        <span
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold select-none pointer-events-none"
          style={{
            top: element.radius * 2 + 4,
            color: element.labelColor,
            fontSize: element.fontSize,
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
}
