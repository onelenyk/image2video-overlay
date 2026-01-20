import { useStore } from "../../store/useStore";
import type { OverlayElement } from "../../types";

export function OverlayControl() {
  const { elements, activeElementId, setActiveElement, addElement, createOverlay } = useStore();
  
  const overlays = elements.filter((el): el is OverlayElement => el.type === "overlay");
  const activeOverlay = overlays.find((o) => o.id === activeElementId);

  const handleAddOverlay = () => {
    const newOverlay = createOverlay();
    addElement(newOverlay);
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        0. Overlays
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={activeElementId || ""}
          onChange={(e) => setActiveElement(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[10px] outline-none cursor-pointer"
        >
          {overlays.map((overlay) => (
            <option key={overlay.id} value={overlay.id}>
              {overlay.label || overlay.id}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddOverlay}
          className="bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          + Add
        </button>
      </div>
      <div className="text-[8px] text-slate-500 pt-1 border-t border-slate-800">
        <div className="flex justify-between">
          <span>Active:</span>
          <span className="font-bold text-slate-400">
            {activeOverlay?.label || activeElementId || "None"}
          </span>
        </div>
      </div>
    </div>
  );
}
