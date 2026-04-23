import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WordListService, { type Word } from '@/services/WordListService';
import api from '@/services/api';
import {
    Search, X, Volume2, PlayCircle, CheckCircle2, Circle,
    BookOpen, Filter, ChevronLeft, ChevronRight, List, Grid3X3,
    Plus, Check, Layers,
} from 'lucide-react';
import { cn } from '@/utils/cn';

// ─── Types ─────────────────────────────────────────────────────
type VocabWord = Word & { isKnown: boolean; frequency: number };
type ViewMode = 'list' | 'flashcard';
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const CEFR_COLORS: Record<string, { bg: string; text: string; pill: string }> = {
    A1: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', pill: '#22C55E' },
    A2: { bg: 'bg-lime-50 dark:bg-lime-900/20', text: 'text-lime-600 dark:text-lime-400', pill: '#84CC16' },
    B1: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', pill: '#F59E0B' },
    B2: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', pill: '#F97316' },
    C1: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', pill: '#EF4444' },
    C2: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', pill: '#A855F7' },
};
const QUIZ_TYPES = [
    { key: 'MULTIPLE_CHOICE', label: 'Çoktan Seçmeli', icon: '🎯' },
    { key: 'FILL_IN_THE_BLANKS', label: 'Boşluk Doldurma', icon: '✏️' },
    { key: 'LISTENING', label: 'Dinleme', icon: '🎧' },
];
const MOCK_USER_ID = 1;

function speakWord(word: string) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    }
}

