import { useStore } from "../../store/useStore";
import type { OverlayElement } from "../../types";

export function LabelControl() {
  const { elements, activeElementId, updateElement } = useStore();
  
  const activeElement = elements.find((el) => el.id === activeElementId);
  const isOverlay = activeElement?.type === "overlay";
  const overlay = isOverlay ? (activeElement as OverlayElement) : null;

  if (!overlay) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3 opacity-50">
        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
          1. Label
        </label>
        <p className="text-[10px] text-slate-500">Select an overlay to edit label</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        1. Label
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={overlay.label}
          onChange={(e) => updateElement(overlay.id, { label: e.target.value })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-500/50"
        />
        <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none bg-slate-800 px-3 rounded-lg border border-slate-700 hover:bg-slate-700">
          <input
            type="checkbox"
            checked={overlay.showLabel}
            onChange={(e) => updateElement(overlay.id, { showLabel: e.target.checked })}
            className="accent-red-500 w-3 h-3"
          />
          <span className="text-slate-400 font-bold">Show</span>
        </label>
        <input
          type="color"
          value={overlay.labelColor}
          onChange={(e) => updateElement(overlay.id, { labelColor: e.target.value })}
          className="h-9 w-12 bg-transparent cursor-pointer rounded-lg border border-slate-700"
        />
      </div>
      <div className="control-group">
        <div className="label-row">
          <span className="text-[10px] font-bold text-slate-400">Font Size</span>
          <span className="val-badge text-[9px]">{overlay.fontSize}px</span>
        </div>
        <input
          type="range"
          min="10"
          max="60"
          value={overlay.fontSize}
          onChange={(e) => updateElement(overlay.id, { fontSize: parseInt(e.target.value) })}
          className="h-1"
        />
      </div>
    </div>
  );
}
