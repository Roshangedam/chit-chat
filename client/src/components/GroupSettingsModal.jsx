/**
 * GroupSettingsModal Component
 * Modal for editing group settings (Admin/Creator only)
 */

import { useState } from 'react';
import socket from '../socket';
import './GroupSettingsModal.css';

function GroupSettingsModal({ group, isCreator, onClose, onUpdate }) {
    const [name, setName] = useState(group.name || '');
    const [description, setDescription] = useState(group.description || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Settings (for creator only)
    const [settings, setSettings] = useState({
        onlyAdminsCanPost: group.settings?.only_admins_can_post || false,
        onlyAdminsCanAddMembers: group.settings?.only_admins_can_add_members || false,
        isLocked: group.settings?.is_locked || false
    });

    const handleSave = () => {
        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setIsSaving(true);
        setError('');

        // Update group info
        socket.emit('group:update', {
            groupId: group.id,
            name: name.trim(),
            description: description.trim() || null
        }, (response) => {
            if (!response?.success) {
                setIsSaving(false);
                setError(response?.error || 'Failed to update group');
                return;
            }

            // If creator, also update settings
            if (isCreator) {
                socket.emit('group:updateSettings', {
                    groupId: group.id,
                    settings: {
                        only_admins_can_post: settings.onlyAdminsCanPost,
                        only_admins_can_add_members: settings.onlyAdminsCanAddMembers,
                        is_locked: settings.isLocked
                    }
                }, (settingsResponse) => {
                    setIsSaving(false);
                    if (settingsResponse?.success) {
                        onUpdate?.();
                        onClose();
                    } else {
                        setError(settingsResponse?.error || 'Failed to update settings');
                    }
                });
            } else {
                setIsSaving(false);
                onUpdate?.();
                onClose();
            }
        });
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="group-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚙️ Group Settings</h2>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-section">
                        <h3>Group Info</h3>

                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                placeholder="Enter group name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={50}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                placeholder="What's this group about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={200}
                                rows={3}
                            />
                        </div>
                    </div>

                    {isCreator && (
                        <div className="form-section">
                            <h3>Permissions</h3>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <span className="setting-label">Only admins can post</span>
                                    <span className="setting-desc">Only admins and creator can send messages</span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.onlyAdminsCanPost}
                                        onChange={(e) => setSettings({ ...settings, onlyAdminsCanPost: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <span className="setting-label">Only admins can add members</span>
                                    <span className="setting-desc">Restrict who can add new members</span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.onlyAdminsCanAddMembers}
                                        onChange={(e) => setSettings({ ...settings, onlyAdminsCanAddMembers: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <span className="setting-label">Lock group</span>
                                    <span className="setting-desc">Only admins can send messages when locked</span>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.isLocked}
                                        onChange={(e) => setSettings({ ...settings, isLocked: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={handleClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GroupSettingsModal;
