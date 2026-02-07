import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store';

const EyeTracker = () => {
  const webcamRef = useRef(null);
  const { setDistracted, isCalibrating, setCalibration, calibration } = useStore();
  
  // DEBUG STATE: Store values to display on screen
  const [debugValues, setDebugValues] = useState({ yaw: 0, pitch: 0, status: "Unknown" });

  const onResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const landmarks = results.multiFaceLandmarks[0];

    // --- GEOMETRY MATH ---
    // Nose Tip: 1, Left Ear: 234, Right Ear: 454
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    // Calculate Center X of your head (Average of ears)
    const earMidpointX = (leftEar.x + rightEar.x) / 2;
    const earMidpointY = (leftEar.y + rightEar.y) / 2;

    // RAW MOVEMENTS
    // Yaw: Positive = Turning Left (usually), Negative = Turning Right
    const rawYaw = nose.x - earMidpointX;
    // Pitch: Positive = Looking Down, Negative = Looking Up
    const rawPitch = nose.y - earMidpointY;

    // --- CALIBRATION ---
    if (isCalibrating) {
      setCalibration(rawPitch, rawYaw);
      return;
    }

    // --- NORMALIZED VALUES (Current - Calibrated) ---
    const yaw = rawYaw - calibration.yawOffset;
    const pitch = rawPitch - calibration.pitchOffset;

    // --- SENSITIVITY SETTINGS (Lower = More Sensitive) ---
    const YAW_THRESHOLD = 0.04;  // Try lowering this if it won't trigger (e.g. 0.02)
    const PITCH_THRESHOLD = 0.03;

    // LOGIC: Distracted if turning head significantly Left or Right
    const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD;
    
    // UPDATE STATE
    // We send 'true' if distracted, 'false' if focused
    setDistracted(isLookingAway);

    // UPDATE DEBUG DISPLAY (For you to see)
    setDebugValues({
      yaw: yaw.toFixed(3),
      pitch: pitch.toFixed(3),
      status: isLookingAway ? "❌ DISTRACTED" : "✅ FOCUSED"
    });
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults(onResults);

    if (webcamRef.current) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640, height: 480
      });
      camera.start();
    }
  }, [isCalibrating]);

  return (
    <div className="fixed top-5 left-5 z-50">
      {/* 1. VISIBLE WEBCAM (So you know it's working) */}
      <Webcam 
        ref={webcamRef} 
        className="w-48 rounded-lg shadow-lg mb-2" 
        mirrored={true} // Flip if looking Left moves the number the wrong way
      />
      
      {/* 2. DATA BOX (The Matrix View) */}
      <div className="bg-black/80 text-white p-4 rounded font-mono text-sm border border-green-500">
        <p className="font-bold text-green-400 mb-2">👁 SYSTEM DIAGNOSTICS</p>
        <p>STATUS: <span className={debugValues.status.includes("DISTRACTED") ? "text-red-500 font-bold" : "text-green-500"}>{debugValues.status}</span></p>
        <hr className="border-gray-600 my-2"/>
        <p>Yaw (Turn): {debugValues.yaw}</p>
        <p>Threshold: 0.04</p>
        <p className="text-gray-400 text-xs mt-2">
          (If Yaw &gt; 0.04, it pauses)
        </p>
      </div>
    </div>
  );
};

export default EyeTracker;