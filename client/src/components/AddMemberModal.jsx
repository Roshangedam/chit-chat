/**
 * AddMemberModal Component
 * Modal for adding members to a group (Admin/Creator only)
 */

import { useState, useEffect } from 'react';
import usePeerStore from '../store/peerStore';
import socket from '../socket';
import './AddMemberModal.css';

function AddMemberModal({ group, existingMemberIds, onClose, onMemberAdded }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');

    const peers = usePeerStore((state) => state.peers);

    // Filter peers to exclude existing members
    const availablePeers = peers.filter(peer =>
        !existingMemberIds.includes(peer.id) &&
        (peer.custom_name || peer.name || peer.id)
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAddMembers = () => {
        if (selectedUsers.length === 0) {
            setError('Please select at least one member');
            return;
        }

        setIsAdding(true);
        setError('');

        // Add members one by one
        let addedCount = 0;
        let failedCount = 0;

        selectedUsers.forEach(userId => {
            socket.emit('group:addMember', {
                groupId: group.id,
                userId: userId
            }, (response) => {
                if (response?.success) {
                    addedCount++;
                } else {
                    failedCount++;
                }

                // Check if all done
                if (addedCount + failedCount === selectedUsers.length) {
                    setIsAdding(false);
                    if (addedCount > 0) {
                        onMemberAdded?.(addedCount);
                        onClose();
                    } else {
                        setError('Failed to add members');
                    }
                }
            });
        });
    };

    const handleClose = () => {
        setSelectedUsers([]);
        setSearchQuery('');
        setError('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="add-member-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Members</h2>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                            autoFocus
                        />
                    </div>

                    {selectedUsers.length > 0 && (
                        <div className="selected-count">
                            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                        </div>
                    )}

                    <div className="users-list">
                        {availablePeers.length === 0 ? (
                            <div className="no-users">
                                {searchQuery ? 'No matching contacts found' : 'All contacts are already members'}
                            </div>
                        ) : (
                            availablePeers.map(peer => (
                                <div
                                    key={peer.id}
                                    className={`user-item ${selectedUsers.includes(peer.id) ? 'selected' : ''}`}
                                    onClick={() => toggleUser(peer.id)}
                                >
                                    <div className="user-avatar">
                                        {peer.avatar ? (
                                            <img src={peer.avatar} alt="" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(peer.custom_name || peer.name || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className={`status-dot ${peer.status}`}></span>
                                    </div>
                                    <div className="user-info">
                                        <span className="user-name">{peer.custom_name || peer.name || peer.id}</span>
                                        <span className="user-status">{peer.status}</span>
                                    </div>
                                    <div className="user-checkbox">
                                        {selectedUsers.includes(peer.id) && '✓'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={handleClose} disabled={isAdding}>
                        Cancel
                    </button>
                    <button
                        className="add-btn"
                        onClick={handleAddMembers}
                        disabled={isAdding || selectedUsers.length === 0}
                    >
                        {isAdding ? 'Adding...' : `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} Member${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddMemberModal;
