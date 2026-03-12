import { useState, useEffect } from 'react';
import { X, Plus, Check, Lock } from 'lucide-react';
import WordListService, { type WordListDTO } from '@/services/WordListService';
import { cn } from '@/utils/cn';

interface ListSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    wordId: number;
    word: string;
}

const ListSelectionModal = ({ isOpen, onClose, wordId, word }: ListSelectionModalProps) => {
    const [lists, setLists] = useState<WordListDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [addedLists, setAddedLists] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchListsAndStatus();
        }
    }, [isOpen]);

    const fetchListsAndStatus = async () => {
        try {
            setLoading(true);
            const [userLists, containingListIds] = await Promise.all([
                WordListService.getUserLists(),
                WordListService.getListsContainingWord(wordId)
            ]);
            
            setLists(userLists);
            setAddedLists(new Set(containingListIds));
        } catch (error) {
            console.error("Failed to fetch lists or status", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        try {
            setIsCreating(true);
            const newList = await WordListService.createList(newListName);
            setLists([...lists, newList]);
            setNewListName('');

            // Automatically add word to the new list
            await handleAddToList(newList.id);
        } catch (error) {
            console.error("Failed to create list", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddToList = async (listId: number) => {
        try {
            await WordListService.addWordToList(listId, wordId);
            setAddedLists(prev => new Set(prev).add(listId));
            window.dispatchEvent(new CustomEvent('list-words-changed'));
        } catch (error) {
            console.error("Failed to add word to list", error);
        }
    };

    const handleRemoveFromList = async (listId: number) => {
        try {
            await WordListService.removeWordFromList(listId, wordId);
            setAddedLists(prev => {
                const next = new Set(prev);
                next.delete(listId);
                return next;
            });
            window.dispatchEvent(new CustomEvent('list-words-changed'));
        } catch (error) {
            console.error("Failed to remove word from list", error);
        }
    };

    const toggleList = (listId: number) => {
        if (addedLists.has(listId)) {
            handleRemoveFromList(listId);
        } else {
            handleAddToList(listId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#161822] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Add "{word}" to...
                    </h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    {/* Create New List */}
                    <form onSubmit={handleCreateList} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="Create new list..."
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={!newListName.trim() || isCreating}
                            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>

                    {/* List of Lists */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="text-center py-4 text-gray-400">Loading lists...</div>
                        ) : lists.filter(l => !l.isSystem).length === 0 ? (
                            <div className="text-center py-4 text-gray-400">No custom lists found. Create one above!</div>
                        ) : (
                            lists.filter(l => !l.isSystem).map(list => {
                                const isAdded = addedLists.has(list.id);
                                return (
                                    <button
                                        key={list.id}
                                        onClick={() => toggleList(list.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors",
                                            isAdded
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="font-medium truncate">{list.name}</span>
                                        </div>
                                        {isAdded && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ListSelectionModal;
