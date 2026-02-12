import { useEffect, useState } from 'react';
import { listService, type WordList } from '@/services/list';
import WordCard from '@/components/features/WordCard';
import { Loader2, Plus, Trash2, ChevronRight, Book, Star } from 'lucide-react';
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
                // Default to the first list (which might be "Bilinen Kelimeler" now)
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

                // If currently viewing "Known Words" list, removing known status should technically remove it from the list
                // But generally we might want to keep it locally until refresh or remove it immediately.
                // If it's the "Bilinen Kelimeler" list (id: -1), we should remove it from the view if unmarking known.
                let newWords = updatedWords;
                if (selectedList.id === -1 && currentStatus) { // Unmarking known in known list
                    newWords = selectedList.words.filter((w: any) => w.id !== wordId);
                }

                const updatedList = { ...selectedList, words: newWords };
                setSelectedList(updatedList);

                // Update in main lists array
                setLists(lists.map(l => l.id === selectedList.id ? updatedList : l));
            }
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    const handleDeleteWord = async (listId: number, wordId: number) => {
        if (listId === -1) {
            // For "Known Words" list, "Delete" implies "Mark as Unknown"
            if (!confirm("Remove this word from Known Words?")) return;
            await handleToggleKnown(wordId, true);
            return;
        }

        if (!confirm("Remove this word from the list?")) return;
        try {
            await listService.removeWordFromList(listId, wordId);
            if (selectedList) {
                const updatedWords = selectedList.words.filter((w: any) => w.id !== wordId);
                const updatedList = { ...selectedList, words: updatedWords };
                setSelectedList(updatedList);
                setLists(lists.map(l => l.id === selectedList.id ? updatedList : l));
            }
        } catch (error) {
            console.error("Failed to remove word", error);
        }
    };

    const handleDeleteList = async (listId: number) => {
        if (listId === -1) return; // Cannot delete system list
        if (!confirm("Are you sure you want to delete this list?")) return;

        // TODO: Implement delete list API in backend/service if not exists
        // assuming listService.deleteList(listId) exists or we skip for now as not in task
        alert("Delete list feature coming soon!");
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
                                        <div className="min-w-0 flex items-center gap-3">
                                            {/* Icon based on list type */}
                                            {list.id === -1 ? (
                                                <Star className={cn("w-5 h-5 shrink-0", selectedList?.id === list.id ? "fill-indigo-300/30" : "text-gray-400")} />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                            )}

                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{list.name}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {list.words.length} words
                                                </p>
                                            </div>
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
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        {selectedList.name}
                                    </h2>
                                    <p className="text-gray-400 text-sm flex items-center gap-2">
                                        <span>Created {new Date(selectedList.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{selectedList.words.length} items</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedList.id !== -1 && (
                                        <button
                                            onClick={() => handleDeleteList(selectedList.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete List"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedList.words.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Book className="w-10 h-10 opacity-20" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">List is empty</h3>
                                    <p>Go browse media or search words to add to this list!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {selectedList.words.map((word: any) => (
                                        <WordCard
                                            key={word.id}
                                            {...word}
                                            frequency={word.frequency || 0}
                                            // Handle isKnown properly. 
                                            // For Known Words list (-1), everything is known by definition, but word.isKnown might be null/missing.
                                            // Ideally backend returns DTO with isKnown=true.
                                            // If not, we default to false, OR true if listId === -1.
                                            isKnown={word.isKnown || (selectedList.id === -1)}
                                            onToggleKnown={handleToggleKnown}
                                            onRemove={() => handleDeleteWord(selectedList.id, word.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl min-h-[400px]">
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
