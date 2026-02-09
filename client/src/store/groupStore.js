/**
 * Group Store
 * Zustand store for managing group state
 */

import { create } from 'zustand';

const useGroupStore = create((set, get) => ({
    // State
    groups: [],
    selectedGroup: null,
    groupMembers: {}, // { groupId: [members] }
    groupSettings: {}, // { groupId: settings }
    typingUsers: {}, // { groupId: [userIds] }

    // Actions
    setGroups: (groups) => set({ groups }),

    addGroup: (group) => set((state) => {
        // Check if already exists
        if (state.groups.find(g => g.id === group.id)) {
            return state;
        }
        return { groups: [group, ...state.groups] };
    }),

    updateGroup: (groupId, updates) => set((state) => ({
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, ...updates } : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
            ? { ...state.selectedGroup, ...updates }
            : state.selectedGroup
    })),

    removeGroup: (groupId) => set((state) => ({
        groups: state.groups.filter(g => g.id !== groupId),
        selectedGroup: state.selectedGroup?.id === groupId ? null : state.selectedGroup
    })),

    selectGroup: (group) => set({ selectedGroup: group }),

    clearSelectedGroup: () => set({ selectedGroup: null }),

    // Unread counts
    incrementUnread: (groupId) => set((state) => ({
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, unreadCount: (g.unreadCount || 0) + 1 } : g
        )
    })),

    clearUnread: (groupId) => set((state) => ({
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, unreadCount: 0 } : g
        )
    })),

    setUnreadCount: (groupId, count) => set((state) => ({
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, unreadCount: count } : g
        )
    })),

    // Last message updates
    updateLastMessage: (groupId, message) => set((state) => ({
        groups: state.groups.map(g =>
            g.id === groupId ? {
                ...g,
                last_message: message.content,
                last_message_time: message.created_at,
                last_message_sender: message.sender_name || message.sender_id,
                last_message_type: message.type
            } : g
        )
    })),

    // Members
    setGroupMembers: (groupId, members) => set((state) => ({
        groupMembers: { ...state.groupMembers, [groupId]: members }
    })),

    addGroupMember: (groupId, member) => set((state) => ({
        groupMembers: {
            ...state.groupMembers,
            [groupId]: [...(state.groupMembers[groupId] || []), member]
        },
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, member_count: (g.member_count || 0) + 1 } : g
        )
    })),

    removeGroupMember: (groupId, userId) => set((state) => ({
        groupMembers: {
            ...state.groupMembers,
            [groupId]: (state.groupMembers[groupId] || []).filter(m => m.user_id !== userId)
        },
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, member_count: Math.max(0, (g.member_count || 0) - 1) } : g
        )
    })),

    updateMemberRole: (groupId, userId, newRole) => set((state) => ({
        groupMembers: {
            ...state.groupMembers,
            [groupId]: (state.groupMembers[groupId] || []).map(m =>
                m.user_id === userId ? { ...m, role: newRole } : m
            )
        }
    })),

    // Settings
    setGroupSettings: (groupId, settings) => set((state) => ({
        groupSettings: { ...state.groupSettings, [groupId]: settings },
        // Also update the group object's settings
        groups: state.groups.map(g =>
            g.id === groupId ? { ...g, settings } : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
            ? { ...state.selectedGroup, settings }
            : state.selectedGroup
    })),

    // Typing indicators - now stores { userId, userName }
    setUserTyping: (groupId, userId, isTyping, userName = null) => set((state) => {
        const currentTyping = state.typingUsers[groupId] || [];
        let newTyping;

        if (isTyping) {
            // Check if user already in list
            if (!currentTyping.find(t => t.userId === userId)) {
                newTyping = [...currentTyping, { userId, userName: userName || userId }];
            } else {
                newTyping = currentTyping;
            }
        } else {
            newTyping = currentTyping.filter(t => t.userId !== userId);
        }

        return {
            typingUsers: { ...state.typingUsers, [groupId]: newTyping }
        };
    }),

    clearTyping: (groupId) => set((state) => ({
        typingUsers: { ...state.typingUsers, [groupId]: [] }
    })),

    // Getters
    getGroup: (groupId) => get().groups.find(g => g.id === groupId),

    getGroupMembers: (groupId) => get().groupMembers[groupId] || [],

    getGroupSettings: (groupId) => get().groupSettings[groupId],

    getTypingUsers: (groupId) => get().typingUsers[groupId] || [],

    getMyRole: (groupId, myId) => {
        const members = get().groupMembers[groupId] || [];
        const me = members.find(m => m.user_id === myId);
        return me?.role || 'member';
    },

    isAdmin: (groupId, userId) => {
        const members = get().groupMembers[groupId] || [];
        const member = members.find(m => m.user_id === userId);
        return member?.role === 'admin' || member?.role === 'creator';
    },

    isCreator: (groupId, userId) => {
        const members = get().groupMembers[groupId] || [];
        const member = members.find(m => m.user_id === userId);
        return member?.role === 'creator';
    },

    getTotalUnreadCount: () => {
        return get().groups.reduce((total, g) => total + (g.unreadCount || 0), 0);
    }
}));

export default useGroupStore;
