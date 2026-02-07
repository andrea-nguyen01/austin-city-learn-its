import React, { useRef, useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useStore } from '../store';

const SmartPlayer = () => {
  const { isDistracted, startCalibration } = useStore();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // STATE
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  
  // UI STATE: Track List Toggle
  const [showTrackList, setShowTrackList] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, text: "Review Intro", completed: false },
    { id: 2, text: "Chapter 1 Notes", completed: false }
  ]);
  const [newTask, setNewTask] = useState("");

  // AUDIO REFS
  const noiseSynth = useRef(null);
  const vinylPlayer = useRef(null);

  // --- 1. SETUP AUDIO ENGINE ---
  useEffect(() => {
    const noise = new Tone.Noise("pink").start();
    const filter = new Tone.Filter(400, "lowpass").toDestination();
    noise.connect(filter);
    noise.volume.value = -Infinity;
    noiseSynth.current = noise;

    const synth = new Tone.MembraneSynth().toDestination();
    vinylPlayer.current = synth;

    return () => {
      noise.dispose();
      synth.dispose();
    };
  }, []);

  // --- 2. LOGIC LOOP (Rewind + Pause) ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !isAudioStarted) return; 

    if (isDistracted) {
      // --- STATE: DISTRACTED ---
      
      // A. Rewind 3 Seconds (The "Smart" Feature)
      // We check if video is playing to avoid double-rewinding if already paused
      if (!video.paused) {
        console.log("⏪ Rewinding 5s for context...");
        video.currentTime = Math.max(0, video.currentTime - 5);
      }

      // B. Pause Video
      video.pause();

      // C. Audio Effects (Vinyl Stop)
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-Infinity, 0.1);
      if (vinylPlayer.current) vinylPlayer.current.triggerAttackRelease("C1", "8n");

    } else {
      // --- STATE: FOCUSED ---
      video.play().catch(e => console.log("Auto-play blocked:", e));
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-20, 2); 
    }
  }, [isDistracted, videoUrl, isAudioStarted]);

  // HANDLERS
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await Tone.start();
      setIsAudioStarted(true);
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setFileName(file.name);
    }
  };

  const addTask = (e) => {
    if (e.key === 'Enter' && newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
      setNewTask("");
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    // WRAPPER: Handles "Stage Lights" dimming
    <div className={`transition-all duration-1000 ease-in-out min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden
      ${isDistracted ? "bg-gray-900" : "bg-black"}`}
    >
      
      {/* "Spotlight" Overlay */}
      <div className={`fixed inset-0 bg-black pointer-events-none transition-opacity duration-1000 z-0 
        ${!isDistracted && videoUrl ? "opacity-80" : "opacity-0"}`} 
      />

      {/* --- HEADER --- */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-tighter"
            style={{ fontFamily: 'Impact, sans-serif' }}>
          HEADLINER
        </h1>
        <p className="text-purple-300 tracking-[0.3em] text-xs font-bold mt-2">
          {fileName ? `NOW PLAYING: ${fileName}` : "AUSTIN CITY LEARN-ITS EDITION"}
        </p>
      </div>

      {/* --- MAIN STAGE (CENTERED VIDEO) --- */}
      <div className={`relative w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden bg-black border-4 transition-all duration-300 ease-in-out group z-20
          ${videoUrl 
            ? (isDistracted 
                ? 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.9)] animate-pulse' 
                : 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]')
            : 'border-gray-800'
          }`}
      >
        {!videoUrl ? (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-900 transition"
            onClick={() => fileInputRef.current.click()} 
          >
            <div className="text-8xl mb-6 opacity-50 animate-bounce">🎸</div>
            <h2 className="text-4xl font-bold text-white tracking-tight">STAGE EMPTY</h2>
            <button className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500 rounded font-mono uppercase hover:bg-cyan-500 hover:text-black transition">
              Load Video Here 
            </button>
          </div>
        ) : (
          <>
            {/* DISTRACTION OVERLAY */}
            <div 
              className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-200`}
              style={{ 
                opacity: isDistracted ? 1 : 0, 
                pointerEvents: isDistracted ? 'auto' : 'none' 
              }}
            >
              <div className="text-center p-8 border-4 border-red-600 bg-red-900/20 shadow-[0_0_100px_rgba(220,38,38,0.5)] transform scale-110">
                <h2 className="text-6xl font-black text-red-500 mb-2 tracking-tighter">REWINDING...</h2>
                <p className="text-xl text-white font-mono uppercase tracking-widest">Focus Lost • Backing up 5secs</p>
              </div>
            </div>

            <video
              key={videoUrl}
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              controls={true}
              playsInline
            />
          </>
        )}
      </div>

      {/* --- CONTROL BAR (BOTTOM) --- */}
      <div className="mt-8 flex gap-4 z-20">
         
         {/* Calibration Button */}
         <button 
            onClick={startCalibration} 
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold border border-gray-600 uppercase tracking-wider text-sm transition"
         >
           ⚖️ Calibrate
         </button>

         {/* Upload Button */}
         <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
         <button 
            onClick={() => fileInputRef.current.click()} 
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/30 uppercase tracking-wider text-sm transition"
         >
           💿 Change Disk
         </button>

         {/* Track List Toggle */}
         <button 
            onClick={() => setShowTrackList(!showTrackList)} 
            className={`px-6 py-3 rounded-lg font-bold border uppercase tracking-wider text-sm transition flex items-center gap-2
              ${showTrackList 
                ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                : "bg-gray-800 text-purple-300 border-gray-600 hover:border-purple-400"}`}
         >
           <span>📝</span> Track List
         </button>
      </div>

      {/* --- TRACK LIST (COLLAPSIBLE DRAWER) --- */}
      <div 
        className={`fixed bottom-0 right-0 md:right-10 md:bottom-10 w-full md:w-80 bg-gray-900 border-2 border-purple-500/50 rounded-t-xl md:rounded-xl shadow-2xl transition-transform duration-300 ease-in-out z-40 overflow-hidden
          ${showTrackList ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"}`}
      >
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-white font-bold font-mono tracking-wider">TRACK LIST</h3>
          <button onClick={() => setShowTrackList(false)} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {/* Add Task */}
          <input 
            type="text" 
            placeholder="+ Add track..." 
            className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white mb-3 focus:border-purple-500 outline-none text-sm font-mono"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={addTask}
          />
          
          {/* List */}
          <div className="space-y-2">
            {tasks.map(task => (
              <div 
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-2 rounded cursor-pointer border transition-all duration-200 flex items-center gap-3
                  ${task.completed 
                    ? "bg-gray-800/50 border-transparent opacity-50" 
                    : "bg-gray-800 border-gray-700 hover:border-purple-500"}`}
              >
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center
                  ${task.completed ? "bg-purple-500 border-purple-500" : "border-gray-500"}`}
                />
                <span className={`text-sm font-mono ${task.completed ? "line-through text-gray-500" : "text-gray-200"}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SmartPlayer;
