/**
 * MediaGallery Component
 * Shows all media (images, videos, documents) from a chat
 * Features: Pagination, Lazy Loading, Infinite Scroll
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket';
import './MediaGallery.css';

const ITEMS_PER_PAGE = 30;

function MediaGallery({ peerId, onClose }) {
    const [activeTab, setActiveTab] = useState('images');
    const [media, setMedia] = useState({ images: [], videos: [], documents: [] });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState({ images: true, videos: true, documents: true });
    const [selectedMedia, setSelectedMedia] = useState(null);

    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    // Initial fetch
    useEffect(() => {
        socket.emit('media:fetch', { peerId, limit: ITEMS_PER_PAGE, offset: 0 });

        const handleMediaList = (data) => {
            if (data.peerId === peerId) {
                const images = data.media.filter(m => m.type === 'image');
                const videos = data.media.filter(m => m.type === 'video');
                const documents = data.media.filter(m => m.type === 'file');

                if (data.append) {
                    // Append to existing
                    setMedia(prev => ({
                        images: [...prev.images, ...images],
                        videos: [...prev.videos, ...videos],
                        documents: [...prev.documents, ...documents]
                    }));
                } else {
                    // Replace
                    setMedia({ images, videos, documents });
                }

                // Check if there's more data
                setHasMore({
                    images: images.length >= ITEMS_PER_PAGE,
                    videos: videos.length >= ITEMS_PER_PAGE,
                    documents: documents.length >= ITEMS_PER_PAGE
                });

                setLoading(false);
                setLoadingMore(false);
            }
        };

        socket.on('media:list', handleMediaList);

        return () => {
            socket.off('media:list', handleMediaList);
        };
    }, [peerId]);

    // Load more function
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore[activeTab]) return;

        const currentCount = media[activeTab === 'images' ? 'images' : activeTab === 'videos' ? 'videos' : 'documents'].length;

        setLoadingMore(true);
        socket.emit('media:fetch', {
            peerId,
            limit: ITEMS_PER_PAGE,
            offset: currentCount,
            type: activeTab === 'images' ? 'image' : activeTab === 'videos' ? 'video' : 'file',
            append: true
        });
    }, [peerId, activeTab, loadingMore, hasMore, media]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [loadMore, loading, loadingMore]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileExtension = (filename) => {
        return filename?.split('.').pop()?.toUpperCase() || 'FILE';
    };

    const getFileIcon = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const icons = {
            pdf: '📄', doc: '📝', docx: '📝',
            xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️',
            txt: '📃', csv: '📋', zip: '📦', rar: '📦'
        };
        return icons[ext] || '📎';
    };

    const downloadMedia = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    // Lazy Image Component
    const LazyImage = ({ src, alt, onClick }) => {
        const [loaded, setLoaded] = useState(false);
        const [error, setError] = useState(false);
        const imgRef = useRef(null);

        useEffect(() => {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && imgRef.current) {
                        imgRef.current.src = src;
                        observer.disconnect();
                    }
                },
                { threshold: 0.1, rootMargin: '100px' }
            );

            if (imgRef.current) observer.observe(imgRef.current);

            return () => observer.disconnect();
        }, [src]);

        return (
            <div className={`lazy-image-container ${loaded ? 'loaded' : ''}`} onClick={onClick}>
                {!loaded && !error && <div className="image-placeholder">📷</div>}
                {error && <div className="image-error">❌</div>}
                <img
                    ref={imgRef}
                    alt={alt}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    style={{ opacity: loaded ? 1 : 0 }}
                />
            </div>
        );
    };

    // Lazy Video Component
    const LazyVideo = ({ src, onClick }) => {
        const [loaded, setLoaded] = useState(false);
        const videoRef = useRef(null);

        useEffect(() => {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && videoRef.current) {
                        videoRef.current.src = src;
                        observer.disconnect();
                    }
                },
                { threshold: 0.1, rootMargin: '100px' }
            );

            if (videoRef.current) observer.observe(videoRef.current);

            return () => observer.disconnect();
        }, [src]);

        return (
            <div className={`lazy-video-container ${loaded ? 'loaded' : ''}`} onClick={onClick}>
                {!loaded && <div className="video-placeholder">🎬</div>}
                <video
                    ref={videoRef}
                    muted
                    preload="metadata"
                    onLoadedData={() => setLoaded(true)}
                    style={{ opacity: loaded ? 1 : 0 }}
                />
                <div className="video-play-icon">▶</div>
            </div>
        );
    };

    const renderImages = () => (
        <div className="media-grid images-grid">
            {media.images.length === 0 && !loading ? (
                <div className="no-media">No images in this chat</div>
            ) : (
                media.images.map((item, idx) => (
                    <div key={idx} className="media-item image-item">
                        <LazyImage
                            src={item.content}
                            alt=""
                            onClick={() => setSelectedMedia(item)}
                        />
                        <div className="media-date">{formatDate(item.created_at)}</div>
                    </div>
                ))
            )}
        </div>
    );

    const renderVideos = () => (
        <div className="media-grid videos-grid">
            {media.videos.length === 0 && !loading ? (
                <div className="no-media">No videos in this chat</div>
            ) : (
                media.videos.map((item, idx) => (
                    <div key={idx} className="media-item video-item">
                        <LazyVideo
                            src={item.content}
                            onClick={() => setSelectedMedia(item)}
                        />
                        <div className="media-date">{formatDate(item.created_at)}</div>
                    </div>
                ))
            )}
        </div>
    );

    const renderDocuments = () => (
        <div className="media-list documents-list">
            {media.documents.length === 0 && !loading ? (
                <div className="no-media">No documents in this chat</div>
            ) : (
                media.documents.map((item, idx) => (
                    <div key={idx} className="document-item" onClick={() => downloadMedia(item.content, item.fileName)}>
                        <div className="doc-icon">{getFileIcon(item.fileName)}</div>
                        <div className="doc-info">
                            <span className="doc-name">{item.fileName || 'Document'}</span>
                            <span className="doc-meta">
                                <span className="doc-ext">{getFileExtension(item.fileName)}</span>
                                {item.fileSize && <span className="doc-size">{formatSize(item.fileSize)}</span>}
                                <span className="doc-date">{formatDate(item.created_at)}</span>
                            </span>
                        </div>
                        <div className="doc-download">⬇️</div>
                    </div>
                ))
            )}
        </div>
    );

    const currentTabHasMore = hasMore[activeTab === 'images' ? 'images' : activeTab === 'videos' ? 'videos' : 'documents'];

    return (
        <div className="media-gallery-overlay" onClick={onClose}>
            <div className="media-gallery" onClick={(e) => e.stopPropagation()}>
                <div className="gallery-header">
                    <h3>Media</h3>
                    <button className="close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="gallery-tabs">
                    <button
                        className={`tab ${activeTab === 'images' ? 'active' : ''}`}
                        onClick={() => setActiveTab('images')}
                    >
                        📷 Images ({media.images.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('videos')}
                    >
                        🎬 Videos ({media.videos.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
                        onClick={() => setActiveTab('documents')}
                    >
                        📎 Docs ({media.documents.length})
                    </button>
                </div>

                <div className="gallery-content">
                    {loading ? (
                        <div className="gallery-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading media...</span>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'images' && renderImages()}
                            {activeTab === 'videos' && renderVideos()}
                            {activeTab === 'documents' && renderDocuments()}

                            {/* Load More Trigger */}
                            {currentTabHasMore && (
                                <div ref={loadMoreRef} className="load-more-trigger">
                                    {loadingMore && (
                                        <div className="loading-more">
                                            <div className="loading-spinner small"></div>
                                            <span>Loading more...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Lightbox for full-size view */}
            {selectedMedia && (
                <div className="lightbox" onClick={() => setSelectedMedia(null)}>
                    <button className="lightbox-close" onClick={() => setSelectedMedia(null)}>✕</button>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        {selectedMedia.type === 'video' ? (
                            <video src={selectedMedia.content} controls autoPlay />
                        ) : (
                            <img src={selectedMedia.content} alt="" />
                        )}
                    </div>
                    <button
                        className="lightbox-download"
                        onClick={() => downloadMedia(selectedMedia.content, `media-${Date.now()}`)}
                    >
                        ⬇️ Download
                    </button>
                </div>
            )}
        </div>
    );
}

export default MediaGallery;
