import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { WordDTO, UserStatistics } from '@/src/types/api';
import { mediaKeys } from './media.queries';
import { userKeys } from './user.queries';
import { listKeys } from './lists.queries';
import { useStreakStore } from '@/src/store/streakStore';

export const wordKeys = {
  search:   (q: string) => ['words', 'search', q] as const,
  frequent: ['words', 'frequent'] as const,
};

export function useWordSearch(query: string, difficulties?: string[], onlyUnknown = false) {
  return useQuery<WordDTO[]>({
    queryKey: [...wordKeys.search(query), difficulties, onlyUnknown],
    queryFn:  async () => {
      let url = `${ENDPOINTS.words.search}?q=${encodeURIComponent(query)}&language=en&onlyUnknown=${onlyUnknown}`;
      if (difficulties && difficulties.length > 0) {
        url += `&difficulties=${difficulties.join(',')}`;
      }
      const res = await apiClient.get<WordDTO[]>(url);
      return res.data;
    },
    enabled: query.trim().length >= 2,
  });
}

export function useFrequentWords(difficulties?: string[], onlyUnknown = false, size = 100) {
  return useInfiniteQuery<WordDTO[]>({
    queryKey: [...wordKeys.frequent, difficulties, onlyUnknown, size],
    initialPageParam: 0,
    staleTime: 1000 * 60 * 60, // 1 saat
    queryFn: async ({ pageParam = 0 }) => {
      let url = `${ENDPOINTS.words.frequent}?language=en&page=${pageParam}&size=${size}&onlyUnknown=${onlyUnknown}`;
      if (difficulties && difficulties.length > 0) {
        url += `&difficulties=${difficulties.join(',')}`;
      }
      const res = await apiClient.get<WordDTO[]>(url);
      return res.data;
    },
    getNextPageParam: (lastPage: WordDTO[], allPages: WordDTO[][]) => {
      return lastPage.length === size ? allPages.length : undefined;
    },
  });
}

export function useMarkKnown() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wordId,
      isKnown,
      mediaId,
    }: {
      wordId: number;
      /** Mevcut durum: true ise unmark (DELETE), false ise mark (POST) */
      isKnown: boolean;
      mediaId?: number;
    }) => {
      const url = ENDPOINTS.words.markKnown(wordId);
      if (isKnown) {
        await apiClient.delete(url);
      } else {
        await apiClient.post(url);
      }
      return { wordId, isKnown, mediaId };
    },
    onMutate: async ({ wordId, isKnown }) => {
      await qc.cancelQueries({ queryKey: userKeys.knownWords });

      const previous = qc.getQueryData<WordDTO[]>(userKeys.knownWords);
      qc.setQueryData<WordDTO[]>(userKeys.knownWords, (old) => {
        if (!old) return old;
        return isKnown
          ? old.filter((w) => w.id !== wordId)
          : [...old, { id: wordId } as WordDTO];
      });

      // Profil istatistiklerini anlık güncelle
      const prevStats = qc.getQueryData<UserStatistics>(userKeys.stats);
      qc.setQueryData<UserStatistics>(userKeys.stats, (old) => {
        if (!old) return old;
        return {
          ...old,
          totalKnownWords: isKnown
            ? Math.max(0, old.totalKnownWords - 1)
            : old.totalKnownWords + 1,
        };
      });

      return { previous, prevStats };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(userKeys.knownWords, context.previous);
      }
      if (context?.prevStats !== undefined) {
        qc.setQueryData(userKeys.stats, context.prevStats);
      }
    },
    onSuccess: ({ mediaId, isKnown }) => {
      // refetchType 'none': cache'i stale işaretle ama HEMEN ağa çıkma.
      // UI zaten optimistic güncel; ekranlar focus/mount olduğunda stale
      // veriyi tek istekle tazeler. Her işaretlemede 500+ kelimelik listeleri
      // yeniden çekmek yavaş ağda ciddi yük oluşturuyordu.
      qc.invalidateQueries({ queryKey: userKeys.knownWords, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: userKeys.stats });
      qc.invalidateQueries({ queryKey: ['progress', 'stats'] });
      qc.invalidateQueries({ queryKey: wordKeys.frequent, refetchType: 'none' });
      // Liste yüzdeleri ve continue-learning bir sonraki focus'ta tazelensin
      qc.invalidateQueries({ queryKey: listKeys.all, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: mediaKeys.continueLearning, refetchType: 'none' });
      // DO NOT invalidate mediaKeys.words here. It causes instant refetches
      // with onlyUnknown=true, making words disappear instantly from lists.
      // Optimistic updates are enough for UI checkmarks.

      // Record streak when marking as known (not when unmarking)
      if (!isKnown) {
        useStreakStore.getState().recordActivity();
      }
    },
  });
}

