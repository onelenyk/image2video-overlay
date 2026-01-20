import { useStore } from "../../store/useStore";
import type { AnimationType, OverlayElement } from "../../types";

export function AnimationControl() {
  const { elements, activeElementId, updateElement } = useStore();

  const activeElement = elements.find((el) => el.id === activeElementId);
  const isOverlay = activeElement?.type === "overlay";
  const overlay = isOverlay ? (activeElement as OverlayElement) : null;

  const handleAnimTypeChange = (value: AnimationType) => {
    if (overlay) {
      updateElement(overlay.id, { animationType: value });
    }
  };

  const handleDurationChange = (value: number) => {
    if (overlay) {
      updateElement(overlay.id, { animationDuration: value });
      document.documentElement.style.setProperty("--anim-duration", `${value}s`);
    }
  };

  const handleEnableChange = (enabled: boolean) => {
    if (overlay) {
      updateElement(overlay.id, { animationEnabled: enabled });
    }
  };

  const handleLoop = () => {
    if (overlay) {
      const newLooping = !overlay.isLooping;
      updateElement(overlay.id, {
        isLooping: newLooping,
        animationEnabled: newLooping,
      });
    }
  };

  const handleToggleVisibility = () => {
    if (overlay) {
      updateElement(overlay.id, { isHidden: !overlay.isHidden });
    }
  };

  const handlePlayOnce = () => {
    if (overlay) {
      // Trigger animation by toggling it
      updateElement(overlay.id, { animationEnabled: false });
      setTimeout(() => {
        updateElement(overlay.id, { animationEnabled: true });
        if (!overlay.isLooping) {
          setTimeout(() => {
            updateElement(overlay.id, { animationEnabled: false });
          }, overlay.animationDuration * 1000);
        }
      }, 10);
    }
  };

  if (!overlay) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3 opacity-50">
        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
          4. Animation
        </label>
        <p className="text-[10px] text-slate-500">Select an overlay to animate</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
          4. Animation
        </label>
        <label className="flex items-center gap-1.5 text-[9px] cursor-pointer select-none bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:bg-slate-700">
          <input
            type="checkbox"
            checked={overlay.animationEnabled}
            onChange={(e) => handleEnableChange(e.target.checked)}
            className="accent-red-500 w-3 h-3"
          />
          <span className="text-slate-400 font-bold">Enable</span>
        </label>
      </div>

      <div className="flex gap-2">
        <select
          value={overlay.animationType}
          onChange={(e) => handleAnimTypeChange(e.target.value as AnimationType)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 text-[10px] outline-none cursor-pointer"
        >
          <option value="anim-pulse">Pulse</option>
          <option value="anim-bounce">Bounce</option>
          <option value="anim-fade">Fade</option>
          <option value="anim-shake">Shake</option>
          <option value="anim-flash">Flash</option>
          <option value="anim-spin">Spin</option>
          <option value="anim-zoom">Zoom</option>
          <option value="anim-float">Float</option>
        </select>
        <button
          onClick={handleLoop}
          className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase ${
            overlay.isLooping ? "bg-red-600" : "bg-slate-700 hover:bg-red-600"
          }`}
        >
          {overlay.isLooping ? "Stop Loop" : "Loop"}
        </button>
      </div>

      <div className="control-group">
        <div className="label-row">
          <span className="text-[10px] font-bold text-slate-400">Duration</span>
          <span className="val-badge text-[9px]">{overlay.animationDuration}s</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="5.0"
          step="0.1"
          value={overlay.animationDuration}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
          className="h-1"
        />
      </div>

      <div className="flex gap-1 pt-1 border-t border-slate-800">
        <button
          onClick={handleToggleVisibility}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          {overlay.isHidden ? "Show Box" : "Hide Box"}
        </button>
        <button
          onClick={handlePlayOnce}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          Play Once
        </button>
      </div>
    </div>
  );
}
