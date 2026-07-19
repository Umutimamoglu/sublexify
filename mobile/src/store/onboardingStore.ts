import { useCallback } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tüm uygulama içi rehber/tur "görüldü" bayraklarının TEK kaynağı.
 *
 * Önceden her ekranın kendi store'u + kendi AsyncStorage key'i vardı
 * (explore/discover/vocab/lists tur store'ları + ListScreen'deki ham
 * @list_*_hint_shown anahtarları). Hepsi burada tek bir `seen` map'inde,
 * tek bir persist key'i (@onboarding_v1) altında toplandı.
 *
 * ID sözlüğü:
 *   lists.play  | lists.view | lists.quiz   → ListScreen ipuçları
 *   lists       → Listeler sekmesi turu
 *   discover    → Keşfet turu (çok adımlı)
 *   explore     → Explore turu
 *   vocab       → Kelime havuzu turu
 *   guidedFlow  → İlk kullanım rehberli akışı (discover→media)
 */

const PERSIST_KEY = '@onboarding_v1';
const MIGRATION_FLAG = '@onboarding_migrated_v1';

// Eski (dağınık) anahtar → yeni ID eşlemesi. Migration bir kez çalışır.
const LEGACY_KEY_MAP: Record<string, string> = {
  '@discover_tour_completed': 'discover',
  '@explore_tour_completed': 'explore',
  '@vocab_tour_completed': 'vocab',
  '@lists_tour_completed': 'lists',
  '@guided_flow_done': 'guidedFlow',
  '@list_play_hint_shown': 'lists.play',
  '@list_view_toggle_hint_shown': 'lists.view',
  '@list_quiz_hint_shown': 'lists.quiz',
};

interface OnboardingState {
  seen: Record<string, boolean>;
  /** hydrate + migration tamamlandıysa true. Turlar buna bakar → erken flash yok. */
  ready: boolean;
  markSeen: (id: string) => void;
  isSeen: (id: string) => boolean;
  /** "Eğitimleri tekrar göster" — tüm turları sıfırlar. */
  resetAll: () => Promise<void>;
  _setReady: () => void;
  _mergeSeen: (seen: Record<string, boolean>) => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      seen: {},
      ready: false,
      markSeen: (id) => set((s) => ({ seen: { ...s.seen, [id]: true } })),
      isSeen: (id) => !!get().seen[id],
      resetAll: async () => {
        set({ seen: {} });
      },
      _setReady: () => set({ ready: true }),
      // Eski değerler galip gelmesin diye mevcut state öncelikli.
      _mergeSeen: (seen) => set((s) => ({ seen: { ...seen, ...s.seen } })),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen }),
    },
  ),
);

// ─── Hydrate + tek-seferlik migration ──────────────────────────
function waitForHydration(): Promise<void> {
  if (useOnboarding.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useOnboarding.persist.onFinishHydration(() => {
      unsub?.();
      resolve();
    });
    // hasHydrated ile subscribe arası yarış: aradan geçtiyse hemen çöz.
    if (useOnboarding.persist.hasHydrated()) {
      unsub?.();
      resolve();
    }
  });
}

async function migrateLegacy(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(MIGRATION_FLAG)) === 'true') return;
    const keys = Object.keys(LEGACY_KEY_MAP);
    const pairs = await AsyncStorage.multiGet(keys);
    const migrated: Record<string, boolean> = {};
    for (const [k, v] of pairs) {
      if (v === 'true') migrated[LEGACY_KEY_MAP[k]] = true;
    }
    if (Object.keys(migrated).length > 0) {
      useOnboarding.getState()._mergeSeen(migrated);
    }
    await AsyncStorage.multiRemove(keys);
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
  } catch (e) {
    console.warn('[onboarding] legacy migration failed', e);
  }
}

let readyPromise: Promise<void> | null = null;
/** hydrate + migration bitene kadar bekler; sonucu cache'ler. Idempotent. */
export function ensureOnboardingReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await waitForHydration();
      await migrateLegacy();
      useOnboarding.getState()._setReady();
    })();
  }
  return readyPromise;
}

// Uygulama açılışında erkenden başlat → ekranlar mount olmadan hazır olsun.
ensureOnboardingReady();

// ─── Basit tur bayrağı hook'u (eski {show,initializeTour,finishTour} API'si) ──
export function useTourFlag(id: string) {
  const ready = useOnboarding((s) => s.ready);
  const seen = useOnboarding((s) => !!s.seen[id]);
  const markSeen = useOnboarding((s) => s.markSeen);

  const initializeTour = useCallback(() => {
    ensureOnboardingReady();
  }, []);
  const finishTour = useCallback(async () => {
    markSeen(id);
  }, [markSeen, id]);

  return { show: ready && !seen, initializeTour, finishTour };
}
