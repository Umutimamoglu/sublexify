import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import type { MediaDTO, MediaWordsResponseDTO, WordListDTO } from '@/src/types/api';

export const mediaKeys = {
  all:              ['media'] as const,
  continueLearning: ['media', 'continue-learning'] as const,
  watchedIds:       ['media', 'watched-ids'] as const,
  detail:           (id: number) => ['media', id] as const,
  words:            (id: number, onlyUnknown?: boolean) => ['media', id, 'words', onlyUnknown] as const,
};

export function useMedia() {
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.all,
    staleTime: 1000 * 60 * 30, // 30 dakika (katalog sık değişmez)
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(ENDPOINTS.media.list);
      return res.data;
    },
  });
}

export function useMediaDetail(id: number) {
  return useQuery<MediaDTO>({
    queryKey: mediaKeys.detail(id),
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO>(ENDPOINTS.media.detail(id));
      return res.data;
    },
    enabled: !!id,
  });
}

export function useContinueLearning(limit = 5) {
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.continueLearning,
    staleTime: 0,
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(
        `${ENDPOINTS.media.continueLearning}?limit=${limit}`,
      );
      return res.data;
    },
  });
}

export function useMediaWords(mediaId: number, onlyUnknown = false) {
  return useQuery<MediaWordsResponseDTO>({
    queryKey: mediaKeys.words(mediaId, onlyUnknown),
    queryFn:  async () => {
      const res = await apiClient.get<MediaWordsResponseDTO>(
        `${ENDPOINTS.media.words(mediaId)}?onlyUnknown=${onlyUnknown}`,
      );
      return res.data;
    },
    enabled: !!mediaId,
  });
}

export function useSeriesEpisodes(imdbId: string) {
  return useQuery<MediaDTO[]>({
    queryKey: ['media', 'series', imdbId],
    queryFn:  async () => {
      const res = await apiClient.get<MediaDTO[]>(ENDPOINTS.media.seriesEpisodes(imdbId));
      return res.data;
    },
    enabled: !!imdbId,
  });
}

export function useGenerateListFromMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: number) => {
      const res = await apiClient.post<WordListDTO>(
        `${ENDPOINTS.lists.generateFromMedia}?mediaId=${mediaId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      qc.invalidateQueries({ queryKey: mediaKeys.continueLearning });
    },
  });
}

// ─── Watch Toggle ───────────────────────────────────────────────

export function useWatchedMediaIds() {
  return useQuery<number[]>({
    queryKey: mediaKeys.watchedIds,
    queryFn: async () => {
      const res = await apiClient.get<number[]>(ENDPOINTS.media.watchedIds);
      return res.data;
    },
    staleTime: 0,
  });
}

export function useToggleWatched() {
  const qc = useQueryClient();
  return useMutation<{ watched: boolean; mediaId: number }, Error, number>({
    mutationFn: async (mediaId: number) => {
      const res = await apiClient.post<{ watched: boolean; mediaId: number }>(
        ENDPOINTS.media.watchToggle(mediaId),
      );
      return res.data;
    },
    // Optimistic update: immediately toggle the watched state in cache
    onMutate: async (mediaId) => {
      await qc.cancelQueries({ queryKey: mediaKeys.watchedIds });
      const prev = qc.getQueryData<number[]>(mediaKeys.watchedIds) ?? [];
      const isCurrentlyWatched = prev.includes(mediaId);
      qc.setQueryData<number[]>(
        mediaKeys.watchedIds,
        isCurrentlyWatched ? prev.filter(id => id !== mediaId) : [...prev, mediaId],
      );
      return { prev };
    },
    onError: (_err, _mediaId, context: any) => {
      if (context?.prev) qc.setQueryData(mediaKeys.watchedIds, context.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.continueLearning });
    },
  });
}

