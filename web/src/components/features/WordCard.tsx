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
    onRemove?: () => void;
    isSystemProtected?: boolean;
}

const WordCard = ({ id, word, frequency, isKnown, definition, difficulty, onToggleKnown, onRemove, isSystemProtected = false }: WordProps) => {
    // Frequency to visual width (cap at 100%)
    const freqWidth = Math.min(frequency * 5, 100);
    const [showListModal, setShowListModal] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    const speak = (e: React.MouseEvent) => {
        e.stopPropagation();

        // 1. Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';

        // 2. Smart Voice Selection
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
            };
        }

        const preferredVoice = voices.find(v => v.name === 'Google US English')
            || voices.find(v => v.name === 'Samantha')
            || voices.find(v => v.name.startsWith('Microsoft'))
            || voices.find(v => v.lang === 'en-US');

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            if (preferredVoice.name === 'Google US English') {
                utterance.rate = 0.9;
            } else if (preferredVoice.name === 'Samantha') {
                utterance.rate = 1.05;
            }
        }

        window.speechSynthesis.speak(utterance);
    };

    const hasEnrichment = !!definition || !!difficulty;

    const handleFlip = () => {
        if (hasEnrichment) {
            setIsFlipped(!isFlipped);
        }
    };

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <>
            <div
                className="group relative h-80 perspective-1000 cursor-pointer"
                onClick={handleFlip}
            >
                <div
                    className={cn(
                        "relative w-full h-full transition-all duration-500 [transform-style:preserve-3d]",
                        isFlipped ? "[transform:rotateY(180deg)]" : ""
                    )}
                >
                    {/* --- FRONT FACE --- */}
                    <div className={cn(
                        "absolute inset-0 w-full h-full [backface-visibility:hidden]",
                        "bg-white dark:bg-[#1e2030] rounded-2xl border flex flex-col items-center justify-center p-6 text-center shadow-sm transition-all",
                        isKnown
                            ? "border-emerald-200/50 dark:border-emerald-500/20 shadow-emerald-500/5"
                            : "border-gray-200/60 dark:border-gray-800/60 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30"
                    )}>
                        <div className="absolute top-4 right-4 flex items-start gap-2">
                            {/* Known Status Icon & Toggle for Front */}
                            <div className="flex flex-col gap-2 items-end">
                                {difficulty && (
                                    <span className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                        ["A1", "A2"].includes(difficulty) ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                                            ["B1", "B2"].includes(difficulty) ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" :
                                                "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
                                    )}>
                                        {difficulty}
                                    </span>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleAction(e, () => onToggleKnown(id, isKnown))}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors border",
                                            isKnown
                                                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                                : "text-gray-400 bg-gray-50 border-gray-100 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30"
                                        )}
                                        title={isKnown ? "Mark Unknown" : "Mark Known"}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleAction(e, () => setShowListModal(true))}
                                        className="p-1.5 rounded-lg text-gray-400 bg-gray-50 border border-gray-100 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-500/30 transition-colors"
                                        title="Add to List"
                                    >
                                        <Bookmark className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <h3 className={cn(
                                "text-3xl font-bold tracking-tight mb-2",
                                isKnown ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                            )}>
                                {word}
                            </h3>

                            <button
                                onClick={speak}
                                className="p-4 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                            >
                                <Volume2 className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="w-full mt-auto">
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium">
                                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse"></span>
                                Click to flip
                            </div>
                        </div>

                        {/* Frequency Bar at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800">
                            <div
                                className={cn(
                                    "h-full transition-all duration-500",
                                    isKnown ? "bg-emerald-500/50" : "bg-indigo-500/50"
                                )}
                                style={{ width: `${freqWidth}%` }}
                            />
                        </div>
                    </div>

                    {/* --- BACK FACE --- */}
                    <div className={cn(
                        "absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]",
                        "bg-white dark:bg-[#1e2030] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 shadow-sm flex flex-col overflow-hidden"
                    )}>
                        {/* Header / Actions */}
                        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{word}</h4>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => handleAction(e, () => onToggleKnown(id, isKnown))}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isKnown
                                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                                            : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                    )}
                                    title={isKnown ? "Mark Unknown" : "Mark Known"}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleAction(e, () => setShowListModal(true))}
                                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                    title="Add to List"
                                >
                                    <Bookmark className="w-4 h-4" />
                                </button>
                                {onRemove && !isSystemProtected && (
                                    <button
                                        onClick={(e) => handleAction(e, onRemove)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                            {definition ? (
                                <>
                                    {/* Meanings */}
                                    {definition.meanings?.map((meaning, idx) => (
                                        <div key={idx} className="text-sm">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded">{meaning.pos}</span>
                                                <span className="text-gray-900 dark:text-white font-medium">{meaning.definition}</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs italic pl-2 border-l-2 border-indigo-100 dark:border-indigo-500/30">
                                                "{meaning.example}"
                                            </p>
                                        </div>
                                    ))}

                                    {/* Verb Forms */}
                                    {definition.verb_forms && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Verb Forms</h4>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {[
                                                    { label: 'V1', val: definition.verb_forms.v1 },
                                                    { label: 'V2', val: definition.verb_forms.v2 },
                                                    { label: 'V3', val: definition.verb_forms.v3 },
                                                    { label: 'ING', val: definition.verb_forms.ing }
                                                ].map((form, i) => (
                                                    <div key={i} className="flex flex-col items-center p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                                        <span className="text-[8px] font-bold text-indigo-400 dark:text-indigo-500 uppercase leading-none mb-1">{form.label}</span>
                                                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-none">{form.val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Phrasal Verbs */}
                                    {definition.phrasal_verbs && definition.phrasal_verbs.length > 0 && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Phrases</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {definition.phrasal_verbs.slice(0, 2).map((pv, idx) => (
                                                    <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl text-left border border-gray-100 dark:border-gray-800">
                                                        <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">{pv.phrase}</div>
                                                        <div className="text-gray-700 dark:text-gray-300 mb-1.5 leading-snug">{pv.definition}</div>
                                                        {pv.example && (
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 italic pl-2 border-l border-indigo-200 dark:border-indigo-500/30 py-0.5">
                                                                "{pv.example}"
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-center p-4 text-gray-400 text-sm">
                                    <p>No detailed definition available yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
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
