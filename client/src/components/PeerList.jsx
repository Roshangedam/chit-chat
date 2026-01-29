/**
 * PeerList Component
 * Displays list of online/offline users with filter tabs
 */

import { useState } from 'react';
import usePeerStore from '../store/peerStore';
import useUserStore from '../store/userStore';
import useMessageStore from '../store/messageStore';
import GlobalSearch from './GlobalSearch';
import UserAvatar from './UserAvatar';
import ProfileInfoModal from './ProfileInfoModal';
import { updateFaviconBadge } from '../utils/faviconBadge';
import './PeerList.css';

function PeerList() {
    const peers = usePeerStore((state) => state.peers);
    const selectedPeer = usePeerStore((state) => state.selectedPeer);
    const selectPeer = usePeerStore((state) => state.selectPeer);
    const resetUnread = usePeerStore((state) => state.resetUnread);
    const currentUser = useUserStore((state) => state.currentUser);
    const typingUsers = useMessageStore((state) => state.typingUsers);

    // Filter state: 'all', 'online', 'offline'
    const [filter, setFilter] = useState('all');

    // Profile info modal state
    const [profileUser, setProfileUser] = useState(null);

    // Separate online and offline peers
    const onlinePeers = peers.filter(p => p.status === 'online');
    const offlinePeers = peers.filter(p => p.status !== 'online');

    // Get filtered peers based on current filter
    const getFilteredPeers = () => {
        switch (filter) {
            case 'online':
                return onlinePeers;
            case 'offline':
                return offlinePeers;
            default:
                return peers;
        }
    };

    const filteredPeers = getFilteredPeers();

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'recently';

        // Handle both ISO and SQLite datetime formats
        let timestamp;
        if (lastSeen.includes('T')) {
            timestamp = new Date(lastSeen).getTime();
        } else {
            // SQLite format: "YYYY-MM-DD HH:MM:SS"
            timestamp = new Date(lastSeen.replace(' ', 'T') + 'Z').getTime();
        }

        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Get label for media message types
    const getMediaLabel = (type) => {
        switch (type) {
            case 'gif': return '🎞️ GIF';
            case 'sticker': return '🏷️ Sticker';
            case 'image': return '📷 Image';
            case 'video': return '🎬 Video';
            case 'audio': return '🎵 Audio';
            case 'file': return '📎 File';
            default: return null;
        }
    };

    const handleSelectPeer = (peer) => {
        selectPeer(peer);
        // Reset unread count when chat is opened
        if (peer.unreadCount > 0) {
            resetUnread(peer.id);
            // Update browser title and favicon
            setTimeout(() => {
                const totalUnread = usePeerStore.getState().getTotalUnread();
                document.title = totalUnread > 0 ? `(${totalUnread}) ChitChat` : 'ChitChat';
                updateFaviconBadge(totalUnread);
                // Dispatch event for Electron/Mobile
                window.dispatchEvent(new CustomEvent('unread-count-changed', {
                    detail: { count: totalUnread }
                }));
            }, 0);
        }
    };

    // Get status icon for message status (WhatsApp style with SVG)
    const getStatusIcon = (status) => {
        const singleCheck = (
            <svg className="status-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4,8 7,11 12,5" />
            </svg>
        );
        const doubleCheck = (
            <svg className="status-icon double" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1,8 4,11 9,5" />
                <polyline points="6,8 9,11 14,5" />
            </svg>
        );

        switch (status) {
            case 'sending': return <span className="status-tick sending">⏳</span>;
            case 'sent': return <span className="status-tick sent">{singleCheck}</span>;
            case 'delivered': return <span className="status-tick delivered">{doubleCheck}</span>;
            case 'read': return <span className="status-tick read">{doubleCheck}</span>;
            default: return <span className="status-tick sent">{singleCheck}</span>;
        }
    };

    return (
        <div className="peer-list">
            <div className="peer-list-header">
                <h3>💬 Chats</h3>
                <span className="online-count">{onlinePeers.length} online</span>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({peers.length})
                </button>
                <button
                    className={`filter-tab ${filter === 'online' ? 'active' : ''}`}
                    onClick={() => setFilter('online')}
                >
                    Online ({onlinePeers.length})
                </button>
                <button
                    className={`filter-tab ${filter === 'offline' ? 'active' : ''}`}
                    onClick={() => setFilter('offline')}
                >
                    Offline ({offlinePeers.length})
                </button>
            </div>

            {/* Global Search */}
            <GlobalSearch />

            {/* Filtered Peers List */}
            <div className="peers-container">
                {filteredPeers.length > 0 ? (
                    filteredPeers.map((peer) => (
                        <div
                            key={peer.id}
                            className={`peer-item ${selectedPeer?.id === peer.id ? 'selected' : ''}`}
                            onClick={() => handleSelectPeer(peer)}
                        >
                            <UserAvatar user={peer} size="medium" onClick={(user) => { setProfileUser(user); }} />
                            <div className="peer-info">
                                <div className="peer-header">
                                    <span className="name">{peer.name}</span>
                                    <div className="peer-header-right">
                                        {peer.unreadCount > 0 && (
                                            <span className="unread-badge">{peer.unreadCount > 99 ? '99+' : peer.unreadCount}</span>
                                        )}
                                        {peer.last_chat_time && (
                                            <span className="last-time">{formatLastSeen(peer.last_chat_time)}</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`last-message ${typingUsers[peer.id] ? 'typing' : ''}`}>
                                    {typingUsers[peer.id] ? (
                                        <span className="typing-indicator-text">typing...</span>
                                    ) : peer.last_message_deleted === 1 ? (
                                        <span className="deleted-indicator">🚫 Message was deleted</span>
                                    ) : peer.last_message ? (
                                        <>
                                            {peer.last_message_sender === currentUser?.id && (
                                                <span className="status-wrapper">{getStatusIcon(peer.last_message_status)}</span>
                                            )}
                                            <span className="message-text">
                                                {getMediaLabel(peer.last_message_type) ? (
                                                    <span className="media-label">{getMediaLabel(peer.last_message_type)}</span>
                                                ) : (
                                                    peer.last_message.length > 30 ? peer.last_message.substring(0, 30) + '...' : peer.last_message
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className={peer.status === 'online' ? 'online-text' : ''}>
                                            {peer.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(peer.last_seen)}`}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-filter">
                        <p>No {filter === 'all' ? '' : filter} users</p>
                    </div>
                )}
            </div>

            {/* Profile Info Modal */}
            {profileUser && (
                <ProfileInfoModal
                    user={profileUser}
                    onClose={() => setProfileUser(null)}
                    onSelectPeer={(user) => {
                        handleSelectPeer(user);
                        setProfileUser(null);
                    }}
                />
            )}
        </div>
    );
}

export default PeerList;
