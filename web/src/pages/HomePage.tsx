import { useEffect, useState } from 'react';
import MediaService, { type Media } from '@/services/MediaService';
import MediaCard from '@/components/features/MediaCard';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, BookOpen, TrendingUp } from 'lucide-react';

const HomePage = () => {
    const { t } = useTranslation();
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const data = await MediaService.getAllMedia();
                setMediaList(data);
            } catch (err) {
                setError('Failed to load media list. Please ensure backend is running.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, []);

    const filteredMedia = mediaList.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading content...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-8 text-center max-w-md">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Connection Error</h3>
                    <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-5">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Hero Section */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl">
                        <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('media_list')}
                    </h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
                    Learn vocabulary from your favorite shows and movies
                </p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediaList.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Media</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {mediaList.reduce((sum, m) => sum + m.totalWords, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Words</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                />
            </div>

            {/* Media Grid */}
            {filteredMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                        <Search className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No media found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Try a different search term</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredMedia.map((media) => (
                        <MediaCard key={media.id} media={media} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomePage;
