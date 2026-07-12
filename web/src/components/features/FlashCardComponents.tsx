import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Volume2, X, List, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

// Types
type VocabWord = any;

const CEFR_COLORS: Record<string, { bg: string; text: string; pill: string }> = {
    A1: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', pill: '#22C55E' },
    A2: { bg: 'bg-lime-50 dark:bg-lime-900/20', text: 'text-lime-600 dark:text-lime-400', pill: '#84CC16' },
    B1: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', pill: '#F59E0B' },
    B2: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', pill: '#F97316' },
    C1: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', pill: '#EF4444' },
    C2: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', pill: '#A855F7' },
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakWord(word: string) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        currentUtterance = new SpeechSynthesisUtterance(word);
        currentUtterance.lang = 'en-US';
        currentUtterance.rate = 1.0;
        currentUtterance.pitch = 1.0;
        
        // Safari/Chrome Web Speech API bug: prevent garbage collection mid-speech
        (window as any)._speechUtterance = currentUtterance;
        
        window.speechSynthesis.speak(currentUtterance);
    }
}

export function WordPreviewModal({ word, onClose, onToggleKnown, isKnown }: {
    word: VocabWord; onClose: () => void; onToggleKnown: () => void; isKnown: boolean;
}) {
    const col = word.difficulty ? CEFR_COLORS[word.difficulty] : null;
    const meanings = word.definition?.meanings ?? [];
    const phrasalVerbs = word.definition?.phrasal_verbs ?? [];
    const verbForms = word.definition?.verb_forms;
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg mx-4 sm:mx-0 bg-white dark:bg-[#161822] rounded-3xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{word.word}</h2>
                            {col && (
                                <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', col.bg, col.text)}>
                                    {word.difficulty}
                                </span>
                            )}
                        </div>
                        {word.frequency > 1 && <p className="text-xs text-gray-400">×{word.frequency} sıklık</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => speakWord(word.word)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-500 transition-colors" title="Dinle">
                            <Volume2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onToggleKnown}
                            className={cn('p-2 rounded-xl border-2 transition-all', isKnown ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-indigo-300')}
                        >
                            {isKnown ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-4">
                    {meanings.length === 0 ? <p className="text-gray-400 text-sm">Detaylı tanım bulunamadı.</p> :
                        meanings.map((m: any, i: number) => (
                            <div key={i} className="mb-4">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{m.pos}</span>
                                <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{m.definition}</p>
                                {m.example && (
                                    <div className="mt-2 pl-3 border-l-2 border-indigo-200 dark:border-indigo-500/30">
                                        <p className="text-xs text-gray-500 italic mb-1">"{m.example}"</p>
                                        <button onClick={() => speakWord(m.example)} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase">
                                            <Volume2 className="w-3.5 h-3.5" /> Dinle
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    
                    {verbForms && Object.keys(verbForms).length > 0 && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fiil Çekimleri</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(verbForms).map(([tense, form]: [string, any]) => (
                                    <div key={tense} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">{tense.replace('_', ' ')}</span>
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{form}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function FlashCard({ word, index, total, isKnown, onToggleKnown, onPrev, onNext, onAddToList }: {
    word: VocabWord; index: number; total: number; isKnown: boolean;
    onToggleKnown: () => void; onPrev: () => void; onNext: () => void; onAddToList?: () => void;
}) {
    const [flipped, setFlipped] = useState(false);
    const col = word.difficulty ? CEFR_COLORS[word.difficulty] : null;
    const meanings = word.definition?.meanings ?? [];

    useEffect(() => { setFlipped(false); }, [word?.id]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
            else if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onPrev, onNext]);

    if (!word) return null;

    return (
        <div className="w-full flex flex-col items-center gap-6 px-4">
            {/* Progress */}
            <p className="text-sm text-gray-400 font-medium">{index + 1} / {total}</p>

            {/* 3D Card */}
            <div
                className="w-full max-w-xl cursor-pointer"
                style={{ perspective: 1500 }}
                onClick={() => setFlipped(f => !f)}
            >
                <div
                    className="relative w-full"
                    style={{
                        height: 400,
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.42s ease',
                        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center p-8 shadow-2xl"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {onAddToList && (
                            <button onClick={(e) => { e.stopPropagation(); onAddToList(); }}
                                className="absolute top-5 left-5 w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all z-10 bg-transparent">
                                <List className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onToggleKnown(); }}
                            className={cn('absolute top-5 right-5 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all z-10',
                                isKnown ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-400')}
                        >
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                        </button>

                        <div className="flex items-center gap-2 mb-2 flex-wrap justify-center mt-4">
                            {col && <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', col.bg, col.text)}>{word.difficulty}</span>}
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white text-center mb-6 break-words w-full px-4">{word.word}</h2>
                        <button onClick={(e) => { e.stopPropagation(); speakWord(word.word); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-500 hover:text-indigo-500 rounded-xl transition-colors text-sm font-bold mb-3">
                            <Volume2 className="w-5 h-5" /> Dinle
                        </button>
                        {meanings[0]?.example && (
                            <button onClick={(e) => { e.stopPropagation(); speakWord(meanings[0].example); }}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-500 rounded-xl transition-colors text-xs font-medium whitespace-nowrap">
                                💬 Cümleyi Dinle
                            </button>
                        )}
                        <p className="text-gray-400 text-xs mt-4 absolute bottom-5">Çevirmek için tıkla</p>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-y-auto p-6 shadow-2xl"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
                    >
                        {onAddToList && (
                            <button onClick={(e) => { e.stopPropagation(); onAddToList(); }}
                                className="absolute top-5 left-5 w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all z-10 bg-white dark:bg-[#161822]">
                                <List className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onToggleKnown(); }}
                            className={cn('absolute top-5 right-5 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all z-10 bg-white dark:bg-[#161822]',
                                isKnown ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-400')}
                        >
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                        </button>

                        <p className="text-2xl font-black text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-800 pb-4 text-center mt-2">{word.word}</p>
                        {meanings.length === 0 ? <p className="text-gray-400 text-sm">Tanım yok</p> :
                            meanings.slice(0, 4).map((m: any, i: number) => (
                                <div key={i} className="mb-3">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{m.pos}</span>
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">{m.definition}</p>
                                    {m.example && <p className="text-xs text-gray-400 italic mt-0.5">"{m.example}"</p>}
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-2">
                <button onClick={onPrev} disabled={index === 0}
                    className="w-14 h-14 rounded-full bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-all disabled:opacity-30 shadow-sm">
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <button onClick={onNext} disabled={index === total - 1}
                    className="w-14 h-14 rounded-full bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-all disabled:opacity-30 shadow-sm">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
