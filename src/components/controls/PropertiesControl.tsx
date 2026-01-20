import { useStore } from "../../store/useStore";
import type { OverlayElement } from "../../types";

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

  const isOverlay = activeElement.type === "overlay";
  const overlay = isOverlay ? (activeElement as OverlayElement) : null;

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        Properties
      </label>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">W</span>
            <span className="val-badge text-[9px]">{activeElement.size.width}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            value={activeElement.size.width}
            onChange={(e) =>
              updateElement(activeElement.id, {
                size: { ...activeElement.size, width: parseInt(e.target.value) },
              })
            }
            className="h-1"
          />
        </div>
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">H</span>
            <span className="val-badge text-[9px]">{activeElement.size.height}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="800"
            value={activeElement.size.height}
            onChange={(e) =>
              updateElement(activeElement.id, {
                size: { ...activeElement.size, height: parseInt(e.target.value) },
              })
            }
            className="h-1"
          />
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">X</span>
            <span className="val-badge text-[9px]">{activeElement.position.x.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={activeElement.position.x}
            onChange={(e) =>
              updateElement(activeElement.id, {
                position: { ...activeElement.position, x: parseFloat(e.target.value) },
              })
            }
            className="h-1"
          />
        </div>
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Y</span>
            <span className="val-badge text-[9px]">{activeElement.position.y.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={activeElement.position.y}
            onChange={(e) =>
              updateElement(activeElement.id, {
                position: { ...activeElement.position, y: parseFloat(e.target.value) },
              })
            }
            className="h-1"
          />
        </div>
      </div>

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

      {/* Border (overlay only) */}
      {overlay && (
        <div className="control-group pt-1 border-t border-slate-800">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Border</span>
            <span className="val-badge text-[9px]">{overlay.borderWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={overlay.borderWidth}
            onChange={(e) =>
              updateElement(overlay.id, { borderWidth: parseInt(e.target.value) })
            }
            className="h-1"
          />
        </div>
      )}
    </div>
  );
}
