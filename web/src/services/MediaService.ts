import api from './api';
import { Word } from './WordListService';

export interface Media {
    id: number;
    title: string;
    type: 'MOVIE' | 'EPISODE' | 'SONG' | 'OTHER';
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
}

export interface MediaWordsResponse {
    mediaId: number;
    totalWords: number;
    words: (Word & {
        frequency: number;
        isKnown: boolean;
    })[];
}

const MediaService = {
    getAllMedia: async (): Promise<Media[]> => {
        const response = await api.get<Media[]>('/media');
        return response.data;
    },

    getMediaById: async (id: number): Promise<Media> => {
        const response = await api.get<Media>(`/media/${id}`);
        return response.data;
    },

    getMediaWords: async (id: number, userId?: number, onlyUnknown?: boolean): Promise<MediaWordsResponse> => {
        const response = await api.get<MediaWordsResponse>(`/media/${id}/words`, {
            params: { userId, onlyUnknown },
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

    getEnrichedWords: async (page: number = 0, size: number = 20): Promise<Page<Word>> => {
        const response = await api.get<Page<Word>>('/admin/words/enriched', {
            params: { page, size }
        });
        return response.data;
    },

    downloadEnrichedWords: async (date?: string): Promise<void> => {
        const response = await api.get<Blob>('/admin/words/enriched/download', {
            responseType: 'blob',
            params: { date }
        });

        // Create a link element, hide it, click it, and remove it
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `enriched_words${date ? '_' + date : ''}.json`);
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

export default MediaService;
