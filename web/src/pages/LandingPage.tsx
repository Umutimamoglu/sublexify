import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Tv, List, PlayCircle, Search, X, BookOpen, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MediaService, { type Media } from '@/services/MediaService';
import MediaCard from '@/components/features/MediaCard';
import WordListService, { type WordListDTO } from '@/services/WordListService';

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const categories = [
        {
            id: 'series',
            title: 'Series',
            icon: Tv,
            color: 'bg-indigo-500',
            description: 'Browse your favorite TV shows and learn efficiently.',
            path: '/browse/series'
        },
        {
            id: 'movies',
            title: 'Movies',
            icon: Film,
            color: 'bg-purple-500',
            description: 'Dive into movies and expand your vocabulary.',
            path: '/browse/movies'
        },
        {
            id: 'lists',
            title: 'My Lists',
            icon: List,
            color: 'bg-emerald-500',
            description: 'Review your personal vocabulary lists.',
            path: '/lists'
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                What do you want to learn today?
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 text-center max-w-2xl">
                Select a category to start your immersive language learning journey with Sublex.
            </p>

            {/* Global Search */}
            <GlobalSearch />

            {/* Continue Learning Section */}
            <ContinueLearning />

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-20">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => navigate(category.path)}
                        className="group relative flex flex-col items-center p-8 bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-3xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-center"
                    >
                        <div className={`p-4 rounded-2xl mb-6 ${category.color} bg-opacity-10 dark:bg-opacity-20`}>
                            <CategoryIcon icon={category.icon} color={category.color} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {category.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {category.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* Featured Lists Section */}
            <FeaturedLists />
        </div>
    );
};

const ContinueLearning = () => {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContinueLearning = async () => {
            try {
                // For now use default limit of 5
                const data = await MediaService.getContinueLearning(1);
                setMediaList(data);
            } catch (err) {
                console.error('Failed to fetch continue learning media', err);
            } finally {
                setLoading(false);
            }
        };
        fetchContinueLearning();
    }, []);

    if (loading || mediaList.length === 0) return null;

    return (
        <div className="w-full max-w-5xl mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-indigo-500" />
                Continue Learning
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {mediaList.map((media) => (
                    <MediaCard key={media.id} media={media} imageUrl={media.posterUrl || media.backdropUrl} />
                ))}
            </div>
        </div>
    );
};

const CategoryIcon = ({ icon: Icon, color }: { icon: any, color: string }) => (
    <Icon className={`w-10 h-10 ${color.replace('bg-', 'text-')}`} />
);

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        const fetchAllMedia = async () => {
            try {
                const data = await MediaService.getAllMedia(1);
                setMediaList(data);
            } catch (err) {
                console.error('Failed to fetch media for search', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllMedia();
    }, []);

    const results = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];

        const normalizedQuery = query.toLowerCase();
        
        // Group series items
        const seriesMap = new Map<number, { id: number, tmdbId: number, title: string, type: string, knownWordPercentage?: number, image?: string }>();
        const movies: any[] = [];

        mediaList.forEach(m => {
            if (m.title.toLowerCase().includes(normalizedQuery)) {
                if (m.type === 'MOVIE') {
                    movies.push(m);
                } else if (m.tmdbId) {
                    if (!seriesMap.has(m.tmdbId)) {
                        // For series, try to get clean title (everything before ' - ')
                        let cleanTitle = m.title;
                        const sepIndex = m.title.indexOf(' - ');
                        if (sepIndex > 0) cleanTitle = m.title.substring(0, sepIndex);
                        
                        seriesMap.set(m.tmdbId, {
                            id: m.id,
                            tmdbId: m.tmdbId,
                            title: cleanTitle,
                            type: 'SERIES',
                            knownWordPercentage: m.knownWordPercentage,
                            image: m.posterUrl || m.backdropUrl
                        });
                    }
                }
            }
        });

        return [...movies, ...Array.from(seriesMap.values())].slice(0, 8);
    }, [query, mediaList]);

    return (
        <div className="w-full max-w-2xl mb-12 relative z-50">
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search movies or series..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="w-full pl-14 pr-12 py-5 bg-white dark:bg-[#161822] border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] text-lg font-medium shadow-xl shadow-indigo-500/5 outline-none focus:border-indigo-500/50 dark:focus:border-indigo-500/50 transition-all"
                />
                {query && (
                    <button 
                        onClick={() => setQuery('')}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#161822] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.length > 0 ? (
                        <div className="p-2">
                            {results.map((item: any) => (
                                <button
                                    key={item.id + (item.tmdbId || 0)}
                                    onClick={() => {
                                        if (item.type === 'SERIES' && item.tmdbId) {
                                            navigate(`/series/${item.tmdbId}`);
                                        } else {
                                            navigate(`/media/${item.id}`);
                                        }
                                        setShowResults(false);
                                        setQuery('');
                                    }}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-colors group/item"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                            {(item.image || item.posterUrl || item.backdropUrl) ? (
                                                <img 
                                                    src={item.image || item.posterUrl || item.backdropUrl} 
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${item.type === 'MOVIE' ? 'text-purple-600' : 'text-indigo-600'}`}>
                                                    {item.type === 'MOVIE' ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                                {item.type}
                                            </p>
                                        </div>
                                    </div>
                                    {item.knownWordPercentage !== undefined && (
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                %{Math.round(item.knownWordPercentage)} Uyum
                                            </span>
                                            <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500" 
                                                    style={{ width: `${item.knownWordPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                            No results found for "{query}"
                        </div>
                    )}
                </div>
            )}
            
            {/* Backdrop to close results when clicking outside */}
            {showResults && query.length >= 2 && (
                <div 
                    className="fixed inset-0 z-[-1]" 
                    onClick={() => setShowResults(false)}
                />
            )}
        </div>
    );
};


const FeaturedLists = () => {
    const navigate = useNavigate();
    const [lists, setLists] = useState<WordListDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const data = await WordListService.getStandardLists();
                setLists(data);
            } catch (err) {
                console.error('Failed to fetch standard lists', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLists();
    }, []);

    if (loading) return null;
    if (lists.length === 0) return null;

    return (
        <div className="w-full max-w-5xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                Featured Collections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {lists.map(list => (
                    <button
                        key={list.id}
                        onClick={() => navigate(`/lists/${list.id}`)}
                        className="group text-left bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-lg hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <List className="w-5 h-5" />
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-800 text-xs font-semibold px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300">
                                Official
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                            {list.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                            Standard vocabulary list to boost your language skills.
                        </p>
                        <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                            Start Learning <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LandingPage;
