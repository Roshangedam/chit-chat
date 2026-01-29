/**
 * Profile Settings Component
 */

import { useState, useRef, useEffect } from 'react';
import { User, Camera, Trash2, Check, Save } from 'lucide-react';
import useUserStore from '../../store/userStore';
import socket from '../../socket';
import './ProfileSettings.css';

const STATUS_OPTIONS = [
    { value: 'Available', emoji: '🟢' },
    { value: 'Busy', emoji: '🔴' },
    { value: 'Away', emoji: '🟡' },
    { value: 'Do Not Disturb', emoji: '⛔' },
];

function ProfileSettings() {
    const { currentUser, setCurrentUser } = useUserStore();
    const fileInputRef = useRef(null);

    // Form state
    const [name, setName] = useState(currentUser?.name || currentUser?.custom_name || '');
    const [statusMessage, setStatusMessage] = useState(currentUser?.status_message || 'Available');
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [avatar, setAvatar] = useState(currentUser?.avatar || null);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Sync with current user
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || currentUser.custom_name || '');
            setStatusMessage(currentUser.status_message || 'Available');
            setBio(currentUser.bio || '');
            setAvatar(currentUser.avatar || null);
        }
    }, [currentUser]);

    // Listen for user updates
    useEffect(() => {
        const handleUserUpdated = (data) => {
            if (data.user && data.user.id === currentUser?.id) {
                setCurrentUser(data.user);
            }
        };

        socket.on('user:updated', handleUserUpdated);
        return () => socket.off('user:updated', handleUserUpdated);
    }, [currentUser, setCurrentUser]);

    // Get initials for avatar placeholder
    const getInitial = () => {
        if (name) return name.charAt(0).toUpperCase();
        return 'U';
    };

    // Handle avatar upload
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/api/upload/avatar', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setAvatar(data.file.url);
                // Update via socket
                socket.emit('user:updateAvatar', { avatarPath: data.file.url });
            } else {
                alert(data.error || 'Failed to upload avatar');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            alert('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle avatar remove
    const handleAvatarRemove = () => {
        setAvatar(null);
        socket.emit('user:updateAvatar', { avatarPath: null });
    };

    // Handle save
    const handleSave = () => {
        if (!name.trim()) {
            alert('Name cannot be empty');
            return;
        }

        setIsSaving(true);
        setShowSuccess(false);

        socket.emit('user:updateProfile', {
            name: name.trim(),
            statusMessage: statusMessage,
            bio: bio.trim()
        });

        // Show success after a short delay
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 500);
    };

    // Check if there are unsaved changes
    const hasChanges = () => {
        return (
            name !== (currentUser?.name || currentUser?.custom_name || '') ||
            statusMessage !== (currentUser?.status_message || 'Available') ||
            bio !== (currentUser?.bio || '')
        );
    };

    return (
        <div className="profile-settings">
            <h3 className="settings-section-title">
                <User /> Profile
            </h3>

            {/* Profile Photo */}
            <div className="profile-photo-section">
                <div className="profile-photo-preview">
                    {avatar ? (
                        <img src={avatar} alt="Profile" />
                    ) : (
                        <div className="avatar-placeholder">
                            {getInitial()}
                        </div>
                    )}
                </div>
                <div className="photo-actions">
                    <h4>Profile Photo</h4>
                    <div className="photo-buttons">
                        <button
                            className="photo-btn upload"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            <Camera />
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                        {avatar && (
                            <button
                                className="photo-btn remove"
                                onClick={handleAvatarRemove}
                            >
                                <Trash2 />
                                Remove
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden-input"
                    />
                </div>
            </div>

            {/* Account Info - Read Only */}
            <div className="account-info-section">
                <h4 className="account-info-title">ℹ️ Account Info</h4>
                <div className="account-info-grid">
                    {currentUser?.id && (
                        <div className="info-row">
                            <span className="info-label">📍 IP Address</span>
                            <span className="info-value">{currentUser.id}</span>
                        </div>
                    )}
                    {currentUser?.hostname && (
                        <div className="info-row">
                            <span className="info-label">💻 Computer</span>
                            <span className="info-value">{currentUser.hostname}</span>
                        </div>
                    )}
                    {currentUser?.created_at && (
                        <div className="info-row">
                            <span className="info-label">📅 Joined</span>
                            <span className="info-value">
                                {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Form */}
            <div className="profile-form">
                {/* Display Name */}
                <div className="form-group">
                    <label>Display Name</label>
                    <div className="form-input-wrapper">
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value.slice(0, 25))}
                            placeholder="Enter your name"
                            maxLength={25}
                        />
                        <span className={`char-count ${name.length >= 25 ? 'limit' : name.length >= 20 ? 'warning' : ''}`}>
                            {name.length}/25
                        </span>
                    </div>
                </div>

                {/* Status */}
                <div className="form-group">
                    <label>Status</label>
                    <select
                        className="status-select"
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.emoji} {opt.value}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bio */}
                <div className="form-group">
                    <label>About / Bio</label>
                    <div className="form-input-wrapper" style={{ display: 'block' }}>
                        <textarea
                            className="form-textarea"
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, 250))}
                            placeholder="Write something about yourself..."
                            maxLength={250}
                        />
                        <span className={`char-count ${bio.length >= 250 ? 'limit' : bio.length >= 200 ? 'warning' : ''}`} style={{ position: 'static', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                            {bio.length}/250
                        </span>
                    </div>
                </div>

                {/* Save Button */}
                <div className="save-section">
                    {showSuccess && (
                        <span className="save-success">
                            <Check size={18} /> Saved!
                        </span>
                    )}
                    <button
                        className={`save-btn ${isSaving ? 'saving' : ''}`}
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges()}
                    >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfileSettings;
