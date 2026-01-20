import { useStore } from "../store/useStore";
import {
  OverlayControl,
  ElementsControl,
  ImageControl,
  AnimationControl,
  PropertiesControl,
} from "./controls";

export function ControlPanel() {
  const { isRecording } = useStore();

  return (
    <div className="space-y-4 bg-slate-800/90 p-6 rounded-3xl border border-slate-700 h-fit shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-indigo-400 tracking-tight">
          Plan Highlighter Pro
        </h1>
        {isRecording && (
          <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse border border-red-500/30 uppercase tracking-widest">
            Recording
          </div>
        )}
      </div>

      <div className="space-y-3">
        <OverlayControl />
        <ElementsControl />
        <ImageControl />
        <AnimationControl />
        <PropertiesControl />
      </div>
    </div>
  );
}
