import type { Media } from '@/services/MediaService';
import { Film, Music, Tv as TvIcon, FileQuestion, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MediaCardProps {
    media: Media;
    imageUrl?: string;
    stats?: string;
}

const typeConfig: Record<string, { color: string; bgLight: string; bgDark: string }> = {
    MOVIE: { color: 'text-violet-600 dark:text-violet-400', bgLight: 'bg-violet-50', bgDark: 'dark:bg-violet-500/10' },
    EPISODE: { color: 'text-blue-600 dark:text-blue-400', bgLight: 'bg-blue-50', bgDark: 'dark:bg-blue-500/10' },
    SONG: { color: 'text-rose-600 dark:text-rose-400', bgLight: 'bg-rose-50', bgDark: 'dark:bg-rose-500/10' },
    OTHER: { color: 'text-gray-600 dark:text-gray-400', bgLight: 'bg-gray-50', bgDark: 'dark:bg-gray-500/10' },
};

const MediaCard = ({ media, imageUrl, stats }: MediaCardProps) => {
    const config = typeConfig[media.type] || typeConfig.OTHER;

    const getIcon = () => {
        const cls = `w-10 h-10 ${config.color}`;
        switch (media.type) {
            case 'MOVIE': return <Film className={cls} />;
            case 'EPISODE': return <TvIcon className={cls} />;
            case 'SONG': return <Music className={cls} />;
            default: return <FileQuestion className={cls} />;
        }
    };

    return (
        <Link to={media.tmdbId ? `/series/${media.tmdbId}` : `/media/${media.id}`} className="block group h-full">
            <div className="bg-white dark:bg-[#161822] rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/5 hover:-translate-y-0.5 h-full flex flex-col">
                {/* Image or Icon Area */}
                <div className={`aspect-[2/3] w-full relative overflow-hidden ${!imageUrl ? `${config.bgLight} ${config.bgDark}` : ''}`}>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={media.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-current" />
                                <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full border-2 border-current" />
                            </div>
                            {getIcon()}
                        </div>
                    )}

                    <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 text-white backdrop-blur-md">
                            {media.type === 'EPISODE' && media.tmdbId ? 'SERIES' : media.type}
                        </span>
                    </div>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {media.title}
                    </h3>

                    {/* Stats or Extra Info */}
                    {stats && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-1">
                            {stats}
                        </p>
                    )}

                    {/* Bottom */}
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/60">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <span className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mr-2">
                                {media.language.toUpperCase()}
                            </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;
