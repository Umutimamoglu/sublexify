import type { Media } from '@/services/MediaService';
import { Film, Music, Tv as TvIcon, FileQuestion, BookOpen, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface MediaCardProps {
    media: Media;
}

const MediaCard = ({ media }: MediaCardProps) => {
    const getIcon = () => {
        switch (media.type) {
            case 'MOVIE': return <Film className="w-8 h-8" />;
            case 'EPISODE': return <TvIcon className="w-8 h-8" />;
            case 'SONG': return <Music className="w-8 h-8" />;
            default: return <FileQuestion className="w-8 h-8" />;
        }
    };

    const getGradient = () => {
        switch (media.type) {
            case 'MOVIE': return 'from-orange-500 to-red-500';
            case 'EPISODE': return 'from-blue-500 to-cyan-500';
            case 'SONG': return 'from-green-500 to-emerald-500';
            default: return 'from-gray-500 to-slate-500';
        }
    };

    return (
        <Link to={`/media/${media.id}`} className="block group">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                {/* Placeholder Thumbnail Area with Gradient */}
                <div className={cn("h-48 flex items-center justify-center text-white bg-gradient-to-br transition-all duration-500", getGradient())}>
                    {/* Overlay Pattern */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                    <div className="transform group-hover:scale-110 transition-transform duration-500 drop-shadow-lg">
                        {getIcon()}
                    </div>
                </div>

                <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider text-white/90 bg-gradient-to-r shadow-sm",
                            getGradient()
                        )}>
                            {media.type}
                        </span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                            {media.language.toUpperCase()}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {media.title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4">
                        <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1.5 text-gray-400" />
                            <span>{media.totalWords} words</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                            <span>Just added</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;
