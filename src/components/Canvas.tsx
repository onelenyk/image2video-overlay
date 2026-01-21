import { useRef, useCallback, useMemo, useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { OverlayBox } from "./OverlayBox";
import { PointElement } from "./PointElement";
import { LineElement } from "./LineElement";
import { PolygonElement } from "./PolygonElement";
import { ImageElement } from "./ImageElement";
import { DrawingElement } from "./DrawingElement";
import type { 
  OverlayElement, 
  ComponentElement, 
  Position,
  RectangleOverlay,
  PointOverlay,
  LineOverlay,
  PolygonOverlay,
  ImageComponent,
  DrawingComponent,
} from "../types";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = 2; // 1x

export function Canvas() {
  const { 
    elements, 
    backgroundImage, 
    backgroundDataUrl,
    editorMode,
    currentDrawingPath,
    activePolygonId,
    addDrawingPoint,
    clearDrawingPath,
    addElement,
    createDrawingComponent,
    createPolygon,
    addPolygonVertex,
    closePolygon,
    finishPolygonOpen,
    setEditorMode,
    setActivePolygonId,
    setActiveElement,
  } = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  
  // Zoom state
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const aspectRatio = backgroundImage
    ? `${backgroundImage.width} / ${backgroundImage.height}`
    : "9/16";
  
  // Zoom controls
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  
  const handleZoomIn = useCallback(() => {
    if (canZoomIn) setZoomIndex(i => i + 1);
  }, [canZoomIn]);
  
  const handleZoomOut = useCallback(() => {
    if (canZoomOut) setZoomIndex(i => i - 1);
  }, [canZoomOut]);
  
  const handleResetZoom = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  // Get the active polygon being created
  const activePolygon = useMemo(() => {
    if (!activePolygonId) return null;
    return elements.find(el => el.id === activePolygonId) as PolygonOverlay | undefined;
  }, [activePolygonId, elements]);

  // Get mouse/touch position as percentage
  const getPositionPercent = useCallback((e: React.MouseEvent | React.TouchEvent): Position | null => {
    const container = canvasRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const coords = "touches" in e && e.touches.length > 0
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };

    return {
      x: ((coords.x - rect.left) / rect.width) * 100,
      y: ((coords.y - rect.top) / rect.height) * 100,
    };
  }, []);

  // Handle canvas click for polygon creation mode
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (editorMode !== "polygon-create") return;

    const pos = getPositionPercent(e);
    if (!pos) return;

    // Check if clicking on first point to close polygon
    if (activePolygonId && activePolygon) {
      if (activePolygon.points.length >= 3) {
        const firstPoint = activePolygon.points[0];
        const dist = Math.sqrt(
          Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2)
        );
        // If close to first point, close the polygon
        if (dist < 5) {
          closePolygon(activePolygonId);
          setActiveElement(activePolygonId);
          setActivePolygonId(null);
          setEditorMode("select");
          return;
        }
      }
      // Add vertex to existing polygon
      addPolygonVertex(activePolygonId, pos);
    } else {
      // Create new polygon with first point
      const polygon = createPolygon([pos]);
      addElement(polygon);
      setActivePolygonId(polygon.id);
      setActiveElement(polygon.id);
    }
  }, [editorMode, activePolygonId, activePolygon, getPositionPercent, closePolygon, addPolygonVertex, createPolygon, addElement, setEditorMode, setActivePolygonId, setActiveElement]);

  // Handle double-click to finish polygon as open polyline
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (editorMode !== "polygon-create") return;
    if (!activePolygonId || !activePolygon) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Need at least 2 points for a polyline
    if (activePolygon.points.length >= 2) {
      finishPolygonOpen(activePolygonId);
      setActiveElement(activePolygonId);
      setActivePolygonId(null);
      setEditorMode("select");
    }
  }, [editorMode, activePolygonId, activePolygon, finishPolygonOpen, setActiveElement, setActivePolygonId, setEditorMode]);

  // Handle keyboard for polygon creation (Enter to finish open, Escape to cancel)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editorMode !== "polygon-create") return;
    
    if (e.key === "Enter" && activePolygonId && activePolygon && activePolygon.points.length >= 2) {
      // Finish as open polyline
      finishPolygonOpen(activePolygonId);
      setActiveElement(activePolygonId);
      setActivePolygonId(null);
      setEditorMode("select");
    } else if (e.key === "Escape") {
      // Cancel polygon creation - if we have an active polygon, delete it
      if (activePolygonId) {
        // We need to import deleteElement or just reset
        setActivePolygonId(null);
        setEditorMode("select");
      }
    }
  }, [editorMode, activePolygonId, activePolygon, finishPolygonOpen, setActiveElement, setActivePolygonId, setEditorMode]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle drawing start
  const handleDrawStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (editorMode !== "draw-freehand" && editorMode !== "draw-straight") return;

    e.preventDefault();
    const pos = getPositionPercent(e);
    if (!pos) return;

    isDrawing.current = true;
    clearDrawingPath();
    addDrawingPoint(pos);
  }, [editorMode, getPositionPercent, clearDrawingPath, addDrawingPoint]);

  // Handle drawing move
  const handleDrawMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    if (editorMode !== "draw-freehand" && editorMode !== "draw-straight") return;

    e.preventDefault();
    const pos = getPositionPercent(e);
    if (!pos) return;

    // For freehand, add every point
    // For straight, we'll only use first and last points
    if (editorMode === "draw-freehand") {
      addDrawingPoint(pos);
    }
  }, [editorMode, getPositionPercent, addDrawingPoint]);

  // Handle drawing end
  const handleDrawEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    if (editorMode !== "draw-freehand" && editorMode !== "draw-straight") return;

    isDrawing.current = false;
    const pos = getPositionPercent(e);

    let finalPath = [...currentDrawingPath];
    if (pos) {
      finalPath.push(pos);
    }

    // For straight line, only keep first and last points
    if (editorMode === "draw-straight" && finalPath.length >= 2) {
      finalPath = [finalPath[0], finalPath[finalPath.length - 1]];
    }

    if (finalPath.length >= 2) {
      const drawing = createDrawingComponent(
        finalPath,
        editorMode === "draw-freehand" ? "freehand" : "straight",
        "#ef4444",
        1
      );
      addElement(drawing);
    }

    clearDrawingPath();
    setEditorMode("select");
  }, [editorMode, currentDrawingPath, getPositionPercent, createDrawingComponent, addElement, clearDrawingPath, setEditorMode]);

  // Render element based on type
  const renderElement = (element: OverlayElement | ComponentElement) => {
    if (element.type === "overlay") {
      const overlay = element as OverlayElement;
      switch (overlay.overlayType) {
        case "rectangle":
          return (
            <OverlayBox
              key={element.id}
              element={overlay as RectangleOverlay}
              containerRef={canvasRef}
            />
          );
        case "point":
          return (
            <PointElement
              key={element.id}
              element={overlay as PointOverlay}
              containerRef={canvasRef}
            />
          );
        case "line":
          return (
            <LineElement
              key={element.id}
              element={overlay as LineOverlay}
              containerRef={canvasRef}
            />
          );
        case "polygon":
          return (
            <PolygonElement
              key={element.id}
              element={overlay as PolygonOverlay}
              containerRef={canvasRef}
            />
          );
        default:
          return null;
      }
    } else if (element.type === "component") {
      const component = element as ComponentElement;
      switch (component.componentType) {
        case "image":
          return (
            <ImageElement
              key={element.id}
              element={component as ImageComponent}
              containerRef={canvasRef}
            />
          );
        case "drawing":
          return (
            <DrawingElement
              key={element.id}
              element={component as DrawingComponent}
              containerRef={canvasRef}
            />
          );
        default:
          return null;
      }
    }
    return null;
  };

  // Render current drawing preview
  const renderDrawingPreview = () => {
    if (currentDrawingPath.length < 1) return null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
        {/* Draw lines between consecutive points */}
        {currentDrawingPath.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = currentDrawingPath[index - 1];
          return (
            <line
              key={`drawing-${index}`}
              x1={`${prevPoint.x}%`}
              y1={`${prevPoint.y}%`}
              x2={`${point.x}%`}
              y2={`${point.y}%`}
              stroke="#ef4444"
              strokeWidth={3}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          );
        })}
        {/* Draw a dot at the current position for single point */}
        {currentDrawingPath.length === 1 && (
          <circle
            cx={`${currentDrawingPath[0].x}%`}
            cy={`${currentDrawingPath[0].y}%`}
            r={5}
            fill="#ef4444"
            fillOpacity={0.8}
          />
        )}
      </svg>
    );
  };

  // Render polygon creation preview (shows vertex markers during creation)
  const renderPolygonPreview = () => {
    if (editorMode !== "polygon-create" || !activePolygon) return null;
    
    const points = activePolygon.points;
    if (points.length === 0) return null;

    return (
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none z-50"
      >
        {/* Draw lines between consecutive points */}
        {points.length >= 2 && points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          return (
            <line
              key={`line-${index}`}
              x1={`${prevPoint.x}%`}
              y1={`${prevPoint.y}%`}
              x2={`${point.x}%`}
              y2={`${point.y}%`}
              stroke="#8b5cf6"
              strokeWidth={4}
              strokeOpacity={1}
              strokeLinecap="round"
              strokeDasharray="12,6"
            />
          );
        })}
        
        {/* Highlight first point for closing (when 3+ points) */}
        {points.length >= 3 && (
          <circle
            cx={`${points[0].x}%`}
            cy={`${points[0].y}%`}
            r={12}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="6,3"
            className="animate-pulse"
          />
        )}
        
        {/* Draw vertex markers */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={`${point.x}%`}
              cy={`${point.y}%`}
              r={6}
              fill="#8b5cf6"
              stroke="white"
              strokeWidth={1.5}
            />
            <text
              x={`${point.x}%`}
              y={`${point.y}%`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fontWeight="bold"
              fill="white"
            >
              {index + 1}
            </text>
          </g>
        ))}

        {/* Instructions */}
        {points.length >= 2 && (
          <foreignObject x="0" y="90%" width="100%" height="10%">
            <div className="flex justify-center items-center gap-4 text-[10px] font-bold">
              {points.length >= 3 && (
                <span className="bg-emerald-500/80 text-white px-2 py-1 rounded">
                  Click point 1 → Close polygon
                </span>
              )}
              <span className="bg-violet-500/80 text-white px-2 py-1 rounded">
                Double-click / Enter → Finish as polyline
              </span>
              <span className="bg-slate-600/80 text-white px-2 py-1 rounded">
                Esc → Cancel
              </span>
            </div>
          </foreignObject>
        )}
      </svg>
    );
  };

  const isDrawingMode = editorMode === "draw-freehand" || editorMode === "draw-straight" || editorMode === "polygon-create";

  const handleCancelMode = () => {
    if (editorMode === "polygon-create" && activePolygonId) {
      // Delete the incomplete polygon
      useStore.getState().deleteElement(activePolygonId);
    }
    setActivePolygonId(null);
    setEditorMode("select");
    clearDrawingPath();
  };

  return (
    <div className="flex flex-col items-center sticky top-8 lg:mt-6">
      {/* Editor mode indicator */}
      {editorMode !== "select" && (
        <div className="mb-2 flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-amber-500/30 uppercase tracking-wider">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          {editorMode === "draw-freehand" && "Freehand Drawing Mode"}
          {editorMode === "draw-straight" && "Straight Line Mode"}
          {editorMode === "polygon-create" && (
            <>
              Polygon Mode - {activePolygon ? `${activePolygon.points.length} points` : "Click to start"}
            </>
          )}
          <button
            onClick={handleCancelMode}
            className="ml-2 bg-amber-500/30 hover:bg-amber-500/50 px-2 py-0.5 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="mb-2 flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
        <button
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors min-w-[45px]"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Scrollable container for zoomed canvas */}
      <div 
        className="canvas-scroll-container overflow-auto"
        style={{ 
          maxHeight: '70vh',
          maxWidth: '90vw',
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${100 / zoom}%`,
            height: 'fit-content',
          }}
        >
          <div
            className={`canvas-wrapper ring-8 ring-slate-800/50 ${isDrawingMode ? "cursor-crosshair" : ""}`}
            id="canvas-wrapper"
            style={{ aspectRatio }}
          >
            {backgroundImage && (
              <div id="size-badge">
                {backgroundImage.width} x {backgroundImage.height}
              </div>
            )}
            <div
              id="main-canvas"
              ref={canvasRef}
              style={{
                backgroundImage: backgroundDataUrl ? `url(${backgroundDataUrl})` : undefined,
              }}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            >
              {elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(renderElement)}
              
              {renderDrawingPreview()}
              {renderPolygonPreview()}
            </div>
          </div>
        </div>
      </div>
      <div className="canvas-info-overlay mt-6 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
          <span className="text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
            {backgroundImage ? `${backgroundImage.width} x ${backgroundImage.height}` : "Ready"}
          </span>
        </div>
        <p className="text-slate-600 text-[9px] font-medium max-w-[300px]">
          Project adjusts to image aspect ratio. All elements are tracked in export.
        </p>
      </div>
    </div>
  );
}
