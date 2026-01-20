export function replaceCurrentColorInSvgXml(svgXml: string, actualColor: string): string {
  // Replace fill="currentColor" and fill='currentColor' with actual color
  let result = svgXml.replace(/fill=["']currentColor["']/gi, `fill="${actualColor}"`);
  // Replace stroke="currentColor" and stroke='currentColor' with actual color
  result = result.replace(/stroke=["']currentColor["']/gi, `stroke="${actualColor}"`);
  return result;
}

export function parseSvgContent(svgContent: string): SVGSVGElement | null {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
  return svgDoc.querySelector("svg");
}

export function prepareSvgForDisplay(svgContent: string): string {
  const parsedSvg = parseSvgContent(svgContent);
  if (!parsedSvg) return svgContent;

  // Extract viewBox for proper scaling
  const viewBox = parsedSvg.getAttribute("viewBox") || "0 0 24 24";
  parsedSvg.setAttribute("viewBox", viewBox);
  parsedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Remove class attributes that might interfere
  parsedSvg.removeAttribute("class");

  // Update fill/stroke to currentColor if they exist
  if (parsedSvg.hasAttribute("fill")) {
    const fillValue = parsedSvg.getAttribute("fill");
    if (fillValue !== "none") {
      parsedSvg.setAttribute("fill", "currentColor");
    }
  }

  parsedSvg.querySelectorAll("[fill]").forEach((el) => {
    const fillValue = el.getAttribute("fill");
    if (fillValue && fillValue !== "none") {
      el.setAttribute("fill", "currentColor");
    }
  });

  if (parsedSvg.hasAttribute("stroke")) {
    const strokeValue = parsedSvg.getAttribute("stroke");
    if (strokeValue && strokeValue !== "none") {
      parsedSvg.setAttribute("stroke", "currentColor");
    }
  }

  parsedSvg.querySelectorAll("[stroke]").forEach((el) => {
    const strokeValue = el.getAttribute("stroke");
    if (strokeValue && strokeValue !== "none") {
      el.setAttribute("stroke", "currentColor");
    }
  });

  return parsedSvg.outerHTML;
}

export async function createSvgImageCache(
  svgElement: SVGSVGElement,
  color: string
): Promise<{ url: string; image: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    let svgData = new XMLSerializer().serializeToString(svgElement);
    svgData = replaceCurrentColorInSvgXml(svgData, color);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => resolve({ url, image: img });
    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = url;
  });
}
