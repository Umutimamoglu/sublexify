import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type User = {
  id: number;
  email: string;
  name: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  hasSeenOnboarding: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setHasSeenOnboarding: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      hasSeenOnboarding: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true, hasHydrated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false, hasHydrated: true }),
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
    }),
    {
      name: 'sublex-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
