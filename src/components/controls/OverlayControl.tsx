import { useStore } from "../../store/useStore";
import type { 
  OverlayElement, 
  RectangleOverlay, 
  PointOverlay, 
  LineOverlay, 
  PolygonOverlay,
  OverlayType 
} from "../../types";
import { isConnectionRef } from "../../types";
import { findConnectablePoints, resolveEndpoint } from "../../utils/connections";

export function OverlayControl() {
  const { 
    elements, 
    activeElementId, 
    setActiveElement, 
    addElement, 
    deleteElement,
    createRectangle, 
    createPoint, 
    createLine,
    updateElement,
    setEditorMode,
    getPoints,
    connectLineEndpoint,
    disconnectLineEndpoint,
  } = useStore();
  
  const overlays = elements.filter((el): el is OverlayElement => el.type === "overlay");
  const activeElement = elements.find((el) => el.id === activeElementId);
  const activeOverlay = activeElement?.type === "overlay" ? (activeElement as OverlayElement) : null;
  const points = getPoints();
  
  // Get all connectable points for lines
  const connectablePoints = findConnectablePoints(elements, activeElementId || undefined);

  const handleAddOverlay = (overlayType: OverlayType) => {
    switch (overlayType) {
      case "rectangle": {
        const newOverlay = createRectangle();
        addElement(newOverlay);
        break;
      }
      case "point": {
        const newPoint = createPoint();
        addElement(newPoint);
        break;
      }
      case "line": {
        const newLine = createLine({ x: 30, y: 30 }, { x: 70, y: 70 });
        addElement(newLine);
        break;
      }
      case "polygon": {
        setEditorMode("polygon-create");
        break;
      }
    }
  };

  const handleConnectToTarget = (lineId: string, endpoint: "start" | "end", targetKey: string) => {
    if (targetKey === "") {
      // Disconnect - set to current resolved position
      const line = elements.find((el) => el.id === lineId) as LineOverlay;
      if (line) {
        const currentEndpoint = endpoint === "start" ? line.startPoint : line.endPoint;
        if (isConnectionRef(currentEndpoint)) {
          const resolvedPos = resolveEndpoint(currentEndpoint, elements);
          if (resolvedPos) {
            disconnectLineEndpoint(lineId, endpoint, resolvedPos);
          }
        }
      }
    } else {
      // Find the connectable point by key (format: elementId:vertexIndex or elementId:endpoint or elementId)
      const targetPoint = connectablePoints.find((p) => {
        const ref = p.connectionRef;
        if (ref.vertexIndex !== undefined) {
          return `${ref.elementId}:v${ref.vertexIndex}` === targetKey;
        } else if (ref.endpoint) {
          return `${ref.elementId}:${ref.endpoint}` === targetKey;
        } else {
          return ref.elementId === targetKey;
        }
      });
      
      if (targetPoint) {
        connectLineEndpoint(lineId, endpoint, targetPoint.connectionRef);
      }
    }
  };
  
  // Helper to get the current connection key for a line endpoint
  const getConnectionKey = (endpoint: LineOverlay["startPoint"] | LineOverlay["endPoint"]): string => {
    if (!isConnectionRef(endpoint)) return "";
    
    const ref = endpoint;
    if (ref.vertexIndex !== undefined) {
      return `${ref.elementId}:v${ref.vertexIndex}`;
    } else if (ref.endpoint) {
      return `${ref.elementId}:${ref.endpoint}`;
    } else {
      return ref.elementId;
    }
  };
  
  // Helper to format connectable point key
  const getConnectablePointKey = (point: typeof connectablePoints[0]): string => {
    const ref = point.connectionRef;
    if (ref.vertexIndex !== undefined) {
      return `${ref.elementId}:v${ref.vertexIndex}`;
    } else if (ref.endpoint) {
      return `${ref.elementId}:${ref.endpoint}`;
    } else {
      return ref.elementId;
    }
  };

  const getOverlayDisplayName = (overlay: OverlayElement) => {
    switch (overlay.overlayType) {
      case "rectangle":
        return (overlay as RectangleOverlay).label || overlay.id;
      case "point":
        return (overlay as PointOverlay).label || overlay.id;
      case "line":
        return `Line ${overlay.id.split("-")[1] || ""}`;
      case "polygon":
        return `Polygon ${overlay.id.split("-")[1] || ""}`;
    }
    // Fallback for any unexpected overlay type
    return (overlay as OverlayElement).id;
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        0. Overlay
      </label>
      
      {/* Overlay selector */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={activeElementId || ""}
          onChange={(e) => setActiveElement(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[10px] outline-none cursor-pointer"
        >
          {overlays.map((overlay) => (
            <option key={overlay.id} value={overlay.id}>
              {getOverlayDisplayName(overlay)}
            </option>
          ))}
        </select>
        <div className="relative group">
          <button
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            + Add ▼
          </button>
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl z-50 hidden group-hover:block">
            <button
              onClick={() => handleAddOverlay("rectangle")}
              className="w-full px-3 py-2 text-[9px] font-bold text-left hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-4 h-4 border-2 border-current rounded-sm" />
              Rectangle
            </button>
            <button
              onClick={() => handleAddOverlay("point")}
              className="w-full px-3 py-2 text-[9px] font-bold text-left hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-3 h-3 bg-current rounded-full" />
              Point
            </button>
            <button
              onClick={() => handleAddOverlay("line")}
              className="w-full px-3 py-2 text-[9px] font-bold text-left hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="w-4 h-0.5 bg-current" />
              Line
            </button>
            <button
              onClick={() => handleAddOverlay("polygon")}
              className="w-full px-3 py-2 text-[9px] font-bold text-left hover:bg-slate-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 22,8.5 18,21 6,21 2,8.5" />
              </svg>
              Polygon
            </button>
          </div>
        </div>
      </div>

      {activeOverlay ? (
        <>
          {/* Type indicator */}
          <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase font-bold">
            <span className="bg-slate-800 px-2 py-1 rounded">
              {activeOverlay.overlayType}
            </span>
            <button
              onClick={() => deleteElement(activeOverlay.id)}
              className="ml-auto text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded"
            >
              Delete
            </button>
          </div>

          {/* Rectangle-specific controls */}
          {activeOverlay.overlayType === "rectangle" && (
            <>
              {/* Label */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">Label</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={(activeOverlay as RectangleOverlay).label}
                    onChange={(e) => updateElement(activeOverlay.id, { label: e.target.value })}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none bg-slate-800 px-3 rounded-lg border border-slate-700 hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={(activeOverlay as RectangleOverlay).showLabel}
                      onChange={(e) => updateElement(activeOverlay.id, { showLabel: e.target.checked })}
                      className="accent-red-500 w-3 h-3"
                    />
                    <span className="text-slate-400 font-bold">Show</span>
                  </label>
                  <input
                    type="color"
                    value={(activeOverlay as RectangleOverlay).labelColor}
                    onChange={(e) => updateElement(activeOverlay.id, { labelColor: e.target.value })}
                    className="h-9 w-12 bg-transparent cursor-pointer rounded-lg border border-slate-700"
                  />
                </div>
                <div className="control-group">
                  <div className="label-row">
                    <span className="text-[9px] font-bold text-slate-400">Font Size</span>
                    <span className="val-badge text-[9px]">{(activeOverlay as RectangleOverlay).fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={(activeOverlay as RectangleOverlay).fontSize}
                    onChange={(e) => updateElement(activeOverlay.id, { fontSize: parseInt(e.target.value) })}
                    className="h-1"
                  />
                </div>
              </div>

              {/* Border */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">Border</span>
                <div className="control-group">
                  <div className="label-row">
                    <span className="text-[9px] font-bold text-slate-400">Width</span>
                    <span className="val-badge text-[9px]">{(activeOverlay as RectangleOverlay).borderWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={(activeOverlay as RectangleOverlay).borderWidth}
                    onChange={(e) => updateElement(activeOverlay.id, { borderWidth: parseInt(e.target.value) })}
                    className="h-1"
                  />
                </div>
              </div>
            </>
          )}

          {/* Point-specific controls */}
          {activeOverlay.overlayType === "point" && (
            <>
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">Point</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={(activeOverlay as PointOverlay).label}
                    onChange={(e) => updateElement(activeOverlay.id, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none bg-slate-800 px-3 rounded-lg border border-slate-700 hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={(activeOverlay as PointOverlay).showLabel}
                      onChange={(e) => updateElement(activeOverlay.id, { showLabel: e.target.checked })}
                      className="accent-red-500 w-3 h-3"
                    />
                    <span className="text-slate-400 font-bold">Show</span>
                  </label>
                </div>
                <div className="control-group">
                  <div className="label-row">
                    <span className="text-[9px] font-bold text-slate-400">Radius</span>
                    <span className="val-badge text-[9px]">{(activeOverlay as PointOverlay).radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    value={(activeOverlay as PointOverlay).radius}
                    onChange={(e) => updateElement(activeOverlay.id, { radius: parseInt(e.target.value) })}
                    className="h-1"
                  />
                </div>
              </div>
            </>
          )}

          {/* Line-specific controls */}
          {activeOverlay.overlayType === "line" && (
            <>
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">Line</span>
                <div className="control-group">
                  <div className="label-row">
                    <span className="text-[9px] font-bold text-slate-400">Stroke Width</span>
                    <span className="val-badge text-[9px]">{(activeOverlay as LineOverlay).strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={(activeOverlay as LineOverlay).strokeWidth}
                    onChange={(e) => updateElement(activeOverlay.id, { strokeWidth: parseInt(e.target.value) })}
                    className="h-1"
                  />
                </div>

                {/* Connect to other elements */}
                <div className="space-y-2 pt-2">
                  <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">Connect Endpoints</span>
                  <p className="text-[8px] text-slate-500">Drag endpoint near target to snap, or select below</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        Start
                        {isConnectionRef((activeOverlay as LineOverlay).startPoint) && (
                          <span className="text-green-400">●</span>
                        )}
                      </span>
                      <select
                        value={getConnectionKey((activeOverlay as LineOverlay).startPoint)}
                        onChange={(e) => handleConnectToTarget(activeOverlay.id, "start", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[9px] outline-none"
                      >
                        <option value="">Free</option>
                        <optgroup label="Points">
                          {connectablePoints
                            .filter((p) => !p.connectionRef.endpoint && p.connectionRef.vertexIndex === undefined)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Line Endpoints">
                          {connectablePoints
                            .filter((p) => p.connectionRef.endpoint)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Polygon Vertices">
                          {connectablePoints
                            .filter((p) => p.connectionRef.vertexIndex !== undefined)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        End
                        {isConnectionRef((activeOverlay as LineOverlay).endPoint) && (
                          <span className="text-green-400">●</span>
                        )}
                      </span>
                      <select
                        value={getConnectionKey((activeOverlay as LineOverlay).endPoint)}
                        onChange={(e) => handleConnectToTarget(activeOverlay.id, "end", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[9px] outline-none"
                      >
                        <option value="">Free</option>
                        <optgroup label="Points">
                          {connectablePoints
                            .filter((p) => !p.connectionRef.endpoint && p.connectionRef.vertexIndex === undefined)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Line Endpoints">
                          {connectablePoints
                            .filter((p) => p.connectionRef.endpoint)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Polygon Vertices">
                          {connectablePoints
                            .filter((p) => p.connectionRef.vertexIndex !== undefined)
                            .map((p) => (
                              <option key={getConnectablePointKey(p)} value={getConnectablePointKey(p)}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Polygon-specific controls */}
          {activeOverlay.overlayType === "polygon" && (
            <>
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider">
                  {(activeOverlay as PolygonOverlay).closed ? "Polygon" : "Polyline"}
                </span>
                <div className="flex items-center gap-2 text-[9px] text-slate-400">
                  <span>{(activeOverlay as PolygonOverlay).points.length} vertices</span>
                </div>
                
                {/* Closed toggle */}
                <label className="flex items-center gap-2 text-[10px] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(activeOverlay as PolygonOverlay).closed}
                    onChange={(e) => {
                      const updates: Partial<PolygonOverlay> = { closed: e.target.checked };
                      // Auto-disable fill when opening polygon (can't fill open path)
                      if (!e.target.checked) {
                        updates.fillEnabled = false;
                      }
                      updateElement(activeOverlay.id, updates);
                    }}
                    className="accent-emerald-500 w-3 h-3"
                    disabled={(activeOverlay as PolygonOverlay).points.length < 3}
                  />
                  <span className="text-slate-400 font-bold">
                    Closed Shape
                    {(activeOverlay as PolygonOverlay).points.length < 3 && (
                      <span className="text-slate-600 text-[8px] ml-1">(need 3+ points)</span>
                    )}
                  </span>
                </label>

                <div className="control-group">
                  <div className="label-row">
                    <span className="text-[9px] font-bold text-slate-400">Stroke Width</span>
                    <span className="val-badge text-[9px]">{(activeOverlay as PolygonOverlay).strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={(activeOverlay as PolygonOverlay).strokeWidth}
                    onChange={(e) => updateElement(activeOverlay.id, { strokeWidth: parseInt(e.target.value) })}
                    className="h-1"
                  />
                </div>
                
                {/* Fill only available for closed polygons */}
                <label className={`flex items-center gap-2 text-[10px] cursor-pointer select-none ${!(activeOverlay as PolygonOverlay).closed ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={(activeOverlay as PolygonOverlay).fillEnabled}
                    onChange={(e) => updateElement(activeOverlay.id, { fillEnabled: e.target.checked })}
                    className="accent-red-500 w-3 h-3"
                    disabled={!(activeOverlay as PolygonOverlay).closed}
                  />
                  <span className="text-slate-400 font-bold">
                    Fill Enabled
                    {!(activeOverlay as PolygonOverlay).closed && (
                      <span className="text-slate-600 text-[8px] ml-1">(closed only)</span>
                    )}
                  </span>
                </label>

                {/* Editing instructions */}
                <div className="mt-3 pt-2 border-t border-slate-700 space-y-1">
                  <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider block">
                    Edit Vertices
                  </span>
                  <div className="text-[9px] text-slate-500 space-y-0.5">
                    <p>• <span className="text-slate-400">Drag</span> vertex to move</p>
                    <p>• <span className="text-slate-400">Double-click</span> vertex to delete</p>
                    <p>• <span className="text-slate-400">Click</span> edge midpoint (○) to add</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          Select an overlay to edit
        </p>
      )}
    </div>
  );
}
