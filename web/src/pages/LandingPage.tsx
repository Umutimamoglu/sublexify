import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Film, Tv, Library, BookOpen,
    Flame, ChevronRight, List, PlayCircle,
} from 'lucide-react';
import MediaService, { type Media } from '@/services/MediaService';
import WordListService, { type WordListDTO } from '@/services/WordListService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from 'react-i18next';

// ─── Helpers ──────────────────────────────────────────────────

type MediaFilter = 'all' | 'movie' | 'series';

function greeting(t: any): string {
    const h = new Date().getHours();
    if (h < 12) return t('landing.greeting_morning');
    if (h < 18) return t('landing.greeting_afternoon');
    return t('landing.greeting_evening');
}

function seriesTitle(m: Media, t: any): string {
    if (!m) return t('landing.unknown');
    if (m.type !== 'MOVIE') {
        const idx = m.title?.indexOf(' - ') ?? -1;
        if (idx > 0) return m.title.substring(0, idx);
    }
    return m.title || t('landing.unnamed_content');
}

function episodeLabel(m: Media, t: any): string {
    if (!m) return '';
    if (m.type === 'MOVIE') return t('landing.movie');
    if (m.seasonNumber && m.episodeNumber)
        return `S${m.seasonNumber}:E${m.episodeNumber}`;
    return m.type || t('landing.content');
}

function deduplicateMedia(items: Media[], filter: MediaFilter): Media[] {
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    return items.filter((m) => {
        if (!m) return false;
        if (m.type === 'MOVIE') {
            if (filter === 'series') return false;
            return true;
        }
        if (m.type === 'EPISODE' || m.type === 'SEASON') {
            if (filter === 'movie') return false;
            if (!m.imdbId) return false;
            if (seen.has(m.imdbId)) return false;
            seen.add(m.imdbId);
            return true;
        }
        return false;
    });
}

const CEFR_COLORS: Record<string, string> = {
    A1: '#34D399', A2: '#4ADE80',
    B1: '#FBBF24', B2: '#FB923C',
    C1: '#EF4444', C2: '#A855F7',
};

const LIST_ICON_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FF9800'];

