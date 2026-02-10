import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MediaService, { type Media, type MediaWordsResponse } from '@/services/MediaService';
import MediaHeader from '@/components/features/MediaHeader';
import WordCard from '@/components/features/WordCard';
import { Loader2, ArrowLeft, Filter } from 'lucide-react';
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
                // Unmark
                await api.delete(`/words/${wordId}/mark-known`, { params: { userId } });
            } else {
                // Mark
                await api.post(`/words/${wordId}/mark-known`, null, { params: { userId } });
            }

            // Optimistic update
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
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!media || !wordData) return <div className="text-center py-20 text-gray-500">Media not found</div>;

    return (
        <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
            <Link to="/" className="inline-flex items-center px-4 py-2 mb-6 text-sm font-medium text-gray-600 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
            </Link>

            <MediaHeader media={media} />

            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-20 z-40 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-80">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Vocabulary <span className="text-sm font-medium text-gray-400 ml-2">({wordData.words.length} items)</span>
                </h2>

                <button
                    onClick={() => setFilterUnknown(!filterUnknown)}
                    className={cn(
                        "flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md",
                        filterUnknown
                            ? "bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                >
                    <Filter className={cn("w-4 h-4 mr-2 transition-transform duration-300", filterUnknown ? "rotate-180" : "")} />
                    {filterUnknown ? 'Showing Unknown Only' : 'Filter Unknown Words'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-20">
                {wordData.words.map((word) => (
                    <div key={word.id} className="animate-in zoom-in-50 duration-500 fill-mode-backwards" style={{ animationDelay: `${Math.min(word.id * 50, 1000)}ms` }}>
                        <WordCard
                            {...word}
                            onToggleKnown={handleToggleKnown}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MediaDetailPage;
