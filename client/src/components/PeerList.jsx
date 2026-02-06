/**
 * PeerList Component
 * Displays unified list of chats (users + groups) sorted by recent activity
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import usePeerStore from '../store/peerStore';
import useUserStore from '../store/userStore';
import useMessageStore from '../store/messageStore';
import useGroupStore from '../store/groupStore';
import GlobalSearch from './GlobalSearch';
import UserAvatar from './UserAvatar';
import ProfileInfoModal from './ProfileInfoModal';
import CreateGroupModal from './CreateGroupModal';
import socket from '../socket';
import { updateFaviconBadge } from '../utils/faviconBadge';
import './PeerList.css';

function PeerList() {
    // Peer store - use individual selectors
    const peers = usePeerStore((state) => state.peers);
    const selectedPeer = usePeerStore((state) => state.selectedPeer);
    const selectPeer = usePeerStore((state) => state.selectPeer);
    const resetUnread = usePeerStore((state) => state.resetUnread);
    const clearSelectedPeer = usePeerStore((state) => state.clearSelectedPeer);

    const currentUser = useUserStore((state) => state.currentUser);
    const typingUsers = useMessageStore((state) => state.typingUsers);

    // Group store - use individual selectors
    const groups = useGroupStore((state) => state.groups);
    const selectedGroup = useGroupStore((state) => state.selectedGroup);
    const selectGroup = useGroupStore((state) => state.selectGroup);
    const clearUnreadGroup = useGroupStore((state) => state.clearUnread);
    const clearSelectedGroup = useGroupStore((state) => state.clearSelectedGroup);

    // Get typing users for groups - subscribe to typingUsers state directly for reactivity
    const groupTypingUsers = useGroupStore((state) => state.typingUsers);


    // Filter state: 'all', 'online', 'offline', 'groups'
    const [filter, setFilter] = useState('all');

    // Profile info modal state
    const [profileUser, setProfileUser] = useState(null);

    // Create group modal state
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    // Fetch groups on mount
    useEffect(() => {
        socket.emit('group:getList', (response) => {
            if (response.success) {
                useGroupStore.getState().setGroups(response.groups || []);
            }
        });
    }, []);

    // Separate online and offline peers
    const onlinePeers = peers.filter(p => p.status === 'online');
    const offlinePeers = peers.filter(p => p.status !== 'online');

    // Create unified chat list
    const unifiedList = useMemo(() => {
        // Add isGroup flag to groups
        const groupItems = groups.map(g => ({
            ...g,
            isGroup: true,
            name: g.name,
            last_message_time: g.last_message_time || g.created_at,
            unreadCount: g.unreadCount || 0
        }));

        // Add isGroup: false to peers
        const peerItems = peers.map(p => ({
            ...p,
            isGroup: false,
            last_message_time: p.last_chat_time || p.last_seen
        }));

        // Combine and sort by last_message_time (most recent first)
        return [...groupItems, ...peerItems].sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
            return timeB - timeA;
        });
    }, [groups, peers]);

    // Get filtered items based on current filter
    const getFilteredItems = () => {
        switch (filter) {
            case 'online':
                // Only online peers (no groups)
                return onlinePeers;
            case 'offline':
                // Only offline peers (no groups)
                return offlinePeers;
            default:
                // All = unified list (peers + groups) sorted by last activity
                return unifiedList;
        }
    };

    const filteredItems = getFilteredItems();

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

    const handleSelectItem = (item) => {
        if (item.isGroup) {
            // Select group
            clearSelectedPeer?.();
            selectGroup(item);
            if (item.unreadCount > 0) {
                clearUnreadGroup(item.id);
                updateTitleAndFavicon();
            }
        } else {
            // Select peer
            clearSelectedGroup?.();
            selectPeer(item);
            if (item.unreadCount > 0) {
                resetUnread(item.id);
                updateTitleAndFavicon();
            }
        }
    };

    const updateTitleAndFavicon = () => {
        setTimeout(() => {
            const peerUnread = usePeerStore.getState().getTotalUnread();
            const groupUnread = useGroupStore.getState().getTotalUnreadCount();
            const totalUnread = peerUnread + groupUnread;
            document.title = totalUnread > 0 ? `(${totalUnread}) ChitChat` : 'ChitChat';
            updateFaviconBadge(totalUnread);
            window.dispatchEvent(new CustomEvent('unread-count-changed', {
                detail: { count: totalUnread }
            }));
        }, 0);
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

    // Check if item is selected
    const isSelected = (item) => {
        if (item.isGroup) {
            return selectedGroup?.id === item.id;
        }
        return selectedPeer?.id === item.id;
    };

    // Handle group creation
    const handleGroupCreated = (newGroup) => {
        setShowCreateGroup(false);
        if (newGroup) {
            useGroupStore.getState().addGroup(newGroup);
            selectGroup(newGroup);
        }
    };

    return (
        <div className="peer-list">
            <div className="peer-list-header">
                <h3>💬 Chats</h3>
                <div className="header-actions">
                    <span className="online-count">{onlinePeers.length} online</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({unifiedList.length})
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

            {/* Unified Chat List */}
            <div className="peers-container">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <div
                            key={item.isGroup ? `group-${item.id}` : `peer-${item.id}`}
                            className={`peer-item ${isSelected(item) ? 'selected' : ''} ${item.isGroup ? 'group-item' : ''}`}
                            onClick={() => handleSelectItem(item)}
                        >
                            {item.isGroup ? (
                                // Group Avatar
                                <div className="group-avatar-wrapper">
                                    {item.avatar ? (
                                        <img src={item.avatar} alt="" className="group-avatar" />
                                    ) : (
                                        <div className="group-avatar-placeholder">
                                            {item.name?.[0]?.toUpperCase() || '👥'}
                                        </div>
                                    )}
                                    <span className="group-indicator">👥</span>
                                </div>
                            ) : (
                                <UserAvatar user={item} size="medium" onClick={(user) => { setProfileUser(user); }} />
                            )}
                            <div className="peer-info">
                                <div className="peer-header">
                                    <span className="name">
                                        {item.isGroup ? item.name : (item.custom_name || item.name || item.id)}
                                    </span>
                                    <div className="peer-header-right">
                                        {item.unreadCount > 0 && (
                                            <span className="unread-badge">{item.unreadCount > 99 ? '99+' : item.unreadCount}</span>
                                        )}
                                        {item.last_message_time && (
                                            <span className="last-time">{formatLastSeen(item.last_message_time)}</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`last-message ${(item.isGroup ? (groupTypingUsers[item.id]?.length > 0) : typingUsers[item.id]) ? 'typing' : ''}`}>
                                    {item.isGroup ? (
                                        // Group last message
                                        groupTypingUsers[item.id]?.length > 0 ? (
                                            <span className="typing-indicator-text">
                                                {groupTypingUsers[item.id].map(t => t.userName).join(', ')} typing...
                                            </span>
                                        ) : item.last_message ? (
                                            <>
                                                <span className="message-text">
                                                    {item.last_message_sender && `${item.last_message_sender}: `}
                                                    {getMediaLabel(item.last_message_type) || (
                                                        item.last_message.length > 25 ? item.last_message.substring(0, 25) + '...' : item.last_message
                                                    )}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="muted-text">{item.member_count || 0} members</span>
                                        )
                                    ) : (
                                        // Peer last message
                                        typingUsers[item.id] ? (
                                            <span className="typing-indicator-text">typing...</span>
                                        ) : item.last_message_deleted === 1 ? (
                                            <span className="deleted-indicator">🚫 Message was deleted</span>
                                        ) : item.last_message ? (
                                            <>
                                                {item.last_message_sender === currentUser?.id && (
                                                    <span className="status-wrapper">{getStatusIcon(item.last_message_status)}</span>
                                                )}
                                                <span className="message-text">
                                                    {getMediaLabel(item.last_message_type) ? (
                                                        <span className="media-label">{getMediaLabel(item.last_message_type)}</span>
                                                    ) : (
                                                        item.last_message.length > 30 ? item.last_message.substring(0, 30) + '...' : item.last_message
                                                    )}
                                                </span>
                                            </>
                                        ) : (
                                            <span className={item.status === 'online' ? 'online-text' : ''}>
                                                {item.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(item.last_seen)}`}
                                            </span>
                                        )
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-filter">
                        <p>No {filter === 'all' ? '' : filter} chats</p>
                    </div>
                )}
            </div>

            {/* Profile Info Modal */}
            {profileUser && (
                <ProfileInfoModal
                    user={profileUser}
                    onClose={() => setProfileUser(null)}
                    onSelectPeer={(user) => {
                        handleSelectItem(user);
                        setProfileUser(null);
                    }}
                />
            )}

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={showCreateGroup}
                onClose={handleGroupCreated}
            />
        </div>
    );
}

export default PeerList;

