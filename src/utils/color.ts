export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function rgbToHex(rgb: string): string {
  if (!rgb || rgb === "rgba(0, 0, 0, 0)") return "#ef4444";
  const vals = rgb.match(/\d+/g);
  if (!vals) return "#ef4444";
  return (
    "#" +
    vals
      .slice(0, 3)
      .map((x) => parseInt(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function parseRgbaInput(value: string): { hex: string; opacity: number } | null {
  if (!value || !value.trim()) return null;

  // Try rgba/rgb format: rgba(255,0,0,0.5) or rgb(255,0,0)
  const rgbaMatch = value.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

    const hex =
      "#" +
      [r, g, b]
        .map((x) => {
          const h = Math.min(255, Math.max(0, x)).toString(16);
          return h.length === 1 ? "0" + h : h;
        })
        .join("");

    return { hex, opacity: Math.min(1, Math.max(0, a)) };
  }

  // Try hex with alpha: #rrggbbaa or #rgba
  const hexAlphaMatch = value.match(/#([0-9a-f]{8}|[0-9a-f]{4})/i);
  if (hexAlphaMatch) {
    const hex = hexAlphaMatch[1];
    let r: number, g: number, b: number, a: number;

    if (hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
      a = parseInt(hex[3] + hex[3], 16) / 255;
    }

    const hexColor =
      "#" +
      [r, g, b]
        .map((x) => {
          const h = Math.min(255, Math.max(0, x)).toString(16);
          return h.length === 1 ? "0" + h : h;
        })
        .join("");

    return { hex: hexColor, opacity: Math.min(1, Math.max(0, a)) };
  }

  // Try regular hex: #rrggbb or #rgb
  const hexMatch = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    let r: number, g: number, b: number;

    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    }

    const hexColor =
      "#" +
      [r, g, b]
        .map((x) => {
          const h = Math.min(255, Math.max(0, x)).toString(16);
          return h.length === 1 ? "0" + h : h;
        })
        .join("");

    return { hex: hexColor, opacity: 1 };
  }

  return null;
}

export function formatRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}
