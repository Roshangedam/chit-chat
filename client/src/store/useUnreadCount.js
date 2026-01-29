/**
 * useUnreadCount Hook
 * Provides total unread count - reusable across components
 * 
 * Usage in components:
 *   const totalUnread = useUnreadCount();
 * 
 * Usage in Electron main process (listen to event):
 *   window.addEventListener('unread-count-changed', (e) => {
 *     ipcRenderer.send('update-badge', e.detail.count);
 *   });
 * 
 * Usage in React Native:
 *   DeviceEventEmitter.addListener('unread-count-changed', (data) => {
 *     // Update app badge
 *   });
 */

import { useEffect, useState } from 'react';
import usePeerStore from './peerStore';

/**
 * Hook to get total unread count with auto-updates
 */
export function useUnreadCount() {
    const peers = usePeerStore((state) => state.peers);

    // Calculate total from all peers
    const totalUnread = peers.reduce((sum, peer) => sum + (peer.unreadCount || 0), 0);

    return totalUnread;
}

/**
 * Hook to get unread count for a specific peer
 */
export function usePeerUnreadCount(peerId) {
    const peers = usePeerStore((state) => state.peers);
    const peer = peers.find(p => p.id === peerId);
    return peer?.unreadCount || 0;
}

/**
 * Utility function to update document title (can be called from anywhere)
 */
export function updateDocumentTitle(count) {
    const baseTitle = 'ChitChat';
    if (count > 0) {
        document.title = `(${count}) ${baseTitle}`;
    } else {
        document.title = baseTitle;
    }
}

/**
 * Utility to dispatch unread count event (for Electron/Mobile)
 */
export function notifyUnreadCountChanged(count) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unread-count-changed', {
            detail: { count }
        }));
    }
}

export default useUnreadCount;
