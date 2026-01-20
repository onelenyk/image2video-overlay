import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import { formatRgba, parseRgbaInput } from "../../utils/color";

export function ElementsControl() {
  const {
    elements,
    activeElementId,
    updateElement,
    deleteElement,
    bringToFront,
    sendToBack,
    addElement,
    createImageComponent,
    savedImages,
    addSavedImage,
    setEditorMode,
    editorMode,
  } = useStore();

  const [svgText, setSvgText] = useState("");
  const [selectedSavedImage, setSelectedSavedImage] = useState("");
  const [rgbaInputValue, setRgbaInputValue] = useState("");

  const activeElement = elements.find((el) => el.id === activeElementId);

  const color = activeElement?.color || "#ef4444";
  const opacity = activeElement?.opacity || 0.4;
  const zIndex = activeElement?.zIndex || 100;

  // Sync rgba input value with element state
  useEffect(() => {
    setRgbaInputValue(formatRgba(color, opacity));
  }, [color, opacity]);

  const handleColorChange = (newColor: string) => {
    if (activeElement) {
      updateElement(activeElement.id, { color: newColor });
    }
  };

  const handleOpacityChange = (newOpacity: number) => {
    if (activeElement) {
      updateElement(activeElement.id, { opacity: newOpacity });
    }
  };

  const handleRgbaInput = (value: string) => {
    const result = parseRgbaInput(value);
    if (result && activeElement) {
      updateElement(activeElement.id, { color: result.hex, opacity: result.opacity });
    }
  };

  const handleZIndexChange = (newZIndex: number) => {
    if (activeElement) {
      updateElement(activeElement.id, { zIndex: newZIndex });
    }
  };

  const handleAddSvg = () => {
    if (svgText.trim()) {
      const imageComponent = createImageComponent(svgText, "svg", color, opacity);
      addElement(imageComponent);
      addSavedImage({ name: `SVG ${savedImages.length + 1}`, content: svgText, format: "svg", color, opacity });
      setSvgText("");
    }
  };

  const handleSvgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setSvgText(content);
        const imageComponent = createImageComponent(content, "svg", color, opacity);
        addElement(imageComponent);
        const fileName = file.name.replace(/\.svg$/i, "") || `SVG ${savedImages.length + 1}`;
        addSavedImage({ name: fileName, content, format: "svg", color, opacity });
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  const handlePngFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const imageComponent = createImageComponent(content, "png", "#ffffff", 1);
        addElement(imageComponent);
        const fileName = file.name.replace(/\.png$/i, "") || `PNG ${savedImages.length + 1}`;
        addSavedImage({ name: fileName, content, format: "png", color: "#ffffff", opacity: 1 });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleSelectSavedImage = (index: string) => {
    const idx = parseInt(index);
    if (!isNaN(idx) && savedImages[idx]) {
      const saved = savedImages[idx];
      const imageComponent = createImageComponent(saved.content, saved.format, saved.color, saved.opacity);
      addElement(imageComponent);
    }
    setSelectedSavedImage("");
  };

  const handleDelete = () => {
    if (activeElement) {
      // Don't allow deleting the last rectangle overlay
      const rectangles = elements.filter(
        (el) => el.type === "overlay" && (el as any).overlayType === "rectangle"
      );
      if (
        activeElement.type === "overlay" &&
        (activeElement as any).overlayType === "rectangle" &&
        rectangles.length <= 1
      ) {
        return;
      }
      deleteElement(activeElement.id);
    }
  };

  const handleStartDrawing = (mode: "draw-freehand" | "draw-straight") => {
    setEditorMode(mode);
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        2. Components
      </label>

      {/* Drawing tools */}
      <div className="space-y-2">
        <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider block">Draw Line</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleStartDrawing("draw-freehand")}
            className={`py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 ${
              editorMode === "draw-freehand"
                ? "bg-amber-500 text-black"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 17c3-3 6-10 9-10 1.5 0 3 3 4 6s2 5 5 5" />
            </svg>
            Freehand
          </button>
          <button
            onClick={() => handleStartDrawing("draw-straight")}
            className={`py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 ${
              editorMode === "draw-straight"
                ? "bg-amber-500 text-black"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="20" x2="20" y2="3" />
            </svg>
            Straight
          </button>
        </div>
      </div>

      {/* Image upload controls */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <span className="text-[8px] uppercase font-bold text-slate-600 tracking-wider block">Images</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-[9px] font-black uppercase text-center cursor-pointer flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <circle cx="8" cy="8" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            SVG
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleSvgFileUpload}
              className="hidden"
            />
          </label>
          <label className="bg-purple-600 hover:bg-purple-500 py-2 rounded-lg text-[9px] font-black uppercase text-center cursor-pointer flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <circle cx="8" cy="8" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            PNG
            <input
              type="file"
              accept=".png,image/png"
              onChange={handlePngFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Saved images */}
      {savedImages.length > 0 && (
        <select
          value={selectedSavedImage}
          onChange={(e) => handleSelectSavedImage(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 text-[10px] outline-none cursor-pointer"
        >
          <option value="">Select saved image...</option>
          {savedImages.map((img, index) => (
            <option key={index} value={index}>
              {img.name} ({img.format.toUpperCase()})
            </option>
          ))}
        </select>
      )}

      {/* SVG paste area */}
      <div className="space-y-2">
        <textarea
          value={svgText}
          onChange={(e) => setSvgText(e.target.value)}
          placeholder="Paste SVG code..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[9px] py-1.5 px-2 outline-none h-16 font-mono text-slate-300 placeholder-slate-500 resize-none"
        />
        {svgText && (
          <button
            onClick={handleAddSvg}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            Add Pasted SVG
          </button>
        )}
      </div>

      {/* Color controls */}
      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-slate-400">Color (RGBA)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-6 w-10 bg-transparent cursor-pointer rounded border border-slate-700"
              />
              <input
                type="text"
                value={rgbaInputValue}
                onChange={(e) => setRgbaInputValue(e.target.value)}
                onBlur={(e) => handleRgbaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRgbaInput((e.target as HTMLInputElement).value)}
                placeholder="rgba(r,g,b,a)"
                className="text-[8px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 w-24 outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>
          </div>
          <div className="control-group">
            <div className="label-row">
              <span className="text-[9px] font-bold text-slate-400">Opacity</span>
              <span className="val-badge text-[9px]">{opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="h-1"
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="label-row mb-1">
            <span className="text-[9px] font-bold text-slate-400">Z-Index</span>
            <span className="val-badge text-[9px]">{zIndex}</span>
          </div>
          <input
            type="range"
            min="1"
            max="1000"
            value={zIndex}
            onChange={(e) => handleZIndexChange(parseInt(e.target.value))}
            className="h-1"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 pt-1 border-t border-slate-800">
        <button
          onClick={handleDelete}
          className="flex-1 bg-red-700 hover:bg-red-600 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          Delete
        </button>
        <button
          onClick={() => activeElement && bringToFront(activeElement.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          Front
        </button>
        <button
          onClick={() => activeElement && sendToBack(activeElement.id)}
          className="flex-1 bg-blue-700 hover:bg-blue-600 py-2 rounded-lg text-[9px] font-black uppercase"
        >
          Back
        </button>
      </div>
    </div>
  );
}
