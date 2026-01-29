/**
 * Peer Store
 * Manages online users/peers state
 */

import { create } from 'zustand';

const usePeerStore = create((set, get) => ({
    // State
    peers: [],
    selectedPeer: null,

    // Actions
    setPeers: (peers) => set({ peers }),

    addPeer: (peer) => set((state) => {
        // Don't add if already exists
        if (state.peers.find(p => p.id === peer.id)) {
            return state;
        }
        return { peers: [...state.peers, peer] };
    }),

    updatePeer: (peerId, updates) => set((state) => ({
        peers: state.peers.map(p =>
            p.id === peerId ? { ...p, ...updates } : p
        ),
        selectedPeer: state.selectedPeer?.id === peerId
            ? { ...state.selectedPeer, ...updates }
            : state.selectedPeer
    })),

    removePeer: (peerId) => set((state) => ({
        peers: state.peers.filter(p => p.id !== peerId),
        selectedPeer: state.selectedPeer?.id === peerId ? null : state.selectedPeer
    })),

    setPeerOnline: (peerId) => set((state) => ({
        peers: state.peers.map(p =>
            p.id === peerId ? { ...p, status: 'online' } : p
        )
    })),

    setPeerOffline: (peerId, lastSeen) => set((state) => ({
        peers: state.peers.map(p =>
            p.id === peerId ? { ...p, status: 'offline', last_seen: lastSeen } : p
        )
    })),

    selectPeer: (peer) => set({ selectedPeer: peer }),

    clearSelectedPeer: () => set({ selectedPeer: null }),

    // Move peer to top of list and optionally update last message
    movePeerToTop: (peerId, lastMessage = null, senderId = null, messageType = 'text', messageStatus = 'sent') => set((state) => {
        const peerIndex = state.peers.findIndex(p => p.id === peerId);
        if (peerIndex === -1) return state;

        let peer = { ...state.peers[peerIndex] };

        // Update last message if provided
        if (lastMessage) {
            peer.last_message = lastMessage;
            peer.last_message_sender = senderId;
            peer.last_message_type = messageType;
            peer.last_message_status = messageStatus;
            peer.last_chat_time = new Date().toISOString();
        }

        // If already at top, just update the message
        if (peerIndex === 0) {
            const newPeers = [...state.peers];
            newPeers[0] = peer;
            return { peers: newPeers };
        }

        // Move to top
        const newPeers = [
            peer,
            ...state.peers.slice(0, peerIndex),
            ...state.peers.slice(peerIndex + 1)
        ];

        return { peers: newPeers };
    }),

    // Update last message status for a peer (for real-time delivery/read updates)
    updatePeerMessageStatus: (peerId, status) => set((state) => {
        const peerIndex = state.peers.findIndex(p => p.id === peerId);
        if (peerIndex === -1) return state;

        const newPeers = [...state.peers];
        newPeers[peerIndex] = {
            ...newPeers[peerIndex],
            last_message_status: status
        };
        return { peers: newPeers };
    }),

    // Getters
    getOnlinePeers: () => get().peers.filter(p => p.status === 'online'),

    getOfflinePeers: () => get().peers.filter(p => p.status === 'offline'),

    getPeerById: (id) => get().peers.find(p => p.id === id),

    // ==========================================
    // Unread Count Management
    // ==========================================

    // Increment unread count for a peer
    incrementUnread: (peerId) => set((state) => ({
        peers: state.peers.map(p =>
            p.id === peerId ? { ...p, unreadCount: (p.unreadCount || 0) + 1 } : p
        )
    })),

    // Reset unread count for a peer (when chat is opened)
    resetUnread: (peerId) => set((state) => ({
        peers: state.peers.map(p =>
            p.id === peerId ? { ...p, unreadCount: 0 } : p
        )
    })),

    // Get total unread count across all peers
    getTotalUnread: () => get().peers.reduce((sum, p) => sum + (p.unreadCount || 0), 0)
}));

export default usePeerStore;
