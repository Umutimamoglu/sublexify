import type { Media } from '@/services/MediaService';
import { Film, Music, Tv as TvIcon, FileQuestion, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

const cefrColors: Record<string, string> = {
    A1: 'bg-emerald-400',
    A2: 'bg-green-400',
    B1: 'bg-amber-400',
    B2: 'bg-orange-400',
    C1: 'bg-red-500',
    C2: 'bg-purple-500',
};

const difficultyConfig: Record<string, { labelKey: string; color: string }> = {
    EASY: { labelKey: 'common.easy', color: 'bg-emerald-500 text-white' },
    MEDIUM: { labelKey: 'common.medium', color: 'bg-amber-500 text-white' },
    HARD: { labelKey: 'common.hard', color: 'bg-rose-500 text-white' }
};

const MediaCard = ({ media, imageUrl, stats }: MediaCardProps) => {
    const { t } = useTranslation();
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

    const getTargetLink = () => {
        if (media.generatedListId) return `/lists?id=${media.generatedListId}`;
        return media.tmdbId ? `/series/${media.tmdbId}` : `/media/${media.id}`;
    };

    return (
        <Link to={getTargetLink()} className="block group h-full">
            <div className="bg-white dark:bg-[#161822] rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/5 hover:-translate-y-0.5 h-full flex flex-col">
                {/* Image or Icon Area */}
                <div className={`aspect-[2/3] w-full relative overflow-hidden ${!imageUrl ? `${config.bgLight} ${config.bgDark}` : ''}`}>
                    {imageUrl ? (
                        <img
                            src={imageUrl.replace('/original/', '/w500/')}
                            alt={media.title}
                            loading="lazy"
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

                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 text-white backdrop-blur-md shadow-sm">
                            {media.type === 'EPISODE' && media.tmdbId ? t('common.series').toUpperCase() : media.type}
                        </span>
                        {media.overallDifficulty && difficultyConfig[media.overallDifficulty] && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-md shadow-sm ${difficultyConfig[media.overallDifficulty].color}`}>
                                {t(difficultyConfig[media.overallDifficulty].labelKey)}
                            </span>
                        )}
                    </div>

                    {media.knownWordPercentage !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-1000" 
                                style={{ width: `${media.knownWordPercentage}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className="p-5 flex flex-col flex-grow">
                    {/* Distribution Bar */}
                    {media.levelCounts && Object.keys(media.levelCounts).length > 0 && (
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => {
                                const count = media.levelCounts?.[level] || 0;
                                const total = Object.values(media.levelCounts || {}).reduce((a, b) => a + b, 0);
                                if (count === 0) return null;
                                return (
                                    <div 
                                        key={level}
                                        className={`${cefrColors[level]} h-full first:rounded-l-full last:rounded-r-full`}
                                        style={{ width: `${(count / total) * 100}%` }}
                                        title={`${level}: ${count} ${t('common.words')}`}
                                    />
                                );
                            })}
                        </div>
                    )}

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
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                {media.language.toUpperCase()}
                            </span>
                            {media.knownWordPercentage !== undefined && (
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 text-indigo-500" />
                                    %{Math.round(media.knownWordPercentage)} {t('common.compatibility')}
                                </span>
                            )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;
