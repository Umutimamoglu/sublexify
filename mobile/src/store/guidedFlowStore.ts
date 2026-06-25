import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@guided_flow_done';

type Step = 'discover' | 'media' | 'done';

interface GuidedFlowState {
  active: boolean;
  step: Step;
  start: () => void;
  advanceToMedia: () => void;
  finish: () => Promise<void>;
  checkIfDone: () => Promise<boolean>;
}

export const useGuidedFlowStore = create<GuidedFlowState>((set) => ({
  active: false,
  step: 'discover',

  start: () => set({ active: true, step: 'discover' }),

  advanceToMedia: () => set({ step: 'media' }),

  finish: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    set({ active: false, step: 'done' });
  },

  checkIfDone: async () => {
    const done = await AsyncStorage.getItem(STORAGE_KEY);
    return done === 'true';
  },
}));
