import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import type { LineOverlay, Position, LineEndpoint, AnimationType } from "../types";
import { isConnectionRef } from "../types";
import { useStore } from "../store/useStore";
import { resolveEndpoint, findNearestSnapPoint } from "../utils/connections";
import type { ConnectablePoint } from "../utils/connections";

interface LineElementProps {
  element: LineOverlay;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const SNAP_DISTANCE = 4; // percentage units

// Check if animation type is a line-specific animation
function isLineAnimation(animType: AnimationType): boolean {
  return animType === "anim-train" || animType === "anim-train-loop" || animType === "anim-dash";
}

export function LineElement({ element, containerRef }: LineElementProps) {
  const { activeElementId, setActiveElement, updateElement, connectLineEndpoint, disconnectLineEndpoint, elements, editorMode } = useStore();
  const elementRef = useRef<SVGSVGElement>(null);
  const isActive = activeElementId === element.id;
  
  // State for snap preview
  const [snapPreview, setSnapPreview] = useState<{ endpoint: "start" | "end"; target: ConnectablePoint } | null>(null);
  
  // State for train animation progress (0 to 1)
  const [trainProgress, setTrainProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);

  const dragState = useRef({
    isDragging: false,
    dragTarget: null as "line" | "start" | "end" | null,
    startX: 0,
    startY: 0,
    initialStart: { x: 0, y: 0 } as Position,
    initialEnd: { x: 0, y: 0 } as Position,
    pendingSnap: null as ConnectablePoint | null,
  });

  // Check if an endpoint is connected (not a free position)
  const isConnected = useCallback((endpoint: LineEndpoint): boolean => {
    return isConnectionRef(endpoint);
  }, []);

  // Resolve endpoints to positions using the connection system
  const startPos = useMemo(() => 
    resolveEndpoint(element.startPoint, elements) ?? { x: 50, y: 50 },
    [element.startPoint, elements]
  );
  const endPos = useMemo(() => 
    resolveEndpoint(element.endPoint, elements) ?? { x: 50, y: 50 },
    [element.endPoint, elements]
  );

  // Train animation effect
  useEffect(() => {
    const isTrainAnim = element.animationPreview && isLineAnimation(element.animationType);
    
    if (!isTrainAnim) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setTrainProgress(0);
      return;
    }

    const duration = element.animationDuration * 1000; // Convert to ms
    animationStartTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartTimeRef.current;
      let progress = (elapsed % duration) / duration;
      
      // For train-loop, make it go back and forth
      if (element.animationType === "anim-train-loop") {
        progress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
      }
      
      setTrainProgress(progress);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [element.animationPreview, element.animationType, element.animationDuration]);

  const getCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }, []);

  // Double-click to disconnect an endpoint
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, endpoint: "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();
      
      const endpointValue = endpoint === "start" ? element.startPoint : element.endPoint;
      if (isConnected(endpointValue)) {
        // Disconnect and keep the current resolved position
        const currentPos = endpoint === "start" ? startPos : endPos;
        disconnectLineEndpoint(element.id, endpoint, currentPos);
      }
    },
    [element, startPos, endPos, disconnectLineEndpoint, isConnected]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, target: "line" | "start" | "end") => {
      if (editorMode !== "select") return;
      
      e.preventDefault();
      e.stopPropagation();
      setActiveElement(element.id);

      // Only allow dragging endpoints if they're not connected
      if (target === "start" && isConnected(element.startPoint)) return;
      if (target === "end" && isConnected(element.endPoint)) return;

      const container = containerRef.current;
      if (!container) return;

      const coords =
        "touches" in e
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : { x: e.clientX, y: e.clientY };

      dragState.current.isDragging = true;
      dragState.current.dragTarget = target;
      dragState.current.startX = coords.x;
      dragState.current.startY = coords.y;
      dragState.current.initialStart = { ...startPos };
      dragState.current.initialEnd = { ...endPos };

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        moveEvent.preventDefault();

        const moveCoords = getCoords(moveEvent);
        const containerRect = container.getBoundingClientRect();

        const deltaX = ((moveCoords.x - dragState.current.startX) / containerRect.width) * 100;
        const deltaY = ((moveCoords.y - dragState.current.startY) / containerRect.height) * 100;

        if (dragState.current.dragTarget === "line") {
          // Move entire line (only non-connected endpoints)
          if (!isConnected(element.startPoint)) {
            const newStartX = Math.max(0, Math.min(100, dragState.current.initialStart.x + deltaX));
            const newStartY = Math.max(0, Math.min(100, dragState.current.initialStart.y + deltaY));
            updateElement(element.id, { startPoint: { x: newStartX, y: newStartY } });
          }
          if (!isConnected(element.endPoint)) {
            const newEndX = Math.max(0, Math.min(100, dragState.current.initialEnd.x + deltaX));
            const newEndY = Math.max(0, Math.min(100, dragState.current.initialEnd.y + deltaY));
            updateElement(element.id, { endPoint: { x: newEndX, y: newEndY } });
          }
          setSnapPreview(null);
          dragState.current.pendingSnap = null;
        } else if (dragState.current.dragTarget === "start" && !isConnected(element.startPoint)) {
          const newX = Math.max(0, Math.min(100, dragState.current.initialStart.x + deltaX));
          const newY = Math.max(0, Math.min(100, dragState.current.initialStart.y + deltaY));
          updateElement(element.id, { startPoint: { x: newX, y: newY } });
          
          // Check for snap target
          const snapTarget = findNearestSnapPoint({ x: newX, y: newY }, elements, SNAP_DISTANCE, element.id);
          if (snapTarget) {
            setSnapPreview({ endpoint: "start", target: snapTarget });
            dragState.current.pendingSnap = snapTarget;
          } else {
            setSnapPreview(null);
            dragState.current.pendingSnap = null;
          }
        } else if (dragState.current.dragTarget === "end" && !isConnected(element.endPoint)) {
          const newX = Math.max(0, Math.min(100, dragState.current.initialEnd.x + deltaX));
          const newY = Math.max(0, Math.min(100, dragState.current.initialEnd.y + deltaY));
          updateElement(element.id, { endPoint: { x: newX, y: newY } });
          
          // Check for snap target
          const snapTarget = findNearestSnapPoint({ x: newX, y: newY }, elements, SNAP_DISTANCE, element.id);
          if (snapTarget) {
            setSnapPreview({ endpoint: "end", target: snapTarget });
            dragState.current.pendingSnap = snapTarget;
          } else {
            setSnapPreview(null);
            dragState.current.pendingSnap = null;
          }
        }
      };

      const handleEnd = () => {
        // Apply snap connection if pending
        const pendingSnap = dragState.current.pendingSnap;
        const dragTarget = dragState.current.dragTarget;
        
        if (pendingSnap && (dragTarget === "start" || dragTarget === "end")) {
          connectLineEndpoint(element.id, dragTarget, pendingSnap.connectionRef);
        }
        
        dragState.current.isDragging = false;
        dragState.current.dragTarget = null;
        dragState.current.pendingSnap = null;
        setSnapPreview(null);
        
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
    [element, setActiveElement, updateElement, connectLineEndpoint, containerRef, getCoords, startPos, endPos, editorMode, isConnected, elements]
  );

  // For non-line animations, apply CSS class; for line animations, don't apply class
  const isLineAnim = isLineAnimation(element.animationType);
  const animClass = element.animationPreview && !isLineAnim ? element.animationType : "";

  // Get train settings (with defaults)
  const trainSettings = element.trainSettings || {
    trainLength: 0.15,
    glowIntensity: 0.3,
    glowSize: 8,
    trainColor: "inherit",
    fadeTrail: false,
  };

  // Calculate the "lit" portion of the line for train effect
  const trainSegment = useMemo(() => {
    if (!isLineAnim || !element.animationPreview) return null;
    
    const halfTrain = trainSettings.trainLength / 2;
    
    // Calculate segment start and end (clamped to 0-1)
    const segStart = Math.max(0, trainProgress - halfTrain);
    const segEnd = Math.min(1, trainProgress + halfTrain);
    
    return {
      start: {
        x: startPos.x + (endPos.x - startPos.x) * segStart,
        y: startPos.y + (endPos.y - startPos.y) * segStart,
      },
      end: {
        x: startPos.x + (endPos.x - startPos.x) * segEnd,
        y: startPos.y + (endPos.y - startPos.y) * segEnd,
      },
    };
  }, [isLineAnim, element.animationPreview, startPos, endPos, trainProgress, trainSettings.trainLength]);

  // Determine train color
  const trainColor = trainSettings.trainColor === "inherit" ? element.color : trainSettings.trainColor;

  return (
    <svg
      ref={elementRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${animClass}`}
      style={{
        zIndex: element.zIndex,
        ["--anim-duration" as string]: `${element.animationDuration}s`,
      }}
    >
      {/* Main line - clickable */}
      <line
        x1={`${startPos.x}%`}
        y1={`${startPos.y}%`}
        x2={`${endPos.x}%`}
        y2={`${endPos.y}%`}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        strokeOpacity={isLineAnim && element.animationPreview ? element.opacity * 0.3 : element.opacity}
        strokeLinecap="round"
        className="pointer-events-auto cursor-move"
        onMouseDown={(e) => handleMouseDown(e, "line")}
        onTouchStart={(e) => handleMouseDown(e, "line")}
      />

      {/* Train animation - highlighted segment traveling along the line */}
      {trainSegment && (element.animationType === "anim-train" || element.animationType === "anim-train-loop") && (
        <>
          {/* Glow effect */}
          {trainSettings.glowIntensity > 0 && trainSettings.glowSize > 0 && (
            <line
              x1={`${trainSegment.start.x}%`}
              y1={`${trainSegment.start.y}%`}
              x2={`${trainSegment.end.x}%`}
              y2={`${trainSegment.end.y}%`}
              stroke={trainColor}
              strokeWidth={element.strokeWidth + trainSettings.glowSize}
              strokeOpacity={trainSettings.glowIntensity}
              strokeLinecap="round"
              className="pointer-events-none"
              style={{ filter: `blur(${Math.round(trainSettings.glowSize / 2)}px)` }}
            />
          )}
          {/* Bright core */}
          <line
            x1={`${trainSegment.start.x}%`}
            y1={`${trainSegment.start.y}%`}
            x2={`${trainSegment.end.x}%`}
            y2={`${trainSegment.end.y}%`}
            stroke="white"
            strokeWidth={element.strokeWidth}
            strokeOpacity={0.9}
            strokeLinecap="round"
            className="pointer-events-none"
          />
          {/* Colored overlay */}
          <line
            x1={`${trainSegment.start.x}%`}
            y1={`${trainSegment.start.y}%`}
            x2={`${trainSegment.end.x}%`}
            y2={`${trainSegment.end.y}%`}
            stroke={trainColor}
            strokeWidth={Math.max(1, element.strokeWidth - 1)}
            strokeOpacity={1}
            strokeLinecap="round"
            className="pointer-events-none"
          />
        </>
      )}

      {/* Dash animation - marching ants effect */}
      {element.animationPreview && element.animationType === "anim-dash" && (
        <line
          x1={`${startPos.x}%`}
          y1={`${startPos.y}%`}
          x2={`${endPos.x}%`}
          y2={`${endPos.y}%`}
          stroke="white"
          strokeWidth={element.strokeWidth}
          strokeOpacity={0.8}
          strokeLinecap="round"
          strokeDasharray="10,10"
          strokeDashoffset={trainProgress * -100}
          className="pointer-events-none"
        />
      )}

      {/* Selection highlight */}
      {isActive && (
        <line
          x1={`${startPos.x}%`}
          y1={`${startPos.y}%`}
          x2={`${endPos.x}%`}
          y2={`${endPos.y}%`}
          stroke="white"
          strokeWidth={element.strokeWidth + 4}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeDasharray="5,5"
          className="pointer-events-none"
        />
      )}

      {/* Start endpoint handle - draggable when not connected */}
      {isActive && !isConnected(element.startPoint) && (
        <circle
          cx={`${startPos.x}%`}
          cy={`${startPos.y}%`}
          r={8}
          fill="white"
          stroke={element.color}
          strokeWidth={2}
          className="pointer-events-auto cursor-grab"
          onMouseDown={(e) => handleMouseDown(e, "start")}
          onTouchStart={(e) => handleMouseDown(e, "start")}
        />
      )}

      {/* End endpoint handle - draggable when not connected */}
      {isActive && !isConnected(element.endPoint) && (
        <circle
          cx={`${endPos.x}%`}
          cy={`${endPos.y}%`}
          r={8}
          fill="white"
          stroke={element.color}
          strokeWidth={2}
          className="pointer-events-auto cursor-grab"
          onMouseDown={(e) => handleMouseDown(e, "end")}
          onTouchStart={(e) => handleMouseDown(e, "end")}
        />
      )}

      {/* Connected point indicators - show when endpoint is connected, double-click to disconnect */}
      {isActive && isConnected(element.startPoint) && (
        <circle
          cx={`${startPos.x}%`}
          cy={`${startPos.y}%`}
          r={8}
          fill="#22c55e"
          fillOpacity={0.3}
          stroke="#22c55e"
          strokeWidth={2}
          className="pointer-events-auto cursor-pointer"
          onDoubleClick={(e) => handleDoubleClick(e, "start")}
        />
      )}
      {isActive && isConnected(element.endPoint) && (
        <circle
          cx={`${endPos.x}%`}
          cy={`${endPos.y}%`}
          r={8}
          fill="#22c55e"
          fillOpacity={0.3}
          stroke="#22c55e"
          strokeWidth={2}
          className="pointer-events-auto cursor-pointer"
          onDoubleClick={(e) => handleDoubleClick(e, "end")}
        />
      )}

      {/* Snap preview indicator */}
      {snapPreview && (
        <>
          {/* Highlight the snap target */}
          <circle
            cx={`${snapPreview.target.position.x}%`}
            cy={`${snapPreview.target.position.y}%`}
            r={12}
            fill="none"
            stroke="#22c55e"
            strokeWidth={3}
            className="pointer-events-none animate-pulse"
          />
          {/* Connection line preview */}
          <line
            x1={`${snapPreview.endpoint === "start" ? startPos.x : endPos.x}%`}
            y1={`${snapPreview.endpoint === "start" ? startPos.y : endPos.y}%`}
            x2={`${snapPreview.target.position.x}%`}
            y2={`${snapPreview.target.position.y}%`}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="4,4"
            strokeOpacity={0.8}
            className="pointer-events-none"
          />
        </>
      )}
    </svg>
  );
}
