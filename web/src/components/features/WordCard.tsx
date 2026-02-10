import { CheckCircle, Volume2, Book } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WordProps {
    id: number;
    word: string;
    frequency: number;
    isKnown: boolean;
    onToggleKnown: (id: number, currentStatus: boolean) => void;
}

const WordCard = ({ id, word, frequency, isKnown, onToggleKnown }: WordProps) => {
    return (
        <div
            className={cn(
                "group relative bg-white dark:bg-gray-900 rounded-xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden",
                isKnown
                    ? "border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10"
                    : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
            )}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {word}
                    </h3>
                    <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            Freq: {frequency}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => onToggleKnown(id, isKnown)}
                    className={cn(
                        "p-2 rounded-full transition-all duration-300",
                        isKnown
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                    )}
                    title={isKnown ? "Mark as Unknown" : "Mark as Known"}
                >
                    <CheckCircle className={cn("w-5 h-5 transition-transform duration-300", isKnown ? "scale-110" : "scale-100")} />
                </button>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button className="text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 flex items-center transition-colors">
                    <Volume2 className="w-3.5 h-3.5 mr-1" /> Listen
                </button>
                <div className="flex space-x-2">
                    <button className="text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 flex items-center transition-colors">
                        <Book className="w-3.5 h-3.5 mr-1" /> Define
                    </button>
                </div>
            </div>

            {/* Progress Bar for frequency relative simulation */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-all duration-500" style={{ width: `${Math.min(frequency * 10, 100)}%` }} />
        </div>
    );
};

export default WordCard;