// ─── Main Page ────────────────────────────────────────────────

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuthStore();
    const firstName = user?.name?.split(' ')[0] ?? t('landing.user');
    const avatarInitial = firstName.charAt(0).toUpperCase();

    const [continueMedia, setContinueMedia] = useState<Media[]>([]);
    const [allMedia, setAllMedia] = useState<Media[]>([]);
    const [systemLists, setSystemLists] = useState<WordListDTO[]>([]);
    const [loading, setLoading] = useState(true);

    // Hero carousel
    const [heroIndex, setHeroIndex] = useState(0);
    const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Search
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Media filter
    const [mediaFilter, setMediaFilter] = useState<MediaFilter>('series');

    // Series Intercept Modal
    const [seriesListsModalOpen, setSeriesListsModalOpen] = useState(false);
    const [seriesLists, setSeriesLists] = useState<WordListDTO[]>([]);
    const [checkingSeriesId, setCheckingSeriesId] = useState<number | null>(null);
    const [seriesToNavigate, setSeriesToNavigate] = useState<Media | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [cont, all, lists] = await Promise.all([
                    MediaService.getContinueLearning(user?.id, 8),
                    MediaService.getAllMedia(user?.id),
                    WordListService.getStandardLists(),
                ]);
                setContinueMedia(cont || []);
                setAllMedia(all || []);
                setSystemLists(lists || []);
            } catch (err) {
                console.error("Failed to load landing page data", err);
            }
            finally { setLoading(false); }
        };
        load();
    }, [user?.id]);

    // Hero auto-scroll
    const heroItems = useMemo(() => {
        if (continueMedia.length > 0) return continueMedia.slice(0, 6);
        return [...allMedia]
            .filter(m => m.backdropUrl || m.posterUrl)
            .sort((a, b) => b.totalWords - a.totalWords)
            .slice(0, 5);
    }, [continueMedia, allMedia]);

    useEffect(() => {
        if (heroItems.length <= 1) return;
        heroTimer.current = setInterval(() => {
            setHeroIndex(i => (i + 1) % heroItems.length);
        }, 5000);
        return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
    }, [heroItems]);

    const handleHeroNav = (dir: 1 | -1) => {
        if (heroTimer.current) clearInterval(heroTimer.current);
        setHeroIndex(i => (i + dir + heroItems.length) % heroItems.length);
    };

    // Search results
    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2 || !Array.isArray(allMedia) || allMedia.length === 0) return [];
        const seen = new Set<string>();
        const out: Media[] = [];
        for (const m of allMedia) {
            if (!m || !m.title) continue;
            if (!m.title.toLowerCase().includes(q)) continue;
            const key = m.type !== 'MOVIE' && m.imdbId ? m.imdbId : String(m.id);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ ...m, title: seriesTitle(m, t) });
            if (out.length >= 8) break;
        }
        return out;
    }, [query, allMedia]);

    // Browse media
    const browsedMedia = useMemo(() => deduplicateMedia(allMedia, mediaFilter), [allMedia, mediaFilter]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const goToMedia = async (m: Media) => {
        if (m.type === 'MOVIE') {
            navigate(`/media/${m.id}`);
            return;
        }

        // Intercept Series click
        const seriesId = m.imdbId || String(m.id);
        setCheckingSeriesId(m.id);
        try {
            const lists = await WordListService.getListsBySeries(seriesId);
            if (lists && lists.length > 0) {
                setSeriesLists(lists);
                setSeriesToNavigate(m);
                setSeriesListsModalOpen(true);
            } else {
                showToast(t('landing.no_list_toast'));
                setTimeout(() => navigate(m.tmdbId ? `/series/${m.tmdbId}` : `/media/${m.id}`), 1500);
            }
        } catch (error) {
            console.error("Failed to check lists for series", error);
            navigate(m.tmdbId ? `/series/${m.tmdbId}` : `/media/${m.id}`);
        } finally {
            setCheckingSeriesId(null);
        }
    };

    const heroItem = heroItems[heroIndex];

    return (
        <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
            {/* ─── Hero Banner ─────────────────────────────────── */}
            <div className="relative h-[52vh] min-h-[380px] max-h-[580px] overflow-hidden bg-gray-900">
                {heroItem ? (
                    <>
                        {/* Backdrop image */}
                        <div
                            key={heroIndex}
                            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                            style={{
                                backgroundImage: `url(${(heroItem.backdropUrl || heroItem.posterUrl)?.replace('/original/', '/w1280/')})`,
                                backgroundPosition: 'center 20%',
                            }}
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

                        {/* Floating header */}
                        <div className="absolute top-0 left-0 right-0 px-6 lg:px-10 pt-6 flex items-center justify-between">
                            {isAuthenticated ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">{avatarInitial}</span>
                                    </div>
                                    <span className="text-white font-semibold text-base drop-shadow-md">
                                        {greeting(t)}, {firstName}
                                    </span>
                                </div>
                            ) : (
                                <div />
                            )}
                            {/* Streak badge - placeholder; wire up real data if available */}
                            <div className="flex items-center gap-2 bg-red-950/70 border border-red-500/40 px-3 py-1.5 rounded-xl">
                                <Flame className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-bold text-sm">0</span>
                            </div>
                        </div>

                        {/* Hero content */}
                        <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-10 pb-10">
                            <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">
                                {continueMedia.length > 0 ? t('landing.continue_watching') : t('landing.recommended')} · {episodeLabel(heroItem, t)}
                            </p>
                            <h1 className="text-white text-3xl lg:text-4xl font-black tracking-tight mb-2 drop-shadow-lg">
                                {seriesTitle(heroItem, t)}
                            </h1>
                            {heroItem.overview && (
                                <p className="text-white/60 text-sm max-w-xl line-clamp-2 mb-4">{heroItem.overview}</p>
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => goToMedia(heroItem)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl shadow-lg transition-all hover:scale-105"
                                >
                                    <PlayCircle className="w-4 h-4" /> {t('landing.start')}
                                </button>
                                <button
                                    onClick={() => goToMedia(heroItem)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/25 backdrop-blur-sm transition-all"
                                >
                                    {t('landing.details')}
                                </button>
                            </div>
                        </div>

                        {/* Pagination dots */}
                        {heroItems.length > 1 && (
                            <div className="absolute bottom-3 right-6 flex items-center gap-1.5">
                                {heroItems.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { if (heroTimer.current) clearInterval(heroTimer.current); setHeroIndex(i); }}
                                        className={`transition-all rounded-full ${i === heroIndex ? 'w-5 h-2 bg-yellow-400' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    // Empty hero fallback
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                        <div className="text-center text-white">
                            <Film className="w-12 h-12 opacity-30 mx-auto mb-3" />
                            <p className="text-lg font-bold opacity-60">{t('landing.loading_content')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Content Area ─────────────────────────────────── */}
            <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-10 max-w-7xl mx-auto">

                {/* Search Bar */}
                <div className="relative z-30">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('landing.search_placeholder')}
                            value={query}
                            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
                            onFocus={() => setShowResults(true)}
                            className="w-full pl-14 pr-12 py-4 bg-white dark:bg-[#161822] border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-base font-medium shadow-xl shadow-indigo-500/5 outline-none focus:border-indigo-500/50 dark:focus:border-indigo-500/50 transition-all"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setShowResults(false); }}
                                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Search Dropdown */}
                    {showResults && query.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#161822] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                            {searchResults.length === 0 ? (
                                <div className="p-10 text-center text-gray-400">{t('landing.no_results_for', { query })}</div>
                            ) : (
                                <div className="p-2">
                                    {searchResults.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setShowResults(false);
                                                setQuery('');
                                                if (item.type === 'MOVIE') navigate(`/media/${item.id}`);
                                                else if (item.tmdbId) navigate(`/series/${item.tmdbId}`);
                                                else navigate(`/media/${item.id}`);
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                                                    {(item.posterUrl || item.backdropUrl) ? (
                                                        <img src={(item.posterUrl || item.backdropUrl)?.replace('/original/', '/w500/')} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            {item.type === 'MOVIE' ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</p>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{item.type === 'MOVIE' ? t('landing.movie') : t('landing.series')}</p>
                                                </div>
                                            </div>
                                            {item.knownWordPercentage != null && (
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{t('landing.known_pct', { pct: Math.round(item.knownWordPercentage) })}</span>
                                                    <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${item.knownWordPercentage}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {showResults && query.length >= 2 && (
                        <div className="fixed inset-0 z-[-1]" onClick={() => setShowResults(false)} />
                    )}
                </div>





                {/* Browse Media */}
                <section>
                    {/* Filter chips */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <button
                            onClick={() => setMediaFilter('all')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${mediaFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#161822] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                        >
                            {t('landing.all_content')}
                        </button>
                        {([{ key: 'movie', label: t('landing.filter_movies') }, { key: 'series', label: t('landing.filter_series') }] as const).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setMediaFilter(f.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${mediaFilter === f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#161822] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <button
                            onClick={() => navigate(mediaFilter === 'movie' ? '/browse/movies' : '/browse/series')}
                            className="ml-auto flex items-center gap-1 text-xs font-bold text-yellow-500 uppercase tracking-wider hover:text-yellow-400 transition-colors"
                        >
                            {t('landing.view_all')} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-[280px] h-36 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {browsedMedia.slice(0, 20).map(m => (
                                <MediaLandscapeCard
                                    key={`${m.id}-${m.imdbId}`}
                                    media={m}
                                    t={t}
                                    onClick={() => {
                                        if (m.type === 'MOVIE') navigate(`/media/${m.id}`);
                                        else if (m.tmdbId) navigate(`/series/${m.tmdbId}`);
                                        else navigate(`/media/${m.id}`);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Curated Lists */}
                {loading ? (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-indigo-500 opacity-50" />
                            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        </h2>
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-full flex items-center gap-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl p-5">
                                    <div className="w-[52px] h-[52px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                                        <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800/60 rounded animate-pulse" />
                                    </div>
                                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse shrink-0" />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : systemLists.length > 0 ? (
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            {t('landing.curated_lists')}
                        </h2>
                        <div className="space-y-3">
                            {/* Known Words card */}
                            <button
                                onClick={() => navigate('/lists')}
                                className="w-full flex items-center gap-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl p-5 hover:border-pink-300 dark:hover:border-pink-800 transition-all hover:shadow-md group"
                            >
                                <div className="w-13 h-13 rounded-2xl bg-pink-500/15 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0" style={{ width: 52, height: 52 }}>
                                    <BookOpen className="w-6 h-6 text-pink-500" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-gray-900 dark:text-white">{t('landing.known_words_title')}</p>
                                    <p className="text-sm text-gray-400">{t('landing.known_words_desc')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors" />
                            </button>

                            {systemLists.map((list, idx) => {
                                if (!list) return null;
                                const color = LIST_ICON_COLORS[idx % LIST_ICON_COLORS.length];
                                const knownWords = list.totalWords - (list.unknownWords || 0);
                                const pct = list.totalWords > 0 ? Math.round((knownWords / list.totalWords) * 100) : 0;
                                const SafeName = list.name || "İsimsiz Liste";
                                const isOxford = SafeName.toLowerCase().includes('oxford');
                                return (
                                    <button
                                        key={list.id}
                                        onClick={() => navigate(`/lists?id=${list.id}`)}
                                        className="w-full flex items-center gap-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl p-5 transition-all hover:shadow-md group"
                                        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                                    >
                                        <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '22' }}>
                                            <List className="w-6 h-6" style={{ color }} />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{list.name}</p>
                                            <p className="text-sm text-gray-400">{isOxford ? t('landing.core_english') : t('landing.words_count', { count: list.totalWords })}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xl font-black" style={{ color: isOxford ? color : undefined, ...(isOxford ? {} : { color: '#6b7280' }) }}>
                                                {isOxford ? `${pct}%` : list.totalWords.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {isOxford ? t('landing.completed') : t('landing.word_label')}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ) : null}
            </div>

            {/* Series Lists Modal */}
            {seriesListsModalOpen && seriesToNavigate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#161822] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {t('landing.list_modal_title', { title: seriesToNavigate.title })}
                            </h3>
                            <button onClick={() => setSeriesListsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-gray-500 mb-4 text-sm">{t('landing.list_modal_desc')}</p>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-2">
                            {seriesLists.map(list => (
                                <button key={list.id} onClick={() => navigate(`/lists?id=${list.id}`)} className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-between group">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-gray-100">{list.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{list.totalWords} {t('landing.word_label').toLowerCase()} • {t('landing.words_to_learn', { unknown: list.unknownWords })}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => navigate(seriesToNavigate.tmdbId ? `/series/${seriesToNavigate.tmdbId}` : `/media/${seriesToNavigate.id}`)} className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                {t('landing.go_to_episodes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Message */}
            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm flex items-center gap-2 border border-gray-700">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        {toastMessage}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Media Landscape Card ─────────────────────────────────────

function MediaLandscapeCard({ media, onClick, t }: { media: Media; onClick: () => void; t: any }) {
    const title = seriesTitle(media, t);
    const cefrTotal = Object.values(media.levelCounts ?? {}).reduce((a, b) => a + b, 0);

    return (
        <button
            onClick={onClick}
            className="group w-[280px] h-36 shrink-0 rounded-2xl overflow-hidden relative border border-white/10 flex flex-row shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
            {/* Poster left */}
            <div className="w-24 h-full bg-gray-900 shrink-0 overflow-hidden">
                {media.posterUrl ? (
                    <img src={media.posterUrl?.replace('/original/', '/w500/')} alt={title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/50">
                        <span className="text-4xl font-black text-white/30">{title.charAt(0)}</span>
                    </div>
                )}
            </div>

            {/* Right content */}
            <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-3 flex flex-col justify-between text-left relative overflow-hidden">
                {/* Backdrop blur behind */}
                {media.backdropUrl && (
                    <div
                        className="absolute inset-0 opacity-20 bg-cover bg-center"
                        style={{ backgroundImage: `url(${media.backdropUrl?.replace('/original/', '/w780/')})` }}
                    />
                )}

                <div className="relative">
                    <p className="text-white font-bold text-sm line-clamp-2 leading-tight">{title}</p>
                    <p className="text-white/50 text-xs mt-1">{episodeLabel(media, t)}</p>
                </div>

                <div className="relative space-y-2">
                    <div className="flex items-center gap-1 text-white/60 text-[11px]">
                        <span>{t('landing.words_count', { count: media.totalWords })}</span>
                        {media.knownWordPercentage != null && (
                            <span className="text-yellow-400 font-bold ml-1">· {t('landing.known_pct', { pct: Math.round(media.knownWordPercentage) })}</span>
                        )}
                    </div>
                    {cefrTotal > 0 && (
                        <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
                            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map(lv => {
                                const cnt = media.levelCounts?.[lv] ?? 0;
                                if (!cnt) return null;
                                return (
                                    <div
                                        key={lv}
                                        style={{ flex: cnt / cefrTotal, backgroundColor: CEFR_COLORS[lv] }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

export default LandingPage;
