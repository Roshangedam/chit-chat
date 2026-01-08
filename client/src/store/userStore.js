/**
 * User Store
 * Manages current user state
 */

import { create } from 'zustand';

const useUserStore = create((set, get) => ({
    // State
    currentUser: null,
    isLoading: true,
    needsName: false,

    // Actions
    setCurrentUser: (user) => set({
        currentUser: user,
        isLoading: false,
        needsName: !user?.name || user.name.startsWith('User-')
    }),

    updateUser: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
        needsName: updates.name ? false : state.needsName
    })),

    setName: (name) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, name } : null,
        needsName: false
    })),

    clearUser: () => set({
        currentUser: null,
        isLoading: false,
        needsName: false
    })
}));

export default useUserStore;
