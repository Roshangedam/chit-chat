/**
 * ProfileInfoModal Component
 * WhatsApp-style profile info modal - shows user details and shared media
 */

import { useState, useEffect } from 'react';
import { X, MessageCircle, BellOff, Bell, Trash2, Image, Monitor, Calendar, MapPin } from 'lucide-react';
import UserAvatar from './UserAvatar';
import MediaGallery from './MediaGallery';
import socket from '../socket';
import usePeerStore from '../store/peerStore';
import './ProfileInfoModal.css';

function ProfileInfoModal({ user, onClose, onSelectPeer }) {
    const [showFullPhoto, setShowFullPhoto] = useState(false);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [mediaPreview, setMediaPreview] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Fetch media preview on mount
    useEffect(() => {
        if (user?.id) {
            socket.emit('media:getPreview', { peerId: user.id, limit: 6 });

            const handleMediaPreview = (data) => {
                if (data.peerId === user.id) {
                    setMediaPreview(data.media || []);
                }
            };

            socket.on('media:preview', handleMediaPreview);
            return () => socket.off('media:preview', handleMediaPreview);
        }
    }, [user?.id]);

    // Format last seen
    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'recently';

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
        if (days < 30) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    // Format join date
    const formatJoinDate = (date) => {
        if (!date) return 'Unknown';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Handle message action
    const handleMessage = () => {
        if (onSelectPeer) {
            onSelectPeer(user);
        }
        onClose();
    };

    // Handle mute toggle
    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
        // TODO: Implement mute in store/server
    };

    // Handle clear chat
    const handleClearChat = () => {
        if (showClearConfirm) {
            // TODO: Implement clear chat
            socket.emit('chat:clear', { peerId: user.id });
            setShowClearConfirm(false);
            onClose();
        } else {
            setShowClearConfirm(true);
        }
    };

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (showFullPhoto) {
                    setShowFullPhoto(false);
                } else if (showMediaGallery) {
                    setShowMediaGallery(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showFullPhoto, showMediaGallery, onClose]);

    if (!user) return null;

    const isOnline = user.status === 'online';

    return (
        <>
            <div className="profile-modal-overlay" onClick={onClose}>
                <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="profile-modal__header">
                        <h3>Profile Info</h3>
                        <button className="profile-modal__close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Profile Photo */}
                    <div className="profile-modal__photo-section">
                        <div
                            className="profile-modal__avatar-wrapper"
                            onClick={() => user.avatar && setShowFullPhoto(true)}
                        >
                            <UserAvatar user={user} size="large" showStatus={false} />
                            {user.avatar && <div className="photo-overlay">Click to view</div>}
                        </div>
                        <h2 className="profile-modal__name">{user.name || user.custom_name || 'Unknown'}</h2>
                        <div className={`profile-modal__status ${isOnline ? 'online' : 'offline'}`}>
                            <span className="status-dot"></span>
                            {isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`}
                        </div>
                    </div>

                    {/* Bio Section */}
                    {user.bio && (
                        <div className="profile-modal__section">
                            <h4>📝 Bio</h4>
                            <p className="profile-modal__bio">{user.bio}</p>
                        </div>
                    )}

                    {/* Status Message */}
                    {user.status_message && (
                        <div className="profile-modal__section">
                            <h4>💭 Status</h4>
                            <p className="profile-modal__status-msg">{user.status_message}</p>
                        </div>
                    )}

                    {/* Info Section */}
                    <div className="profile-modal__section">
                        <h4>ℹ️ Info</h4>
                        <div className="profile-modal__info-grid">
                            {user.id && (
                                <div className="info-item">
                                    <MapPin size={16} />
                                    <span className="info-label">IP</span>
                                    <span className="info-value">{user.id}</span>
                                </div>
                            )}
                            {user.hostname && (
                                <div className="info-item">
                                    <Monitor size={16} />
                                    <span className="info-label">PC</span>
                                    <span className="info-value">{user.hostname}</span>
                                </div>
                            )}
                            <div className="info-item">
                                <Calendar size={16} />
                                <span className="info-label">Joined</span>
                                <span className="info-value">{formatJoinDate(user.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Media Preview */}
                    <div className="profile-modal__section">
                        <div className="section-header">
                            <h4><Image size={16} /> Media</h4>
                            {mediaPreview.length > 0 && (
                                <button
                                    className="view-all-btn"
                                    onClick={() => setShowMediaGallery(true)}
                                >
                                    View All →
                                </button>
                            )}
                        </div>
                        <div className="profile-modal__media-grid">
                            {mediaPreview.length > 0 ? (
                                mediaPreview.map((media, idx) => (
                                    <div key={idx} className="media-thumb" onClick={() => setShowMediaGallery(true)}>
                                        {media.type === 'image' ? (
                                            <img src={media.content} alt="Media" />
                                        ) : media.type === 'video' ? (
                                            <div className="video-thumb">
                                                <video src={media.content} />
                                                <span className="play-icon">▶</span>
                                            </div>
                                        ) : (
                                            <div className="file-thumb">📄</div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="no-media">No shared media yet</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="profile-modal__actions">
                        <button className="action-btn primary" onClick={handleMessage}>
                            <MessageCircle size={18} />
                            <span>Message</span>
                        </button>
                        <button className={`action-btn ${isMuted ? 'muted' : ''}`} onClick={handleMuteToggle}>
                            {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                        </button>
                        <button
                            className={`action-btn danger ${showClearConfirm ? 'confirm' : ''}`}
                            onClick={handleClearChat}
                        >
                            <Trash2 size={18} />
                            <span>{showClearConfirm ? 'Confirm?' : 'Clear'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Fullscreen Photo Viewer */}
            {showFullPhoto && user.avatar && (
                <div className="fullscreen-photo" onClick={() => setShowFullPhoto(false)}>
                    <button className="close-fullscreen" onClick={() => setShowFullPhoto(false)}>
                        <X size={24} />
                    </button>
                    <img src={user.avatar} alt={user.name} />
                </div>
            )}

            {/* Media Gallery */}
            {showMediaGallery && (
                <MediaGallery
                    peerId={user.id}
                    onClose={() => setShowMediaGallery(false)}
                />
            )}
        </>
    );
}

export default ProfileInfoModal;
