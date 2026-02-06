/**
 * Group Message Store
 * Stores messages for group chats separately from peer messages
 */

import { create } from 'zustand';

const useGroupMessageStore = create((set, get) => ({
    // Messages organized by groupId
    messages: {},

    // Loading states
    loading: {},
    hasMore: {},

    // Set messages for a group
    setMessages: (groupId, messages) => set((state) => ({
        messages: { ...state.messages, [groupId]: messages }
    })),

    // Add a new message
    addMessage: (groupId, message) => set((state) => {
        const existing = state.messages[groupId] || [];
        // Avoid duplicates
        if (existing.find(m => m.id === message.id)) {
            return state;
        }
        return {
            messages: { ...state.messages, [groupId]: [...existing, message] }
        };
    }),

    // Prepend older messages (for infinite scroll)
    prependMessages: (groupId, olderMessages) => set((state) => {
        const existing = state.messages[groupId] || [];
        const existingIds = new Set(existing.map(m => m.id));
        const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
        return {
            messages: { ...state.messages, [groupId]: [...newMessages, ...existing] }
        };
    }),

    // Update a message (edit, reactions, etc.)
    updateMessage: (groupId, messageId, updates) => set((state) => ({
        messages: {
            ...state.messages,
            [groupId]: (state.messages[groupId] || []).map(m =>
                m.id === messageId ? { ...m, ...updates } : m
            )
        }
    })),

    // Delete a message
    deleteMessage: (groupId, messageId) => set((state) => ({
        messages: {
            ...state.messages,
            [groupId]: (state.messages[groupId] || []).map(m =>
                m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
            )
        }
    })),

    // Clear messages for a group
    clearMessages: (groupId) => set((state) => ({
        messages: { ...state.messages, [groupId]: [] }
    })),

    // Loading state
    setLoading: (groupId, isLoading) => set((state) => ({
        loading: { ...state.loading, [groupId]: isLoading }
    })),

    setHasMore: (groupId, hasMore) => set((state) => ({
        hasMore: { ...state.hasMore, [groupId]: hasMore }
    })),

    // Getters
    getMessages: (groupId) => get().messages[groupId] || [],
    isLoading: (groupId) => get().loading[groupId] || false,
    getHasMore: (groupId) => get().hasMore[groupId] !== false
}));

export default useGroupMessageStore;