export function useMarkKnownBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordIds: number[]) => {
      try {
        // Tek istek: 20 kelime = 20 paralel HTTP yerine 1 batch çağrısı
        await apiClient.post(ENDPOINTS.words.markKnownBatch, wordIds);
      } catch (err: any) {
        // Eski backend deploy'unda batch endpoint yoksa (404/405) tek tek işaretle
        const status = err?.response?.status;
        if (status !== 404 && status !== 405) throw err;
        await Promise.all(
          wordIds.map((id) => apiClient.post(ENDPOINTS.words.markKnown(id))),
        );
      }
      return wordIds;
    },
    onSuccess: (wordIds) => {
      // knownWords cache'ini elle güncelle (optimistic tarzı) — büyük listeyi
      // hemen yeniden çekme; diğer cache'ler stale işaretlenir, focus'ta tazelenir
      qc.setQueryData<WordDTO[]>(userKeys.knownWords, (old) => {
        if (!old) return old;
        const existing = new Set(old.map((w) => w.id));
        const added = wordIds.filter((id) => !existing.has(id)).map((id) => ({ id }) as WordDTO);
        return added.length ? [...old, ...added] : old;
      });
      qc.invalidateQueries({ queryKey: userKeys.knownWords, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: userKeys.stats });
      qc.invalidateQueries({ queryKey: ['progress', 'stats'] });
      qc.invalidateQueries({ queryKey: wordKeys.frequent, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: listKeys.all, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: mediaKeys.continueLearning, refetchType: 'none' });
      // Record streak for batch mark-known
      useStreakStore.getState().recordActivity();
    },
  });
}

// ─── Word Note Mutations ───────────────────────────────────────

/**
 * Creates or updates the user's personal note for a word.
 * Invalidates all list detail caches so the note appears immediately.
 */
export function useUpsertWordNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ wordId, note }: { wordId: number; note: string }) => {
      await apiClient.put(ENDPOINTS.words.note(wordId), { note });
      return { wordId, note };
    },
    onSuccess: ({ wordId, note }) => {
      // Optimistically update all cached list details that contain this word
      qc.setQueriesData<any>(
        { queryKey: ['lists'], predicate: (query) => query.queryKey.length === 2 },
        (old: any) => {
          if (!old?.words) return old;
          return {
            ...old,
            words: old.words.map((w: any) =>
              w.id === wordId ? { ...w, note } : w
            ),
          };
        },
      );
    },
  });
}

/**
 * Deletes the user's personal note for a word.
 */
export function useDeleteWordNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordId: number) => {
      await apiClient.delete(ENDPOINTS.words.note(wordId));
      return wordId;
    },
    onSuccess: (wordId) => {
      // Optimistically clear note from all cached list details
      qc.setQueriesData<any>(
        { queryKey: ['lists'], predicate: (query) => query.queryKey.length === 2 },
        (old: any) => {
          if (!old?.words) return old;
          return {
            ...old,
            words: old.words.map((w: any) =>
              w.id === wordId ? { ...w, note: null } : w
            ),
          };
        },
      );
    },
  });
}
