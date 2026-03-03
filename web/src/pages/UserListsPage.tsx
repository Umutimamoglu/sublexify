import { useEffect, useState, useMemo } from 'react';
import WordListService, { type WordListDTO, type WordListWordsResponseDTO } from '@/services/WordListService';
import WordCard from '@/components/features/WordCard';
import { Loader2, Plus, Trash2, ChevronRight, Book, Star, Filter, Wand2, Check, CheckCircle2, BookOpen, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import api from '@/services/api';

const UserListsPage = () => {
    const [lists, setLists] = useState<WordListDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [wordsLoading, setWordsLoading] = useState(false);
    const [selectedList, setSelectedList] = useState<WordListDTO | null>(null);
    const [wordData, setWordData] = useState<WordListWordsResponseDTO | null>(null);
    
    // Filters
    const [filterUnknown, setFilterUnknown] = useState(false);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [visibleCount, setVisibleCount] = useState(50);
    
    // Actions
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isGenerationSuccess, setIsGenerationSuccess] = useState(false);

    // Mock userId
    const userId = 1;

    useEffect(() => {
        fetchLists();
    }, []);

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
            if (sortedData.length > 0 && !selectedList) {
                setSelectedList(sortedData[0]);
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
            const data = await WordListService.getListWords(id, userId, filterUnknown);
            setWordData(data);
            setVisibleCount(50); // Reset pagination on list change
        } catch (error) {
            console.error("Failed to fetch words", error);
        } finally {
            setWordsLoading(false);
        }
    };

    const handleCreateList = async () => {
        const name = prompt("Enter list name:");
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

                // If filtering unknown only, remove from view if marked as known
                let finalWords = updatedWords;
                if (filterUnknown && !currentStatus) {
                    finalWords = updatedWords.filter(w => w.id !== wordId);
                }

                setWordData({ ...wordData, words: finalWords });
            }
            
            // Refresh lists to update counts in sidebar
            const updatedLists = await WordListService.getUserLists();
            setLists(updatedLists);
            
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    const handleDeleteWord = async (listId: number, wordId: number) => {
        if (!confirm("Remove this word from the list?")) return;
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
        if (!confirm("Are you sure you want to delete this list?")) return;
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
            alert('Liste oluşturulamadı.');
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

    const filteredWords = useMemo(() => {
        if (!wordData) return [];
        return wordData.words.filter(w => 
            selectedLevels.length === 0 || (w.difficulty && selectedLevels.includes(w.difficulty))
        );
    }, [wordData, selectedLevels]);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <Book className="w-8 h-8 text-indigo-500" />
                My Word Lists
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar: List of Lists */}
                <div className="w-full lg:w-1/4 space-y-4">
                    <button
                        onClick={handleCreateList}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        Create New List
                    </button>

                    <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
                        {lists.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">No lists yet.</div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {sortedLists.map(list => (
                                    <button
                                        key={list.id}
                                        onClick={() => setSelectedList(list)}
                                        className={cn(
                                            "w-full text-left px-5 py-4 flex items-center justify-between transition-colors",
                                            selectedList?.id === list.id
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        <div className="min-w-0 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
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
                                                    {list.totalWords} words • {list.unknownWords} unknown
                                                </p>
                                            </div>
                                        </div>
                                        {selectedList?.id === list.id && <ChevronRight className="w-4 h-4" />}
                                    </button>
                                ))}
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
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                            {selectedList.name}
                                        </h2>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                                {wordData.totalWords} words
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                {wordData.totalWords - wordData.unknownWords} known
                                            </span>
                                            <span>•</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{progressPercent}% Mastery</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFilterUnknown(!filterUnknown)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                                filterUnknown
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            )}
                                        >
                                            <Filter className="w-3.5 h-3.5" />
                                            {filterUnknown ? 'Unknown only' : 'All status'}
                                        </button>

                                        <button
                                            onClick={handleGenerateSubList}
                                            disabled={isGeneratingList || isGenerationSuccess || wordData.unknownWords === 0}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm",
                                                isGenerationSuccess
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                    : "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                            )}
                                        >
                                            {isGeneratingList ? <Loader2 className="w-4 h-4 animate-spin" /> : isGenerationSuccess ? <Check className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                            {isGeneratingList ? 'Hazırlanıyor...' : isGenerationSuccess ? 'Hazır!' : 'Bilinmeyenlerden Liste'}
                                        </button>
                                        
                                        {!selectedList.isSystem ? (
                                            <button
                                                onClick={() => handleDeleteList(selectedList.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0"
                                                title="Delete List"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <div className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed shrink-0" title="System lists cannot be deleted">
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
                                                onClick={() => isSelected ? setSelectedLevels(selectedLevels.filter(l => l !== level)) : setSelectedLevels([...selectedLevels, level])}
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
                                        <button onClick={() => setSelectedLevels([])} className="text-xs text-gray-400 hover:text-indigo-500 ml-2">Clear levels</button>
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

                            {/* Word Grid */}
                            {wordsLoading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                </div>
                            ) : filteredWords.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 bg-white dark:bg-[#161822] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                    <Book className="w-10 h-10 opacity-20 mx-auto mb-4" />
                                    <p>No words match your filters.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {filteredWords.slice(0, visibleCount).map((word: any) => (
                                            <WordCard
                                                key={word.id}
                                                {...word}
                                                onToggleKnown={handleToggleKnown}
                                                onRemove={() => handleDeleteWord(selectedList.id, word.id)}
                                            />
                                        ))}
                                    </div>
                                    {visibleCount < filteredWords.length && (
                                        <div className="mt-8 flex justify-center">
                                            <button
                                                onClick={() => setVisibleCount(prev => prev + 100)}
                                                className="px-8 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                                            >
                                                Load More Words ({filteredWords.length - visibleCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl min-h-[400px]">
                            {wordsLoading ? <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" /> : <Book className="w-12 h-12 mb-4 opacity-20" />}
                            <p className="text-lg">{wordsLoading ? 'Kelime listesi yükleniyor...' : 'Görüntülemek için bir liste seçin'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListsPage;
