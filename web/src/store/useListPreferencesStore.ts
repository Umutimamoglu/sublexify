import { create } from 'zustand';
import WordListService from '@/services/WordListService';

type ListPreferencesState = {
    globalHide: boolean;
    hiddenIds: number[];
    toggleGlobalHide: () => void;
    toggleHide: (id: number) => void;
    fetchHiddenLists: () => Promise<void>;
};

export const useListPreferencesStore = create<ListPreferencesState>()((set, get) => {
    // Restore from localStorage on init
    const storedGlobalHide = localStorage.getItem('sublex-global-hide');
    const storedHiddenIds = localStorage.getItem('sublex-hidden-ids');

    return {
        globalHide: storedGlobalHide ? JSON.parse(storedGlobalHide) : false,
        hiddenIds: storedHiddenIds ? JSON.parse(storedHiddenIds) : [],

        toggleGlobalHide: () => {
            set((state) => {
                const next = !state.globalHide;
                localStorage.setItem('sublex-global-hide', JSON.stringify(next));
                return { globalHide: next };
            });
        },

        toggleHide: (id: number) => {
            const { hiddenIds } = get();
            const isHidden = hiddenIds.includes(id);
            const nextIds = isHidden
                ? hiddenIds.filter((hiddenId) => hiddenId !== id)
                : [...hiddenIds, id];
                
            set({ hiddenIds: nextIds });
            localStorage.setItem('sublex-hidden-ids', JSON.stringify(nextIds));
            
            // Sync with backend
            WordListService.syncHiddenLists(nextIds).catch(console.error);
        },

        fetchHiddenLists: async () => {
            try {
                const serverIds = await WordListService.getHiddenLists();
                set({ hiddenIds: serverIds });
                localStorage.setItem('sublex-hidden-ids', JSON.stringify(serverIds));
            } catch (e) {
                console.error("Failed to fetch hidden lists from server", e);
            }
        }
    };
});
