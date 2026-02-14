import { useState } from 'react';
import { CheckCircle2, Bookmark, Volume2, Trash2, ChevronDown, ChevronUp, GraduationCap, Book } from 'lucide-react';
import { cn } from '@/utils/cn';
import ListSelectionModal from './ListSelectionModal';
import { WordDefinition } from '@/services/WordListService';

interface WordProps {
    id: number;
    word: string;
    frequency: number;
    isKnown: boolean;
    definition?: WordDefinition;
    difficulty?: string;
    onToggleKnown: (id: number, currentStatus: boolean) => void;
    onRemove?: () => void; // Optional remove handler for lists
}

const WordCard = ({ id, word, frequency, isKnown, definition, difficulty, onToggleKnown, onRemove }: WordProps) => {
    // Frequency to visual width (cap at 100%)
    const freqWidth = Math.min(frequency * 5, 100);
    const [showListModal, setShowListModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const speak = (e: React.MouseEvent) => {
        e.stopPropagation();

        // 1. Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';

        // 2. Smart Voice Selection
        // Wait for voices to be loaded (sometimes async)
        let voices = window.speechSynthesis.getVoices();

        // Retry getting voices if empty (some browsers need a moment)
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
            };
        }

        // Priority List: Google > Safari (Samantha) > Microsoft > Default
        const preferredVoice = voices.find(v => v.name === 'Google US English')
            || voices.find(v => v.name === 'Samantha')
            || voices.find(v => v.name.startsWith('Microsoft')) // Windows high quality
            || voices.find(v => v.lang === 'en-US'); // Fallback to any US English

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            // Tweaks for specific voices
            if (preferredVoice.name === 'Google US English') {
                utterance.rate = 0.9; // Slightly slower for clarity
                utterance.pitch = 1.0;
            } else if (preferredVoice.name === 'Samantha') {
                utterance.rate = 1.05; // Samantha is a bit slow
            }
        }

        window.speechSynthesis.speak(utterance);
    };

    const hasEnrichment = !!definition || !!difficulty;

    return (
        <>
            <div
                className={cn(
                    "group relative bg-white dark:bg-[#1e2030] rounded-2xl border transition-all duration-300 overflow-hidden",
                    // Lift only if not expanded to avoid layout shifts when reading
                    !isExpanded && "hover:-translate-y-1",
                    isKnown
                        ? "border-emerald-200/50 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                        : "border-gray-200/60 dark:border-gray-800/60 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30"
                )}
            >
                {/* Card Main Content */}
                <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className={cn(
                                    "text-2xl font-bold tracking-tight truncate transition-colors",
                                    isKnown
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-gray-900 dark:text-white"
                                )}>
                                    {word}
                                </h3>

                                {difficulty && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                        ["A1", "A2"].includes(difficulty) ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                                            ["B1", "B2"].includes(difficulty) ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" :
                                                "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
                                    )}>
                                        {difficulty}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={speak}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
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

                {/* Expanded Details Section */}
                {isExpanded && definition && (
                    <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-4">
                            {/* Meanings */}
                            {definition.meanings?.map((meaning, idx) => (
                                <div key={idx} className="text-sm">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{meaning.pos}</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{meaning.definition}</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 italic pl-10 border-l-2 border-gray-100 dark:border-gray-800">
                                        "{meaning.example}"
                                    </p>
                                </div>
                            ))}

                            {/* Phrasal Verbs */}
                            {definition.phrasal_verbs && definition.phrasal_verbs.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Phrasal Verbs</h4>
                                    <div className="space-y-3">
                                        {definition.phrasal_verbs.map((pv, idx) => (
                                            <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-800/30 p-2 rounded-lg">
                                                <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">{pv.phrase}</div>
                                                <div className="text-gray-600 dark:text-gray-300 mb-1">{pv.definition}</div>
                                                <div className="text-gray-400 dark:text-gray-500 italic text-xs">"{pv.example}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions Bar */}
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2">
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
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Expand Button (Only if data exists) */}
                        {hasEnrichment && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={cn(
                                    "p-2 rounded-lg transition-colors border border-transparent",
                                    isExpanded
                                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20"
                                        : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                )}
                                title={isExpanded ? "Show Less" : "Show Definition"}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}

                        {/* Remove Action */}
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
