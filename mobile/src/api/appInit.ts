import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { mediaKeys } from '@/src/api/queries/media.queries';
import { listKeys } from '@/src/api/queries/lists.queries';
import { userKeys } from '@/src/api/queries/user.queries';
import { wordKeys } from '@/src/api/queries/words.queries';
import { useAuthStore } from '@/src/store/authStore';
import type { AppInitDTO } from '@/src/types/api';

// VocabularyScreen'in ilk açılış parametreleriyle birebir aynı olmalı:
// useFrequentWords([], false, 50) → ['words','frequent',[],false,50]
const FREQUENT_WORDS_KEY = [...wordKeys.frequent, [], false, 50];
const FREQUENT_WORDS_PAGE_SIZE = 50;

let inFlight: Promise<void> | null = null;

/**
 * Açılıştaki tüm kritik veriyi TEK istekte çekip React Query cache'ine yazar.
 * Splash'i bekletmez — arka planda çağrılır (fire-and-forget). Kullanıcı
 * ekrana düştüğünde veriler cache'de hazır olur; persist sayesinde sonraki
 * açılışlarda da anında görünür.
 *
 * Anonim kullanıcıda (onboarding sırasında) backend sadece public katalog
 * döner; login sonrası tekrar çağrıldığında kullanıcı verileri de dolar.
 * `/app-init` başarısız olursa (eski backend, geçici hata) tek tek paralel
 * prefetch'lere düşer.
 */
export function prefetchAppInit(queryClient: QueryClient): Promise<void> {
  // Aynı anda birden fazla tetiklenirse (cold start + login) tek istek at
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await apiClient.get<AppInitDTO>(ENDPOINTS.appInit, {
        // Yavaş ağ + Railway cold start toleransı; arka planda olduğu için UX'i bloklamaz
        timeout: 30000,
      });
      seedCaches(queryClient, res.data);
    } catch {
      await fallbackPrefetch(queryClient);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function seedCaches(qc: QueryClient, data: AppInitDTO) {
  if (data.media) qc.setQueryData(mediaKeys.all, data.media);
  if (data.frequentWords) {
    // useInfiniteQuery veri şekli: { pages, pageParams }
    qc.setQueryData(FREQUENT_WORDS_KEY, {
      pages: [data.frequentWords],
      pageParams: [0],
    });
  }
  if (data.continueLearning) qc.setQueryData(mediaKeys.continueLearning, data.continueLearning);
  if (data.lists) qc.setQueryData(listKeys.all, data.lists);
  if (data.userStatistics) qc.setQueryData(userKeys.stats, data.userStatistics);
  if (data.knownWords) qc.setQueryData(userKeys.knownWords, data.knownWords);
  if (data.watchedMediaIds) qc.setQueryData(mediaKeys.watchedIds, data.watchedMediaIds);
  if (data.progressStats) qc.setQueryData(['progress', 'stats'], data.progressStats);
}

/** /app-init yoksa eski davranış: kritik veriler paralel, ayrı isteklerle. */
async function fallbackPrefetch(qc: QueryClient) {
  const publicPrefetches = [
    qc.prefetchQuery({
      queryKey: mediaKeys.all,
      queryFn: () => apiClient.get(ENDPOINTS.media.list).then((r) => r.data),
      staleTime: 1000 * 60 * 30,
    }),
    qc.prefetchInfiniteQuery({
      queryKey: FREQUENT_WORDS_KEY,
      queryFn: () =>
        apiClient
          .get(`${ENDPOINTS.words.frequent}?language=en&page=0&size=${FREQUENT_WORDS_PAGE_SIZE}&onlyUnknown=false`)
          .then((r) => r.data),
      initialPageParam: 0,
      getNextPageParam: () => undefined,
      staleTime: 1000 * 60 * 60,
    }),
  ];

  if (!useAuthStore.getState().isAuthenticated) {
    await Promise.allSettled(publicPrefetches);
    return;
  }

  await Promise.allSettled([
    ...publicPrefetches,
    qc.prefetchQuery({
      queryKey: mediaKeys.continueLearning,
      queryFn: () => apiClient.get(`${ENDPOINTS.media.continueLearning}?limit=50`).then((r) => r.data),
      staleTime: 0,
    }),
    qc.prefetchQuery({
      queryKey: listKeys.all,
      queryFn: () => apiClient.get(ENDPOINTS.lists.list).then((r) => r.data),
      staleTime: 1000 * 60 * 5,
    }),
    qc.prefetchQuery({
      queryKey: userKeys.stats,
      queryFn: () => apiClient.get(ENDPOINTS.user.stats).then((r) => r.data),
      staleTime: 1000 * 60 * 5,
    }),
    qc.prefetchQuery({
      queryKey: userKeys.knownWords,
      queryFn: () => apiClient.get(ENDPOINTS.user.knownWords).then((r) => r.data),
      staleTime: 1000 * 60 * 5,
    }),
    qc.prefetchQuery({
      queryKey: mediaKeys.watchedIds,
      queryFn: () => apiClient.get(ENDPOINTS.media.watchedIds).then((r) => r.data),
      staleTime: 1000 * 60 * 10,
    }),
    qc.prefetchQuery({
      queryKey: ['progress', 'stats'],
      queryFn: () => apiClient.get(ENDPOINTS.progress.stats).then((r) => r.data),
      staleTime: 1000 * 60 * 5,
    }),
  ]);
}
