import { useState } from 'react';
import { CheckCircle2, Bookmark, Volume2, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import ListSelectionModal from './ListSelectionModal';

interface WordProps {
    id: number;
    word: string;
    frequency: number;
    isKnown: boolean;
    onToggleKnown: (id: number, currentStatus: boolean) => void;
    onRemove?: () => void; // Optional remove handler for lists
}

const WordCard = ({ id, word, frequency, isKnown, onToggleKnown, onRemove }: WordProps) => {
    // Frequency to visual width (cap at 100%)
    const freqWidth = Math.min(frequency * 5, 100);
    const [showListModal, setShowListModal] = useState(false);

    const speak = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    return (
        <>
            <div
                className={cn(
                    "group relative bg-white dark:bg-[#1e2030] rounded-2xl border transition-all duration-300 overflow-hidden hover:-translate-y-1",
                    isKnown
                        ? "border-emerald-200/50 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                        : "border-gray-200/60 dark:border-gray-800/60 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30"
                )}
            >
                {/* Card Header / Content */}
                <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className={cn(
                                "text-2xl font-bold tracking-tight truncate transition-colors",
                                isKnown
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-gray-900 dark:text-white"
                            )}>
                                {word}
                            </h3>
                            <button
                                onClick={speak}
                                className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                                Listen
                            </button>
                        </div>

                        {/* Frequency Badge */}
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-600 tracking-wider">
                                Freq
                            </span>
                            <span className="text-sm font-bg font-mono tabular-nums text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                {frequency}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between backdrop-blur-sm">
                    {/* Status Indicator / Toggle */}
                    <button
                        onClick={() => onToggleKnown(id, isKnown)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                            isKnown
                                ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                    >
                        <CheckCircle2 className={cn("w-4 h-4", isKnown && "fill-emerald-200/20")} />
                        {isKnown ? "Known" : "Mark Known"}
                    </button>

                    <div className="flex items-center gap-1">
                        {/* Remove Action (if provided) */}
                        {onRemove && (
                            <button
                                onClick={onRemove}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Remove from list"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* Add to List Action */}
                        <button
                            onClick={() => setShowListModal(true)}
                            className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            title="Add to List"
                        >
                            <Bookmark className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Bottom Progress Line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            isKnown
                                ? "bg-emerald-500/50"
                                : "bg-indigo-500/50"
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
