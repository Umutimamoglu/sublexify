import { useState } from 'react';
import { CheckCircle2, Bookmark } from 'lucide-react';
import { cn } from '@/utils/cn';
import ListSelectionModal from './ListSelectionModal';

interface WordProps {
    id: number;
    word: string;
    frequency: number;
    isKnown: boolean;
    onToggleKnown: (id: number, currentStatus: boolean) => void;
}

const WordCard = ({ id, word, frequency, isKnown, onToggleKnown }: WordProps) => {
    // Frequency to visual width (cap at 100%)
    const freqWidth = Math.min(frequency * 5, 100);
    const [showListModal, setShowListModal] = useState(false);

    return (
        <>
            <div
                className={cn(
                    "group relative bg-white dark:bg-[#161822] rounded-xl border p-4 transition-all duration-200 hover:shadow-md overflow-hidden",
                    isKnown
                        ? "border-emerald-200 dark:border-emerald-800/40"
                        : "border-gray-200/60 dark:border-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-600/50"
                )}
            >
                <div className="flex justify-between items-center gap-3">
                    {/* Word */}
                    <div className="flex-1 min-w-0">
                        <h3 className={cn(
                            "text-base font-semibold truncate transition-colors",
                            isKnown
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-gray-900 dark:text-gray-100"
                        )}>
                            {word}
                        </h3>
                    </div>

                    {/* Frequency */}
                    <span className="text-xs font-mono tabular-nums text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md shrink-0">
                        ×{frequency}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Add to List Button */}
                        <button
                            onClick={() => setShowListModal(true)}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            title="Add to List"
                        >
                            <Bookmark className="w-4 h-4" />
                        </button>

                        {/* Toggle Known Button */}
                        <button
                            onClick={() => onToggleKnown(id, isKnown)}
                            className={cn(
                                "p-1.5 rounded-lg transition-all duration-200",
                                isKnown
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/25"
                                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-400"
                            )}
                            title={isKnown ? "Mark as Unknown" : "Mark as Known"}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Frequency Bar */}
                <div className="mt-3 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isKnown
                                ? "bg-emerald-400 dark:bg-emerald-500"
                                : "bg-indigo-400 dark:bg-indigo-500"
                        )}
                        style={{ width: `${freqWidth}%` }}
                    />
                </div>
            </div>

            <ListSelectionModal
                isOpen={showListModal}
                onClose={() => setShowListModal(false)}
                wordId={id}
                word={word}
            />
        </>
    );
};

export default WordCard;
