/**
 * Create Group Modal
 * Modal for creating new groups
 */

import { useState } from 'react';
import usePeerStore from '../store/peerStore';
import socket from '../socket';
import './CreateGroupModal.css';

function CreateGroupModal({ isOpen = true, onClose, onGroupCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const peers = usePeerStore((state) => state.peers);

    const filteredPeers = peers.filter(peer =>
        (peer.custom_name || peer.name || peer.id)
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    const toggleMember = (peerId) => {
        setSelectedMembers(prev =>
            prev.includes(peerId)
                ? prev.filter(id => id !== peerId)
                : [...prev, peerId]
        );
    };

    const handleCreate = () => {
        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setIsCreating(true);
        setError('');

        socket.emit('group:create', {
            name: name.trim(),
            description: description.trim() || null,
            memberIds: selectedMembers,
            type: 'group'
        }, (response) => {
            setIsCreating(false);

            if (response.success) {
                // Reset form and close
                setName('');
                setDescription('');
                setSelectedMembers([]);
                setSearchQuery('');
                if (onGroupCreated) {
                    onGroupCreated(response.group);
                } else {
                    onClose();
                }
            } else {
                setError(response.error || 'Failed to create group');
            }
        });
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setSelectedMembers([]);
        setSearchQuery('');
        setError('');
        onClose();
    };

    // Don't render if isOpen is explicitly false
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="create-group-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Group</h2>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Group Name *</label>
                        <input
                            type="text"
                            placeholder="Enter group name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Description (optional)</label>
                        <textarea
                            placeholder="What's this group about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                            rows={2}
                        />
                    </div>

                    <div className="form-group">
                        <label>Add Members ({selectedMembers.length} selected)</label>
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="members-list">
                        {filteredPeers.length === 0 ? (
                            <div className="no-peers">No contacts found</div>
                        ) : (
                            filteredPeers.map(peer => (
                                <div
                                    key={peer.id}
                                    className={`member-item ${selectedMembers.includes(peer.id) ? 'selected' : ''}`}
                                    onClick={() => toggleMember(peer.id)}
                                >
                                    <div className="member-avatar">
                                        {peer.avatar ? (
                                            <img src={peer.avatar} alt="" />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(peer.custom_name || peer.name || '?')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <span className={`status-dot ${peer.status}`}></span>
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{peer.custom_name || peer.name || peer.id}</span>
                                        <span className="member-status">{peer.status}</span>
                                    </div>
                                    <div className="member-checkbox">
                                        {selectedMembers.includes(peer.id) ? '✓' : ''}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={handleClose} disabled={isCreating}>
                        Cancel
                    </button>
                    <button
                        className="create-btn"
                        onClick={handleCreate}
                        disabled={isCreating || !name.trim()}
                    >
                        {isCreating ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateGroupModal;
