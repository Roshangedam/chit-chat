/**
 * MediaUpload Component
 * Unified component for uploading images and videos with preview and caption
 * Reusable for all media types - just pass mediaType prop
 */

import { useState, useRef, useEffect } from 'react';
import './MediaUpload.css';

const MEDIA_CONFIG = {
    image: {
        title: 'Send Photo',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>,
        accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxSizeLabel: '10MB',
        validTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        uploadEndpoint: '/api/upload/image',
        fieldName: 'image'
    },
    video: {
        title: 'Send Video',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23,7 16,12 23,17 23,7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
        accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo',
        maxSize: 100 * 1024 * 1024, // 100MB
        maxSizeLabel: '100MB',
        validTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
        uploadEndpoint: '/api/upload/video',
        fieldName: 'video'
    },
    document: {
        title: 'Send Document',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
        accept: '*/*', // Accept any file type
        maxSize: 50 * 1024 * 1024, // 50MB
        maxSizeLabel: '50MB',
        validTypes: null, // Accept any MIME type
        uploadEndpoint: '/api/upload/document',
        fieldName: 'document'
    }
};

function MediaUpload({ mediaType = 'image', initialFile = null, onUploadComplete, onCancel }) {
    const config = MEDIA_CONFIG[mediaType];

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [error, setError] = useState(null);
    const [duration, setDuration] = useState(null); // For video

    const fileInputRef = useRef(null);
    const mediaRef = useRef(null);

    // Pre-load initialFile if provided (from drag-drop or paste)
    useEffect(() => {
        if (initialFile) {
            handleFileSelect(initialFile);
        }
    }, [initialFile]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const handleFileSelect = (file) => {
        if (!file) return;
        setError(null);

        // Validate type (skip for documents which accept any type)
        if (config.validTypes && !config.validTypes.includes(file.type)) {
            setError(`Invalid file type. Supported: ${config.accept}`);
            return;
        }

        // Validate size
        if (file.size > config.maxSize) {
            setError(`File too large. Max size: ${config.maxSizeLabel}`);
            return;
        }

        // For documents, don't create preview URL (they're not displayable)
        const previewUrl = mediaType === 'document' ? null : URL.createObjectURL(file);
        setPreview(previewUrl);
        setSelectedFile(file);
    };

    const handleInputChange = (e) => handleFileSelect(e.target.files?.[0]);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleMediaLoad = () => {
        if (mediaType === 'video' && mediaRef.current) {
            setDuration(Math.round(mediaRef.current.duration));
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return ` • ${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Just pass file info to parent - upload happens in background in MessageInput
    const handleSend = () => {
        if (!selectedFile) return;

        // Pass file and info to parent for background upload
        onUploadComplete({
            file: selectedFile,
            previewUrl: preview,
            caption: caption.trim() || null,
            duration: duration,
            config: config
        });
        // Modal closes immediately - upload happens in background
    };

    const handleClear = () => {
        if (preview) URL.revokeObjectURL(preview);
        setSelectedFile(null);
        setPreview(null);
        setCaption('');
        setError(null);
        setDuration(null);
    };

    return (
        <div className="media-upload-modal">
            <div className="media-upload-content">
                <div className="media-upload-header">
                    <h3><span className="header-icon">{config.icon}</span>{config.title}</h3>
                    <button className="close-btn" onClick={onCancel}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {!selectedFile ? (
                    <div
                        className="media-drop-zone"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="drop-icon">{config.icon}</div>
                        <p>Drag & drop or click to select</p>
                        <p className="size-hint">Max size: {config.maxSizeLabel}</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={config.accept}
                            onChange={handleInputChange}
                            hidden
                        />
                    </div>
                ) : (
                    <div className="media-preview-section">
                        {mediaType === 'video' ? (
                            <video
                                ref={mediaRef}
                                src={preview}
                                className="media-preview video"
                                controls
                                onLoadedMetadata={handleMediaLoad}
                            />
                        ) : mediaType === 'document' ? (
                            <div className="document-preview">
                                <div className="document-icon">
                                    {config.icon}
                                </div>
                                <div className="document-extension">
                                    {selectedFile.name.split('.').pop().toUpperCase()}
                                </div>
                            </div>
                        ) : (
                            <img src={preview} alt="Preview" className="media-preview image" />
                        )}

                        <div className="media-info">
                            <span className="media-name">{selectedFile.name}</span>
                            <span className="media-size">
                                {formatSize(selectedFile.size)}{mediaType === 'video' && formatDuration(duration)}
                            </span>
                        </div>

                        {/* Caption Input */}
                        <div className="caption-container">
                            <input
                                type="text"
                                className="caption-input"
                                placeholder="Add a caption... (optional)"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            />
                        </div>

                        <button className="change-btn" onClick={handleClear}>
                            Change {mediaType === 'video' ? 'Video' : mediaType === 'document' ? 'Document' : 'Photo'}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="error-message">⚠️ {error}</div>
                )}

                <div className="media-upload-actions">
                    <button className="cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!selectedFile}
                    >
                        Send {mediaType === 'video' ? 'Video' : mediaType === 'document' ? 'Document' : 'Photo'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MediaUpload;
