import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,        // 5 dk stale
      gcTime:               1000 * 60 * 60 * 24,  // 24 saat bellekte tut (persist için)
      retry:                2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
