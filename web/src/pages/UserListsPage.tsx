import { useEffect, useState, useMemo, useRef } from 'react';
import WordListService, { type WordListDTO, type WordListWordsResponseDTO } from '@/services/WordListService';
import WordCard from '@/components/features/WordCard';
import { FlashCard } from '@/components/features/FlashCardComponents';
import { Loader2, Plus, Trash2, ChevronRight, Book, Filter, Wand2, Check, CheckCircle2, BookOpen, Lock, PlayCircle, Pencil, X, Eye, EyeOff, List, Grid3X3, Volume2, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import api from '@/services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useListPreferencesStore } from '@/store/useListPreferencesStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const UserListsPage = () => {
    const [lists, setLists] = useState<WordListDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [wordsLoading, setWordsLoading] = useState(false);
    const [selectedList, setSelectedList] = useState<WordListDTO | null>(null);
    const [wordData, setWordData] = useState<WordListWordsResponseDTO | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlListId = searchParams.get('id');
    
    // Filters
    const [filterUnknown, setFilterUnknown] = useState(false);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [visibleCount, setVisibleCount] = useState(50);
    const { t } = useTranslation();
    const { globalHide, hiddenIds, toggleGlobalHide, toggleHide } = useListPreferencesStore();
    
    // View Modes
    const [viewMode, setViewMode] = useState<'list' | 'flashcard'>('list');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    // Note modal state
    const [noteModal, setNoteModal] = useState<{ wordId: number; wordName: string; note?: string | null } | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [noteLoading, setNoteLoading] = useState(false);

    // Auto Play State
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoPlayRef = useRef(false);
    const { preferredVoiceGender } = useSettingsStore();
    
    // Actions
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isGenerationSuccess, setIsGenerationSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'lists' | 'rankings'>('lists');
    const [frequentWords, setFrequentWords] = useState<(any)[]>([]);

    // Quiz Type Modal State
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [selectedQuizTypes, setSelectedQuizTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANKS', 'LISTENING']);
    const [quizSize, setQuizSize] = useState(10);

    // Edit List Modal State
    const [editingList, setEditingList] = useState<WordListDTO | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState<string | undefined>(undefined);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Delete Confirmation Modal State
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'list' | 'word', id: number } | null>(null);

    const LIST_COLORS = [
        '#7c3aed', '#2563eb', '#0ea5e9', '#0891b2',
        '#14b8a6', '#10b981', '#059669', '#84cc16',
        '#eab308', '#f59e0b', '#d97706', '#ea580c',
        '#ef4444', '#dc2626', '#ec4899', '#db2777',
        '#d946ef', '#8b5cf6', '#6366f1', '#6b7280',
    ];

    const handleOpenEdit = (e: React.MouseEvent, list: WordListDTO) => {
        e.stopPropagation();
        setEditingList(list);
        setEditName(list.name);
        setEditColor(list.color);
    };

    const [editError, setEditError] = useState<string | null>(null);

    const handleSaveEdit = async () => {
        if (!editingList) return;
        setIsSavingEdit(true);
        setEditError(null);
        try {
            // undefined → '' so backend clears color; a hex string sets it
            const updated = await WordListService.updateList(editingList.id, editName, editColor ?? '');
            setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
            if (selectedList?.id === updated.id) setSelectedList(updated);
            setEditingList(null);
        } catch (error: any) {
            console.error('Failed to update list', error);
            setEditError(error?.response?.data?.message ?? error?.message ?? t('lists.error_occurred'));
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Mock userId
    const userId = 1;

    useEffect(() => {
        fetchLists();
        
        const handleListChange = () => fetchLists();
        window.addEventListener('list-words-changed', handleListChange);
        return () => window.removeEventListener('list-words-changed', handleListChange);
    }, []);

    useEffect(() => {
        if (activeTab === 'rankings') {
            fetchFrequentWords();
        }
    }, [activeTab]);

    const fetchFrequentWords = async () => {
        try {
            setWordsLoading(true);
            const data = await WordListService.getFrequentWords('en', 100, userId);
            setFrequentWords(data);
        } catch (error) {
            console.error("Failed to fetch frequent words", error);
        } finally {
            setWordsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedList) {
            fetchWords(selectedList.id);
        }
    }, [selectedList, filterUnknown]);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const data = await WordListService.getUserLists();
            // Sort: Custom lists first, then newest first
            const sortedData = [...data].sort((a, b) => {
                if (!!a.isSystem !== !!b.isSystem) return a.isSystem ? 1 : -1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setLists(sortedData);
            if (!selectedList) {
                if (urlListId === '-1') {
                    setSelectedList({
                        id: -1,
                        name: t('lists.knownWords', { defaultValue: 'Bilinen Kelimeler' }),
                        createdAt: new Date().toISOString(),
                        totalWords: 0,
                        unknownWords: 0,
                        levelCounts: {}
                    });
                } else if (sortedData.length > 0) {
                    const preSelected = urlListId 
                        ? sortedData.find(l => l.id === parseInt(urlListId)) 
                        : null;
                    setSelectedList(preSelected || sortedData[0]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch lists", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWords = async (id: number) => {
        try {
            setWordsLoading(true);
            if (id === -1) {
                const response = await api.get('/user/known-words', { params: { userId } });
                const knownWordsData = response.data || [];
                
                const levelCounts: Record<string, number> = {};
                knownWordsData.forEach((w: any) => {
                    if (w.difficulty) {
                        levelCounts[w.difficulty] = (levelCounts[w.difficulty] || 0) + 1;
                    }
                });

                const mockResponse: WordListWordsResponseDTO = {
                    list: {
                        id: -1,
                        name: t('lists.knownWords', { defaultValue: 'Bilinen Kelimeler' }),
                        createdAt: new Date().toISOString(),
                        totalWords: knownWordsData.length,
                        unknownWords: 0,
                        levelCounts,
                    },
                    words: knownWordsData.map((w: any) => ({ ...w, isKnown: true })),
                    totalWords: knownWordsData.length,
                    unknownWords: 0,
                    levelCounts
                };
                
                setWordData(mockResponse);
                
                // Only update selected list if counts differ to prevent infinite loop
                setSelectedList(prev => {
                    if (prev?.id === -1 && prev.totalWords !== knownWordsData.length) {
                        return { ...prev, totalWords: knownWordsData.length, levelCounts };
                    }
                    return prev;
                });
            } else {
                const data = await WordListService.getListWords(id, userId, filterUnknown);
                setWordData(data);
            }
            setVisibleCount(50); // Reset pagination on list change
            setCurrentCardIndex(0); // Reset flashcard index on list change
            stopAutoPlay();
        } catch (error) {
            console.error("Failed to fetch words", error);
        } finally {
            setWordsLoading(false);
        }
    };

    const handleCreateList = async () => {
        const name = prompt(t('lists.enter_name'));
        if (name) {
            try {
                const newList = await WordListService.createList(name);
                setLists([...lists, newList]);
                setSelectedList(newList);
            } catch (error) {
                console.error("Failed to create list", error);
            }
        }
    };

    const handleToggleKnown = async (wordId: number, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await api.delete(`/words/${wordId}/mark-known`, { params: { userId } });
            } else {
                await api.post(`/words/${wordId}/mark-known`, null, { params: { userId } });
            }

            // Update local state in wordData
            if (wordData) {
                const updatedWords = wordData.words.map((w: any) =>
                    w.id === wordId ? { ...w, isKnown: !currentStatus } : w
                );

                // UX FIX: Do not filter out the word immediately when its known status changes.
                // This prevents the list from jumping around and causing misclicks.
                // The word will naturally be filtered out on the next page reload or filter toggle.
                setWordData({
                    ...wordData,
                    words: updatedWords
                });
            }
            
            // Refresh lists to update counts in sidebar
            const updatedLists = await WordListService.getUserLists();
            setLists(updatedLists);
            
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    const filteredWords = useMemo(() => {
        if (!wordData) return [];
        return wordData.words.filter(w => 
            selectedLevels.length === 0 || (w.difficulty && selectedLevels.includes(w.difficulty))
        );
    }, [wordData, selectedLevels]);

    // Auto Play Logic
    const startAutoPlay = async () => {
        setIsAutoPlaying(true);
        autoPlayRef.current = true;
        setViewMode('flashcard');
        
        const voices = window.speechSynthesis.getVoices();
        let targetVoice: SpeechSynthesisVoice | null = null;
        if (preferredVoiceGender !== 'system') {
             targetVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(preferredVoiceGender === 'female' ? 'siri' : 'premium')) || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(preferredVoiceGender)) || null;
        }

        const speakText = (text: string, lang = 'en-US'): Promise<void> => {
            return new Promise((resolve) => {
                if (!autoPlayRef.current) return resolve();
                const u = new SpeechSynthesisUtterance(text);
                u.lang = lang;
                u.rate = 1.0;
                u.pitch = 1.0;
                if (targetVoice && lang.startsWith('en')) u.voice = targetVoice;
                
                // Keep global reference to prevent Safari/Chrome GC bug mid-speech
                (window as any)._autoPlayUtterance = u;
                
                u.onend = () => resolve();
                u.onerror = () => resolve();
                window.speechSynthesis.speak(u);
            });
        };

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        let startIndex = currentCardIndex;
        if (startIndex >= filteredWords.length - 1 && !isAutoPlaying) {
            startIndex = 0;
            setCurrentCardIndex(0);
        }

        for (let i = startIndex; i < filteredWords.length; i++) {
            if (!autoPlayRef.current) break;
            setCurrentCardIndex(i);
            const w = filteredWords[i];
            
            // 1. English word
            await speakText(w.word, 'en-US');
            await sleep(500);
            if (!autoPlayRef.current) break;

            // 2. Turkish meaning
            const meaning = w.definition?.meanings?.[0]?.definition;
            if (meaning) {
                await speakText(meaning, 'tr-TR');
                await sleep(500);
            }
            if (!autoPlayRef.current) break;

            // 3. English example
            const example = w.definition?.meanings?.[0]?.example;
            if (example) {
                await speakText(example, 'en-US');
                await sleep(800);
            }
            if (!autoPlayRef.current) break;
            
            // 4. Turkish example
            const exampleTr = (w.definition?.meanings?.[0] as any)?.exampleTr;
            if (exampleTr) {
                await speakText(exampleTr, 'tr-TR');
                await sleep(1000);
            }
        }
        
        setIsAutoPlaying(false);
        autoPlayRef.current = false;
    };

    const stopAutoPlay = () => {
        setIsAutoPlaying(false);
        autoPlayRef.current = false;
        window.speechSynthesis.cancel();
    };

    useEffect(() => {
        return () => stopAutoPlay();
    }, []);

    const handleDeleteWord = async (listId: number, wordId: number) => {
        try {
            await WordListService.removeWordFromList(listId, wordId);
            if (wordData) {
                setWordData({
                    ...wordData,
                    words: wordData.words.filter(w => w.id !== wordId)
                });
            }
            // Update lists to reflect count change
            fetchLists();
        } catch (error) {
            console.error("Failed to remove word", error);
        }
    };

    const handleDeleteList = async (listId: number) => {
        try {
            await WordListService.deleteList(listId);
            const newList = lists.filter(l => l.id !== listId);
            setLists(newList);
            if (selectedList?.id === listId) {
                setSelectedList(newList.length > 0 ? newList[0] : null);
            }
        } catch (error) {
            console.error("Failed to delete list", error);
        }
    };

    const handleGenerateSubList = async () => {
        if (!selectedList || isGeneratingList) return;

        setIsGeneratingList(true);
        try {
            const newList = await WordListService.createSubListFromUnknown(selectedList.id);
            setLists([...lists, newList]);
            setIsGenerationSuccess(true);
            setTimeout(() => setIsGenerationSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to generate list:', error);
            alert(t('lists.create_failed'));
        } finally {
            setIsGeneratingList(false);
        }
    };

    const sortedLists = useMemo(() => {
        return [...lists].sort((a, b) => {
            // First: Custom lists (isSystem: false) go to top
            if (!!a.isSystem !== !!b.isSystem) {
                return a.isSystem ? 1 : -1;
            }
            // Second: Newest first
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [lists]);

    const visibleLists = useMemo(() => {
        return sortedLists.filter(list => !(globalHide && hiddenIds.includes(list.id)));
    }, [sortedLists, globalHide, hiddenIds]);



    if (loading && lists.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const progressPercent = wordData ? Math.round(((wordData.totalWords - wordData.unknownWords) / wordData.totalWords) * 100) : 0;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-8 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Book className="w-8 h-8 text-indigo-500" />
                    {t('lists.title')}
                </h1>

                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'lists'
                                ? "bg-white dark:bg-[#161822] text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        )}
                    >
                        {t('lists.tab_my_lists')}
                    </button>
                    <button
                        onClick={() => setActiveTab('rankings')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'rankings'
                                ? "bg-white dark:bg-[#161822] text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        )}
                    >
                        {t('lists.tab_rankings')}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {activeTab === 'lists' ? (
                    <>
                        {/* Sidebar: List of Lists */}
                        <div className="w-full lg:w-1/4 space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateList}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Plus className="w-5 h-5" />
                                    {t('lists.create_new')}
                                </button>
                                <button
                                    onClick={toggleGlobalHide}
                                    className="w-12 flex items-center justify-center bg-white dark:bg-[#161822] text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 border border-gray-200/60 dark:border-gray-800/60 rounded-xl transition-colors shadow-sm"
                                    title={globalHide ? "Tüm listeleri göster" : "Gizli listeleri sakla"}
                                >
                                    {globalHide ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
                                {lists.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">{t('lists.no_lists')}</div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {(() => {
                                            const personalLists = visibleLists.filter(l => !l.isSystem);
                                            const systemLists = visibleLists.filter(l => l.isSystem);

                                            const renderList = (list: WordListDTO) => {
                                                const isHidden = hiddenIds.includes(list.id);
                                                return (
                                                    <div
                                                        key={list.id}
                                                        className={cn(
                                                            "group relative w-full flex items-center transition-colors overflow-hidden",
                                                            selectedList?.id === list.id
                                                                ? (list.color ? "" : "bg-indigo-50 dark:bg-indigo-500/10")
                                                                : "hover:bg-gray-50 dark:hover:bg-gray-800",
                                                            isHidden && !globalHide && "opacity-50"
                                                        )}
                                                    >
                                                        {/* Background Tint Layer */}
                                                        {list.color && (
                                                            <div 
                                                                className={cn(
                                                                    "absolute inset-0 pointer-events-none transition-opacity",
                                                                    selectedList?.id === list.id ? "opacity-20" : "opacity-5 group-hover:opacity-10"
                                                                )}
                                                                style={{ backgroundColor: list.color }}
                                                            />
                                                        )}
                                                        
                                                        <button
                                                            onClick={() => setSelectedList(list)}
                                                            className={cn(
                                                                "relative z-10 flex-1 text-left px-5 py-4 flex items-center justify-between min-w-0",
                                                                selectedList?.id === list.id
                                                                    ? "text-indigo-700 dark:text-indigo-300"
                                                                    : "text-gray-700 dark:text-gray-300"
                                                            )}
                                                        >
                                                            <div className="min-w-0 flex items-center gap-3">
                                                                {list.sourceMediaPosterUrl ? (
                                                                    <div className="relative shrink-0">
                                                                        <img 
                                                                            src={list.sourceMediaPosterUrl} 
                                                                            alt={list.name} 
                                                                            className="w-10 h-14 object-cover rounded-md shadow-sm border border-gray-200 dark:border-gray-800" 
                                                                        />
                                                                        {list.color && (
                                                                            <div 
                                                                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#161822]"
                                                                                style={{ backgroundColor: list.color }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5"
                                                                        style={{ backgroundColor: (list.color ?? '#818cf8') + '20' }}
                                                                    >
                                                                        <BookOpen className="w-5 h-5" style={{ color: list.color ?? '#818cf8' }} />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold truncate flex items-center gap-2">
                                                                        {list.name}
                                                                        {list.isSystem && (
                                                                            <span title="System List">
                                                                                <Lock className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400 mt-1">
                                                                        {list.totalWords} {t('lists.words')} • {list.unknownWords} {t('lists.unknown')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-600 dark:group-hover:text-gray-400 transition-colors shrink-0" />
                                                        </button>
                                                        
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleHide(list.id); }}
                                                            className="relative z-10 p-2 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg transition-colors shrink-0"
                                                            title={isHidden ? "Göster" : "Gizle"}
                                                        >
                                                            {isHidden ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                        
                                                        {!list.isSystem && (
                                                            <button
                                                                onClick={(e) => handleOpenEdit(e, list)}
                                                                className="relative z-10 p-2 mr-2 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 rounded-lg transition-colors shrink-0"
                                                                title="Edit list"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            };

                                            return (
                                                <>
                                                    {personalLists.length > 0 && (
                                                        <>
                                                            <div className="bg-gray-50/80 dark:bg-gray-800/30 px-5 py-2.5 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                                                {t('personalLists', 'Kişisel Listelerim')}
                                                            </div>
                                                            {personalLists.map(renderList)}
                                                        </>
                                                    )}
                                                    
                                                    {systemLists.length > 0 && (
                                                        <>
                                                            <div className="bg-gray-50/80 dark:bg-gray-800/30 px-5 py-2.5 text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-y border-gray-100 dark:border-gray-800 mt-2">
                                                                {t('curatedLists', 'Önerilen Listeler')}
                                                            </div>
                                                            {systemLists.map(renderList)}
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Content: Selected List Details */}
                        <div className="flex-1">
                            {selectedList && wordData ? (
                                <div className="space-y-6">
                                    {/* List Status Card (Unified Media Style) */}
                                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 sm:p-8">
                                        <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
                                            <div className="flex-1 min-w-[280px]">
                                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                                    {selectedList.name}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                                        {wordData.totalWords} {t('lists.words')}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        {wordData.totalWords - wordData.unknownWords} {t('lists.known')}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 font-bold text-indigo-600 dark:text-indigo-400">
                                                        {progressPercent}% {t('lists.mastery')}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-2">
                                                {isAutoPlaying ? (
                                                    <button
                                                        onClick={stopAutoPlay}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold rounded-xl transition-all whitespace-nowrap border border-rose-200"
                                                    >
                                                        Duraklat
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={startAutoPlay}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl transition-all whitespace-nowrap border border-indigo-100"
                                                    >
                                                        <Volume2 className="w-5 h-5" />
                                                        {currentCardIndex > 0 && currentCardIndex < filteredWords.length - 1 ? `Sürdür (${filteredWords.length - currentCardIndex})` : `Otomatik Çal (${filteredWords.length})`}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIsQuizModalOpen(true)}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 whitespace-nowrap"
                                                >
                                                    <PlayCircle className="w-5 h-5 fill-white/20" />
                                                    {t('lists.study_list')}
                                                </button>
                                                <button
                                                    onClick={() => setFilterUnknown(!filterUnknown)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",
                                                        filterUnknown
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/25"
                                                            : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    )}
                                                >
                                                    <Filter className="w-4 h-4" />
                                                    {filterUnknown ? t('lists.filter_unknown') : t('lists.filter_all')}
                                                </button>
                                                
                                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
                                                    <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white')}><List className="w-4 h-4" /></button>
                                                    <button onClick={() => setViewMode('flashcard')} className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'flashcard' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white')}><Grid3X3 className="w-4 h-4" /></button>
                                                </div>

                                                <button
                                                    onClick={handleGenerateSubList}
                                                    disabled={isGeneratingList || isGenerationSuccess || wordData.unknownWords === 0}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm whitespace-nowrap",
                                                        isGenerationSuccess
                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                            : "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                                    )}
                                                >
                                                    {isGeneratingList ? <Loader2 className="w-4 h-4 animate-spin" /> : isGenerationSuccess ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                                    {isGeneratingList ? t('lists.preparing') : isGenerationSuccess ? t('lists.ready') : t('lists.create_from_unknown')}
                                                </button>
                                                
                                                {!selectedList.isSystem ? (
                                                    <button
                                                        onClick={() => setDeleteConfirm({ type: 'list', id: selectedList.id })}
                                                        className="p-2.5 text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-red-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:border-red-900/50 rounded-xl transition-all shrink-0"
                                                        title="Delete List"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <div className="p-2.5 text-gray-300 border border-gray-100 dark:border-gray-800/50 dark:text-gray-600 cursor-not-allowed shrink-0 rounded-xl bg-gray-50 dark:bg-gray-900/50" title="System lists cannot be deleted">
                                                        <Lock className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Level Filters */}
                                        <div className="flex flex-wrap items-center gap-2 mb-6">
                                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                                                const count = wordData.levelCounts[level] || 0;
                                                const isSelected = selectedLevels.includes(level);
                                                return (
                                                    <button
                                                        key={level}
                                                        onClick={() => {
                                                            isSelected ? setSelectedLevels(selectedLevels.filter(l => l !== level)) : setSelectedLevels([...selectedLevels, level]);
                                                            setCurrentCardIndex(0);
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 border",
                                                            isSelected
                                                                ? level.startsWith('A') ? "bg-green-500 text-white border-green-600" : level.startsWith('B') ? "bg-blue-500 text-white border-blue-600" : "bg-purple-500 text-white border-purple-600"
                                                                : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"
                                                        )}
                                                    >
                                                        {level}
                                                        <span className={cn("px-1.5 py-0.5 rounded-md text-[10px]", isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400")}>
                                                            {count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {selectedLevels.length > 0 && (
                                                <button onClick={() => { setSelectedLevels([]); setCurrentCardIndex(0); }} className="text-xs text-gray-400 hover:text-indigo-500 ml-2">{t('lists.clear_levels')}</button>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Words Rendering */}
                                    {wordsLoading ? (
                                        <div className="flex justify-center items-center h-40">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        </div>
                                    ) : (
                                        <>
                                            {filteredWords.length === 0 ? (
                                                <div className="text-center py-12 text-gray-400 bg-white dark:bg-[#161822] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                                    <Book className="w-10 h-10 opacity-20 mx-auto mb-4" />
                                                    <p>{t('lists.no_words', { defaultValue: 'Bu listede kelime bulunamadı.' })}</p>
                                                </div>
                                            ) : viewMode === 'flashcard' ? (
                                                <div className="flex justify-center py-8 relative w-full">
                                                    {filteredWords.length > 0 && currentCardIndex < filteredWords.length ? (
                                                        <FlashCard
                                                            word={filteredWords[currentCardIndex]}
                                                            index={currentCardIndex}
                                                            total={filteredWords.length}
                                                            isKnown={filteredWords[currentCardIndex].isKnown}
                                                            onToggleKnown={() => handleToggleKnown(filteredWords[currentCardIndex].id, filteredWords[currentCardIndex].isKnown)}
                                                            onPrev={() => setCurrentCardIndex(p => Math.max(0, p - 1))}
                                                            onNext={() => setCurrentCardIndex(p => Math.min(filteredWords.length - 1, p + 1))}
                                                            onAddToList={selectedList.id !== -1 ? undefined : () => {}}
                                                            note={(filteredWords[currentCardIndex] as any).note}
                                                            onNoteEdit={() => {
                                                                const w = filteredWords[currentCardIndex];
                                                                setNoteDraft((w as any).note ?? '');
                                                                setNoteModal({ wordId: w.id, wordName: w.word, note: (w as any).note });
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-400">
                                                            Tebrikler! Filtrelediğiniz kelimelerin sonuna geldiniz.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
                                                    {filteredWords.slice(0, visibleCount).map((word: any) => (
                                                        <WordCard
                                                            key={word.id}
                                                            {...word}
                                                            onToggleKnown={handleToggleKnown}
                                                            onRemove={() => handleDeleteWord(selectedList.id, word.id)}
                                                            isSystemProtected={selectedList.isSystem}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {viewMode === 'list' && visibleCount < filteredWords.length && (
                                                <div className="mt-8 flex justify-center">
                                                    <button
                                                        onClick={() => setVisibleCount(prev => prev + 100)}
                                                        className="px-8 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                                                    >
                                                        {t('lists.load_more', { count: filteredWords.length - visibleCount })}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl min-h-[400px]">
                                    {wordsLoading ? <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" /> : <Book className="w-12 h-12 mb-4 opacity-20" />}
                                    <p className="text-lg">{wordsLoading ? t('lists.loading_words') : t('lists.select_list_to_view')}</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Global Rankings View */
                    <div className="flex-1 space-y-6">
                        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('lists.rankings_title')}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{t('lists.rankings_desc')}</p>
                        </div>

                        {wordsLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">
                                {frequentWords.map((word, index) => (
                                    <div key={word.id} className="relative group">
                                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-lg shadow-indigo-500/30">
                                            #{index + 1}
                                        </div>
                                        <WordCard
                                            {...word}
                                            onToggleKnown={handleToggleKnown}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit List Modal */}
            {editingList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#161822] rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('lists.edit_list')}</h3>
                            <button onClick={() => setEditingList(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('lists.name')}</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('lists.color')}</label>
                        <div className="flex flex-wrap gap-2 mb-8">
                            <button
                                onClick={() => setEditColor(undefined)}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                    !editColor ? "border-gray-400 scale-110" : "border-gray-200 dark:border-gray-700"
                                )}
                                title={t('lists.no_color')}
                            >
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            {LIST_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setEditColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        editColor === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        {editError && (
                            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{editError}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingList(null)}
                                className="flex-1 py-2.5 px-4 rounded-xl text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit || !editName.trim()}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSavingEdit ? t('lists.saving') : t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Type Selection Modal */}
            {isQuizModalOpen && selectedList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#161822] rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('lists.start_practice')}</h3>
                        <p className="text-gray-500 mb-6">{t('lists.quiz_desc')}</p>
                        
                        <div className="space-y-3 mb-8">
                            {[
                                { id: 'MULTIPLE_CHOICE', label: t('lists.quiz_multiple') },
                                { id: 'FILL_IN_THE_BLANKS', label: t('lists.quiz_fill') },
                                { id: 'LISTENING', label: t('lists.quiz_listen') }
                            ].map(type => (
                                <label key={type.id} className="flex items-center gap-3 p-4 rounded-xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 accent-indigo-600 disabled:opacity-50"
                                        checked={selectedQuizTypes.includes(type.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedQuizTypes([...selectedQuizTypes, type.id]);
                                            } else {
                                                setSelectedQuizTypes(selectedQuizTypes.filter(t => t !== type.id));
                                            }
                                        }}
                                    />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{type.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="mb-8">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('lists.question_count', 'Soru Sayısı')}</h4>
                            <div className="flex gap-3">
                                {[5, 10, 15, 20].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setQuizSize(s)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl font-bold transition-all border",
                                            quizSize === s
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300"
                                                : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsQuizModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsQuizModalOpen(false);
                                    let url = `/study/${selectedList.id}?types=${selectedQuizTypes.join(',')}&size=${quizSize}`;
                                    if (selectedLevels.length > 0) url += `&difficulties=${selectedLevels.join(',')}`;
                                    if (filterUnknown) url += `&onlyUnknown=true`;
                                    navigate(url);
                                }}
                                disabled={selectedQuizTypes.length === 0}
                                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('lists.start')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-[#161822] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                            {t('common.are_you_sure')}
                        </h3>
                        <p className="text-center text-gray-500 mb-8">
                            {deleteConfirm.type === 'list' ? t('lists.confirm_delete_list') : t('lists.confirm_remove_word')}
                        </p>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                            >
                                {t('actions.cancel', 'İptal')}
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirm.type === 'list') handleDeleteList(deleteConfirm.id);
                                    else if (selectedList) handleDeleteWord(selectedList.id, deleteConfirm.id);
                                    setDeleteConfirm(null);
                                }}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                            >
                                {t('actions.delete', 'Sil')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Note Edit Modal ──────────────────────────── */}
            {noteModal && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setNoteModal(null)}
                    />
                    {/* Sheet */}
                    <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#161822] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-slide-up">
                        {/* Handle (mobile only) */}
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-5 sm:hidden" />

                        <div className="flex items-center gap-3 mb-5">
                            <FileText className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Kişisel Notun</h3>
                                {noteModal.wordName && (
                                    <p className="text-sm font-semibold text-amber-500">{noteModal.wordName}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setNoteModal(null)}
                                className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none"
                            ><X className="w-5 h-5" /></button>
                        </div>

                        <textarea
                            className="w-full min-h-[110px] p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Bu kelimeyle ilgili aklında ne var? Bağlam, hafıza kancası, anekdot..."
                            maxLength={320}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value.slice(0, 300))}
                            autoFocus
                        />
                        <p className={cn('text-xs text-right mt-1', (300 - noteDraft.length) < 30 ? 'text-amber-500' : 'text-gray-400')}>
                            {300 - noteDraft.length} karakter kaldı
                        </p>

                        <div className="flex gap-3 mt-4">
                            {noteModal.note && (
                                <button
                                    onClick={async () => {
                                        setNoteLoading(true);
                                        try {
                                            await api.delete(`/words/${noteModal.wordId}/note`);
                                            if (wordData) {
                                                setWordData(prev => prev ? {
                                                    ...prev,
                                                    words: prev.words.map(w => w.id === noteModal.wordId ? { ...w, note: null } : w)
                                                } : prev);
                                            }
                                            setNoteModal(null);
                                        } finally { setNoteLoading(false); }
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    disabled={noteLoading}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Trash2 className="w-4 h-4" />
                                        <span>Notu Sil</span>
                                    </div>
                                </button>
                            )}
                            <button
                                onClick={async () => {
                                    if (!noteDraft.trim()) return;
                                    setNoteLoading(true);
                                    try {
                                        await api.put(`/words/${noteModal.wordId}/note`, { note: noteDraft.trim() });
                                        if (wordData) {
                                            setWordData(prev => prev ? {
                                                ...prev,
                                                words: prev.words.map(w => w.id === noteModal.wordId ? { ...w, note: noteDraft.trim() } : w)
                                            } : prev);
                                        }
                                        setNoteModal(null);
                                    } finally { setNoteLoading(false); }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
                                disabled={!noteDraft.trim() || noteLoading}
                            >
                                {noteLoading ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserListsPage;
