import type { Media } from '@/services/MediaService';
import { Languages, BarChart3, Calendar, ExternalLink, Star } from 'lucide-react';

interface MediaHeaderProps {
    media: Media;
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
    EASY: { label: 'Kolay', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    MEDIUM: { label: 'Orta', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    HARD: { label: 'Zor', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
};

const MediaHeader = ({ media }: MediaHeaderProps) => {
    return (
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl bg-gray-900 group">
            {/* Backdrop Image */}
            {media.backdropUrl ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${media.backdropUrl?.replace('/original/', '/w1280/')})` }}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-gray-900 to-black opacity-80" />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f1117]/90 via-[#0f1117]/40 to-transparent" />

            <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row gap-8 items-start">
                {/* Poster */}
                {media.posterUrl && (
                    <img
                        src={media.posterUrl?.replace('/original/', '/w500/')}
                        alt={media.title}
                        loading="lazy"
                        className="w-32 sm:w-48 rounded-xl shadow-2xl border border-white/10 hidden sm:block object-cover aspect-[2/3]"
                    />
                )}

                <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 backdrop-blur-md">
                            {media.type}
                        </span>

                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/90 border border-white/10 backdrop-blur-md">
                            <Languages className="w-3.5 h-3.5" />
                            {media.language.toUpperCase()}
                        </span>

                        {media.overallDifficulty && difficultyConfig[media.overallDifficulty] && (
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${difficultyConfig[media.overallDifficulty].color}`}>
                                {difficultyConfig[media.overallDifficulty].label}
                            </span>
                        )}

                        {media.voteAverage && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-200 border border-yellow-500/20 backdrop-blur-md">
                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                {media.voteAverage.toFixed(1)}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 leading-tight tracking-tight">
                        {media.title}
                    </h1>

                    {(media.seasonNumber !== undefined || media.episodeNumber !== undefined) && (
                        <p className="text-lg text-indigo-300 mb-5 font-medium flex items-center gap-2">
                            {media.seasonNumber && <span>Season {media.seasonNumber}</span>}
                            {media.seasonNumber && media.episodeNumber && <span className="w-1 h-1 bg-indigo-300 rounded-full" />}
                            {media.episodeNumber && <span>Episode {media.episodeNumber}</span>}
                        </p>
                    )}

                    {/* Overview */}
                    {media.overview && (
                        <p className="text-gray-300 text-base leading-relaxed mb-8 max-w-3xl line-clamp-3 hover:line-clamp-none transition-all">
                            {media.overview}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-8 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3 text-white/80">
                            <div className="p-2 bg-white/5 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white leading-none">{media.totalWords.toLocaleString()}</p>
                                <span className="text-xs text-gray-400 uppercase tracking-wide">Unique Words</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-white/80">
                            <div className="p-2 bg-white/5 rounded-lg">
                                <Calendar className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white leading-none">
                                    {new Date(media.createdAt).toLocaleDateString()}
                                </p>
                                <span className="text-xs text-gray-400 uppercase tracking-wide">Added</span>
                            </div>
                        </div>

                        {media.imdbId && (
                            <a
                                href={`https://www.imdb.com/title/${media.imdbId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-white/80 hover:text-white transition-colors group/link"
                            >
                                <div className="p-2 bg-white/5 rounded-lg group-hover/link:bg-yellow-400/20 transition-colors">
                                    <ExternalLink className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white leading-none">IMDb</p>
                                    <span className="text-xs text-gray-400 uppercase tracking-wide">View Page</span>
                                </div>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaHeader;
