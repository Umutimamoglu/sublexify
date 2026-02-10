import type { Media } from '@/services/MediaService';
import { Calendar, Languages } from 'lucide-react';

interface MediaHeaderProps {
    media: Media;
}

const MediaHeader = ({ media }: MediaHeaderProps) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                            {media.type}
                        </span>
                        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Languages className="w-4 h-4 mr-1" />
                            {media.language.toUpperCase()}
                        </span>
                        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(media.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {media.title}
                    </h1>
                    {media.imdbId && (
                        <a
                            href={`https://www.imdb.com/title/${media.imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center"
                        >
                            IMDb: {media.imdbId}
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-700 px-6 py-4 rounded-lg">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {media.totalWords}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Total Words
                        </div>
                    </div>
                    {/* Future stats: Known Words percentage */}
                </div>
            </div>
        </div>
    );
};

export default MediaHeader;
