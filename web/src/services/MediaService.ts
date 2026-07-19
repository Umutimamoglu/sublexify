import api from './api';
import { Word } from './WordListService';

export interface Media {
    id: number;
    title: string;
    type: 'MOVIE' | 'SEASON' | 'EPISODE' | 'SONG' | 'OTHER';
    language: string;
    imdbId?: string;
    totalWords: number;
    overview?: string;
    posterUrl?: string;
    backdropUrl?: string;
    tmdbId?: number;
    seasonNumber?: number;
    episodeNumber?: number;
    voteAverage?: number;
    createdAt: string;
    knownWordPercentage?: number;
    difficultyLevel?: string;
    overallDifficulty?: string;
    levelCounts?: Record<string, number>;
    generatedListId?: number;
    // Premium gating
    isPremium?: boolean;
    locked?: boolean;
    lockedCount?: number;
}

export interface MediaWordsResponse {
    mediaId: number;
    totalWords: number;
    words: (Word & {
        frequency: number;
        isKnown: boolean;
    })[];
    levelCounts: Record<string, number>;
    // Premium gating — when locked, `words` is only a preview teaser
    locked?: boolean;
    lockedCount?: number;
    previewLimit?: number;
}

const MediaService = {
    getAllMedia: async (userId?: number): Promise<Media[]> => {
        const response = await api.get<Media[]>('/media', {
            params: { userId },
        });
        return response.data;
    },

    getMediaById: async (id: number, userId?: number): Promise<Media> => {
        const response = await api.get<Media>(`/media/${id}`, {
            params: { userId },
        });
        return response.data;
    },
    
    getContinueLearning: async (userId?: number, limit: number = 10): Promise<Media[]> => {
        const response = await api.get<Media[]>('/media/continue-learning', {
            params: { userId, limit },
        });
        return response.data;
    },

    getMediaWords: async (id: number, userId?: number, onlyUnknown?: boolean, sortBy?: string): Promise<MediaWordsResponse> => {
        const response = await api.get<MediaWordsResponse>(`/media/${id}/words`, {
            params: { userId, onlyUnknown, sortBy },
        });
        return response.data;
    },

    batchUpload: async (files: File[], language: string = 'en'): Promise<string[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        formData.append('language', language);

        const response = await api.post<string[]>('/admin/media/batch-upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteMedia: async (id: number): Promise<void> => {
        await api.delete(`/admin/media/${id}`);
    },

    // ─── Premium content flagging (admin) ───
    setMediaPremium: async (id: number, value: boolean): Promise<void> => {
        await api.patch(`/admin/media/${id}/premium`, null, { params: { value } });
    },

    setSeriesPremium: async (imdbId: string, value: boolean): Promise<void> => {
        await api.patch(`/admin/media/series/${imdbId}/premium`, null, { params: { value } });
    },

    getTotalWordCount: async (): Promise<number> => {
        const response = await api.get<number>('/admin/stats/word-count');
        return response.data;
    },

    seedDefaultLists: async (): Promise<string> => {
        const response = await api.post<string>('/admin/lists/seed/defaults');
        return response.data;
    },

    scrapeEpisode: async (imdbId: string, season: number, episode: number): Promise<string> => {
        const response = await api.post<string>(`/admin/media/scrape-episode`, null, {
            params: { imdbId, season, episode }
        });
        return response.data;
    },

    scrapeEpisodeApi: async (imdbId: string, season: number, episode: number): Promise<string> => {
        const response = await api.post<string>(`/admin/scrape-episode-api`, null, {
            params: { imdbId, season, episode }
        });
        return response.data;
    },

    scrapeMovieApi: async (tmdbId?: number, imdbId?: string): Promise<string> => {
        const response = await api.post<string>(`/admin/scrape-movie-api`, null, {
            params: { tmdbId, imdbId }
        });
        return response.data;
    },

    scrapeMedia: async (imdbId: string): Promise<string> => {
        const response = await api.post<string>(`/admin/media/scrape`, null, {
            params: { imdbId }
        });
        return response.data;
    },

    // TMDB Integration Methods
    searchTmdbSeries: async (query: string): Promise<TmdbMedia[]> => {
        const response = await api.get<TmdbMedia[]>('/admin/media/tmdb/search', {
            params: { query }
        });
        return response.data;
    },

    searchTmdbMovies: async (query: string): Promise<TmdbMedia[]> => {
        const response = await api.get<TmdbMedia[]>('/admin/media/tmdb/movie/search', {
            params: { query }
        });
        return response.data;
    },

    getTmdbSeries: async (id: number): Promise<TmdbMedia> => {
        const response = await api.get<TmdbMedia>(`/admin/media/tmdb/series/${id}`);
        return response.data;
    },

    getTmdbSeason: async (id: number, season: number): Promise<TmdbSeasonDetails> => {
        const response = await api.get<TmdbSeasonDetails>(`/admin/media/tmdb/series/${id}/season/${season}`);
        return response.data;
    },
    getEnrichedDates: async (language: string = 'en'): Promise<string[]> => {
        const response = await api.get<string[]>('/admin/words/enriched/dates', {
            params: { language }
        });
        return response.data;
    },

    getJudgeApprovedDates: async (language: string = 'en'): Promise<string[]> => {
        const response = await api.get<string[]>('/admin/words/enriched/approval-dates', {
            params: { language }
        });
        return response.data;
    },

    getEnrichedWords: async (page: number = 0, size: number = 20, needsReEnrichment: boolean = false, isVerified: boolean = false, isJudgeApproved: boolean = false, date?: string): Promise<Page<Word>> => {
        const response = await api.get<Page<Word>>('/admin/words/enriched', {
            params: { page, size, needsReEnrichment, isVerified, isJudgeApproved, date }
        });
        return response.data;
    },

    judgeApproveBatch: async (wordIds: number[]): Promise<string> => {
        const response = await api.post<string>('/admin/approve-batch', wordIds);
        return response.data;
    },

    downloadEnrichedWords: async (date?: string, needsReEnrichment: boolean = false, isVerified: boolean = false, isJudgeApproved: boolean = false): Promise<void> => {
        const response = await api.get<Blob>('/admin/words/enriched/download', {
            responseType: 'blob',
            params: { date, needsReEnrichment, isVerified, isJudgeApproved }
        });

        // Create a link element, hide it, click it, and remove it
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const filename = needsReEnrichment ? 'enriched_words_flagged' : (isJudgeApproved ? 'enriched_words_judge_approved' : (isVerified ? 'enriched_words_verified' : 'enriched_words'));
        link.setAttribute('download', `${filename}${date ? '_' + date : ''}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    },

    downloadMediaWords: async (id: number, userId?: number, onlyUnknown?: boolean): Promise<void> => {
        const response = await api.get<Blob>(`/media/${id}/words/download`, {
            responseType: 'blob',
            params: { userId, onlyUnknown }
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `vocabulary_${id}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    },

    downloadSubtitles: async (id: number): Promise<void> => {
        const response = await api.get<Blob>(`/media/${id}/download-subtitles`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from content-disposition if possible, otherwise use a default
        link.setAttribute('download', `subtitles_${id}.txt`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    }
};

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

export interface TmdbMedia {
    id: number;
    imdbId?: string;
    title: string;
    overview: string;
    posterPath?: string;
    backdropPath?: string;
    releaseDate?: string;
    voteAverage?: number;
    seasons?: TmdbSeason[];
}

export interface TmdbSeason {
    id: number;
    name: string;
    seasonNumber: number;
    episodeCount: number;
    posterPath?: string;
    airDate?: string;
}

export interface TmdbSeasonDetails {
    id: number;
    name: string;
    seasonNumber: number;
    overview: string;
    posterPath?: string;
    episodes: TmdbEpisode[];
}

export interface TmdbEpisode {
    id: number;
    imdbId?: string;
    name: string;
    episodeNumber: number;
    overview: string;
    stillPath?: string;
    airDate?: string;
    voteAverage?: number;
}

// ============ PIPELINE TYPES ============

export interface FailedWord {
    word: string;
    step: string;
    error: string;
}

export interface PipelineStatus {
    currentStep: 'IDLE' | 'WORKER' | 'SHERIFF' | 'SPECIALIST' | 'JUDGE' | 'AUDITOR' | 'DEFINITION_SHORTENING' | 'COMPLETE' | 'FAILED';
    totalWords: number;
    processedWords: number;
    progressPercent: number;
    failedWords: FailedWord[];
    stepTimings: Record<string, number>;
    judgeQueueSize: number;
    startedAt: string | null;
    completedAt: string | null;
    running: boolean;
}

// ============ PIPELINE API ============

const PipelineAPI = {
    start: async (size: number): Promise<string> => {
        const response = await api.post(`/admin/pipeline/start?size=${size}`);
        return response.data;
    },

    getStatus: async (): Promise<PipelineStatus> => {
        const response = await api.get('/admin/pipeline/status');
        return response.data;
    },

    getFailures: async (): Promise<FailedWord[]> => {
        const response = await api.get('/admin/pipeline/failures');
        return response.data;
    },

    getJudgePending: async (): Promise<any[]> => {
        const response = await api.get('/admin/words/judge-pending');
        return response.data;
    },

    approveJudge: async (wordId: number): Promise<string> => {
        const response = await api.post(`/admin/words/judge-approve?wordId=${wordId}`);
        return response.data;
    },

    rejectJudge: async (wordId: number): Promise<string> => {
        const response = await api.post(`/admin/words/judge-reject?wordId=${wordId}`);
        return response.data;
    },

    triggerGlobalSpecialistFix: async (language: string = 'en'): Promise<string> => {
        const response = await api.post(`/admin/pipeline/specialist-global-fix?language=${language}`);
        return response.data;
    },

    getPendingCounts: async (language: string = 'en'): Promise<{ pendingAnalysis: number; pendingEnrichment: number }> => {
        const response = await api.get('/admin/pipeline/pending-counts', {
            params: { language }
        });
        return response.data;
    },

    triggerAnalysis: async (): Promise<string> => {
        const response = await api.post('/admin/word-analysis/trigger');
        return response.data;
    },

    startAuditor: async (size: number): Promise<string> => {
        const response = await api.post(`/admin/pipeline/auditor?size=${size}`);
        return response.data;
    },

    getAuditProblems: async (page: number = 0, size: number = 20): Promise<Page<Word>> => {
        const response = await api.get('/admin/words/audit-problems', {
            params: { page, size }
        });
        return response.data;
    },

    getAllAuditProblemIds: async (): Promise<number[]> => {
        const response = await api.get('/admin/words/audit-problems/all-ids');
        return response.data;
    },

    resolveAuditProblems: async (wordIds: number[]): Promise<string> => {
        const response = await api.post('/admin/words/audit-resolve', wordIds);
        return response.data;
    },

    purgeAuditProblems: async (): Promise<{ wordsDeleted: number; message: string }> => {
        const response = await api.delete('/admin/words/audit-purge');
        return response.data;
    },
    
    downloadAuditProblems: async (): Promise<void> => {
        const response = await api.get<Blob>('/admin/words/audit-problems/download', {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `audit_problems_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    },

    getAuditStats: async (): Promise<{ totalEnriched: number; totalAudited: number; totalProblems: number; totalPending: number; totalFixed: number; totalIgnored: number }> => {
        const response = await api.get('/admin/words/audit-stats');
        return response.data;
    },

    startAuditorV2: async (size: number): Promise<string> => {
        const response = await api.post(`/admin/pipeline/auditor-v2?size=${size}`);
        return response.data;
    },

    getAuditV2Stats: async (): Promise<{ routedDelete: number; routedShorten: number; routedReEnrich: number; routedProperNoun: number; routedClean: number; pending: number }> => {
        const response = await api.get('/admin/words/audit-v2-stats');
        return response.data;
    },

    bulkFixDefinitions: async (fixes: Array<{ id: number; definition: unknown; clearRootWord?: boolean }>): Promise<string> => {
        const response = await api.post('/admin/words/bulk-fix-definitions', fixes);
        return response.data;
    },

    getShorteningStats: async (): Promise<any> => {
        const response = await api.get('/admin/pipeline/shortening/stats');
        return response.data;
    },

    startDefinitionShortening: async (size: number): Promise<string> => {
        const response = await api.post(`/admin/pipeline/shortening/start?size=${size}`);
        return response.data;
    },

    downloadShorteningCandidates: async (): Promise<void> => {
        const response = await api.get<Blob>('/admin/pipeline/shortening/download', {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `shortening_candidates_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    },

    downloadShorteningProcessed: async (batchId?: string): Promise<void> => {
        const urlRequest = batchId 
            ? `/admin/pipeline/shortening/processed/download?batchId=${batchId}`
            : `/admin/pipeline/shortening/processed/download`;
        const response = await api.get<Blob>(urlRequest, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `already_shortened_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    }
};

export { PipelineAPI };
export default MediaService;
