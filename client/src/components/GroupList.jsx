/**
 * GroupList Component
 * Displays list of groups for the Groups tab in Sidebar
 * Includes Create Group button
 */

import { useState, useEffect } from 'react';
import useGroupStore from '../store/groupStore';
import usePeerStore from '../store/peerStore';
import socket from '../socket';
import CreateGroupModal from './CreateGroupModal';
import './GroupList.css';

function GroupList() {
    const groups = useGroupStore((state) => state.groups);
    const selectedGroup = useGroupStore((state) => state.selectedGroup);
    const selectGroup = useGroupStore((state) => state.selectGroup);
    const clearUnread = useGroupStore((state) => state.clearUnread);
    const clearSelectedPeer = usePeerStore((state) => state.clearSelectedPeer);
    const getTypingUsers = useGroupStore((state) => state.getTypingUsers);

    const [showCreateGroup, setShowCreateGroup] = useState(false);

    // Fetch groups on mount
    useEffect(() => {
        socket.emit('group:getList', (response) => {
            if (response.success) {
                useGroupStore.getState().setGroups(response.groups || []);
            }
        });
    }, []);

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return '';
        let timestamp;
        if (lastSeen.includes('T')) {
            timestamp = new Date(lastSeen).getTime();
        } else {
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

    const handleSelectGroup = (group) => {
        clearSelectedPeer?.();
        selectGroup(group);
        if (group.unreadCount > 0) {
            clearUnread(group.id);
        }
    };

    const handleGroupCreated = (newGroup) => {
        setShowCreateGroup(false);
        if (newGroup) {
            useGroupStore.getState().addGroup(newGroup);
            handleSelectGroup(newGroup);
        }
    };

    // Sort groups by last activity
    const sortedGroups = [...groups].sort((a, b) => {
        const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : new Date(a.created_at).getTime();
        const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
    });

    return (
        <div className="group-list">
            <div className="group-list-header">
                <h3>👥 Groups</h3>
                <div className="header-actions">
                    <span className="group-count">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
                    <button className="new-group-btn" onClick={() => setShowCreateGroup(true)} title="Create Group">
                        ➕
                    </button>
                </div>
            </div>

            <div className="groups-container">
                {sortedGroups.length > 0 ? (
                    sortedGroups.map((group) => (
                        <div
                            key={group.id}
                            className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                            onClick={() => handleSelectGroup(group)}
                        >
                            <div className="group-avatar-wrapper">
                                {group.avatar ? (
                                    <img src={group.avatar} alt="" className="group-avatar" />
                                ) : (
                                    <div className="group-avatar-placeholder">
                                        {group.name?.[0]?.toUpperCase() || '👥'}
                                    </div>
                                )}
                            </div>
                            <div className="group-info">
                                <div className="group-header">
                                    <span className="name">{group.name}</span>
                                    <div className="group-header-right">
                                        {group.unreadCount > 0 && (
                                            <span className="unread-badge">{group.unreadCount > 99 ? '99+' : group.unreadCount}</span>
                                        )}
                                        {group.last_message_time && (
                                            <span className="last-time">{formatLastSeen(group.last_message_time)}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="last-message">
                                    {getTypingUsers(group.id)?.length > 0 ? (
                                        <span className="typing-indicator-text">someone is typing...</span>
                                    ) : group.last_message ? (
                                        <span className="message-text">
                                            {group.last_message_sender && `${group.last_message_sender}: `}
                                            {group.last_message.length > 25 ? group.last_message.substring(0, 25) + '...' : group.last_message}
                                        </span>
                                    ) : (
                                        <span className="muted-text">{group.member_count || 0} members</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-groups">
                        <span className="emoji">👥</span>
                        <p>No groups yet</p>
                        <p className="hint">Create a group to start chatting!</p>
                        <button className="create-first-group-btn" onClick={() => setShowCreateGroup(true)}>
                            ➕ Create Group
                        </button>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </div>
    );
}

export default GroupList;
