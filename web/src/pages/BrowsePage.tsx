import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MediaService, { type Media } from '@/services/MediaService';
import MediaCard from '@/components/features/MediaCard';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';

const BrowsePage = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const data = await MediaService.getAllMedia(user?.id);
                setMediaList(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMedia();
    }, []);

    const filteredMedia = useMemo(() => {
        let filtered = mediaList;

        // Filter by type
        if (type === 'series') {
            // Filter for seasons/episodes and Group by Series (TMDB ID)
            const seriesMap = new Map<number, Media>();

            filtered.forEach(media => {
                if ((media.type === 'SEASON' || media.type === 'EPISODE') && media.tmdbId) {
                    if (!seriesMap.has(media.tmdbId)) {
                        // Create a copy to modify the title for display without changing the original record
                        const seriesMedia = { ...media };
                        const sep = seriesMedia.title.indexOf(' - ');
                        if (sep > 0) {
                            seriesMedia.title = seriesMedia.title.substring(0, sep);
                        }
                        seriesMap.set(media.tmdbId, seriesMedia);
                    }
                }
            });
            filtered = Array.from(seriesMap.values());

        } else if (type === 'movies') {
            filtered = filtered.filter(m => m.type === 'MOVIE');
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(m =>
                m.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [mediaList, type, searchQuery]);

    const handleCardClick = (media: Media) => {
        if (type === 'series' && media.tmdbId) {
            navigate(`/series/${media.tmdbId}`);
        } else {
            navigate(`/media/${media.id}`);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                            <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                    {type === 'series' ? t('browse.title_series') : t('browse.title_movies')}
                </h1>
            </div>

            {/* Search */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder={type === 'series' ? t('browse.search_series') : t('browse.search_movies')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl text-sm"
                />
            </div>

            {/* Grid */}
            {filteredMedia.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    {t('browse.no_content')}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredMedia.map((media) => {
                        let stats = undefined;
                        let imageUrl = media.posterUrl || media.backdropUrl;

                        if (type === 'series' && media.tmdbId) {
                            // Calculate stats for this series
                            const seriesEpisodes = mediaList.filter(m => m.tmdbId === media.tmdbId);
                            const seasonCount = new Set(seriesEpisodes.map(m => m.seasonNumber)).size;
                            const episodeCount = seriesEpisodes.length;
                            const seasonLabel = seasonCount !== 1 ? t('browse.season_plural') : t('browse.season_single');
                            const episodeLabel = episodeCount !== 1 ? t('browse.episode_plural') : t('browse.episode_single');
                            stats = `${seasonCount} ${seasonLabel} • ${episodeCount} ${episodeLabel}`;

                            // Try to find the best image from all episodes if the current one is missing
                            if (!imageUrl) {
                                const episodeWithImage = seriesEpisodes.find(m => m.posterUrl || m.backdropUrl);
                                if (episodeWithImage) {
                                    imageUrl = episodeWithImage.posterUrl || episodeWithImage.backdropUrl;
                                }
                            }
                        }

                        return (
                            <div key={media.id} onClick={() => handleCardClick(media)} className="cursor-pointer">
                                <MediaCard media={media} imageUrl={imageUrl} stats={stats} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BrowsePage;
