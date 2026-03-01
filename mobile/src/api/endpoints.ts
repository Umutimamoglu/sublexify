export const ENDPOINTS = {
  media: {
    list:             '/media',
    detail:           (id: number) => `/media/${id}`,
    words:            (id: number) => `/media/${id}/words`,
    continueLearning: '/media/continue-learning',
  },
  words: {
    search:    '/words/search',
    markKnown: (id: number) => `/words/${id}/mark-known`,
  },
  user: {
    stats:      '/user/statistics',
    knownWords: '/user/known-words',
  },
  lists: {
    list:     '/lists',
    standard: '/lists/standard',
    detail:   (id: number) => `/lists/${id}`,
    words:    (id: number) => `/lists/${id}/words`,
  },
  auth: {
    login:    '/auth/login',
    register: '/auth/register',
  },
} as const;
