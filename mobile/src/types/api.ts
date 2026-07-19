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
  note?: string | null;
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
  // userId ile çekildiğinde gelen ek alanlar
  knownWordPercentage?: number | null;
  difficultyLevel?: string | null;
  overallDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  levelCounts?: Record<string, number> | null;
  generatedListId?: number | null;
  // Premium gating
  isPremium?: boolean;
  locked?: boolean;
  lockedCount?: number;
};

// GET /api/media/{id}/words yanıtı
export type MediaWordsResponseDTO = {
  mediaId: number;
  totalWords: number;
  unknownWords: number;
  levelCounts: Record<string, number>;
  words: WordDTO[];
  // Premium gating — when locked, `words` is only a preview teaser
  locked?: boolean;
  lockedCount?: number;
  previewLimit?: number;
};

export type UserStatistics = {
  totalKnownWords: number;
  totalWords: number;
  wordsLearnedToday?: number;
};

// GET /api/subscription/me
export type MembershipDTO = {
  isPremium: boolean;
  plan: 'FREE' | 'PREMIUM';
  source: string | null;                 // MANUAL | STRIPE | APPLE | GOOGLE | null
  sourceLabel: string | null;
  billingInterval: 'MONTHLY' | 'YEARLY' | null;
  lifetime: boolean;
  startedAt: string | null;
  premiumUntil: string | null;
  daysLeft: number | null;
  note: string | null;
};

// GET /api/lists ve /api/lists/standard yanıtı
export type WordListDTO = {
  id: number;
  name: string;
  totalWords: number;
  unknownWords: number;
  levelCounts: Record<string, number>;
  createdAt: string;
  isSystem?: boolean;
  color?: string;
  sourceMediaId?: number;
  sourceMediaPosterUrl?: string | null;
  sourceMediaTmdbId?: number | null;
  sourceMediaImdbId?: string | null;
};

export type ApiError = {
  message: string;
  status: number;
};

// List detail — GET /api/lists/{id}/words yanıtı
export type ListWord = {
  id: number;
  word: string;
  language: string;
  difficulty: Difficulty | null;
  definition: WordDefinition | null;
  isEnriched: boolean;
  isKnown?: boolean;
  note?: string | null;
};

export type ListDetailDTO = {
  id: number;
  name: string;
  words: ListWord[];
  createdAt: string;
};

// ─── Study Mode ───────────────────────────────────────────────
export type QuestionType = 'MULTIPLE_CHOICE' | 'FILL_IN_THE_BLANKS' | 'LISTENING';

export type StudyQuestionDTO = {
  wordId: number;
  word: string;
  definition: string;
  questionType: QuestionType;
  choices: string[];
  contextSentence: string | null;
  correctAnswer: string;
  difficulty?: string;
  pos?: string;
};

export type StudyResultDTO = {
  wordId: number;
  isCorrect: boolean;
};

// ─── Progress ─────────────────────────────────────────────────
export type ProgressStatsDTO = {
  totalWordsLearnt: number;
  totalWordsStudied: number;
  difficultWords: number;
  wordsToReviewToday: number;
  notesCount: number;
};

// ─── App Init ─────────────────────────────────────────────────
// GET /api/app-init — açılışta tüm kritik veri tek istekte.
// Anonim çağrıda (onboarding) sadece public alanlar dolu gelir.
export type AppInitDTO = {
  media: MediaDTO[] | null;
  frequentWords: WordDTO[] | null;
  continueLearning: MediaDTO[] | null;
  lists: WordListDTO[] | null;
  userStatistics: UserStatistics | null;
  knownWords: WordDTO[] | null;
  watchedMediaIds: number[] | null;
  progressStats: ProgressStatsDTO | null;
};