// ─── Word Preview Modal ─────────────────────────────────────────
function WordPreviewModal({ word, onClose, onToggleKnown, isKnown }: {
    word: VocabWord; onClose: () => void; onToggleKnown: () => void; isKnown: boolean;
}) {
    const col = word.difficulty ? CEFR_COLORS[word.difficulty] : null;
    const meanings = word.definition?.meanings ?? [];
    const phrasalVerbs = word.definition?.phrasal_verbs ?? [];
    const verbForms = word.definition?.verb_forms;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#161822] rounded-3xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col">
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
                    {meanings.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Henüz tanım eklenmemiş.</p>
                    ) : meanings.map((m, i) => (
                        <div key={i} className="space-y-1">
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase tracking-wider">{m.pos}</span>
                            <p className="text-gray-900 dark:text-white font-medium text-sm">{m.definition}</p>
                            {m.example && <p className="text-gray-400 text-xs italic">"{m.example}"</p>}
                        </div>
                    ))}
                    {verbForms && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            {Object.entries({ V1: verbForms.v1, V2: verbForms.v2, V3: verbForms.v3, '-ing': verbForms.ing }).map(([label, val]) => (
                                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2 text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{val}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {phrasalVerbs.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phrasal Verbs</p>
                            {phrasalVerbs.map((pv, i) => (
                                <div key={i}>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{pv.phrase}</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{pv.definition}</p>
                                    {pv.example && <p className="text-xs text-gray-400 italic">"{pv.example}"</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Add to List Modal ──────────────────────────────────────────
function AddToListModal({ wordId, wordName, onClose }: { wordId: number; wordName: string; onClose: () => void; }) {
    const [lists, setLists] = useState<any[]>([]);
    const [contained, setContained] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            const [ul, c] = await Promise.all([WordListService.getUserLists(), WordListService.getListsContainingWord(wordId)]);
            setLists(ul); setContained(c);
            setLoading(false);
        };
        load();
    }, [wordId]);
    const toggle = async (listId: number) => {
        if (contained.includes(listId)) { await WordListService.removeWordFromList(listId, wordId); setContained(p => p.filter(i => i !== listId)); }
        else { await WordListService.addWordToList(listId, wordId); setContained(p => [...p, listId]); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <p className="font-bold text-gray-900 dark:text-white">"{wordName}"</p>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                {loading ? <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="p-3 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {lists.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Liste bulunamadı</p> :
                            lists.map(l => {
                                const has = contained.includes(l.id);
                                return (
                                    <button key={l.id} onClick={() => toggle(l.id)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors">
                                        <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', has ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600')}>
                                            {has && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white text-left flex-1 truncate">{l.name}</span>
                                        <span className="text-xs text-gray-400 shrink-0">{l.totalWords} kelime</span>
                                    </button>
                                );
                            })
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Quiz Type Modal ────────────────────────────────────────────
function QuizModal({ selected, onToggle, onClose, onStart }: {
    selected: Set<string>; onToggle: (t: string) => void; onClose: () => void; onStart: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-3xl shadow-2xl p-6">
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">Pratik Türü</h3>
                <p className="text-sm text-gray-400 mb-5">En az bir tür seçin</p>
                <div className="space-y-3 mb-6">
                    {QUIZ_TYPES.map(qt => {
                        const on = selected.has(qt.key);
                        return (
                            <button key={qt.key} onClick={() => onToggle(qt.key)}
                                className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left', on ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                                <span className="text-xl">{qt.icon}</span>
                                <span className={cn('font-bold text-sm', on ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300')}>{qt.label}</span>
                                <div className={cn('ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center', on ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600')}>
                                    {on && <Check className="w-3 h-3 text-white" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-300">İptal</button>
                    <button onClick={onStart} disabled={selected.size === 0} className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 font-bold text-white transition-colors">Başla</button>
                </div>
            </div>
        </div>
    );
}

// ─── Flashcard ──────────────────────────────────────────────────
function FlashCard({ word, index, total, isKnown, onToggleKnown, onPrev, onNext, onAddToList }: {
    word: VocabWord; index: number; total: number; isKnown: boolean;
    onToggleKnown: () => void; onPrev: () => void; onNext: () => void; onAddToList: () => void;
}) {
    const [flipped, setFlipped] = useState(false);
    const col = word.difficulty ? CEFR_COLORS[word.difficulty] : null;
    const meanings = word.definition?.meanings ?? [];

    useEffect(() => { setFlipped(false); }, [word.id]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
            else if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onPrev, onNext]);

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Progress */}
            <p className="text-sm text-gray-400 font-medium">{index + 1} / {total}</p>

            {/* 3D Card */}
            <div
                className="w-full max-w-md cursor-pointer"
                style={{ perspective: 1200 }}
                onClick={() => setFlipped(f => !f)}
            >
                <div
                    className="relative w-full"
                    style={{
                        height: 320,
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
                        <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
                            {col && <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', col.bg, col.text)}>{word.difficulty}</span>}
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white text-center mb-4">{word.word}</h2>
                        <button onClick={(e) => { e.stopPropagation(); speakWord(word.word); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-500 hover:text-indigo-500 rounded-xl transition-colors text-sm font-medium mb-2">
                            <Volume2 className="w-4 h-4" /> Dinle
                        </button>
                        {meanings[0]?.example && (
                            <button onClick={(e) => { e.stopPropagation(); speakWord(meanings[0].example); }}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-500 rounded-xl transition-colors text-xs font-medium">
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
                        <p className="text-lg font-black text-gray-900 dark:text-white mb-4">{word.word}</p>
                        {meanings.length === 0 ? <p className="text-gray-400 text-sm">Tanım yok</p> :
                            meanings.slice(0, 3).map((m, i) => (
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
            <div className="flex items-center gap-4">
                <button onClick={onPrev} disabled={index === 0}
                    className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-all disabled:opacity-30">
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button onClick={(e) => { e.stopPropagation(); onAddToList(); }}
                    className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-all">
                    <Plus className="w-5 h-5" />
                </button>

                <button
                    onClick={onToggleKnown}
                    className={cn('w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg',
                        isKnown ? 'border-indigo-500 bg-indigo-500 shadow-indigo-500/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161822] hover:border-indigo-300')}
                >
                    {isKnown ? <CheckCircle2 className="w-6 h-6 text-white" /> : <Circle className="w-6 h-6 text-gray-400" />}
                </button>

                <button onClick={onNext} disabled={index === total - 1}
                    className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-all disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            <p className="text-xs text-gray-400">← → ile geçiş · Boşluk tuşuyla çevir</p>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────
const VocabularyPage = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<VocabWord[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
    const [onlyUnknown, setOnlyUnknown] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [cardIndex, setCardIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(50);

    // Modals
    const [previewWord, setPreviewWord] = useState<VocabWord | null>(null);
    const [addModal, setAddModal] = useState<{ wordId: number; wordName: string } | null>(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [selectedQuizTypes, setSelectedQuizTypes] = useState<Set<string>>(new Set(['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANKS', 'LISTENING']));

    useEffect(() => { fetchWords(); }, []);

    const fetchWords = async () => {
        try {
            setLoading(true);
            const data = await WordListService.getFrequentWords('en', 500, MOCK_USER_ID);
            setWords(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleToggleKnown = useCallback(async (wordId: number) => {
        const word = words.find(w => w.id === wordId);
        if (!word) return;
        const current = word.isKnown;
        setWords(prev => prev.map(w => w.id === wordId ? { ...w, isKnown: !current } : w));
        try {
            if (current) await api.delete(`/words/${wordId}/mark-known`, { params: { userId: MOCK_USER_ID } });
            else await api.post(`/words/${wordId}/mark-known`, null, { params: { userId: MOCK_USER_ID } });
        } catch { setWords(prev => prev.map(w => w.id === wordId ? { ...w, isKnown: current } : w)); }
    }, [words]);

    const toggleLevel = (lv: string) => {
        setSelectedLevels(prev => { const n = new Set(prev); n.has(lv) ? n.delete(lv) : n.add(lv); return n; });
    };

    const toggleQuizType = (t: string) => {
        setSelectedQuizTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    };

    const handleStartStudy = () => {
        setShowQuizModal(false);
        const types = Array.from(selectedQuizTypes).join(',');
        const difficulties = Array.from(selectedLevels).join(',');
        navigate(`/study/vocabulary?types=${types}&difficulties=${difficulties}&onlyUnknown=${onlyUnknown}`);
    };

    const isSearching = query.trim().length >= 2;

    const filtered = useMemo(() => {
        let result = words;
        if (isSearching) {
            const q = query.trim().toLowerCase();
            result = result.filter(w => w.word.toLowerCase().includes(q));
            result.sort((a, b) => {
                const aw = a.word.toLowerCase(), bw = b.word.toLowerCase(), qt = q;
                const rank = (w: string) => w === qt ? 0 : w.startsWith(qt) ? 1 : 2;
                return (rank(aw) - rank(bw)) || aw.length - bw.length;
            });
        } else {
            if (selectedLevels.size > 0) result = result.filter(w => w.difficulty && selectedLevels.has(w.difficulty));
            if (onlyUnknown) result = result.filter(w => !w.isKnown);
        }
        return result;
    }, [words, query, selectedLevels, onlyUnknown, isSearching]);

    const knownCount = words.filter(w => w.isKnown).length;
    const totalCount = words.length;

    const currentCard = filtered[cardIndex];

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl relative pb-40">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-7 h-7 text-indigo-500" /> Akıllı Kelime Havuzu
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowQuizModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 text-sm"
                    >
                        <PlayCircle className="w-4 h-4" /> Pratik Yap
                    </button>
                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl gap-1">
                        <button onClick={() => setViewMode('list')}
                            className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all', viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600')}>
                            <List className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('flashcard')}
                            className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all', viewMode === 'flashcard' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600')}>
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Kelime ara..."
                    value={query} onChange={e => setQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
            </div>

            {/* Filters + Stats (only when not searching, only in list mode) */}
            {!isSearching && (
                <>
                    <div className="flex flex-wrap gap-2 items-center mb-4">
                        {/* Unknown toggle */}
                        <button onClick={() => setOnlyUnknown(!onlyUnknown)}
                            className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border transition-all', onlyUnknown ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#161822] text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
                            Sadece Bilinmeyenler
                        </button>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                        {CEFR_LEVELS.map(lv => {
                            const active = selectedLevels.has(lv);
                            const col = CEFR_COLORS[lv];
                            return (
                                <button key={lv} onClick={() => toggleLevel(lv)}
                                    className={cn('w-12 h-8 rounded-xl text-xs font-bold border transition-all', active ? 'text-white border-transparent' : 'bg-white dark:bg-[#161822] text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300')}
                                    style={active ? { backgroundColor: col.pill, borderColor: col.pill } : {}}>
                                    {lv}
                                </button>
                            );
                        })}
                        {selectedLevels.size > 0 && (
                            <button onClick={() => setSelectedLevels(new Set())} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">Temizle</button>
                        )}
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{knownCount.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Bilinenler</p>
                        </div>
                        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{filtered.length.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Gösterilen</p>
                        </div>
                    </div>
                </>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Flashcard mode */}
            {!loading && viewMode === 'flashcard' && !isSearching && (
                filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-400"><p>Kelime bulunamadı.</p></div>
                ) : currentCard ? (
                    <FlashCard
                        word={currentCard}
                        index={cardIndex}
                        total={filtered.length}
                        isKnown={currentCard.isKnown}
                        onToggleKnown={() => handleToggleKnown(currentCard.id)}
                        onPrev={() => setCardIndex(i => Math.max(0, i - 1))}
                        onNext={() => setCardIndex(i => Math.min(filtered.length - 1, i + 1))}
                        onAddToList={() => setAddModal({ wordId: currentCard.id, wordName: currentCard.word })}
                    />
                ) : null
            )}

            {/* List mode */}
            {!loading && (viewMode === 'list' || isSearching) && (
                <>
                    {isSearching && (
                        <p className="text-xs text-gray-400 mb-3 px-1">"{query}" için {filtered.length} sonuç</p>
                    )}
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 bg-white dark:bg-[#161822] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <BookOpen className="w-10 h-10 opacity-20 mx-auto mb-3" />
                            <p>Kelime bulunamadı.</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                                {filtered.slice(0, visibleCount).map((word, idx) => {
                                    const col = word.difficulty ? CEFR_COLORS[word.difficulty] : null;
                                    const meaning = word.definition?.meanings?.[0]?.definition;
                                    return (
                                        <div key={word.id}
                                            className="flex items-center px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 group transition-colors cursor-pointer"
                                            onClick={() => setPreviewWord(word)}
                                        >
                                            <span className="w-8 text-xs font-bold text-gray-300 dark:text-gray-600 shrink-0">#{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{word.word}</span>
                                                    {col && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: col.pill + '20', color: col.pill, borderColor: col.pill + '40' }}>{word.difficulty}</span>}
                                                    {word.frequency > 1 && <span className="text-[10px] text-gray-400">×{word.frequency}</span>}
                                                </div>
                                                {meaning && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{meaning}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* TTS - show on hover */}
                                                <button onClick={e => { e.stopPropagation(); speakWord(word.word); }}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 group-hover:text-gray-400 hover:!text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Dinle">
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                                {/* Add to list */}
                                                <button onClick={e => { e.stopPropagation(); setAddModal({ wordId: word.id, wordName: word.word }); }}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 group-hover:text-gray-400 hover:!text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Listeye ekle">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                {/* Known toggle */}
                                                <button onClick={e => { e.stopPropagation(); handleToggleKnown(word.id); }}
                                                    className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                                                        word.isKnown ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-gray-200 dark:border-gray-700 text-gray-300 hover:border-indigo-300')}>
                                                    {word.isKnown ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {visibleCount < filtered.length && (
                                <div className="mt-4 flex justify-center">
                                    <button onClick={() => setVisibleCount(p => p + 100)}
                                        className="px-8 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all shadow-sm">
                                        Daha Fazla Yükle ({filtered.length - visibleCount} kaldı)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Glass batch-mark button — list mode only */}
            {!loading && viewMode === 'list' && !isSearching && filtered.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={async () => {
                            const unknownIds = filtered.filter(w => !w.isKnown).map(w => w.id);
                            if (unknownIds.length === 0) return;
                            setWords(prev => prev.map(w => unknownIds.includes(w.id) ? { ...w, isKnown: true } : w));
                            for (const id of unknownIds) {
                                try { await api.post(`/words/${id}/mark-known`, null, { params: { userId: MOCK_USER_ID } }); } catch { }
                            }
                        }}
                        className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 border border-indigo-400/40"
                        style={{ background: 'linear-gradient(135deg, rgba(99,60,255,0.85), rgba(139,92,246,0.85))', backdropFilter: 'blur(20px)' }}
                    >
                        <Layers className="w-5 h-5 text-white/80" />
                        <span className="text-white font-bold text-sm">Tümünü Biliniyor Olarak İşaretle</span>
                    </button>
                </div>
            )}

            {/* Modals */}
            {previewWord && (
                <WordPreviewModal
                    word={previewWord}
                    onClose={() => setPreviewWord(null)}
                    isKnown={previewWord.isKnown}
                    onToggleKnown={() => { handleToggleKnown(previewWord.id); setPreviewWord(p => p ? { ...p, isKnown: !p.isKnown } : null); }}
                />
            )}
            {addModal && <AddToListModal wordId={addModal.wordId} wordName={addModal.wordName} onClose={() => setAddModal(null)} />}
            {showQuizModal && <QuizModal selected={selectedQuizTypes} onToggle={toggleQuizType} onClose={() => setShowQuizModal(false)} onStart={handleStartStudy} />}
        </div>
    );
};

export default VocabularyPage;
