/**
 * Message Component
 * Individual message bubble with reactions and reply
 */

import { useState } from 'react';
import socket from '../socket';
import AudioPlayer from './AudioPlayer';
import DocumentPreview from './DocumentPreview';
import './Message.css';

// Available reactions
const REACTIONS = ['👍', '❤️', '😂', '🔥', '😢', '👏'];

function Message({ message, isMine, currentUserId, selectedPeerId, onReply, onForward, onEdit, onDelete, onPin, onScrollToMessage }) {
    const [showActions, setShowActions] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        // Handle both ISO and SQLite datetime formats
        let date;
        if (timestamp.includes('T')) {
            date = new Date(timestamp);
        } else {
            // SQLite format: "YYYY-MM-DD HH:MM:SS" - treat as UTC
            date = new Date(timestamp.replace(' ', 'T') + 'Z');
        }

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sending': return '○';
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '✓';
        }
    };

    const getStatusClass = (status) => {
        if (status === 'read') return 'read';
        if (status === 'delivered') return 'delivered';
        return 'sent';
    };

    const handleReaction = (emoji) => {
        socket.emit('reaction:toggle', {
            messageId: message.id,
            emoji: emoji,
            senderId: isMine ? selectedPeerId : message.sender_id
        });
        setShowActions(false);
    };

    const handleReply = () => {
        if (onReply) {
            onReply(message);
        }
        setShowActions(false);
    };

    const handleForward = () => {
        if (onForward) {
            onForward(message);
        }
        setShowActions(false);
    };

    const handleEdit = () => {
        if (onEdit && isMine) {
            onEdit(message);
        }
        setShowActions(false);
    };

    const handleDelete = (deleteForEveryone = false) => {
        if (onDelete) {
            onDelete(message, deleteForEveryone);
        }
        setShowActions(false);
    };

    const handlePin = () => {
        if (onPin) {
            onPin(message, message.is_pinned !== 1);
        }
        setShowActions(false);
    };

    const handleRepliedClick = () => {
        if (message.repliedMessage && onScrollToMessage) {
            onScrollToMessage(message.reply_to);
        }
    };

    const hasMyReaction = (emoji) => {
        if (!message.reactions) return false;
        const reaction = message.reactions.find(r => r.emoji === emoji);
        return reaction?.users?.includes(currentUserId);
    };

    // Check if message can be edited (15 minutes, text only)
    const canEdit = () => {
        if (!isMine) return false;
        if (!message.created_at) return false;

        // Media messages cannot be edited (only their content would show URL)
        if (message.type && message.type !== 'text') return false;

        // Handle both ISO and SQLite datetime formats
        let messageTime;
        const createdAt = message.created_at;
        if (createdAt.includes('T')) {
            messageTime = new Date(createdAt).getTime();
        } else {
            // SQLite format: "YYYY-MM-DD HH:MM:SS"
            messageTime = new Date(createdAt.replace(' ', 'T') + 'Z').getTime();
        }

        const now = Date.now();
        return (now - messageTime) < 15 * 60 * 1000;
    };

    // Check if message can be deleted for everyone (works for all types, only time limit)
    const canDeleteForAll = () => {
        if (!isMine) return false;
        if (!message.created_at) return false;

        let messageTime;
        const createdAt = message.created_at;
        if (createdAt.includes('T')) {
            messageTime = new Date(createdAt).getTime();
        } else {
            messageTime = new Date(createdAt.replace(' ', 'T') + 'Z').getTime();
        }

        const now = Date.now();
        return (now - messageTime) < 15 * 60 * 1000; // 15 minutes
    };

    // Handle deleted messages
    if (message.is_deleted === 1) {
        return (
            <div id={`message-${message.id}`} className={`message ${isMine ? 'sent' : 'received'} deleted`}>
                <div className="message-content deleted-content">
                    <span className="deleted-text">🚫 This message was deleted</span>
                    <span className="message-time">{formatTime(message.created_at)}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            id={`message-${message.id}`}
            className={`message ${isMine ? 'sent' : 'received'} ${message.is_pinned === 1 ? 'pinned' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="message-content">
                {/* Pinned indicator */}
                {message.is_pinned === 1 && (
                    <div className="pinned-tag">
                        <span>📌 Pinned</span>
                    </div>
                )}

                {/* Forwarded tag */}
                {(message.isForwarded || message.is_forwarded === 1) && (
                    <div className="forwarded-tag">
                        <span className="forward-icon">↪</span>
                        <span>Forwarded</span>
                    </div>
                )}

                {/* Replied message preview */}
                {message.repliedMessage && (
                    <div className="replied-message" onClick={handleRepliedClick}>
                        <div className="replied-bar"></div>
                        <div className="replied-content">
                            <span className="replied-sender">
                                {message.repliedMessage.sender_id === currentUserId ? 'You' : 'Them'}
                            </span>
                            <span className="replied-text">
                                {message.repliedMessage.type === 'image' ? (
                                    <span className="replied-media">📷 Photo</span>
                                ) : message.repliedMessage.type === 'video' ? (
                                    <span className="replied-media">🎬 Video</span>
                                ) : message.repliedMessage.type === 'gif' ? (
                                    <span className="replied-media">GIF</span>
                                ) : message.repliedMessage.type === 'sticker' ? (
                                    <span className="replied-media">{message.repliedMessage.content}</span>
                                ) : message.repliedMessage.type === 'audio' ? (
                                    <span className="replied-media">🎤 Audio</span>
                                ) : message.repliedMessage.type === 'file' ? (
                                    <span className="replied-media">📎 {message.repliedMessage.fileName || 'Document'}</span>
                                ) : (
                                    <>
                                        {message.repliedMessage.content?.substring(0, 50)}
                                        {message.repliedMessage.content?.length > 50 ? '...' : ''}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                )}

                {/* Message Content - Image, GIF, Sticker, or Text */}
                {message.type === 'image' ? (
                    <div className={`message-image-container ${message.uploadStatus === 'uploading' ? 'uploading' : ''}`}>
                        {/* Show loading placeholder only when NOT uploading */}
                        {imageLoading && !imageError && !message.uploadStatus && (
                            <div className="image-loading-placeholder">
                                <span className="loading-spinner">⏳</span>
                                <span>Loading image...</span>
                            </div>
                        )}

                        {/* Always render image (except on error) */}
                        {!imageError && (
                            <img
                                src={message.content}
                                alt="Shared image"
                                className={`message-image ${imageLoading && !message.uploadStatus ? 'loading' : ''}`}
                                loading="lazy"
                                onLoad={() => setImageLoading(false)}
                                onError={() => { setImageLoading(false); setImageError(true); }}
                                onClick={() => !message.uploadStatus && window.open(message.content, '_blank')}
                            />
                        )}

                        {imageError && (
                            <div className="image-error-placeholder">
                                <span className="error-icon">🖼️</span>
                                <span>Image failed to load</span>
                            </div>
                        )}

                        {/* Upload Progress Overlay */}
                        {message.uploadStatus === 'uploading' && (
                            <div className="upload-progress-overlay">
                                <svg className="progress-ring" viewBox="0 0 44 44">
                                    <circle className="progress-ring-bg" cx="22" cy="22" r="18" />
                                    <circle
                                        className="progress-ring-fill"
                                        cx="22" cy="22" r="18"
                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - (message.uploadProgress || 0) / 100)}`}
                                    />
                                </svg>
                                <span className="progress-text">{message.uploadProgress || 0}%</span>
                            </div>
                        )}

                        {/* Upload Failed */}
                        {message.uploadStatus === 'failed' && (
                            <div className="upload-failed-overlay">
                                <span className="failed-icon">⚠️</span>
                                <span>Upload Failed</span>
                            </div>
                        )}

                        {!imageLoading && !imageError && !message.uploadStatus && (
                            <div className="image-actions">
                                <a
                                    href={message.content}
                                    download
                                    className="download-btn"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    ⬇️
                                </a>
                            </div>
                        )}
                        {message.caption && (
                            <p className="media-caption">{message.caption}</p>
                        )}
                    </div>
                ) : message.type === 'video' ? (
                    <div className={`message-video-container ${message.uploadStatus === 'uploading' ? 'uploading' : ''}`}>
                        <video
                            src={message.content}
                            className="message-video"
                            controls={!message.uploadStatus}
                            muted
                            preload="metadata"
                            playsInline
                        />

                        {/* Upload Progress Overlay */}
                        {message.uploadStatus === 'uploading' && (
                            <div className="upload-progress-overlay">
                                <svg className="progress-ring" viewBox="0 0 44 44">
                                    <circle className="progress-ring-bg" cx="22" cy="22" r="18" />
                                    <circle
                                        className="progress-ring-fill"
                                        cx="22" cy="22" r="18"
                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - (message.uploadProgress || 0) / 100)}`}
                                    />
                                </svg>
                                <span className="progress-text">{message.uploadProgress || 0}%</span>
                            </div>
                        )}

                        {/* Upload Failed */}
                        {message.uploadStatus === 'failed' && (
                            <div className="upload-failed-overlay">
                                <span className="failed-icon">⚠️</span>
                                <span>Upload Failed</span>
                            </div>
                        )}

                        {!message.uploadStatus && (
                            <div className="video-actions">
                                <a
                                    href={message.content}
                                    download
                                    className="download-btn"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    ⬇️
                                </a>
                            </div>
                        )}
                        {message.caption && (
                            <p className="media-caption">{message.caption}</p>
                        )}
                    </div>
                ) : message.type === 'gif' ? (
                    <img
                        src={message.content}
                        alt="GIF"
                        className="message-gif"
                        loading="lazy"
                    />
                ) : message.type === 'sticker' ? (
                    <span className="message-sticker">{message.content}</span>
                ) : message.type === 'audio' ? (
                    <div className={`message-audio-container ${message.uploadStatus === 'uploading' ? 'uploading' : ''}`}>
                        <AudioPlayer src={message.content} duration={message.duration} />

                        {/* Upload Progress Overlay */}
                        {message.uploadStatus === 'uploading' && (
                            <div className="upload-progress-overlay audio-progress">
                                <svg className="progress-ring" viewBox="0 0 44 44">
                                    <circle className="progress-ring-bg" cx="22" cy="22" r="18" />
                                    <circle
                                        className="progress-ring-fill"
                                        cx="22" cy="22" r="18"
                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - (message.uploadProgress || 0) / 100)}`}
                                    />
                                </svg>
                                <span className="progress-text">{message.uploadProgress || 0}%</span>
                            </div>
                        )}
                    </div>
                ) : message.type === 'file' ? (
                    <DocumentPreview
                        url={message.content}
                        fileName={message.fileName}
                        fileSize={message.fileSize}
                        caption={message.caption}
                        isOwn={isMine}
                        uploadProgress={message.uploadProgress}
                        uploadStatus={message.uploadStatus}
                    />
                ) : (
                    <p>{message.content}</p>
                )}

                {/* Reactions display */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="reactions-display">
                        {message.reactions.map((reaction, idx) => (
                            <span
                                key={idx}
                                className={`reaction-badge ${hasMyReaction(reaction.emoji) ? 'my-reaction' : ''}`}
                                onClick={() => handleReaction(reaction.emoji)}
                            >
                                {reaction.emoji} {reaction.count > 1 && reaction.count}
                            </span>
                        ))}
                    </div>
                )}

                <div className="message-meta">
                    {message.is_edited === 1 && <span className="edited-label">edited</span>}
                    <span className="time">{formatTime(message.created_at)}</span>
                    {isMine && (
                        <span className={`status ${getStatusClass(message.status)}`}>
                            {getStatusIcon(message.status)}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions menu (shows on hover) */}
            {
                showActions && (
                    <div className={`message-actions ${isMine ? 'left' : 'right'}`}>
                        {/* Reply button */}
                        <button className="action-btn reply-btn" onClick={handleReply} title="Reply">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9,14 4,9 9,4" />
                                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                            </svg>
                        </button>

                        {/* Forward button */}
                        <button className="action-btn forward-btn" onClick={handleForward} title="Forward">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15,14 20,9 15,4" />
                                <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                            </svg>
                        </button>

                        {/* Pin/Unpin button */}
                        <button
                            className={`action-btn pin-btn ${message.is_pinned === 1 ? 'pinned' : ''}`}
                            onClick={handlePin}
                            title={message.is_pinned === 1 ? "Unpin" : "Pin"}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="17" x2="12" y2="22" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17z" />
                            </svg>
                        </button>

                        {/* Edit button (only for own messages, within 15 min) */}
                        {isMine && canEdit() && (
                            <button className="action-btn edit-btn" onClick={handleEdit} title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                        )}

                        {/* Delete button */}
                        <button className="action-btn delete-btn" onClick={() => handleDelete(false)} title="Delete for me">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>

                        {/* Delete for everyone (only sender, within 15 min) */}
                        {isMine && canDeleteForAll() && (
                            <button className="action-btn delete-all-btn" onClick={() => handleDelete(true)} title="Delete for everyone">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </button>
                        )}

                        {/* Reaction buttons */}
                        {REACTIONS.map(emoji => (
                            <button
                                key={emoji}
                                className={`action-btn reaction-btn ${hasMyReaction(emoji) ? 'active' : ''}`}
                                onClick={() => handleReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )
            }
        </div >
    );
}

export default Message;
