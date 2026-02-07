import React, { useRef, useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useStore } from '../store';

// --- DEMO DATA ---
const DEMO_CHAPTERS = [
  { time: 0, title: "Algorithm Scope & Graph Types" },
  { time: 8, title: "Dijkstra vs. Minimum Spanning Trees" },
  { time: 14, title: "Initialization & Distance Table Setup" },
  { time: 46, title: "Edge Relaxation & Distance Updates" }
];

const MIC_CHECK_DATA = {
  triggerTime: 10,
  question: "Based on the introduction, how does Dijkstra's objective differ from a Minimum Spanning Tree (MST)?",
  choices: [
    "Dijkstra connects all nodes with the lowest total weight.",
    "Dijkstra finds the shortest path from a source to all other nodes.",
    "Dijkstra only works on undirected graphs.",
    "There is no difference between the two."
  ],
  correctIndex: 1
};

const SmartPlayer = () => {
  const { isDistracted, startCalibration } = useStore();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // STATE
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  
  // MIC CHECK STATE
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null); 
  const [isCorrect, setIsCorrect] = useState(null); 
  const [completedMicChecks, setCompletedMicChecks] = useState(new Set()); // Prevents re-triggering

  // AUDIO REFS
  const noiseSynth = useRef(null);
  const feedbackSynth = useRef(null);
  const vinylPlayer = useRef(null);

  // --- 1. SETUP AUDIO ENGINE ---
  useEffect(() => {
    const noise = new Tone.Noise("pink").start();
    const filter = new Tone.Filter(400, "lowpass").toDestination();
    noise.connect(filter);
    noise.volume.value = -Infinity;
    noiseSynth.current = noise;

    const poly = new Tone.PolySynth().toDestination();
    feedbackSynth.current = poly;

    const vinyl = new Tone.MembraneSynth().toDestination();
    vinylPlayer.current = vinyl;

    return () => {
      noise.dispose();
      poly.dispose();
      vinyl.dispose();
    };
  }, []);

  // --- 2. LOGIC LOOP (Rewind, Noise, & Trigger) ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !isAudioStarted) return; 

    const handleTimeUpdate = () => {
        const currentTime = Math.floor(video.currentTime);
        // Trigger only if at the time, not currently showing, and not already completed
        if (currentTime === MIC_CHECK_DATA.triggerTime && !showMicCheck && !completedMicChecks.has(currentTime)) {
            video.pause();
            setShowMicCheck(true);
        }
    };
    video.addEventListener('timeupdate', handleTimeUpdate);

    if (isDistracted) {
      if (!video.paused) {
        video.currentTime = Math.max(0, video.currentTime - 5);
        if (vinylPlayer.current) vinylPlayer.current.triggerAttackRelease("C1", "8n");
      }
      video.pause();
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-Infinity, 0.1);
    } else if (!showMicCheck) {
      video.play().catch(e => console.log("Auto-play blocked:", e));
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-20, 2); 
    }

    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isDistracted, videoUrl, isAudioStarted, showMicCheck, completedMicChecks]);

  // --- 3. ANSWER HANDLER ---
  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    const correct = index === MIC_CHECK_DATA.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      feedbackSynth.current.triggerAttackRelease(["C4", "E4", "G4"], "4n");
      // Mark this trigger time as completed
      setCompletedMicChecks(prev => new Set(prev).add(MIC_CHECK_DATA.triggerTime));
      
      setTimeout(() => {
        setShowMicCheck(false);
        setIsCorrect(null);
        setSelectedAnswer(null);
      }, 1500);
    } else {
      feedbackSynth.current.triggerAttackRelease(["F#2", "G2"], "2n");
      setTimeout(() => {
        videoRef.current.currentTime = 0; 
        setShowMicCheck(false);
        setIsCorrect(null);
        setSelectedAnswer(null);
      }, 1500);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await Tone.start();
      setIsAudioStarted(true);
      setVideoUrl(URL.createObjectURL(file));
      setFileName(file.name);
    }
  };

  return (
    <div className={`transition-all duration-1000 ease-in-out min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden
      ${isDistracted ? "bg-gray-900" : "bg-black"}`}
    >
      <div className={`fixed inset-0 bg-black pointer-events-none transition-opacity duration-1000 z-0 
        ${!isDistracted && videoUrl ? "opacity-80" : "opacity-0"}`} 
      />

      {/* --- HEADER --- */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-tighter"
            style={{ fontFamily: 'Impact, sans-serif' }}>
          HEADLINER
        </h1>
        <p className="text-purple-300 tracking-[0.3em] text-xs font-bold mt-2 uppercase">
          {fileName ? `NOW PLAYING: ${fileName}` : "AUSTIN CITY LEARN-ITS EDITION"}
        </p>
      </div>

      {/* --- MAIN STAGE --- */}
      <div className={`relative w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden bg-black border-4 transition-all duration-300 ease-in-out group z-20
          ${videoUrl 
            ? (isDistracted 
                ? 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.9)] animate-pulse' 
                : 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]')
            : 'border-gray-800'
          }`}
      >
        {!videoUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-900 transition"
               onClick={() => fileInputRef.current.click()}>
            <div className="text-8xl mb-6 opacity-50 animate-bounce">🎸</div>
            <h2 className="text-4xl font-bold text-white tracking-tight">STAGE EMPTY</h2>
            <button className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500 rounded font-mono uppercase hover:bg-cyan-500 hover:text-black transition">
              Load Video Here 
            </button>
          </div>
        ) : (
          <>
            {/* DISTRACTION OVERLAY */}
            <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md transition-opacity ${isDistracted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="text-center p-8 border-4 border-red-600 bg-red-900/20 shadow-[0_0_100px_rgba(220,38,38,0.5)] transform scale-110">
                    <h2 className="text-6xl font-black text-red-500 mb-2 tracking-tighter">REWINDING...</h2>
                    <p className="text-xl text-white font-mono uppercase tracking-widest">Focus Lost • Backing up 5secs</p>
                </div>
            </div>

            {/* MIC CHECK OVERLAY */}
            {showMicCheck && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-8">
                    <div className="max-w-2xl w-full border-2 border-purple-500 p-8 rounded-2xl bg-gray-900 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                        <h3 className="text-cyan-400 font-mono mb-4 text-sm uppercase tracking-widest animate-pulse">🎤 Mic Check</h3>
                        <p className="text-white text-2xl font-bold mb-8 leading-tight">{MIC_CHECK_DATA.question}</p>
                        
                        <div className="space-y-4">
                            {MIC_CHECK_DATA.choices.map((choice, i) => {
                                const isSelected = selectedAnswer === i;
                                const isCorrectChoice = i === MIC_CHECK_DATA.correctIndex;
                                
                                let btnClass = "border-gray-700 text-gray-300 hover:border-cyan-500";
                                if (isSelected) {
                                    btnClass = isCorrectChoice 
                                        ? "border-green-500 bg-green-500/20 text-green-400 scale-[1.02]" 
                                        : "border-red-500 bg-red-500/20 text-red-400 shake-animation";
                                }

                                return (
                                    <button 
                                        key={i} 
                                        disabled={selectedAnswer !== null}
                                        onClick={() => handleAnswer(i)} 
                                        className={`w-full text-left p-4 border-2 transition-all duration-200 rounded-xl flex justify-between items-center ${btnClass}`}
                                    >
                                        <span className="font-medium">{choice}</span>
                                        {isSelected && isCorrectChoice && <span className="text-2xl">✅</span>}
                                        {isSelected && !isCorrectChoice && <span className="text-2xl">❌</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <video key={videoUrl} ref={videoRef} src={videoUrl} className="w-full h-full object-cover" controls={true} playsInline />
          </>
        )}
      </div>

      {/* --- CONTROL BAR --- */}
      <div className="mt-8 flex gap-4 z-20">
         <button onClick={startCalibration} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold border border-gray-600 uppercase tracking-wider text-sm transition">⚖️ Calibrate</button>
         <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
         <button onClick={() => fileInputRef.current.click()} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/30 uppercase tracking-wider text-sm transition">💿 Change Disk</button>
         <button onClick={() => setShowTrackList(!showTrackList)} className={`px-6 py-3 rounded-lg font-bold border uppercase tracking-wider text-sm transition flex items-center gap-2 ${showTrackList ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "bg-gray-800 text-purple-300 border-gray-600 hover:border-purple-400"}`}><span>📝</span> Setlist</button>
      </div>

      {/* --- TRACK LIST --- */}
      <div className={`fixed bottom-0 right-0 md:right-10 md:bottom-10 w-full md:w-80 bg-gray-900 border-2 border-purple-500/50 rounded-t-xl md:rounded-xl shadow-2xl transition-transform duration-300 ease-in-out z-40 overflow-hidden ${showTrackList ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"}`}>
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center"><h3 className="text-white font-bold font-mono tracking-wider">TRACK LIST</h3></div>
        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
            {DEMO_CHAPTERS.map((ch, i) => (
              <div key={i} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-xs font-mono text-gray-300">{ch.title}</span>
              </div>
            ))}
        </div>
      </div>

      <style>{`
        .shake-animation { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default SmartPlayer;