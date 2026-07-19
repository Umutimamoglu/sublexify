import { create } from 'zustand';
import { useOnboarding, ensureOnboardingReady } from '@/src/store/onboardingStore';

// Kalıcılık artık ortak onboardingStore'da ('guidedFlow' ID'si). Bu store
// sadece ekranlar-arası (discover → media) akış orkestrasyonunu yönetir.

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
    useOnboarding.getState().markSeen('guidedFlow');
    set({ active: false, step: 'done' });
  },

  checkIfDone: async () => {
    await ensureOnboardingReady();
    return useOnboarding.getState().isSeen('guidedFlow');
  },
}));
