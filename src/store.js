import { create } from 'zustand';

export const useStore = create((set) => ({
  // State
  isDistracted: false,
  isCalibrating: false,
  calibration: { pitchOffset: 0, yawOffset: 0 }, // Stores the user's "neutral" face
  quizQuestions: [], // New state for quiz questions

  // Actions
  setDistracted: (status) => set({ isDistracted: status }),
  setCalibration: (pitch, yaw) => set({ 
    calibration: { pitchOffset: pitch, yawOffset: yaw },
    isCalibrating: false 
  }),
  startCalibration: () => set({ isCalibrating: true }),
  setQuizQuestions: (questions) => set({ quizQuestions: questions }),
}));