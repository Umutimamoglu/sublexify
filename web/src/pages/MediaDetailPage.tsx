import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MediaService, { type Media, type MediaWordsResponse } from '@/services/MediaService';
import MediaHeader from '@/components/features/MediaHeader';
import WordCard from '@/components/features/WordCard';
import { Loader2, ArrowLeft, Filter, CheckCircle2, BookOpen } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/cn';


const MediaDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [media, setMedia] = useState<Media | null>(null);
    const [wordData, setWordData] = useState<MediaWordsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterUnknown, setFilterUnknown] = useState(false);

    // Mock userId for now (Sprint 4)
    const userId = 1;

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [mediaRes, wordsRes] = await Promise.all([
                    MediaService.getMediaById(Number(id)),
                    MediaService.getMediaWords(Number(id), userId, filterUnknown)
                ]);
                setMedia(mediaRes);
                setWordData(wordsRes);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, filterUnknown]);

    const handleToggleKnown = async (wordId: number, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await api.delete(`/words/${wordId}/mark-known`, { params: { userId } });
            } else {
                await api.post(`/words/${wordId}/mark-known`, null, { params: { userId } });
            }

            if (wordData) {
                setWordData({
                    ...wordData,
                    words: wordData.words.map(w =>
                        w.id === wordId ? { ...w, isKnown: !currentStatus } : w
                    )
                });
            }
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    if (loading && !media) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
        );
    }

    if (!media || !wordData) return (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">Media not found</div>
    );

    const knownCount = wordData.words.filter(w => w.isKnown).length;
    const totalCount = wordData.words.length;
    const progressPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    return (
        <div>
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Library
            </Link>

            <MediaHeader media={media} />

            {/* Progress + Filter Bar */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-5 mb-6 sticky top-20 z-40 backdrop-blur-xl">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Vocabulary
                        </h2>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                            {totalCount} words
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">{knownCount}</span>
                            <span className="text-gray-400 dark:text-gray-500">known</span>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
                        </div>

                        <button
                            onClick={() => setFilterUnknown(!filterUnknown)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                filterUnknown
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {filterUnknown ? 'Unknown Only' : 'All Words'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Word Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wordData.words.map((word) => (
                    <WordCard
                        key={word.id}
                        {...word}
                        onToggleKnown={handleToggleKnown}
                    />
                ))}
            </div>
        </div>
    );
};

export default MediaDetailPage;
