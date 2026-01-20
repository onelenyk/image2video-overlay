import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import { formatRgba, parseRgbaInput } from "../../utils/color";
import type { ArrowType } from "../../types";

export function ElementsControl() {
  const {
    elements,
    activeElementId,
    updateElement,
    deleteElement,
    bringToFront,
    sendToBack,
    addElement,
    createArrow,
    createSvgElement,
    savedSvgs,
    addSavedSvg,
  } = useStore();

  const [arrowType, setArrowType] = useState<ArrowType>("simple");
  const [svgText, setSvgText] = useState("");
  const [selectedSavedSvg, setSelectedSavedSvg] = useState("");
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

  const handleAddArrow = () => {
    const arrow = createArrow(arrowType, color, opacity);
    addElement(arrow);
  };

  const handleDuplicateArrow = () => {
    // Duplicate with same settings
    const arrow = createArrow(arrowType, color, opacity);
    addElement(arrow);
  };

  const handleAddSvg = () => {
    if (svgText.trim()) {
      const svgElement = createSvgElement(svgText, color, opacity);
      addElement(svgElement);
      addSavedSvg({ name: `SVG ${savedSvgs.length + 1}`, content: svgText, color, opacity });
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
        const svgElement = createSvgElement(content, color, opacity);
        addElement(svgElement);
        const fileName = file.name.replace(/\.svg$/i, "") || `SVG ${savedSvgs.length + 1}`;
        addSavedSvg({ name: fileName, content, color, opacity });
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  const handleSelectSavedSvg = (index: string) => {
    const idx = parseInt(index);
    if (!isNaN(idx) && savedSvgs[idx]) {
      const saved = savedSvgs[idx];
      const svgElement = createSvgElement(saved.content, saved.color, saved.opacity);
      addElement(svgElement);
    }
    setSelectedSavedSvg("");
  };

  const handleDelete = () => {
    if (activeElement) {
      // Don't allow deleting the last overlay
      const overlays = elements.filter((el) => el.type === "overlay");
      if (activeElement.type === "overlay" && overlays.length <= 1) {
        return;
      }
      deleteElement(activeElement.id);
    }
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        2. Elements
      </label>

      {/* Arrow controls */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={arrowType}
          onChange={(e) => setArrowType(e.target.value as ArrowType)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[10px] outline-none cursor-pointer"
        >
          <option value="simple">Arrow</option>
          <option value="diagonal">Diagonal</option>
          <option value="right">Right</option>
          <option value="curved">Curved</option>
          <option value="double">Double</option>
        </select>
        <div className="flex gap-1">
          <button
            onClick={handleAddArrow}
            className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            Add
          </button>
          <button
            onClick={handleDuplicateArrow}
            className="flex-1 bg-green-700 hover:bg-green-600 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            Duplicate
          </button>
        </div>
      </div>

      {/* SVG controls */}
      <div className="grid grid-cols-2 gap-2">
        <label className="bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-[9px] font-black uppercase text-center cursor-pointer">
          Upload SVG
          <input
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleSvgFileUpload}
            className="hidden"
          />
        </label>
        <div className="flex gap-1">
          <button
            onClick={handleAddSvg}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            Add
          </button>
          <button
            onClick={handleAddSvg}
            className="flex-1 bg-indigo-700 hover:bg-indigo-600 py-2 rounded-lg text-[9px] font-black uppercase"
          >
            Duplicate
          </button>
        </div>
      </div>

      <select
        value={selectedSavedSvg}
        onChange={(e) => handleSelectSavedSvg(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 text-[10px] outline-none cursor-pointer"
      >
        <option value="">Select saved SVG...</option>
        {savedSvgs.map((svg, index) => (
          <option key={index} value={index}>
            {svg.name}
          </option>
        ))}
      </select>

      <textarea
        value={svgText}
        onChange={(e) => setSvgText(e.target.value)}
        placeholder="Paste SVG..."
        className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[9px] py-1.5 px-2 outline-none h-16 font-mono text-slate-300 placeholder-slate-500 resize-none"
      />

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
