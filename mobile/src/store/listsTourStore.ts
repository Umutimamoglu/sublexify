import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lists_tour_completed';

interface ListsTourState {
  show: boolean;
  initializeTour: () => Promise<void>;
  finishTour: () => Promise<void>;
}

export const useListsTourStore = create<ListsTourState>((set) => ({
  show: false,

  initializeTour: async () => {
    try {
      // DEV ONLY: her yenilemede tur baştan çalışsın diye flag'i sıfırla.
      if (false) { // DEV auto-reset disabled
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      const completed = await AsyncStorage.getItem(STORAGE_KEY);
      set({ show: completed !== 'true' });
    } catch (e) {
      console.error('Error reading lists tour state', e);
    }
  },

  finishTour: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Error saving lists tour state', e);
    }
    set({ show: false });
  },
}));
