import React from 'react';
import EyeTracker from './components/EyeTracker';
import SmartPlayer from './components/SmartPlayer';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-5 text-white">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-8 text-blue-400">FocusFlow 🧠</h1>
      
      {/* THE MAIN VIDEO PLAYER */}
      <SmartPlayer />

      {/* THE HIDDEN EYE TRACKER */}
      <EyeTracker />
      
      {/* DEBUG TEXT (To prove it's working) */}
      <p className="mt-10 text-gray-500 text-sm">
        Camera active? If you see this text, React is running.
      </p>
    </div>
  );
}

export default App;