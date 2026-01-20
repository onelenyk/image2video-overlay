import { useStore } from "../../store/useStore";

export function ImageControl() {
  const { backgroundImage, setBackgroundImage } = useStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img, dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-3">
      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">
        3. Plan Image
      </span>
      <label className="w-full bg-slate-100 text-slate-900 py-2.5 rounded-lg text-[10px] font-black uppercase hover:bg-white transition-all cursor-pointer block text-center">
        Upload
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>
      {backgroundImage ? (
        <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span>Original:</span>
            <span className="font-bold">{backgroundImage.width} x {backgroundImage.height}</span>
          </div>
          {(backgroundImage.width % 2 !== 0 || backgroundImage.height % 2 !== 0) && (
            <div className="flex items-center justify-between text-amber-500">
              <span>Video size:</span>
              <span className="font-bold">
                {Math.ceil(backgroundImage.width / 2) * 2} x {Math.ceil(backgroundImage.height / 2) * 2}
              </span>
            </div>
          )}
          {(backgroundImage.width % 2 !== 0 || backgroundImage.height % 2 !== 0) && (
            <p className="text-[8px] text-slate-500">
              H.264 requires even dimensions
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800">
          <span>Size:</span>
          <span className="font-bold">Ready</span>
        </div>
      )}
    </div>
  );
}
