// src/types/api.ts
// Backend Java DTO'larının TypeScript karşılıkları

export type WordMeaning = {
  pos: string;
  definition: string;
  example: string;
};

export type PhrasalVerb = {
  phrase: string;
  definition: string;
  example: string;
};

export type VerbForms = {
  v1: string;
  v2: string;
  v3: string;
  ing: string;
};

export type WordDefinition = {
  word: string;
  difficulty: string;
  meanings: WordMeaning[];
  phrasal_verbs: PhrasalVerb[];
  verb_forms: VerbForms | null;
};

export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type WordDTO = {
  id: number;
  word: string;
  language: string;
  frequency: number;
  isKnown: boolean;
  definition: WordDefinition | null;
  difficulty: Difficulty | null;
  isEnriched: boolean;
};

export type MediaType = 'MOVIE' | 'SEASON' | 'EPISODE' | 'SONG' | 'OTHER';

export type MediaDTO = {
  id: number;
  title: string;
  imdbId: string | null;
  type: MediaType;
  language: string;
  totalWords: number;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  tmdbId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  voteAverage: number | null;
  createdAt: string;
};

export type MediaWordsResponseDTO = {
  media: MediaDTO;
  words: WordDTO[];
  totalCount: number;
  unknownCount: number;
};

export type UserStatistics = {
  totalKnown: number;
  totalWords: number;
};

export type WordListDTO = {
  id: number;
  name: string;
  wordCount: number;
  createdAt: string;
};

export type ApiError = {
  message: string;
  status: number;
};

// List detail — GET /api/lists/{id} yanıtı (words dahil)
export type ListWord = {
  id: number;
  word: string;
  language: string;
  difficulty: Difficulty | null;
  definition: WordDefinition | null;
  isEnriched: boolean;
};

export type ListDetailDTO = {
  id: number;
  name: string;
  words: ListWord[];
  createdAt: string;
};
