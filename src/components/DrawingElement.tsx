import { useRef, useCallback, useMemo } from "react";
import type { DrawingComponent, Position } from "../types";
import { useStore } from "../store/useStore";
import { useAnimation, getAnimationStyles } from "../hooks/useAnimation";

interface DrawingElementProps {
  element: DrawingComponent;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DrawingElement({ element, containerRef }: DrawingElementProps) {
  const { activeElementId, setActiveElement, updateElement, editorMode } = useStore();
  const elementRef = useRef<SVGSVGElement>(null);
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
    startX: 0,
    startY: 0,
    initialPath: [] as Position[],
  });

  const getCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }, []);

  // Convert stored path back to absolute coordinates
  const absolutePath = useMemo(() => {
    return element.path.map(p => ({
      x: p.x + element.position.x,
      y: p.y + element.position.y,
    }));
  }, [element.path, element.position]);

  // Generate line segments for rendering
  const lineSegments = useMemo(() => {
    if (absolutePath.length < 2) return [];
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < absolutePath.length - 1; i++) {
      segments.push({
        x1: absolutePath[i].x,
        y1: absolutePath[i].y,
        x2: absolutePath[i + 1].x,
        y2: absolutePath[i + 1].y,
      });
    }
    return segments;
  }, [absolutePath]);

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
      dragState.current.initialPath = element.path.map(p => ({ ...p }));

      const initialPosition = { ...element.position };

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        moveEvent.preventDefault();

        const moveCoords = getCoords(moveEvent);
        const containerRect = container.getBoundingClientRect();

        const deltaX = ((moveCoords.x - dragState.current.startX) / containerRect.width) * 100;
        const deltaY = ((moveCoords.y - dragState.current.startY) / containerRect.height) * 100;

        const newX = Math.max(0, Math.min(100, initialPosition.x + deltaX));
        const newY = Math.max(0, Math.min(100, initialPosition.y + deltaY));

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
    [element.id, element.path, element.position, setActiveElement, updateElement, containerRef, getCoords, editorMode]
  );

  // Get animation styles
  const animStyles = getAnimationStyles(animState, element.rotation);
  const currentOpacity = animState?.opacity ?? element.opacity;

  if (absolutePath.length === 0) return null;

  return (
    <svg
      ref={elementRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: element.zIndex,
        ...animStyles,
      }}
    >
      {/* Draw line segments */}
      {lineSegments.map((seg, index) => (
        <line
          key={`line-${index}`}
          x1={`${seg.x1}%`}
          y1={`${seg.y1}%`}
          x2={`${seg.x2}%`}
          y2={`${seg.y2}%`}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          strokeOpacity={currentOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-auto cursor-move"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        />
      ))}

      {/* Selection highlight */}
      {isActive && lineSegments.map((seg, index) => (
        <line
          key={`highlight-${index}`}
          x1={`${seg.x1}%`}
          y1={`${seg.y1}%`}
          x2={`${seg.x2}%`}
          y2={`${seg.y2}%`}
          stroke="white"
          strokeWidth={element.strokeWidth + 4}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeDasharray="8,4"
          className="pointer-events-none"
        />
      ))}
    </svg>
  );
}
