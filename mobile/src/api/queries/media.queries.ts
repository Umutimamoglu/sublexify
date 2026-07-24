import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, CATALOGUE_TIMEOUT_MS } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { appInitGate } from '@/src/api/appInitGate';
import type { MediaDTO, MediaWordsResponseDTO, WordListDTO } from '@/src/types/api';

export const mediaKeys = {
  all:              ['media'] as const,
  continueLearning: ['media', 'continue-learning'] as const,
  watchedIds:       ['media', 'watched-ids'] as const,
  detail:           (id: number) => ['media', id] as const,
  words:            (id: number, onlyUnknown?: boolean) => ['media', id, 'words', onlyUnknown] as const,
};

export function useMedia() {
  const qc = useQueryClient();
  return useQuery<MediaDTO[]>({
    queryKey: mediaKeys.all,
    staleTime: 1000 * 60 * 30, // 30 dakika (katalog sık değişmez)
    // Katalog ~1.2 MB: zaman aşımına uğrayan isteği tekrarlamak, aynı yükün
    // birden çok kopyasını hatta bindirmekten başka bir işe yaramıyor.
    retry: 0,
    queryFn:  async () => {
      // /app-init tam olarak bu listeyi de taşıyor. O istek zaten yoldaysa
      // yanında ikinci bir kopya indirmek yerine onu bekle — iki eşzamanlı
      // katalog indirmesi mobil bağlantıda birbirini aç bırakıyordu.
      const pending = appInitGate();
      if (pending) {
        await pending;
        const seeded = qc.getQueryData<MediaDTO[]>(mediaKeys.all);
        if (seeded) return seeded;
      }
      const res = await apiClient.get<MediaDTO[]>(ENDPOINTS.media.list, {
        timeout: CATALOGUE_TIMEOUT_MS,
      });
      return res.data;
    },
  });
}

export function useMediaDetail(id: number) {
  return useQuery<MediaDTO>({
    queryKey: mediaKeys.detail(id),
    staleTime: 1000 * 60 * 30, // film/dizi detayı neredeyse hiç değişmez
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
    // 2 dk: tab geçişlerinde gereksiz istek atma; mutation'lar cache'i
    // refetchType 'none' ile stale işaretler, focus'ta stale ise yenilenir
    staleTime: 1000 * 60 * 2,
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
    staleTime: 1000 * 60 * 15, // kelimeler nadiren değişir; yavaş ağda anında açılsın
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
    staleTime: 1000 * 60 * 60 * 24, // bölüm listesi değişmez
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
    staleTime: 1000 * 60 * 10, // toggle zaten optimistic; sunucudan sık çekmeye gerek yok
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

