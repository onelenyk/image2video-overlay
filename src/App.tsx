import { Canvas } from "./components/Canvas";
import { ControlPanel } from "./components/ControlPanel";
import { RecordingControl } from "./components/controls";

function App() {
  return (
    <div className="p-4 md:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <ControlPanel />
        <div className="flex flex-col gap-6">
          <RecordingControl />
          <Canvas />
        </div>
      </div>
    </div>
  );
}

export default App;
