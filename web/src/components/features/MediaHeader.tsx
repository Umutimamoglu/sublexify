import type { Media } from '@/services/MediaService';
import { Languages, Play, BarChart, Calendar } from 'lucide-react';

interface MediaHeaderProps {
    media: Media;
}

const MediaHeader = ({ media }: MediaHeaderProps) => {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700">
                    <Play className="w-10 h-10 text-gray-400" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                            {media.type}
                        </span>
                        <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Languages className="w-3 h-3 mr-1" />
                            {media.language.toUpperCase()}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {media.title}
                    </h1>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                            <BarChart className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-200 mr-1">{media.totalWords}</span>
                            <span>Words</span>
                        </div>
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Added recently</span>
                        </div>
                        {media.imdbId && (
                            <div className="flex items-center">
                                <span className="font-medium text-yellow-600">IMDb: {media.imdbId}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaHeader;
