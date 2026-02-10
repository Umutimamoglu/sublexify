import { useEffect, useState } from 'react';
import MediaService, { type Media } from '@/services/MediaService';
import MediaCard from '@/components/features/MediaCard';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

const HomePage = () => {
    const { t } = useTranslation();
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10">
                <div className="text-red-500 text-lg mb-2">Error</div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('media_list')}
                </h1>
            </div>

            {mediaList.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                    No media found.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {mediaList.map((media) => (
                        <MediaCard key={media.id} media={media} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomePage;
