import { create } from 'zustand';

type ListPreferencesState = {
    globalHide: boolean;
    hiddenIds: number[];
    toggleGlobalHide: () => void;
    toggleHide: (id: number) => void;
};

export const useListPreferencesStore = create<ListPreferencesState>()((set) => {
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
            set((state) => {
                const isHidden = state.hiddenIds.includes(id);
                const nextIds = isHidden
                    ? state.hiddenIds.filter((hiddenId) => hiddenId !== id)
                    : [...state.hiddenIds, id];
                localStorage.setItem('sublex-hidden-ids', JSON.stringify(nextIds));
                return { hiddenIds: nextIds };
            });
        },
    };
});
