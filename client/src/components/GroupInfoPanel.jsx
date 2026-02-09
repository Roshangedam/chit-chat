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
import AddMemberModal from './AddMemberModal';
import GroupSettingsModal from './GroupSettingsModal';
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
    const [showAddMember, setShowAddMember] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [memberMenu, setMemberMenu] = useState(null); // { userId, x, y }
    const [actionLoading, setActionLoading] = useState(null);

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

    // Existing member IDs for AddMemberModal
    const existingMemberIds = members.map(m => m.user_id);

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

    // Helper: Refresh members list after any action
    const refreshMembers = useCallback(() => {
        socket.emit('group:getDetails', { groupId: group.id }, (response) => {
            if (response?.success && response.members) {
                onMembersUpdate?.(response.members);
            }
        });
    }, [group.id, onMembersUpdate]);

    // Handle remove member
    const handleRemoveMember = (userId) => {
        setActionLoading(userId);
        socket.emit('group:removeMember', { groupId: group.id, userId }, (response) => {
            setActionLoading(null);
            setMemberMenu(null);
            if (response?.success) {
                refreshMembers();
            } else {
                alert(response?.error || 'Failed to remove member');
            }
        });
    };

    // Handle promote to admin
    const handlePromoteToAdmin = (userId) => {
        setActionLoading(userId);
        socket.emit('group:updateRole', { groupId: group.id, userId, role: 'admin' }, (response) => {
            setActionLoading(null);
            setMemberMenu(null);
            if (response?.success) {
                refreshMembers();
            } else {
                alert(response?.error || 'Failed to promote member');
            }
        });
    };

    // Handle demote from admin
    const handleDemoteFromAdmin = (userId) => {
        setActionLoading(userId);
        socket.emit('group:updateRole', { groupId: group.id, userId, role: 'member' }, (response) => {
            setActionLoading(null);
            setMemberMenu(null);
            if (response?.success) {
                refreshMembers();
            } else {
                alert(response?.error || 'Failed to demote admin');
            }
        });
    };

    // Close member menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setMemberMenu(null);
        if (memberMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [memberMenu]);

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

    // Check if current user can manage a member
    const canManageMember = (member) => {
        if (!isAdmin) return false;
        if (member.user_id === currentUser?.id) return false;
        if (member.role === 'creator') return false;
        if (member.role === 'admin' && !isCreator) return false;
        return true;
    };

    // Handle member right-click or long-press
    const handleMemberAction = (e, member) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canManageMember(member)) return;

        // Calculate position - keep menu within viewport
        const menuWidth = 180;
        const menuHeight = 100;
        let x = e.clientX;
        let y = e.clientY;

        // Adjust if menu would go off right edge
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 20;
        }

        // Adjust if menu would go off bottom edge
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 20;
        }

        setMemberMenu({
            userId: member.user_id,
            role: member.role,
            x,
            y
        });
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
                {isAdmin && (
                    <button className="settings-btn" onClick={() => setShowSettings(true)} title="Group Settings">
                        ⚙️
                    </button>
                )}
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
                    <div className="members-section">
                        {/* Add Member Button (Admin only) */}
                        {isAdmin && (
                            <button
                                className="add-member-btn"
                                onClick={() => setShowAddMember(true)}
                            >
                                ➕ Add Member
                            </button>
                        )}

                        <div className="members-list">
                            {sortedMembers.map(member => {
                                const userInfo = getUserInfo(member);
                                const isMe = member.user_id === currentUser?.id;
                                const canManage = canManageMember(member);

                                return (
                                    <div
                                        key={member.user_id}
                                        className={`member-item ${isMe ? 'is-me' : ''} ${canManage ? 'manageable' : ''}`}
                                        onContextMenu={(e) => handleMemberAction(e, member)}
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
                                        {canManage && (
                                            <span
                                                className="member-menu-trigger"
                                                onClick={(e) => handleMemberAction(e, member)}
                                            >⋮</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="media-section">
                        <p className="empty-text">No shared media yet</p>
                    </div>
                )}
            </div>

            {/* Member Context Menu */}
            {memberMenu && (
                <div
                    className="member-context-menu"
                    style={{ top: memberMenu.y, left: memberMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {memberMenu.role === 'admin' ? (
                        <button
                            className="menu-item"
                            onClick={() => handleDemoteFromAdmin(memberMenu.userId)}
                            disabled={actionLoading === memberMenu.userId}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 19V5M5 12l7 7 7-7" />
                            </svg>
                            Dismiss Admin
                        </button>
                    ) : (
                        <button
                            className="menu-item"
                            onClick={() => handlePromoteToAdmin(memberMenu.userId)}
                            disabled={actionLoading === memberMenu.userId}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12l7-7 7 7" />
                            </svg>
                            Make Admin
                        </button>
                    )}
                    <button
                        className="menu-item danger"
                        onClick={() => handleRemoveMember(memberMenu.userId)}
                        disabled={actionLoading === memberMenu.userId}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Remove from Group
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="panel-actions">
                {/* Leave Group */}
                {!confirmLeave ? (
                    <button
                        className="action-btn leave-btn"
                        onClick={() => setConfirmLeave(true)}
                        disabled={loading}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Leave Group
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                            Delete Group
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

            {/* Add Member Modal */}
            {showAddMember && (
                <AddMemberModal
                    group={group}
                    existingMemberIds={existingMemberIds}
                    onClose={() => setShowAddMember(false)}
                    onMemberAdded={(count) => {
                        refreshMembers();
                        setShowAddMember(false);
                    }}
                />
            )}

            {/* Group Settings Modal */}
            {showSettings && (
                <GroupSettingsModal
                    group={group}
                    isCreator={isCreator}
                    onClose={() => setShowSettings(false)}
                    onUpdate={() => {
                        refreshMembers();
                        setShowSettings(false);
                    }}
                />
            )}
        </div>
    );
}

export default GroupInfoPanel;

