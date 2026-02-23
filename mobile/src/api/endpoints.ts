export const ENDPOINTS = {
  media: {
    list:    '/media',
    detail:  (id: number) => `/media/${id}`,
    words:   (id: number) => `/media/${id}/words`,
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
    list:   '/lists',
    detail: (id: number) => `/lists/${id}`,
  },
  auth: {
    login:    '/auth/login',
    register: '/auth/register',
  },
} as const;
