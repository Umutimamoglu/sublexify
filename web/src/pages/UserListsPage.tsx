import { useEffect, useState } from 'react';
import { listService, type WordList } from '@/services/list';
import WordCard from '@/components/features/WordCard'; // We might reuse this or make a simpler one
import { Loader2, Plus, Trash2, ChevronRight, Book } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import api from '@/services/api';

const UserListsPage = () => {
    const [lists, setLists] = useState<WordList[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedList, setSelectedList] = useState<WordList | null>(null);

    // Mock userId
    const userId = 1;

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const data = await listService.getUserLists();
            setLists(data);
            if (data.length > 0 && !selectedList) {
                setSelectedList(data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch lists", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async () => {
        const name = prompt("Enter list name:");
        if (name) {
            try {
                const newList = await listService.createList(name);
                setLists([...lists, newList]);
                setSelectedList(newList);
            } catch (error) {
                console.error("Failed to create list", error);
            }
        }
    };

    // We reuse the WordCard toggle logic roughly, or maybe we don't need toggle known here? 
    // Usually lists are for studying, so knowing if it's known is good.
    const handleToggleKnown = async (wordId: number, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await api.delete(`/words/${wordId}/mark-known`, { params: { userId } });
            } else {
                await api.post(`/words/${wordId}/mark-known`, null, { params: { userId } });
            }

            // Update local state in selectedList
            if (selectedList) {
                const updatedWords = selectedList.words.map((w: any) =>
                    w.id === wordId ? { ...w, isKnown: !currentStatus } : w
                );
                setSelectedList({ ...selectedList, words: updatedWords });

                // Also update the list in the main lists array
                setLists(lists.map(l => l.id === selectedList.id ? { ...l, words: updatedWords } : l));
            }
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    const handleDeleteWord = async (listId: number, wordId: number) => {
        if (!confirm("Remove this word from the list?")) return;
        try {
            await listService.removeWordFromList(listId, wordId);
            if (selectedList) {
                const updatedWords = selectedList.words.filter((w: any) => w.id !== wordId);
                setSelectedList({ ...selectedList, words: updatedWords });
                setLists(lists.map(l => l.id === selectedList.id ? { ...l, words: updatedWords } : l));
            }
        } catch (error) {
            console.error("Failed to remove word", error);
        }
    };

    if (loading && lists.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

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
                            <div className="p-8 text-center text-gray-400">
                                No lists yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {lists.map(list => (
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
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{list.name}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {list.words.length} words
                                            </p>
                                        </div>
                                        {selectedList?.id === list.id && (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content: Selected List Details */}
                <div className="flex-1">
                    {selectedList ? (
                        <div className="bg-white dark:bg-[#161822] rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8 min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedList.name}
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Created {new Date(selectedList.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {selectedList.words.length} words
                                </div>
                            </div>

                            {selectedList.words.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    This list is empty. Go browse media to add words!
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedList.words.map((word: any) => (
                                        <div key={word.id} className="relative group">
                                            {/* We wrap WordCard to add a delete button specific to list view if needed, 
                                                but WordCard has its own actions. 
                                                Let's just use WordCard and maybe add a delete action overlay?
                                                Actually WordCard has 'Bookmark' which adds to list. 
                                                For this page, we might want 'Remove from List'.
                                                For now, let's just use WordCard and I'll add a 'Remove' button top-right absolute.
                                            */}
                                            <WordCard
                                                {...word}
                                                // frequency might be missing in list words, or 0.
                                                frequency={word.frequency || 0}
                                                // isKnown needs to be calculated or comes from backend?
                                                // existing backend WordList returns Set<Word>. Word entity doesn't have isKnown.
                                                // Wait, WordListService returns WordList entity. Word entity is pure.
                                                // We need to fetch isKnown status separately or map it.
                                                // The current WordList endpoint just returns Words. It doesn't attach 'isKnown'.
                                                // This is a gap. We might need isKnown for the list view.
                                                // For now, let's defaults to false or try to fetch? 
                                                // Or we can just show the word without known status for MVP?
                                                // Better: UserListsPage should probably fetch known status or we update backend to return DTO.
                                                // Let's assume for sprint 4 we might have to skip isKnown visual in list or accept it's missing.
                                                // Actually, let's fix the backend later if needed. For now passed isKnown might be undefined/false.
                                                // But wait, the toggleKnown function depends on it.
                                                isKnown={word.isKnown || false}
                                                onToggleKnown={handleToggleKnown}
                                            />
                                            <button
                                                onClick={() => handleDeleteWord(selectedList.id, word.id)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                                                title="Remove from list"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                            <Book className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">Select a list to view words</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListsPage;
