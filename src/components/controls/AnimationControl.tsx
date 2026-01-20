import { useStore } from "../../store/useStore";
import type { 
  AnimationType, 
  CanvasElement,
  OverlayElement,
  ComponentElement,
  RectangleOverlay,
  TrainAnimationSettings,
} from "../../types";
import { DEFAULT_TRAIN_SETTINGS } from "../../types";

// Check if the animation type is a train/path animation
function isTrainAnimation(animType: AnimationType): boolean {
  return animType === "anim-train" || animType === "anim-train-loop" || animType === "anim-dash";
}

// Helper to check if element has animation properties
function hasAnimationProperties(element: CanvasElement): boolean {
  return (
    "animationType" in element &&
    "animationDuration" in element &&
    "animationEnabled" in element
  );
}

export function AnimationControl() {
  const { elements, activeElementId, updateElement } = useStore();

  const activeElement = elements.find((el) => el.id === activeElementId);
  const canAnimate = activeElement && hasAnimationProperties(activeElement);

  // Get animation properties from any animatable element
  const animationType = (activeElement as any)?.animationType || "anim-pulse";
  const animationDuration = (activeElement as any)?.animationDuration || 1.5;
  const animationEnabled = (activeElement as any)?.animationEnabled || false;
  const animationPreview = (activeElement as any)?.animationPreview || false;
  const isLooping = (activeElement as any)?.isLooping || false;
  const trainSettings: TrainAnimationSettings = (activeElement as any)?.trainSettings || DEFAULT_TRAIN_SETTINGS;
  
  // Check if current animation is a train animation
  const showTrainSettings = isTrainAnimation(animationType);
  
  // isHidden is only for rectangle overlays
  const isRectangle = activeElement?.type === "overlay" && 
    (activeElement as OverlayElement).overlayType === "rectangle";
  const isHidden = isRectangle ? (activeElement as RectangleOverlay).isHidden : false;

  const handleAnimTypeChange = (value: AnimationType) => {
    if (activeElement) {
      updateElement(activeElement.id, { animationType: value });
    }
  };

  const handleDurationChange = (value: number) => {
    if (activeElement) {
      updateElement(activeElement.id, { animationDuration: value });
      document.documentElement.style.setProperty("--anim-duration", `${value}s`);
    }
  };

  const handleEnableChange = (enabled: boolean) => {
    if (activeElement) {
      updateElement(activeElement.id, { animationEnabled: enabled });
    }
  };

  const handlePreviewChange = (preview: boolean) => {
    if (activeElement) {
      updateElement(activeElement.id, { animationPreview: preview });
    }
  };

  const handleLoop = () => {
    if (activeElement) {
      // Just toggle looping state, don't affect the Enable checkbox
      updateElement(activeElement.id, { isLooping: !isLooping });
    }
  };

  const handleToggleVisibility = () => {
    if (isRectangle) {
      updateElement(activeElement!.id, { isHidden: !isHidden });
    }
  };

  const handlePlayOnce = () => {
    if (activeElement) {
      // Play animation once on preview without affecting the Export checkbox
      const currentPreview = animationPreview;
      
      // Force restart animation by toggling preview off then on
      updateElement(activeElement.id, { animationPreview: false });
      setTimeout(() => {
        updateElement(activeElement.id, { animationPreview: true });
        // After animation completes, restore original preview state
        setTimeout(() => {
          updateElement(activeElement.id, { animationPreview: currentPreview });
        }, animationDuration * 1000);
      }, 10);
    }
  };

  const handleTrainSettingChange = (key: keyof TrainAnimationSettings, value: number | string | boolean) => {
    if (activeElement) {
      updateElement(activeElement.id, {
        trainSettings: { ...trainSettings, [key]: value },
      });
    }
  };

  if (!canAnimate) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3 opacity-50">
        <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
          4. Animation
        </label>
        <p className="text-[10px] text-slate-500">Select an element to animate</p>
      </div>
    );
  }

  // Determine element type label
  const getElementTypeLabel = () => {
    if (activeElement?.type === "overlay") {
      const overlay = activeElement as OverlayElement;
      return overlay.overlayType.charAt(0).toUpperCase() + overlay.overlayType.slice(1);
    } else if (activeElement?.type === "component") {
      const component = activeElement as ComponentElement;
      return component.componentType === "image" ? "Image" : "Drawing";
    }
    return "Element";
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
            4. Animation
          </label>
          <span className="text-[8px] text-slate-600">{getElementTypeLabel()}</span>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-[9px] cursor-pointer select-none bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:bg-slate-700" title="Include animation in exported video">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={(e) => handleEnableChange(e.target.checked)}
              className="accent-green-500 w-3 h-3"
            />
            <span className="text-slate-400 font-bold">Export</span>
          </label>
          <label className="flex items-center gap-1.5 text-[9px] cursor-pointer select-none bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:bg-slate-700" title="Show animation on preview canvas">
            <input
              type="checkbox"
              checked={animationPreview}
              onChange={(e) => handlePreviewChange(e.target.checked)}
              className="accent-blue-500 w-3 h-3"
            />
            <span className="text-slate-400 font-bold">Preview</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={animationType}
          onChange={(e) => handleAnimTypeChange(e.target.value as AnimationType)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 text-[10px] outline-none cursor-pointer"
        >
          <optgroup label="Transform Animations">
            <option value="anim-pulse">Pulse</option>
            <option value="anim-bounce">Bounce</option>
            <option value="anim-fade">Fade</option>
            <option value="anim-shake">Shake</option>
            <option value="anim-flash">Flash</option>
            <option value="anim-spin">Spin</option>
            <option value="anim-zoom">Zoom</option>
            <option value="anim-float">Float</option>
          </optgroup>
          <optgroup label="Line/Path Animations">
            <option value="anim-train">🚂 Train (one-way)</option>
            <option value="anim-train-loop">🔄 Train (back & forth)</option>
            <option value="anim-dash">✨ Marching Dash</option>
          </optgroup>
        </select>
        <button
          onClick={handleLoop}
          className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase ${
            isLooping ? "bg-red-600" : "bg-slate-700 hover:bg-red-600"
          }`}
        >
          {isLooping ? "Stop Loop" : "Loop"}
        </button>
      </div>

      <div className="control-group">
        <div className="label-row">
          <span className="text-[10px] font-bold text-slate-400">Duration</span>
          <span className="val-badge text-[9px]">{animationDuration}s</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="5.0"
          step="0.1"
          value={animationDuration}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
          className="h-1"
        />
      </div>

      {/* Train Animation Settings */}
      {showTrainSettings && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Train Settings</span>
          
          {/* Train Length */}
          <div className="control-group">
            <div className="label-row">
              <span className="text-[10px] font-bold text-slate-400">Train Length</span>
              <span className="val-badge text-[9px]">{Math.round(trainSettings.trainLength * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={trainSettings.trainLength}
              onChange={(e) => handleTrainSettingChange("trainLength", parseFloat(e.target.value))}
              className="h-1"
            />
          </div>

          {/* Glow Intensity */}
          <div className="control-group">
            <div className="label-row">
              <span className="text-[10px] font-bold text-slate-400">Glow Intensity</span>
              <span className="val-badge text-[9px]">{Math.round(trainSettings.glowIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={trainSettings.glowIntensity}
              onChange={(e) => handleTrainSettingChange("glowIntensity", parseFloat(e.target.value))}
              className="h-1"
            />
          </div>

          {/* Glow Size */}
          <div className="control-group">
            <div className="label-row">
              <span className="text-[10px] font-bold text-slate-400">Glow Size</span>
              <span className="val-badge text-[9px]">{trainSettings.glowSize}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={trainSettings.glowSize}
              onChange={(e) => handleTrainSettingChange("glowSize", parseFloat(e.target.value))}
              className="h-1"
            />
          </div>

          {/* Train Color */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">Color</span>
            <select
              value={trainSettings.trainColor === "inherit" ? "inherit" : "custom"}
              onChange={(e) => {
                if (e.target.value === "inherit") {
                  handleTrainSettingChange("trainColor", "inherit");
                } else {
                  handleTrainSettingChange("trainColor", "#ffffff");
                }
              }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded py-1 text-[10px] outline-none cursor-pointer"
            >
              <option value="inherit">Use Element Color</option>
              <option value="custom">Custom Color</option>
            </select>
            {trainSettings.trainColor !== "inherit" && (
              <input
                type="color"
                value={trainSettings.trainColor}
                onChange={(e) => handleTrainSettingChange("trainColor", e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border border-slate-700"
              />
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1 pt-1 border-t border-slate-800">
        {isRectangle && (
          <button
            onClick={handleToggleVisibility}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            {isHidden ? "Show Box" : "Hide Box"}
          </button>
        )}
        <button
          onClick={handlePlayOnce}
          className={`${isRectangle ? "flex-1" : "w-full"} bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-[9px] font-black uppercase`}
        >
          Play Once
        </button>
      </div>
    </div>
  );
}
