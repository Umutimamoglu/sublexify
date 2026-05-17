/**
 * useListPreferences
 *
 * Kişisel listelerin görünürlüğünü, sıralamasını ve
 * gruplamasını AsyncStorage'da saklar.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'list_preferences_v1';

export type ListPreferences = {
  /** Sıralama: liste id'lerinin sıralı dizisi */
  order: number[];
  /** Gizli liste id'leri */
  hiddenIds: number[];
};

const DEFAULT_PREFS: ListPreferences = {
  order: [],
  hiddenIds: [],
};

async function loadPrefs(): Promise<ListPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: ListPreferences) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore write errors
  }
}

export function useListPreferences() {
  const [prefs, setPrefs] = useState<ListPreferences>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPrefs().then((p) => {
      setPrefs(p);
      setReady(true);
    });
  }, []);

  const update = useCallback((updater: (prev: ListPreferences) => ListPreferences) => {
    setPrefs((prev) => {
      const next = updater(prev);
      savePrefs(next);
      return next;
    });
  }, []);

  /** Sıralamayı kaydet (DraggableFlatList onDragEnd çıktısı) */
  const saveOrder = useCallback((ids: number[]) => {
    update((p) => ({ ...p, order: ids }));
  }, [update]);

  /** Listenin görünürlüğünü değiştir */
  const toggleHidden = useCallback((id: number) => {
    update((p) => {
      const hidden = new Set(p.hiddenIds);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...p, hiddenIds: Array.from(hidden) };
    });
  }, [update]);

  /** Hepsini göster */
  const clearHidden = useCallback(() => {
    update((p) => ({ ...p, hiddenIds: [] }));
  }, [update]);

  return {
    prefs,
    ready,
    saveOrder,
    toggleHidden,
    clearHidden,
  };
}
