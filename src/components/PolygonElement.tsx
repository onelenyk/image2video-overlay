import { useRef, useCallback, useMemo, useState } from "react";
import type { PolygonOverlay, Position } from "../types";
import { useStore } from "../store/useStore";
import { hexToRgba } from "../utils/color";
import { useAnimation, useTrainAnimation, getAnimationStyles } from "../hooks/useAnimation";
import { isLineAnimation } from "../utils/animation";

interface PolygonElementProps {
  element: PolygonOverlay;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PolygonElement({ element, containerRef }: PolygonElementProps) {
  const { activeElementId, setActiveElement, updateElement, editorMode, insertPolygonVertex, removePolygonVertex } = useStore();
  const elementRef = useRef<SVGSVGElement>(null);
  const isActive = activeElementId === element.id;
  
  // State for showing edge midpoints when hovering
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  // Use shared animation hook for non-line animations
  const { animState } = useAnimation({
    animationType: element.animationType,
    animationDuration: element.animationDuration,
    animationPreview: element.animationPreview,
    baseOpacity: element.opacity,
  });
  
  // Use train animation hook for line-specific animations
  const trainProgress = useTrainAnimation({
    animationType: element.animationType,
    animationDuration: element.animationDuration,
    animationPreview: element.animationPreview,
  });

  const dragState = useRef({
    isDragging: false,
    dragTarget: null as "polygon" | number | null, // "polygon" for whole shape, number for vertex index
    startX: 0,
    startY: 0,
    initialPoints: [] as Position[],
  });

  const getCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }, []);

  // Generate lines data for rendering
  const lines = useMemo(() => {
    if (element.points.length < 2) return [];
    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < element.points.length - 1; i++) {
      result.push({
        x1: element.points[i].x,
        y1: element.points[i].y,
        x2: element.points[i + 1].x,
        y2: element.points[i + 1].y,
      });
    }
    // Close the polygon if needed
    if (element.closed && element.points.length >= 3) {
      result.push({
        x1: element.points[element.points.length - 1].x,
        y1: element.points[element.points.length - 1].y,
        x2: element.points[0].x,
        y2: element.points[0].y,
      });
    }
    return result;
  }, [element.points, element.closed]);

  // Generate SVG polygon points string for fill (using viewBox coordinates)
  const polygonPoints = element.points.map(p => `${p.x},${p.y}`).join(" ");

  // Calculate total path length for train animation
  const totalPathLength = useMemo(() => {
    let length = 0;
    for (let i = 0; i < element.points.length - 1; i++) {
      const dx = element.points[i + 1].x - element.points[i].x;
      const dy = element.points[i + 1].y - element.points[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    if (element.closed && element.points.length >= 3) {
      const dx = element.points[0].x - element.points[element.points.length - 1].x;
      const dy = element.points[0].y - element.points[element.points.length - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }, [element.points, element.closed]);

  // Get position along the path at a given progress (0-1)
  const getPositionAtProgress = useCallback((progress: number): Position | null => {
    if (element.points.length < 2) return null;
    
    const targetDistance = progress * totalPathLength;
    let accumulatedDistance = 0;
    
    const pointsToTraverse = [...element.points];
    if (element.closed && element.points.length >= 3) {
      pointsToTraverse.push(element.points[0]); // Add first point to close
    }
    
    for (let i = 0; i < pointsToTraverse.length - 1; i++) {
      const p1 = pointsToTraverse[i];
      const p2 = pointsToTraverse[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      if (accumulatedDistance + segmentLength >= targetDistance) {
        const t = (targetDistance - accumulatedDistance) / segmentLength;
        return {
          x: p1.x + dx * t,
          y: p1.y + dy * t,
        };
      }
      accumulatedDistance += segmentLength;
    }
    
    // Return last point if we've gone past
    return element.points[element.points.length - 1];
  }, [element.points, element.closed, totalPathLength]);

  // Get train settings (with defaults)
  const trainSettings = element.trainSettings || {
    trainLength: 0.15,
    glowIntensity: 0.3,
    glowSize: 8,
    trainColor: "inherit",
    fadeTrail: false,
  };

  // Calculate train segment for rendering
  const trainSegment = useMemo(() => {
    const isTrainAnim = element.animationPreview && isLineAnimation(element.animationType);
    if (!isTrainAnim || element.animationType === "anim-dash") return null;
    
    const halfTrain = trainSettings.trainLength / 2;
    
    const startProgress = Math.max(0, trainProgress - halfTrain);
    const endProgress = Math.min(1, trainProgress + halfTrain);
    
    const startPos = getPositionAtProgress(startProgress);
    const endPos = getPositionAtProgress(endProgress);
    
    if (!startPos || !endPos) return null;
    
    return { start: startPos, end: endPos };
  }, [element.animationPreview, element.animationType, trainProgress, getPositionAtProgress, trainSettings.trainLength]);

  // Determine train color
  const trainColor = trainSettings.trainColor === "inherit" ? element.color : trainSettings.trainColor;

  // Handle double-click on vertex to remove it
  const handleVertexDoubleClick = useCallback(
    (e: React.MouseEvent, vertexIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Don't allow removing if it would leave less than 2 points
      if (element.points.length <= 2) return;
      
      removePolygonVertex(element.id, vertexIndex);
    },
    [element.id, element.points.length, removePolygonVertex]
  );

  // Handle click on edge midpoint to add a new vertex
  const handleEdgeMidpointClick = useCallback(
    (e: React.MouseEvent, edgeIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      const p1 = element.points[edgeIndex];
      const p2Index = edgeIndex === element.points.length - 1 && element.closed ? 0 : edgeIndex + 1;
      const p2 = element.points[p2Index];
      
      // Calculate midpoint
      const midpoint: Position = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      
      // Insert at the correct position
      insertPolygonVertex(element.id, edgeIndex, midpoint);
      setHoveredEdge(null);
    },
    [element.id, element.points, element.closed, insertPolygonVertex]
  );

  // Calculate edge midpoints for the "add vertex" UI
  const edgeMidpoints = useMemo(() => {
    if (!isActive || element.points.length < 2) return [];
    
    const midpoints: { x: number; y: number; edgeIndex: number }[] = [];
    
    for (let i = 0; i < element.points.length - 1; i++) {
      midpoints.push({
        x: (element.points[i].x + element.points[i + 1].x) / 2,
        y: (element.points[i].y + element.points[i + 1].y) / 2,
        edgeIndex: i,
      });
    }
    
    // Add midpoint for closing edge if polygon is closed
    if (element.closed && element.points.length >= 3) {
      midpoints.push({
        x: (element.points[element.points.length - 1].x + element.points[0].x) / 2,
        y: (element.points[element.points.length - 1].y + element.points[0].y) / 2,
        edgeIndex: element.points.length - 1,
      });
    }
    
    return midpoints;
  }, [isActive, element.points, element.closed]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, target: "polygon" | number) => {
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
      dragState.current.dragTarget = target;
      dragState.current.startX = coords.x;
      dragState.current.startY = coords.y;
      dragState.current.initialPoints = element.points.map((p) => ({ ...p }));

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!dragState.current.isDragging) return;
        moveEvent.preventDefault();

        const moveCoords = getCoords(moveEvent);
        const containerRect = container.getBoundingClientRect();

        const deltaX = ((moveCoords.x - dragState.current.startX) / containerRect.width) * 100;
        const deltaY = ((moveCoords.y - dragState.current.startY) / containerRect.height) * 100;

        if (dragState.current.dragTarget === "polygon") {
          // Move entire polygon
          const newPoints = dragState.current.initialPoints.map((p) => ({
            x: Math.max(0, Math.min(100, p.x + deltaX)),
            y: Math.max(0, Math.min(100, p.y + deltaY)),
          }));
          updateElement(element.id, { points: newPoints });
        } else if (typeof dragState.current.dragTarget === "number") {
          // Move single vertex
          const vertexIndex = dragState.current.dragTarget;
          const newPoints = [...dragState.current.initialPoints];
          newPoints[vertexIndex] = {
            x: Math.max(0, Math.min(100, dragState.current.initialPoints[vertexIndex].x + deltaX)),
            y: Math.max(0, Math.min(100, dragState.current.initialPoints[vertexIndex].y + deltaY)),
          };
          updateElement(element.id, { points: newPoints });
        }
      };

      const handleEnd = () => {
        dragState.current.isDragging = false;
        dragState.current.dragTarget = null;
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
    [element.id, element.points, setActiveElement, updateElement, containerRef, getCoords, editorMode]
  );

  // Check if this is a line-specific animation
  const isLineAnim = isLineAnimation(element.animationType);
  
  // Get animation styles for non-line animations
  const animStyles = !isLineAnim ? getAnimationStyles(animState, 0) : {};
  
  // Calculate opacity
  const currentOpacity = animState?.opacity ?? element.opacity;
  const fillColor = element.fillEnabled && element.closed ? hexToRgba(element.color, currentOpacity) : "none";

  // Don't render if no points
  if (element.points.length === 0) {
    return null;
  }

  return (
    <svg
      ref={elementRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: element.zIndex,
        ...animStyles,
      }}
    >
      {/* Fill polygon using viewBox for accurate fill */}
      {element.fillEnabled && element.closed && element.points.length >= 3 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <polygon
            points={polygonPoints}
            fill={fillColor}
            className="pointer-events-auto cursor-move"
            onMouseDown={(e) => handleMouseDown(e, "polygon")}
            onTouchStart={(e) => handleMouseDown(e, "polygon")}
          />
        </svg>
      )}

      {/* Stroke lines using percentage coordinates */}
      {lines.map((line, index) => (
        <line
          key={`line-${index}`}
          x1={`${line.x1}%`}
          y1={`${line.y1}%`}
          x2={`${line.x2}%`}
          y2={`${line.y2}%`}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          strokeOpacity={isLineAnim && element.animationPreview ? 0.3 : currentOpacity}
          strokeLinecap="round"
          className="pointer-events-auto cursor-move"
          onMouseDown={(e) => handleMouseDown(e, "polygon")}
          onTouchStart={(e) => handleMouseDown(e, "polygon")}
        />
      ))}

      {/* Train animation - highlighted segment traveling along the path */}
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

      {/* Dash animation - marching ants effect for each line segment */}
      {element.animationPreview && element.animationType === "anim-dash" && lines.map((line, index) => (
        <line
          key={`dash-${index}`}
          x1={`${line.x1}%`}
          y1={`${line.y1}%`}
          x2={`${line.x2}%`}
          y2={`${line.y2}%`}
          stroke="white"
          strokeWidth={element.strokeWidth}
          strokeOpacity={0.8}
          strokeLinecap="round"
          strokeDasharray="10,10"
          strokeDashoffset={trainProgress * -100}
          className="pointer-events-none"
        />
      ))}

      {/* Selection highlight lines */}
      {isActive && lines.map((line, index) => (
        <line
          key={`highlight-${index}`}
          x1={`${line.x1}%`}
          y1={`${line.y1}%`}
          x2={`${line.x2}%`}
          y2={`${line.y2}%`}
          stroke="white"
          strokeWidth={element.strokeWidth + 4}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeDasharray="8,4"
          className="pointer-events-none"
        />
      ))}

      {/* Edge midpoint handles for adding vertices */}
      {isActive && edgeMidpoints.map((midpoint, index) => (
        <g key={`midpoint-${index}`}>
          {/* Hover area for edge */}
          <circle
            cx={`${midpoint.x}%`}
            cy={`${midpoint.y}%`}
            r={hoveredEdge === midpoint.edgeIndex ? 8 : 6}
            fill={hoveredEdge === midpoint.edgeIndex ? "#22c55e" : "#64748b"}
            fillOpacity={hoveredEdge === midpoint.edgeIndex ? 0.8 : 0.4}
            stroke={hoveredEdge === midpoint.edgeIndex ? "#22c55e" : "#94a3b8"}
            strokeWidth={2}
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setHoveredEdge(midpoint.edgeIndex)}
            onMouseLeave={() => setHoveredEdge(null)}
            onClick={(e) => handleEdgeMidpointClick(e, midpoint.edgeIndex)}
          />
          {/* Plus icon */}
          {hoveredEdge === midpoint.edgeIndex && (
            <>
              <line
                x1={`calc(${midpoint.x}% - 4px)`}
                y1={`${midpoint.y}%`}
                x2={`calc(${midpoint.x}% + 4px)`}
                y2={`${midpoint.y}%`}
                stroke="white"
                strokeWidth={2}
                className="pointer-events-none"
              />
              <line
                x1={`${midpoint.x}%`}
                y1={`calc(${midpoint.y}% - 4px)`}
                x2={`${midpoint.x}%`}
                y2={`calc(${midpoint.y}% + 4px)`}
                stroke="white"
                strokeWidth={2}
                className="pointer-events-none"
              />
            </>
          )}
        </g>
      ))}

      {/* Vertex handles */}
      {isActive &&
        element.points.map((point, index) => (
          <g key={index}>
            {/* Vertex circle - double-click to remove */}
            <circle
              cx={`${point.x}%`}
              cy={`${point.y}%`}
              r={8}
              fill="white"
              stroke={element.color}
              strokeWidth={2}
              className="pointer-events-auto cursor-grab"
              onMouseDown={(e) => handleMouseDown(e, index)}
              onTouchStart={(e) => handleMouseDown(e, index)}
              onDoubleClick={(e) => handleVertexDoubleClick(e, index)}
            />
            {/* Vertex index label */}
            <text
              x={`${point.x}%`}
              y={`${point.y}%`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="bold"
              fill={element.color}
              className="pointer-events-none select-none"
            >
              {index + 1}
            </text>
          </g>
        ))}

      {/* First point indicator for closing */}
      {isActive && !element.closed && element.points.length >= 3 && (
        <circle
          cx={`${element.points[0].x}%`}
          cy={`${element.points[0].y}%`}
          r={14}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="6,4"
          className="pointer-events-none animate-pulse"
        />
      )}
    </svg>
  );
}
