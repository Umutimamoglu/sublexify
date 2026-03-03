export const ENDPOINTS = {
  media: {
    list:             '/media',
    detail:           (id: number) => `/media/${id}`,
    words:            (id: number) => `/media/${id}/words`,
    continueLearning: '/media/continue-learning',
    seriesEpisodes:   (imdbId: string) => `/media/series/${imdbId}/episodes`,
  },
  words: {
    search:    '/words/search',
    frequent:  '/words/frequent',
    detail:    (id: number) => `/words/${id}`,
    markKnown: (id: number) => `/words/${id}/mark-known`,
  },
  user: {
    stats:      '/user/statistics',
    knownWords: '/user/known-words',
  },
  lists: {
    list:               '/lists',
    standard:           '/lists/standard',
    detail:             (id: number) => `/lists/${id}`,
    words:              (id: number) => `/lists/${id}/words`,
    wordItem:           (listId: number, wordId: number) => `/lists/${listId}/words/${wordId}`,
    generateFromMedia:  '/lists/generate/unknown',
    generateSubList:    (id: number) => `/lists/${id}/generate/unknown`,
    containingWord:     (wordId: number) => `/lists/containing-word/${wordId}`,
  },
  auth: {
    login:    '/auth/login',
    register: '/auth/register',
  },
} as const;
