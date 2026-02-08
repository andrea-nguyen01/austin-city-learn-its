import React from 'react';
import EyeTracker from './components/EyeTracker';
import SmartPlayer from './components/SmartPlayer';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-5 text-white">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-8 text-blue-400">Austin City Learn-its 🎸🎵</h1>
      
      {/* THE MAIN VIDEO PLAYER */}
      <SmartPlayer />

      {/* THE HIDDEN EYE TRACKER */}
      <EyeTracker />
      

    </div>
  );
}

export default App;