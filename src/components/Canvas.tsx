import { useRef } from "react";
import { useStore } from "../store/useStore";
import { OverlayBox } from "./OverlayBox";
import { ArrowElement } from "./ArrowElement";
import { SvgElement } from "./SvgElement";

export function Canvas() {
  const { elements, backgroundImage, backgroundDataUrl } = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const aspectRatio = backgroundImage
    ? `${backgroundImage.width} / ${backgroundImage.height}`
    : "9/16";

  return (
    <div className="flex flex-col items-center sticky top-8 lg:mt-6">
      <div
        className="canvas-wrapper ring-8 ring-slate-800/50"
        id="canvas-wrapper"
        style={{ aspectRatio }}
      >
        {backgroundImage && (
          <div id="size-badge">
            {backgroundImage.width} x {backgroundImage.height}
          </div>
        )}
        <div
          id="main-canvas"
          ref={canvasRef}
          style={{
            backgroundImage: backgroundDataUrl ? `url(${backgroundDataUrl})` : undefined,
          }}
        >
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
              switch (element.type) {
                case "overlay":
                  return (
                    <OverlayBox
                      key={element.id}
                      element={element}
                      containerRef={canvasRef}
                    />
                  );
                case "arrow":
                  return (
                    <ArrowElement
                      key={element.id}
                      element={element}
                      containerRef={canvasRef}
                    />
                  );
                case "svg":
                  return (
                    <SvgElement
                      key={element.id}
                      element={element}
                      containerRef={canvasRef}
                    />
                  );
                default:
                  return null;
              }
            })}
        </div>
      </div>
      <div className="canvas-info-overlay mt-6 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
          <span className="text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
            {backgroundImage ? `${backgroundImage.width} x ${backgroundImage.height}` : "Ready"}
          </span>
        </div>
        <p className="text-slate-600 text-[9px] font-medium max-w-[300px]">
          Project adjusts to image aspect ratio. All elements are tracked in export.
        </p>
      </div>
    </div>
  );
}
