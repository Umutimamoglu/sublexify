import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface MediaRequest {
  tmdbId: number;
  imdbId?: string;
  title: string;
  posterPath?: string;
  mediaType: 'MOVIE' | 'SERIES';
}

export interface FeedbackData {
  message: string;
  category: 'BUG' | 'SUGGESTION' | 'OTHER';
}

export const useFeedbackMutations = () => {
  const submitMediaRequests = useMutation({
    mutationFn: async (requests: MediaRequest[]) => {
      await apiClient.post('/feedback/media-request', requests);
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackData) => {
      await apiClient.post('/feedback/submit', data);
    },
  });

  return { submitMediaRequests, submitFeedback };
};

export const useTmdbSearch = (query: string, type: 'movie' | 'tv') => {
  return useQuery({
    queryKey: ['tmdbSearch', query, type],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await apiClient.get(`/media/tmdb/search?query=${query}&type=${type}`);
      return response.data;
    },
    enabled: query.length >= 2,
  });
};
