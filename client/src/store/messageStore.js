/**
 * Message Store
 * Manages chat messages state with navigation features
 */

import { create } from 'zustand';

const useMessageStore = create((set, get) => ({
    // State - messages keyed by peerId
    messages: {},
    typingUsers: {}, // peerId -> boolean

    // Navigation state
    jumpedToMessage: null, // ID of message to highlight after jump
    hasOlder: {}, // peerId -> boolean (has older messages to load)
    hasNewer: {}, // peerId -> boolean (has newer messages available)
    loadingOlder: false, // Currently loading older messages

    // Actions
    setMessages: (peerId, messages) => set((state) => ({
        messages: {
            ...state.messages,
            [peerId]: messages
        }
    })),

    addMessage: (peerId, message) => set((state) => {
        const peerMessages = state.messages[peerId] || [];
        return {
            messages: {
                ...state.messages,
                [peerId]: [...peerMessages, message]
            }
        };
    }),

    // Prepend older messages (for infinite scroll)
    prependMessages: (peerId, olderMessages) => set((state) => {
        const currentMessages = state.messages[peerId] || [];
        // Filter out any duplicates
        const existingIds = new Set(currentMessages.map(m => m.id));
        const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
        return {
            messages: {
                ...state.messages,
                [peerId]: [...newMessages, ...currentMessages]
            }
        };
    }),

    updateMessage: (peerId, messageId, updates) => set((state) => {
        const peerMessages = state.messages[peerId] || [];
        return {
            messages: {
                ...state.messages,
                [peerId]: peerMessages.map(m =>
                    m.id === messageId ? { ...m, ...updates } : m
                )
            }
        };
    }),

    deleteMessage: (peerId, messageId) => set((state) => {
        const peerMessages = state.messages[peerId] || [];
        return {
            messages: {
                ...state.messages,
                [peerId]: peerMessages.filter(m => m.id !== messageId)
            }
        };
    }),

    // Update upload/download progress for a message
    updateUploadProgress: (peerId, messageId, progress, status) => set((state) => {
        const peerMessages = state.messages[peerId] || [];
        return {
            messages: {
                ...state.messages,
                [peerId]: peerMessages.map(m =>
                    m.id === messageId
                        ? { ...m, uploadProgress: progress, uploadStatus: status }
                        : m
                )
            }
        };
    }),

    setTyping: (peerId, isTyping) => set((state) => ({
        typingUsers: {
            ...state.typingUsers,
            [peerId]: isTyping
        }
    })),

    clearTyping: (peerId) => set((state) => {
        const { [peerId]: _, ...rest } = state.typingUsers;
        return { typingUsers: rest };
    }),

    // Navigation actions
    setJumpedToMessage: (messageId) => set({ jumpedToMessage: messageId }),
    clearJumpedToMessage: () => set({ jumpedToMessage: null }),

    setHasOlder: (peerId, value) => set((state) => ({
        hasOlder: { ...state.hasOlder, [peerId]: value }
    })),

    setHasNewer: (peerId, value) => set((state) => ({
        hasNewer: { ...state.hasNewer, [peerId]: value }
    })),

    setLoadingOlder: (value) => set({ loadingOlder: value }),

    // Getters
    getMessages: (peerId) => get().messages[peerId] || [],

    isTyping: (peerId) => get().typingUsers[peerId] || false,

    getLastMessage: (peerId) => {
        const msgs = get().messages[peerId] || [];
        return msgs.length > 0 ? msgs[msgs.length - 1] : null;
    },

    getOldestMessageId: (peerId) => {
        const msgs = get().messages[peerId] || [];
        return msgs.length > 0 ? msgs[0].id : null;
    }
}));

export default useMessageStore;

