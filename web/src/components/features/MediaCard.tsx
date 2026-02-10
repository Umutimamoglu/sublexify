import type { Media } from '@/services/MediaService';
import { Film, Music, Tv as TvIcon, FileQuestion, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MediaCardProps {
    media: Media;
}

const MediaCard = ({ media }: MediaCardProps) => {
    const getIcon = () => {
        switch (media.type) {
            case 'MOVIE': return <Film className="w-6 h-6" />;
            case 'EPISODE': return <TvIcon className="w-6 h-6" />;
            case 'SONG': return <Music className="w-6 h-6" />;
            default: return <FileQuestion className="w-6 h-6" />;
        }
    };

    const getTypeLabel = () => {
        switch (media.type) {
            case 'EPISODE': return 'Episode';
            case 'MOVIE': return 'Movie';
            case 'SONG': return 'Song';
            default: return 'Other';
        }
    };

    return (
        <Link to={`/media/${media.id}`} className="block group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors">
                    {/* Placeholder for thumbnail */}
                    {getIcon()}
                </div>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {getTypeLabel()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {media.language.toUpperCase()}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {media.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <BookOpen className="w-4 h-4 mr-1" />
                        <span>{media.totalWords} words</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;
