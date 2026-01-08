/**
 * DocumentPreview Component
 * Displays document files in chat messages with download functionality
 */

import { useState } from 'react';
import './DocumentPreview.css';

// File type icons and colors mapping
const FILE_TYPES = {
    // Documents
    pdf: { icon: '📄', color: '#ef4444', label: 'PDF' },
    doc: { icon: '📝', color: '#2563eb', label: 'DOC' },
    docx: { icon: '📝', color: '#2563eb', label: 'DOCX' },
    xls: { icon: '📊', color: '#16a34a', label: 'XLS' },
    xlsx: { icon: '📊', color: '#16a34a', label: 'XLSX' },
    ppt: { icon: '📽️', color: '#ea580c', label: 'PPT' },
    pptx: { icon: '📽️', color: '#ea580c', label: 'PPTX' },
    txt: { icon: '📃', color: '#64748b', label: 'TXT' },
    csv: { icon: '📋', color: '#16a34a', label: 'CSV' },
    rtf: { icon: '📝', color: '#2563eb', label: 'RTF' },

    // Archives
    zip: { icon: '📦', color: '#8b5cf6', label: 'ZIP' },
    rar: { icon: '📦', color: '#8b5cf6', label: 'RAR' },
    '7z': { icon: '📦', color: '#8b5cf6', label: '7Z' },
    tar: { icon: '📦', color: '#8b5cf6', label: 'TAR' },
    gz: { icon: '📦', color: '#8b5cf6', label: 'GZ' },

    // Code/Programming
    js: { icon: '💻', color: '#f7df1e', label: 'JS' },
    ts: { icon: '💻', color: '#3178c6', label: 'TS' },
    jsx: { icon: '⚛️', color: '#61dafb', label: 'JSX' },
    tsx: { icon: '⚛️', color: '#61dafb', label: 'TSX' },
    py: { icon: '🐍', color: '#3776ab', label: 'PY' },
    java: { icon: '☕', color: '#007396', label: 'JAVA' },
    html: { icon: '🌐', color: '#e34c26', label: 'HTML' },
    css: { icon: '🎨', color: '#1572b6', label: 'CSS' },
    json: { icon: '📋', color: '#000000', label: 'JSON' },
    xml: { icon: '📋', color: '#f26b00', label: 'XML' },
    sql: { icon: '🗃️', color: '#4479a1', label: 'SQL' },

    // Media
    mp3: { icon: '🎵', color: '#1db954', label: 'MP3' },
    wav: { icon: '🎵', color: '#1db954', label: 'WAV' },
    mp4: { icon: '🎬', color: '#ff0000', label: 'MP4' },
    avi: { icon: '🎬', color: '#ff0000', label: 'AVI' },
    mkv: { icon: '🎬', color: '#ff0000', label: 'MKV' },

    // Images
    png: { icon: '🖼️', color: '#ff6f61', label: 'PNG' },
    jpg: { icon: '🖼️', color: '#ff6f61', label: 'JPG' },
    jpeg: { icon: '🖼️', color: '#ff6f61', label: 'JPEG' },
    gif: { icon: '🖼️', color: '#ff6f61', label: 'GIF' },
    svg: { icon: '🖼️', color: '#ffb13b', label: 'SVG' },

    // Executables & Others
    exe: { icon: '⚙️', color: '#0078d4', label: 'EXE' },
    msi: { icon: '⚙️', color: '#0078d4', label: 'MSI' },
    apk: { icon: '📱', color: '#3ddc84', label: 'APK' },
    dmg: { icon: '💿', color: '#999999', label: 'DMG' },
    iso: { icon: '💿', color: '#999999', label: 'ISO' },

    // Default
    default: { icon: '📎', color: '#6366f1', label: 'FILE' }
};

function DocumentPreview({ url, fileName, fileSize, caption, isOwn, uploadProgress, uploadStatus }) {
    const [downloading, setDownloading] = useState(false);

    // Get file extension and type info
    const extension = fileName?.split('.').pop()?.toLowerCase() || 'file';
    const fileType = FILE_TYPES[extension] || FILE_TYPES.default;

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Handle download
    const handleDownload = async () => {
        if (uploadStatus === 'uploading' || downloading) return;

        setDownloading(true);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    const isUploading = uploadStatus === 'uploading';
    const isFailed = uploadStatus === 'failed';

    return (
        <div className={`document-preview-message ${isOwn ? 'own' : ''} ${isFailed ? 'failed' : ''}`}>
            <div className="document-container" onClick={!isUploading && !isFailed ? handleDownload : undefined}>
                {/* File Icon */}
                <div className="document-icon-wrapper" style={{ backgroundColor: `${fileType.color}20` }}>
                    {isUploading ? (
                        <div className="document-upload-spinner">
                            <svg viewBox="0 0 24 24" className="spinner">
                                <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                            </svg>
                        </div>
                    ) : isFailed ? (
                        <span className="error-icon">⚠️</span>
                    ) : (
                        <span className="file-icon" style={{ color: fileType.color }}>{fileType.icon}</span>
                    )}
                </div>

                {/* File Info */}
                <div className="document-info">
                    <span className="document-name" title={fileName}>
                        {fileName || 'Document'}
                    </span>
                    <span className="document-meta">
                        <span className="document-extension" style={{ backgroundColor: fileType.color }}>
                            {fileType.label}
                        </span>
                        {fileSize && <span className="document-size">{formatSize(fileSize)}</span>}
                    </span>
                </div>

                {/* Download/Status Icon */}
                <div className="document-action">
                    {isUploading ? (
                        <span className="upload-progress">{uploadProgress || 0}%</span>
                    ) : isFailed ? (
                        <span className="retry-icon">↻</span>
                    ) : downloading ? (
                        <svg className="download-spinner" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                        </svg>
                    ) : (
                        <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
                <div className="document-progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress || 0}%` }} />
                </div>
            )}

            {/* Caption */}
            {caption && <p className="document-caption">{caption}</p>}
        </div>
    );
}

export default DocumentPreview;
