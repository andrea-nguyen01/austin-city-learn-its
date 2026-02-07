import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store';

const EyeTracker = () => {
  const { setDistracted } = useStore();
  const webcamRef = useRef(null);
  const [showDebug, setShowDebug] = useState(false);
  const [metrics, setMetrics] = useState({
    yaw: "0.00",
    pitch: "0.00",
    status: "Initializing..."
  });

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    if (webcamRef.current && webcamRef.current.video) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  const onResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setDistracted(true);
      setMetrics(prev => ({ ...prev, status: "NO FACE DETECTED" }));
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    // Yaw Calculation
    const distToLeft = Math.abs(nose.x - leftEar.x);
    const totalDist = Math.abs(leftEar.x - rightEar.x);
    const yawRatio = distToLeft / totalDist;

    // Pitch Calculation
    const earY = (leftEar.y + rightEar.y) / 2;
    const pitchDiff = nose.y - earY;

    // Thresholds
    const isDistractedNow = yawRatio < 0.30 || yawRatio > 0.70 || pitchDiff > 0.10;

    setDistracted(isDistractedNow);
    setMetrics({
      yaw: yawRatio.toFixed(2),
      pitch: pitchDiff.toFixed(2),
      status: isDistractedNow ? "❌ DISTRACTED" : "✅ FOCUSED"
    });
  };

  return (
    // CHANGED: 'bottom-5' -> 'top-5' to move it to the Top Left
    <div className="fixed top-5 left-5 z-50 flex flex-col items-start gap-2">
      
      {/* 1. TOGGLE BUTTON */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className={`px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-all border
          ${showDebug 
            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" 
            : "bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400"
          }`}
      >
        {showDebug ? "Hide Debug Overlay" : "Show Debug Overlay"}
      </button>

      {/* 2. THE DEBUG PANEL */}
      <div 
        className={`bg-black/90 p-3 rounded-xl border border-cyan-500/50 shadow-2xl backdrop-blur-md w-64 transition-all duration-300
          ${showDebug ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 pointer-events-none absolute"}`}
      >
        
        {/* A. Webcam Feed (ALWAYS MOUNTED) */}
        <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-3">
          <Webcam 
            ref={webcamRef} 
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-full h-[1px] bg-cyan-500 absolute"></div>
            <div className="h-full w-[1px] bg-cyan-500 absolute"></div>
          </div>
        </div>

        {/* B. Metrics */}
        <div className="font-mono text-[10px] space-y-1">
          <div className={`text-center font-bold text-sm mb-2 p-1 rounded
            ${metrics.status.includes("FOCUSED") ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
            {metrics.status}
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            <div className="bg-gray-800 p-1 rounded">
              <span className="block text-cyan-500 text-[8px] uppercase">Yaw Ratio</span>
              {metrics.yaw}
            </div>
            <div className="bg-gray-800 p-1 rounded">
              <span className="block text-purple-500 text-[8px] uppercase">Pitch Diff</span>
              {metrics.pitch}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EyeTracker;