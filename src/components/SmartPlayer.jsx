import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';

const SmartPlayer = () => {
  const { isDistracted, startCalibration } = useStore();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // STATE: Start Empty
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState("");

  // LOGIC: Debounced Play/Pause based on Distraction
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return; 

    if (isDistracted) {
      video.pause();
      console.log("⏸ Pausing Video (Distracted)");
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log("▶️ Playing Video (Focused)"))
          .catch(error => console.log("Auto-play prevented:", error));
      }
    }
  }, [isDistracted, videoUrl]);

  // HANDLE FILE UPLOAD
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setFileName(`📂 ${file.name}`);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-10">
      
      {/* 1. CONTROL BAR (Now holds Recalibrate AND Upload) */}
      <div className="flex justify-between items-center mb-4 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
        <div className="text-white font-mono text-sm truncate max-w-[200px] md:max-w-md">
          {fileName || "Waiting for upload..."}
        </div>
        
        <div className="flex gap-3">
          {/* --- MOVED RECALIBRATE BUTTON HERE --- */}
          <button 
            onClick={startCalibration}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold transition text-sm border border-gray-600"
          >
            🎯 Recalibrate
          </button>

          {/* Hidden Input + Styled Button */}
          <input 
            type="file" 
            accept="video/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 text-sm"
          >
            <span>📤</span> Upload
          </button>
        </div>
      </div>

      {/* 2. THE PLAYER CONTAINER */}
      <div className="relative aspect-video shadow-2xl rounded-xl overflow-hidden bg-black border-4 border-gray-800 group">
        
        {/* --- STATE A: EMPTY (WAITING FOR UPLOAD) --- */}
        {!videoUrl && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-900 transition"
            onClick={() => fileInputRef.current.click()} 
          >
            <div className="text-6xl mb-4 opacity-50">📂</div>
            <h2 className="text-2xl font-bold text-gray-400">No Video Loaded</h2>
            <p className="text-gray-500 mt-2">Click here to upload your lecture</p>
          </div>
        )}

        {/* --- STATE B: VIDEO LOADED --- */}
        {videoUrl && (
          <>
            {/* The Blur Overlay */}
            <div 
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300`}
              style={{ 
                opacity: isDistracted ? 1 : 0, 
                pointerEvents: isDistracted ? 'auto' : 'none' 
              }}
            >
              <div className="text-center text-white p-6 bg-white/10 rounded-2xl border border-white/20 shadow-xl">
                <div className="text-6xl mb-4">👀</div>
                <h2 className="text-4xl font-extrabold mb-2">FOCUS LOST</h2>
                <p className="text-lg text-gray-200">Look back to resume.</p>
              </div>
            </div>

            {/* Native Video Tag */}
            <video
              key={videoUrl}
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              controls={true}
              muted={false} 
              playsInline
            />
          </>
        )}
      </div>
      
      <p className="text-gray-500 text-center mt-4 text-xs font-mono">
        Status: {videoUrl ? (isDistracted ? "❌ DISTRACTED" : "✅ FOCUSED") : "WAITING..."}
      </p>
    </div>
  );
};

export default SmartPlayer;
