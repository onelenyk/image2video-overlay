import { useStore } from "../../store/useStore";
import { useRecording } from "../../hooks/useRecording";
import type { VideoFormat, DurationMode } from "../../types";

export function RecordingControl() {
  const {
    elements,
    activeElementId,
    recordingSettings,
    setRecordingSettings,
    backgroundImage,
    reset,
    updateElement,
  } = useStore();

  const { isRecording, isConverting, conversionProgress, startRecording, stopRecording, recordAutoLoop, downloadPng } =
    useRecording();

  const { bitrate, fps, videoFormat, durationMode, videoDuration } = recordingSettings;

  // Get active element's animation duration (works for all types now)
  const activeElement = elements.find((el) => el.id === activeElementId);
  const animationDuration = (activeElement as any)?.animationDuration ?? 1.5;

  // Calculate effective duration based on mode
  const effectiveDuration = durationMode === "animation" ? animationDuration : videoDuration;

  const getOutputSize = (): string => {
    if (backgroundImage) {
      // H.264 requires even dimensions
      const width = Math.ceil(backgroundImage.width / 2) * 2;
      const height = Math.ceil(backgroundImage.height / 2) * 2;
      return `${width}x${height}`;
    }
    return "1920x1080";
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAutoRecord = () => {
    if (!isRecording) {
      // If in animation mode, enable animation on the active element and set it to loop
      if (durationMode === "animation" && activeElement) {
        updateElement(activeElement.id, { 
          animationEnabled: true,
          isLooping: true 
        });
      }
      
      const durationMs = effectiveDuration * 1000;
      recordAutoLoop(durationMs);
    }
  };

  const formatLabels: Record<string, string> = {
    "webm-vp8": "WebM",
    "webm-vp9": "WebM (VP9)",
    webm: "WebM (Auto)",
    mp4: "MP4 (iPhone)",
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        5. Recording
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleRecordToggle}
          className={`py-3 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 ${
            isRecording
              ? "bg-red-600 hover:bg-red-500"
              : "bg-red-600 hover:bg-red-500"
          }`}
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {isRecording ? "Stop" : "Record"}
        </button>
        <button
          onClick={handleAutoRecord}
          disabled={isRecording}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg text-[10px] font-black uppercase"
        >
          Auto ({effectiveDuration}s)
        </button>
      </div>

      <div className="pt-1 border-t border-slate-800 space-y-2">
        {/* Duration Mode */}
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Video Duration</span>
            <span className="val-badge text-[9px]">{effectiveDuration}s</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setRecordingSettings({ durationMode: "animation" as DurationMode })}
              className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-colors ${
                durationMode === "animation"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Animation ({animationDuration}s)
            </button>
            <button
              onClick={() => setRecordingSettings({ durationMode: "custom" as DurationMode })}
              className={`flex-1 py-1.5 rounded text-[9px] font-bold transition-colors ${
                durationMode === "custom"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Custom
            </button>
          </div>
          {durationMode === "custom" && (
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={videoDuration}
              onChange={(e) => setRecordingSettings({ videoDuration: parseFloat(e.target.value) })}
              className="h-1 mt-2"
            />
          )}
        </div>

        {/* Bitrate */}
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Bitrate (Mbps)</span>
            <span className="val-badge text-[9px]">{bitrate}</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={bitrate}
            onChange={(e) => setRecordingSettings({ bitrate: parseInt(e.target.value) })}
            className="h-1"
          />
        </div>

        {/* FPS */}
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Frame Rate (fps)</span>
            <span className="val-badge text-[9px]">{fps}</span>
          </div>
          <input
            type="range"
            min="15"
            max="60"
            step="1"
            value={fps}
            onChange={(e) => setRecordingSettings({ fps: parseInt(e.target.value) })}
            className="h-1"
          />
        </div>

        {/* Video Format */}
        <div className="control-group">
          <div className="label-row">
            <span className="text-[9px] font-bold text-slate-400">Video Format</span>
            <span className="val-badge text-[9px]">{formatLabels[videoFormat] || "WebM"}</span>
          </div>
          <select
            value={videoFormat}
            onChange={(e) =>
              setRecordingSettings({ videoFormat: e.target.value as VideoFormat })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 text-[10px] outline-none cursor-pointer"
          >
            <option value="mp4">MP4 - iPhone/Universal</option>
            <option value="webm-vp8">WebM (VP8)</option>
            <option value="webm-vp9">WebM (VP9)</option>
          </select>
          {videoFormat === "mp4" && (
            <p className="text-[8px] text-amber-500 mt-1">
              Converting to MP4 may take a moment
            </p>
          )}
        </div>

        {/* Conversion Progress */}
        {isConverting && (
          <div className="pt-2">
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-slate-400">Converting to MP4...</span>
              <span className="text-amber-500 font-bold">{conversionProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div 
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${conversionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Output info */}
        <div className="text-[8px] text-slate-500 pt-1 border-t border-slate-800">
          <div className="flex justify-between">
            <span>Output:</span>
            <span className="font-bold text-slate-400">
              {getOutputSize()} @ {fps}fps
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={downloadPng}
          disabled={isConverting}
          className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 py-2.5 rounded-lg text-[9px] font-black uppercase"
        >
          Save PNG
        </button>
        <button
          onClick={reset}
          disabled={isConverting}
          className="flex-1 bg-slate-700 hover:bg-red-900/40 disabled:opacity-50 py-2.5 rounded-lg text-[9px] font-black uppercase"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
