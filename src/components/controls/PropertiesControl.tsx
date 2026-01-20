import { useStore } from "../../store/useStore";
import type { Position, Size } from "../../types";

// Helper to check if element has position (not line)
function hasPosition(element: any): element is { position: Position } {
  return "position" in element && typeof element.position === "object" && "x" in element.position;
}

// Helper to check if element has size
function hasSize(element: any): element is { size: Size } {
  return "size" in element && typeof element.size === "object" && "width" in element.size;
}

export function PropertiesControl() {
  const { elements, activeElementId, updateElement } = useStore();

  const activeElement = elements.find((el) => el.id === activeElementId);

  if (!activeElement) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3 opacity-50">
        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
          Properties
        </label>
        <p className="text-[10px] text-slate-500">Select an element to edit</p>
      </div>
    );
  }

  const showSize = hasSize(activeElement);
  const showPosition = hasPosition(activeElement);

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        Properties
      </label>

      {/* Size - only for elements with size property */}
      {showSize && (
        <div className="grid grid-cols-2 gap-2">
          <div className="control-group">
            <div className="label-row">
              <span className="text-[9px] font-bold text-slate-400">W</span>
              <span className="val-badge text-[9px]">{(activeElement as any).size.width}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              value={(activeElement as any).size.width}
              onChange={(e) =>
                updateElement(activeElement.id, {
                  size: { ...(activeElement as any).size, width: parseInt(e.target.value) },
                })
              }
              className="h-1"
            />
          </div>
          <div className="control-group">
            <div className="label-row">
              <span className="text-[9px] font-bold text-slate-400">H</span>
              <span className="val-badge text-[9px]">{(activeElement as any).size.height}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="800"
              value={(activeElement as any).size.height}
              onChange={(e) =>
                updateElement(activeElement.id, {
                  size: { ...(activeElement as any).size, height: parseInt(e.target.value) },
                })
              }
              className="h-1"
            />
          </div>
        </div>
      )}

      {/* Position - only for elements with position property */}
      {showPosition && (
        <div className="grid grid-cols-2 gap-2">
          <div className="control-group">
            <div className="label-row">
              <span className="text-[9px] font-bold text-slate-400">X</span>
              <span className="val-badge text-[9px]">{(activeElement as any).position.x.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={(activeElement as any).position.x}
              onChange={(e) =>
                updateElement(activeElement.id, {
                  position: { ...(activeElement as any).position, x: parseFloat(e.target.value) },
                })
              }
              className="h-1"
            />
          </div>
          <div className="control-group">
            <div className="label-row">
              <span className="text-[9px] font-bold text-slate-400">Y</span>
              <span className="val-badge text-[9px]">{(activeElement as any).position.y.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={(activeElement as any).position.y}
              onChange={(e) =>
                updateElement(activeElement.id, {
                  position: { ...(activeElement as any).position, y: parseFloat(e.target.value) },
                })
              }
              className="h-1"
            />
          </div>
        </div>
      )}

      {/* Rotation */}
      <div className="control-group">
        <div className="label-row">
          <span className="text-[9px] font-bold text-slate-400">Rotation</span>
          <span className="val-badge text-[9px]">{activeElement.rotation}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          value={activeElement.rotation}
          onChange={(e) =>
            updateElement(activeElement.id, { rotation: parseInt(e.target.value) })
          }
          className="h-1"
        />
      </div>
    </div>
  );
}
