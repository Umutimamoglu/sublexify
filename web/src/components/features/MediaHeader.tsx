import type { Media } from '@/services/MediaService';
import { Languages, Play, BarChart, Clock, Calendar } from 'lucide-react';

interface MediaHeaderProps {
    media: Media;
}

const MediaHeader = ({ media }: MediaHeaderProps) => {
    return (
        <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl mb-8 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-10 dark:opacity-20 transition-opacity duration-500 group-hover:opacity-15 dark:group-hover:opacity-25" />

            <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
                    <Play className="w-16 h-16 text-white opacity-90 fill-current" />
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                            {media.type}
                        </span>
                        <span className="flex items-center text-gray-600 dark:text-gray-400 text-sm font-medium">
                            <Languages className="w-4 h-4 mr-1.5" />
                            {media.language.toUpperCase()}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {media.title}
                    </h1>

                    <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400 pt-2">
                        <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <BarChart className="w-5 h-5 mr-2 text-blue-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-200 mr-1">{media.totalWords}</span>
                            <span className="opacity-80">Words</span>
                        </div>
                        <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <Clock className="w-5 h-5 mr-2 text-green-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-200 mr-1">New</span>
                            <span className="opacity-80">Added recently</span>
                        </div>
                        <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                            <span className="opacity-80">2024</span>
                        </div>
                    </div>

                    {media.imdbId && (
                        <div className="pt-2">
                            <a
                                href={`https://www.imdb.com/title/${media.imdbId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-yellow-600 hover:text-yellow-700 font-bold hover:underline"
                            >
                                IMDb: {media.imdbId}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaHeader;
