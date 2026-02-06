/**
 * GroupInfoPanel Component
 * Displays group information, member list, and management options
 */

import { useState, useEffect, useCallback } from 'react';
import useGroupStore from '../store/groupStore';
import useUserStore from '../store/userStore';
import usePeerStore from '../store/peerStore';
import socket from '../socket';
import UserAvatar from './UserAvatar';
import './GroupInfoPanel.css';

function GroupInfoPanel({ group, onClose, members, onMembersUpdate }) {
    const currentUser = useUserStore((state) => state.currentUser);
    const peers = usePeerStore((state) => state.peers);
    const removeGroup = useGroupStore((state) => state.removeGroup);
    const clearSelectedGroup = useGroupStore((state) => state.clearSelectedGroup);

    const [loading, setLoading] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [activeTab, setActiveTab] = useState('members');

    // Get current user's role
    const myMember = members.find(m => m.user_id === currentUser?.id);
    const myRole = myMember?.role || 'member';
    const isCreator = myRole === 'creator';
    const isAdmin = myRole === 'admin' || myRole === 'creator';

    // Sort members: creator first, then admins, then members
    const sortedMembers = [...members].sort((a, b) => {
        const roleOrder = { creator: 0, admin: 1, member: 2 };
        return (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2);
    });

    // Get user info for a member
    const getUserInfo = (member) => {
        const peer = peers.find(p => p.id === member.user_id);
        return {
            name: member.custom_name || member.name || peer?.custom_name || peer?.name || member.user_id,
            avatar: member.avatar || peer?.avatar,
            isOnline: peer?.status === 'online'
        };
    };

    // Handle leave group
    const handleLeaveGroup = useCallback(() => {
        setLoading(true);
        socket.emit('group:leave', { groupId: group.id }, (response) => {
            setLoading(false);
            if (response?.success) {
                removeGroup(group.id);
                clearSelectedGroup();
                onClose();
            } else {
                alert(response?.error || 'Failed to leave group');
            }
        });
    }, [group.id, removeGroup, clearSelectedGroup, onClose]);

    // Handle delete group (creator only)
    const handleDeleteGroup = useCallback(() => {
        setLoading(true);
        socket.emit('group:delete', { groupId: group.id }, (response) => {
            setLoading(false);
            if (response?.success) {
                removeGroup(group.id);
                clearSelectedGroup();
                onClose();
            } else {
                alert(response?.error || 'Failed to delete group');
            }
        });
    }, [group.id, removeGroup, clearSelectedGroup, onClose]);

    // Get role badge
    const getRoleBadge = (role) => {
        switch (role) {
            case 'creator':
                return <span className="role-badge creator">👑 Creator</span>;
            case 'admin':
                return <span className="role-badge admin">⭐ Admin</span>;
            default:
                return null;
        }
    };

    return (
        <div className="group-info-panel">
            {/* Header */}
            <div className="panel-header">
                <button className="close-btn" onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <h3>Group Info</h3>
            </div>

            {/* Group Info Section */}
            <div className="group-info-section">
                <div className="group-avatar-large">
                    {group.avatar ? (
                        <img src={group.avatar} alt={group.name} />
                    ) : (
                        <div className="avatar-placeholder">
                            {group.name?.[0]?.toUpperCase() || '👥'}
                        </div>
                    )}
                </div>
                <h2 className="group-name">{group.name}</h2>
                {group.description && (
                    <p className="group-description">{group.description}</p>
                )}
                <span className="member-count">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tabs */}
            <div className="panel-tabs">
                <button
                    className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    Members
                </button>
                <button
                    className={`tab ${activeTab === 'media' ? 'active' : ''}`}
                    onClick={() => setActiveTab('media')}
                >
                    Media
                </button>
            </div>

            {/* Tab Content */}
            <div className="panel-content">
                {activeTab === 'members' && (
                    <div className="members-list">
                        {sortedMembers.map(member => {
                            const userInfo = getUserInfo(member);
                            const isMe = member.user_id === currentUser?.id;

                            return (
                                <div
                                    key={member.user_id}
                                    className={`member-item ${isMe ? 'is-me' : ''}`}
                                >
                                    <div className="member-avatar">
                                        {userInfo.avatar ? (
                                            <img src={userInfo.avatar} alt="" />
                                        ) : (
                                            <div className="avatar-placeholder-small">
                                                {userInfo.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                        {userInfo.isOnline && <span className="online-dot" />}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">
                                            {userInfo.name}
                                            {isMe && <span className="you-badge"> (You)</span>}
                                        </span>
                                        {getRoleBadge(member.role)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="media-section">
                        <p className="empty-text">No shared media yet</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="panel-actions">
                {/* Leave Group */}
                {!confirmLeave ? (
                    <button
                        className="action-btn leave-btn"
                        onClick={() => setConfirmLeave(true)}
                        disabled={loading}
                    >
                        🚪 Leave Group
                    </button>
                ) : (
                    <div className="confirm-action">
                        <span>Leave this group?</span>
                        <div className="confirm-buttons">
                            <button
                                className="confirm-yes"
                                onClick={handleLeaveGroup}
                                disabled={loading}
                            >
                                {loading ? '...' : 'Yes, Leave'}
                            </button>
                            <button
                                className="confirm-no"
                                onClick={() => setConfirmLeave(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete Group (Creator Only) */}
                {isCreator && (
                    !confirmDelete ? (
                        <button
                            className="action-btn delete-btn"
                            onClick={() => setConfirmDelete(true)}
                            disabled={loading}
                        >
                            🗑️ Delete Group
                        </button>
                    ) : (
                        <div className="confirm-action danger">
                            <span>Delete this group permanently?</span>
                            <div className="confirm-buttons">
                                <button
                                    className="confirm-yes danger"
                                    onClick={handleDeleteGroup}
                                    disabled={loading}
                                >
                                    {loading ? '...' : 'Yes, Delete'}
                                </button>
                                <button
                                    className="confirm-no"
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default GroupInfoPanel;
