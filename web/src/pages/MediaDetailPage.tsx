import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MediaService, { type Media, type MediaWordsResponse } from '@/services/MediaService';
import MediaHeader from '@/components/features/MediaHeader';
import WordCard from '@/components/features/WordCard';
import { Loader2, ArrowLeft, Filter } from 'lucide-react';
import api from '@/services/api';

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

    if (!media || !wordData) return <div>Media not found</div>;

    return (
        <div>
            <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
            </Link>

            <MediaHeader media={media} />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Vocabulary ({wordData.words.length})
                </h2>

                <button
                    onClick={() => setFilterUnknown(!filterUnknown)}
                    className={`flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${filterUnknown
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200'
                        }`}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    {filterUnknown ? 'Showing Unknown Only' : 'Filter Unknown'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
