import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TourState {
  isTourCompleted: boolean;
  tourSteps: { show: boolean }[];
  initializeTour: () => Promise<void>;
  closeStep: (index: number) => void;
  skipTour: () => Promise<void>;
}

const TOTAL_STEPS = 3;

export const useTourStore = create<TourState>((set, get) => ({
  isTourCompleted: true, // Default to true until we check storage
  tourSteps: Array(TOTAL_STEPS).fill({ show: false }),

  initializeTour: async () => {
    try {
      const completed = await AsyncStorage.getItem('@discover_tour_completed');
      if (completed !== 'true') {
        // Not completed, start the tour by showing the first step
        const newSteps = Array(TOTAL_STEPS).fill({ show: false });
        newSteps[0] = { show: true };
        set({ isTourCompleted: false, tourSteps: newSteps });
      } else {
        set({ isTourCompleted: true });
      }
    } catch (e) {
      console.error('Error reading tour state', e);
    }
  },

  closeStep: (index: number) => {
    const { tourSteps } = get();
    const newSteps = [...tourSteps];
    
    // Hide current step
    newSteps[index] = { show: false };
    set({ tourSteps: newSteps });

    // Show next step after a short delay if it exists
    if (index + 1 < TOTAL_STEPS) {
      setTimeout(() => {
        const nextSteps = [...get().tourSteps];
        nextSteps[index + 1] = { show: true };
        set({ tourSteps: nextSteps });
      }, 350);
    } else {
      // Tour is fully completed
      get().skipTour();
    }
  },

  skipTour: async () => {
    try {
      await AsyncStorage.setItem('@discover_tour_completed', 'true');
      set({ 
        isTourCompleted: true, 
        tourSteps: Array(TOTAL_STEPS).fill({ show: false }) 
      });
    } catch (e) {
      console.error('Error saving tour state', e);
    }
  }
}));
