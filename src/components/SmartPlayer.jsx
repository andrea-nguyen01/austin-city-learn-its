import React, { useRef, useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useStore } from '../store';

// --- UPDATED DEMO DATA: MAPPED TO YOUTUBE TIMESTAMPS ---
const DEMO_CHAPTERS = [
  { time: 0, title: "Algorithm Scope & Graph Types" },
  { time: 15, title: "Initialization & Infinity Values" },
  { time: 46, title: "Edge Relaxation Logic" },
  { time: 80, title: "Greedy Node Selection" },
  { time: 130, title: "Final Complexity Recap" }
];



const SmartPlayer = () => {
  const { isDistracted, startCalibration, setQuizQuestions, quizQuestions } = useStore();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // STATE
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false); // New state for loading indicator
  
  // PERFORMANCE METRICS
  const [metrics, setMetrics] = useState({
    firstAttemptCorrect: 0,
    totalQuestions: 0, // This will be set after quiz questions are loaded
    distractionCount: 0,
    showReport: false,
    questionsAttempted: new Set() 
  });

  // MIC CHECK STATE
  const [activeCheck, setActiveCheck] = useState(null); 
  const [selectedAnswer, setSelectedAnswer] = useState(null); 
  const [isCorrect, setIsCorrect] = useState(null); 
  const [completedTimes, setCompletedTimes] = useState(new Set()); 

  // AUDIO REFS
  const noiseSynth = useRef(null);
  const feedbackSynth = useRef(null);
  const vinylPlayer = useRef(null);

  // --- 1. SETUP AUDIO ---
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

  // --- 2. LOGIC LOOP ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !isAudioStarted || quizQuestions.length === 0) return; 

    const handleTimeUpdate = () => {
        const currentTime = Math.floor(video.currentTime);
        const check = quizQuestions.find(c => c.trigger_time === currentTime);
        
        if (check && !activeCheck && !completedTimes.has(currentTime)) {
            video.pause();
            setActiveCheck(check);
        }
    };

    const handleVideoEnd = () => {
        setMetrics(prev => ({ ...prev, showReport: true }));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleVideoEnd);

    if (isDistracted) {
      if (!video.paused) {
        video.currentTime = Math.max(0, video.currentTime - 5);
        setMetrics(prev => ({ ...prev, distractionCount: prev.distractionCount + 1 }));
        if (vinylPlayer.current) vinylPlayer.current.triggerAttackRelease("C1", "8n");
      }
      video.pause();
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-Infinity, 0.1);
    } else if (!activeCheck && !metrics.showReport) {
      video.play().catch(e => console.log("Auto-play blocked:", e));
      if (noiseSynth.current) noiseSynth.current.volume.rampTo(-20, 2); 
    }

    return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleVideoEnd);
    };
  }, [isDistracted, videoUrl, isAudioStarted, activeCheck, completedTimes, metrics.showReport, quizQuestions]);

  // --- 3. UPDATED ANSWER HANDLER ---
  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    const correct = index === activeCheck.correct_index; // Use activeCheck.correct_index
    setIsCorrect(correct);
    const isFirstAttempt = !metrics.questionsAttempted.has(activeCheck.id);

    if (correct) {
      feedbackSynth.current.triggerAttackRelease(["C4", "E4", "G4"], "4n");
      setCompletedTimes(prev => new Set(prev).add(activeCheck.trigger_time)); // Use activeCheck.trigger_time
      
      if (isFirstAttempt) {
        setMetrics(prev => ({ 
          ...prev, 
          firstAttemptCorrect: prev.firstAttemptCorrect + 1,
          questionsAttempted: new Set(prev.questionsAttempted).add(activeCheck.id)
        }));
      }

      setTimeout(() => {
        setActiveCheck(null);
        setIsCorrect(null);
        setSelectedAnswer(null);
      }, 1500);
    } else {
      feedbackSynth.current.triggerAttackRelease(["F#2", "G2"], "2n");
      setMetrics(prev => ({ 
        ...prev, 
        questionsAttempted: new Set(prev.questionsAttempted).add(activeCheck.id) 
      }));

      setTimeout(() => {
        // Rewind to specific Concept Explanation Time
        videoRef.current.currentTime = activeCheck.rewind_time; // Use activeCheck.rewind_time
        setActiveCheck(null);
        setIsCorrect(null);
        setSelectedAnswer(null);
      }, 1500);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingVideo(true);
    setQuizQuestions([]); // Clear previous quizzes
    setVideoUrl(null); // Clear previous video

    try {
      await Tone.start();
      setIsAudioStarted(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/process-multimodal', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const quizData = await response.json();
      console.log("Received quiz data:", quizData);
      setQuizQuestions(quizData);
      setMetrics(prev => ({ ...prev, totalQuestions: quizData.length })); // Update total questions

      // Set video URL AFTER quiz data is loaded
      setVideoUrl(URL.createObjectURL(file));
      setFileName(file.name);

    } catch (error) {
      console.error("Error processing video:", error);
      alert("Failed to process video: " + error.message);
    } finally {
      setIsProcessingVideo(false);
    }
  };

  return (
    <div className={`transition-all duration-1000 min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${isDistracted ? "bg-gray-900" : "bg-black"}`}>
      <div className={`fixed inset-0 bg-black pointer-events-none transition-opacity duration-1000 z-0 ${!isDistracted && videoUrl ? "opacity-80" : "opacity-0"}`} />

      {/* HEADER */}
      <div className="text-center mb-6 z-10">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>HEADLINER</h1>
        <p className="text-purple-300 tracking-[0.3em] text-xs font-bold mt-2 uppercase">Austin City Learn-its Edition</p>
      </div>

      {/* MAIN STAGE */}
      <div className={`relative w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden bg-[#0d1117] border-4 transition-all duration-300 z-20 ${videoUrl ? (isDistracted ? 'border-red-600 animate-pulse' : 'border-cyan-400') : 'border-gray-800'}`}>
        {(!videoUrl && !isProcessingVideo) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group" onClick={() => fileInputRef.current.click()}>
            <div className="text-8xl mb-2 animate-bounce drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]">🎸</div>
            <h2 className="text-4xl font-bold text-white uppercase tracking-tighter text-center">Stage Empty</h2>
            <button className="mt-4 px-6 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500 rounded font-mono uppercase group-hover:bg-cyan-500 group-hover:text-black transition-colors">Load Video Here</button>
          </div>
        ) : (videoUrl ? (
          <>
            <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md transition-opacity ${isDistracted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="text-center p-8 border-4 border-red-600 bg-red-900/20">
                    <h2 className="text-6xl font-black text-red-500 mb-2 tracking-tighter">REWINDING...</h2>
                    <p className="text-xl text-white font-mono uppercase">Focus Lost • Backing up 5s</p>
                </div>
            </div>

            {activeCheck && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-8">
                    <div className="max-w-2xl w-full border-2 border-purple-500 p-8 rounded-2xl bg-gray-900 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                        <h3 className="text-cyan-400 font-mono mb-4 text-sm uppercase tracking-widest">🎤 Focus Check</h3>
                        <p className="text-white text-2xl font-bold mb-8 leading-tight">{activeCheck.question}</p>
                        <div className="space-y-4">
                            {activeCheck.options.map((choice, i) => {
                                const isSelected = selectedAnswer === i;
                                const isCorrectChoice = i === activeCheck.correct_index;
                                let btnClass = "border-gray-700 text-gray-300 hover:border-cyan-500";
                                if (isSelected) btnClass = isCorrectChoice ? "border-green-500 bg-green-500/20 text-green-400" : "border-red-500 bg-red-500/20 text-red-400 shake-animation";
                                return (
                                    <button key={i} disabled={selectedAnswer !== null} onClick={() => handleAnswer(i)} className={`w-full text-left p-4 border-2 transition-all duration-200 rounded-xl flex justify-between items-center ${btnClass}`}>
                                        <span className="font-medium">{choice}</span>
                                        {isSelected && (isCorrectChoice ? "✅" : "❌")}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {metrics.showReport && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-purple-900/90 to-black p-8">
                    <div className="max-w-md w-full bg-black border-4 border-cyan-400 p-8 rounded-3xl text-center shadow-[0_0_80px_rgba(34,211,238,0.5)]">
                        <h2 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase">Show Recap</h2>
                        <div className="space-y-6 mb-8 text-left">
                            <div className="border-b border-gray-800 pb-4">
                                <p className="text-gray-400 font-mono text-[10px] uppercase mb-1">First-Attempt Mastery</p>
                                <p className="text-4xl font-bold text-cyan-400">{metrics.firstAttemptCorrect} / {metrics.totalQuestions}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                    <p className="text-gray-500 text-[10px] uppercase font-bold">Focus Slips</p>
                                    <p className="text-2xl font-bold text-red-500">{metrics.distractionCount}</p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                                    <p className="text-gray-500 text-[10px] uppercase font-bold">Flow State</p>
                                    <p className="text-2xl font-bold text-green-500 uppercase tracking-tighter">
                                        {metrics.distractionCount === 0 ? "ELITE" : metrics.distractionCount < 3 ? "STEADY" : "WOBBLY"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-cyan-500 text-black font-black uppercase rounded-xl hover:bg-white transition-colors">Encore (Restart)</button>
                    </div>
                </div>
            )}

            <video key={videoUrl} ref={videoRef} src={videoUrl} className="w-full h-full object-cover" controls={true} playsInline />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm">
            <svg className="animate-spin h-16 w-16 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white text-xl font-bold text-center mt-6">Curating your personalized check-in questions...</p>
            <p className="text-gray-400 text-sm text-center mt-2">This may take a moment depending on video length.</p>
          </div>
        ))}
      </div>

      {/* CONTROLS */}
      <div className="mt-8 flex gap-4 z-20">
         <button onClick={startCalibration} className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold border border-gray-600 uppercase text-xs hover:bg-gray-700 transition">⚖️ Calibrate</button>
         <input type="file" accept="video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
         <button 
           onClick={() => fileInputRef.current.click()} 
           className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold uppercase text-xs shadow-lg shadow-cyan-500/20"
           disabled={isProcessingVideo} // Disable button during processing
         >
           {isProcessingVideo ? 'Processing...' : '💿 CHANGE DISK'}
         </button>
         <button onClick={() => setShowTrackList(!showTrackList)} className={`px-6 py-3 rounded-lg font-bold border uppercase text-xs transition ${showTrackList ? "bg-purple-600 text-white border-purple-400" : "bg-gray-800 text-purple-300 border-gray-600"}`}>📝 Track List</button>
      </div>

      {/* TRACK LIST */}
      <div className={`fixed bottom-10 right-10 w-80 bg-gray-900 border-2 border-purple-500/50 rounded-xl transition-all duration-300 z-40 overflow-hidden ${showTrackList ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"}`}>
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center"><h3 className="text-white font-bold font-mono text-sm tracking-widest uppercase">Track List</h3></div>
        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
            {DEMO_CHAPTERS.map((ch, i) => (
              <div key={i} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${completedTimes.has(ch.time) ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"}`} />
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

// Incorprating the multiple chocie questions to be based on 
// real time what the lecturer is talking abt (test if anything got broke nwhen incorpating this)