import type { Media } from '@/services/MediaService';
import { Film, Music, Tv as TvIcon, FileQuestion, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MediaCardProps {
    media: Media;
}

const MediaCard = ({ media }: MediaCardProps) => {
    const getIcon = () => {
        switch (media.type) {
            case 'MOVIE': return <Film className="w-8 h-8 text-gray-400" />;
            case 'EPISODE': return <TvIcon className="w-8 h-8 text-gray-400" />;
            case 'SONG': return <Music className="w-8 h-8 text-gray-400" />;
            default: return <FileQuestion className="w-8 h-8 text-gray-400" />;
        }
    };

    return (
        <Link to={`/media/${media.id}`} className="block group">
            <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors duration-200 shadow-sm hover:shadow-md">
                {/* Placeholder Thumbnail Area */}
                <div className="h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-800">
                    {getIcon()}
                </div>

                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {media.type}
                        </span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {media.language.toUpperCase()}
                        </span>
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {media.title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                        <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1.5" />
                            <span>{media.totalWords} words</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;
