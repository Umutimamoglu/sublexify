import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StreakState = {
  currentStreak: number;
  lastActivityDate: string | null; // 'YYYY-MM-DD'
  hasHydrated: boolean;
  /** Call this when user marks a word as known */
  recordActivity: () => void;
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      lastActivityDate: null,
      hasHydrated: false,

      recordActivity: () => {
        const today = todayString();
        const yesterday = yesterdayString();
        const { lastActivityDate, currentStreak } = get();

        // Already recorded today — no-op
        if (lastActivityDate === today) return;

        if (lastActivityDate === yesterday) {
          // Consecutive day — extend streak
          set({ currentStreak: currentStreak + 1, lastActivityDate: today });
        } else {
          // Gap or first time — start fresh
          set({ currentStreak: 1, lastActivityDate: today });
        }
      },
    }),
    {
      name: 'sublex-streak',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;

          // On rehydration, check if the streak is still valid
          const today = todayString();
          const yesterday = yesterdayString();
          if (
            state.lastActivityDate !== today &&
            state.lastActivityDate !== yesterday
          ) {
            // Streak broken — reset
            state.currentStreak = 0;
            state.lastActivityDate = null;
          }
        }
      },
    },
  ),
);
