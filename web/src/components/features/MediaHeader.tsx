import type { Media } from '@/services/MediaService';
import { Languages, BarChart3, Calendar, ExternalLink } from 'lucide-react';

interface MediaHeaderProps {
    media: Media;
}

const MediaHeader = ({ media }: MediaHeaderProps) => {
    return (
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/15 text-white/90 backdrop-blur-sm">
                        {media.type}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm">
                        <Languages className="w-3.5 h-3.5" />
                        {media.language.toUpperCase()}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
                    {media.title}
                </h1>

                {/* Stats */}
                <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2 text-white/80">
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-semibold text-white">{media.totalWords.toLocaleString()}</span>
                        <span className="text-sm">unique words</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Added recently</span>
                    </div>
                    {media.imdbId && (
                        <a
                            href={`https://www.imdb.com/title/${media.imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-yellow-300/90 hover:text-yellow-300 text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            IMDb
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaHeader;
