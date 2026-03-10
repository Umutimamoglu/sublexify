import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { WordDTO, UserStatistics } from '@/src/types/api';
import { mediaKeys } from './media.queries';
import { userKeys } from './user.queries';
import { listKeys } from './lists.queries';

export const wordKeys = {
  search:   (q: string) => ['words', 'search', q] as const,
  frequent: ['words', 'frequent'] as const,
};

export function useWordSearch(query: string) {
  return useQuery<WordDTO[]>({
    queryKey: wordKeys.search(query),
    queryFn:  async () => {
      const res = await apiClient.get<WordDTO[]>(
        `${ENDPOINTS.words.search}?q=${encodeURIComponent(query)}&language=en&userId=1`,
      );
      return res.data;
    },
    enabled: query.trim().length >= 2,
  });
}

export function useFrequentWords(limit = 50) {
  return useQuery<WordDTO[]>({
    queryKey: wordKeys.frequent,
    staleTime: 1000 * 60 * 60, // 1 saat
    queryFn:  async () => {
      const res = await apiClient.get<WordDTO[]>(
        `${ENDPOINTS.words.frequent}?language=en&limit=${limit}&userId=1`,
      );
      return res.data;
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
      const url = `${ENDPOINTS.words.markKnown(wordId)}?userId=1`;
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
    onSuccess: ({ mediaId }) => {
      qc.invalidateQueries({ queryKey: userKeys.knownWords });
      qc.invalidateQueries({ queryKey: userKeys.stats });
      qc.invalidateQueries({ queryKey: ['progress', 'stats'] });
      if (mediaId) {
        qc.invalidateQueries({ queryKey: mediaKeys.words(mediaId) });
        qc.invalidateQueries({ queryKey: mediaKeys.detail(mediaId) });
      }
    },
  });
}

export function useMarkKnownBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordIds: number[]) => {
      await Promise.all(
        wordIds.map((id) => apiClient.post(`${ENDPOINTS.words.markKnown(id)}?userId=1`)),
      );
      return wordIds;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.knownWords });
      qc.invalidateQueries({ queryKey: userKeys.stats });
      qc.invalidateQueries({ queryKey: ['progress', 'stats'] });
      qc.invalidateQueries({ queryKey: listKeys.all });
    },
  });
}
