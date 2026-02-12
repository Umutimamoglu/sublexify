import api from './api';

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
    words: {
        id: number;
        word: string;
        frequency: number;
        isKnown: boolean;
    }[];
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

    scrapeMedia: async (imdbId: string): Promise<string> => {
        const response = await api.post<string>(`/admin/media/scrape?imdbId=${imdbId}`);
        return response.data;
    },

    scrapeEpisode: async (imdbId: string, season: number, episode: number): Promise<string> => {
        const response = await api.post<string>(`/admin/media/scrape-episode`, null, {
            params: { imdbId, season, episode }
        });
        return response.data;
    },
};

export default MediaService;
