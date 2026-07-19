import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MediaService, { type Media } from '@/services/MediaService';
import api from '@/services/api';
import { Loader2, ArrowLeft, Play, Clock, Star, CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/utils/cn';
import { Play as PlayIcon } from 'lucide-react';

const SeriesDetailPage = () => {
    const { tmdbId } = useParams<{ tmdbId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuthStore();
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [watchedIds, setWatchedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [mediaData, watchedRes] = await Promise.all([
                    MediaService.getAllMedia(user?.id),
                    isAuthenticated ? api.get('/media/watched-ids').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
                ]);
                setMediaList(mediaData);
                setWatchedIds(watchedRes.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleWatched = async (e: React.MouseEvent, episodeId: number) => {
        e.stopPropagation();
        const isWatched = watchedIds.includes(episodeId);
        // Optimistic
        setWatchedIds(prev => isWatched ? prev.filter(id => id !== episodeId) : [...prev, episodeId]);
        try {
            await api.post(`/media/${episodeId}/watch`);
        } catch (e) {
            console.error(e);
            // Revert
            setWatchedIds(prev => !isWatched ? prev.filter(id => id !== episodeId) : [...prev, episodeId]);
        }
    };

    const seriesEpisodes = useMemo(() => {
        if (!tmdbId) return [];
        return mediaList.filter(m => String(m.tmdbId) === String(tmdbId) && (m.type === 'EPISODE' || m.type === 'SEASON'));
    }, [mediaList, tmdbId]);

    // Metadata from the first episode found (usually easiest way without dedicated series endpoint)
    const seriesMeta = seriesEpisodes[0];

    // Get unique seasons
    const seasons = useMemo(() => {
        const s = new Set<number>();
        seriesEpisodes.forEach(ep => {
            if (ep.seasonNumber !== undefined && ep.seasonNumber !== null) s.add(ep.seasonNumber);
        });
        return Array.from(s).sort((a, b) => a - b);
    }, [seriesEpisodes]);

    // Update selected season if not set or if current one is not in the list
    useEffect(() => {
        if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
            setSelectedSeason(seasons[0]);
        }
    }, [seasons, selectedSeason]);

    // Filter current season episodes
    const currentEpisodes = useMemo(() => {
        return seriesEpisodes
            .filter(ep => ep.seasonNumber === selectedSeason)
            .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
    }, [seriesEpisodes, selectedSeason]);

    // Hook'lar koşullu return'lerden ÖNCE gelmeli (Rules of Hooks) — aksi halde
    // loading bittiğinde hook sayısı değişir ve React tüm sayfayı çökertir (siyah ekran)
    const nextEpisode = useMemo(() => {
        const sortedAll = [...seriesEpisodes].sort((a, b) => {
            if (a.seasonNumber !== b.seasonNumber) return (a.seasonNumber || 0) - (b.seasonNumber || 0);
            return (a.episodeNumber || 0) - (b.episodeNumber || 0);
        });
        return sortedAll.find(ep => !watchedIds.includes(ep.id));
    }, [seriesEpisodes, watchedIds]);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="w-full h-[400px] bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            <div className="flex gap-4">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800/60 rounded-xl" />
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                ))}
            </div>
        </div>
    );
    if (!seriesMeta) return <div className="p-10 text-center">{t('series_detail.not_found')}</div>;

    return (
        <div className="relative pb-24">
            {/* Header / Backdrop */}
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden mb-8">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img
                    src={seriesMeta.backdropUrl || seriesMeta.posterUrl}
                    alt={seriesMeta.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 p-8 z-20 w-full bg-gradient-to-t from-black/90 to-transparent">
                    <button
                        onClick={() => navigate('/browse/series')}
                        className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> {t('series_detail.back_to_series')}
                    </button>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{seriesMeta.title}</h1>
                    <div className="flex items-center gap-4 text-white/80 text-sm">
                        <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {seriesMeta.voteAverage?.toFixed(1)}
                        </span>
                        <span>{t('browse.season_plural', { count: seasons.length })}</span>
                        <span>{t('browse.episode_plural', { count: seriesEpisodes.length })}</span>
                    </div>
                </div>
            </div>

            {/* Overview */}
            <div className="mb-10 max-w-4xl">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('series_detail.overview')}</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {seriesMeta.overview}
                </p>
            </div>

            {/* Season Selector */}
            <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                {seasons.map(season => (
                    <button
                        key={season}
                        onClick={() => setSelectedSeason(season)}
                        className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${selectedSeason === season
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {t('series_detail.season_label', { count: season })}
                    </button>
                ))}
            </div>

            {/* Episode List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentEpisodes.map(episode => (
                    <div
                        key={episode.id}
                        onClick={() => navigate(`/media/${episode.id}`)}
                        className="group flex gap-4 p-4 bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all cursor-pointer"
                    >
                        {/* Episode Thumbnail (Using still path ideally, or poster fallback) */}
                        <div className="relative w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            {episode.backdropUrl ? (
                                <img src={episode.backdropUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Play className="w-8 h-8 opacity-50" />
                                </div>
                            )}
                            
                            <button 
                                onClick={(e) => toggleWatched(e, episode.id)}
                                className={cn(
                                    "absolute bottom-1 right-1 p-1 rounded-full shadow-md transition-all hover:scale-110",
                                    watchedIds.includes(episode.id) 
                                        ? "bg-emerald-500 text-white" 
                                        : "bg-black/40 backdrop-blur-sm text-white/70 hover:bg-black/60"
                                )}
                            >
                                {watchedIds.includes(episode.id) ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    <Circle className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col justify-center">
                            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                                {episode.episodeNumber}. {episode.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {episode.overview || t('series_detail.no_overview')}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {t('common.word_count', { count: episode.totalWords })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default SeriesDetailPage;
