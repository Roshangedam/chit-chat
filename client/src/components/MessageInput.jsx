/**
 * MessageInput Component
 * Input field for sending messages with reply and edit support
 * Supports both individual and group chats via props
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import socket from '../socket';
import useMessageStore from '../store/messageStore';
import useGroupMessageStore from '../store/groupMessageStore';
import useUserStore from '../store/userStore';
import usePeerStore from '../store/peerStore';
import useGroupStore from '../store/groupStore';
import MediaUpload from './MediaUpload';
import AudioRecorder from './AudioRecorder';
import './MessageInput.css';

function MessageInput({ peerId, replyingTo, onCancelReply, editingMessage, onCancelEdit, isGroup = false, groupId, onSend, onTyping }) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [selectedStickerPack, setSelectedStickerPack] = useState(0);
    const [showMediaUpload, setShowMediaUpload] = useState(false);
    const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [droppedFile, setDroppedFile] = useState(null); // For drag-drop/paste
    const [isDragging, setIsDragging] = useState(false);
    const [showAudioRecorder, setShowAudioRecorder] = useState(false);
    const typingTimeoutRef = useRef(null);

    // Refs for click-outside detection
    const emojiPickerRef = useRef(null);
    const gifPickerRef = useRef(null);
    const stickerPickerRef = useRef(null);
    const attachmentMenuRef = useRef(null);

    // Predefined sticker packs
    const stickerPacks = [
        { name: 'Emotions', icon: '😊', stickers: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '😯', '😲', '😴', '🤤', '😪', '😵', '🤯', '🤠', '🥳'] },
        { name: 'Gestures', icon: '👋', stickers: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤝', '🙏', '💪'] },
        { name: 'Hearts', icon: '❤️', stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '😘', '😻', '💑', '👩‍❤️‍👨', '💏', '🥰', '😍', '🤩'] },
        { name: 'Animals', icon: '🐱', stickers: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴'] },
        { name: 'Food', icon: '🍕', stickers: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🌮', '🍕', '🍔', '🍟', '🌭', '🥪', '🍿', '🧁', '🍰', '🍩'] }
    ];

    const isTypingRef = useRef(false);
    const inputRef = useRef(null);
    const { currentUser } = useUserStore();

    // Click outside to close popups
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Close emoji picker
            if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
            // Close GIF picker
            if (showGifPicker && gifPickerRef.current && !gifPickerRef.current.contains(e.target)) {
                setShowGifPicker(false);
            }
            // Close sticker picker
            if (showStickerPicker && stickerPickerRef.current && !stickerPickerRef.current.contains(e.target)) {
                setShowStickerPicker(false);
            }
            // Close attachment menu
            if (showAttachmentMenu && attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target)) {
                setShowAttachmentMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker, showGifPicker, showStickerPicker, showAttachmentMenu]);

    // Focus input when replying or editing
    useEffect(() => {
        if (replyingTo || editingMessage) {
            inputRef.current?.focus();
        }
    }, [replyingTo, editingMessage]);

    // Pre-fill input when editing
    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.content || '');
        }
    }, [editingMessage]);

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (!isTypingRef.current && !editingMessage) {
            isTypingRef.current = true;

            // Use onTyping prop if provided (for groups)
            if (onTyping) {
                onTyping(true);
            } else {
                socket.emit('typing:start', { receiverId: peerId });
            }
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            if (onTyping) {
                onTyping(false);
            } else {
                socket.emit('typing:stop', { receiverId: peerId });
            }
        }, 2000);
    }, [peerId, editingMessage, onTyping]);

    const handleChange = (e) => {
        setMessage(e.target.value);
        if (!editingMessage) {
            handleTyping();
        }
        // Auto-resize textarea
        autoResizeTextarea(e.target);
    };

    // Auto-resize textarea based on content
    const autoResizeTextarea = (textarea) => {
        if (!textarea) return;
        textarea.style.height = 'auto';
        const maxHeight = 120; // Max ~4-5 lines
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    };

    const handleSend = () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || isSending) return;

        setIsSending(true);

        // Clear typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (isTypingRef.current) {
            if (onTyping) {
                onTyping(false);
            } else {
                socket.emit('typing:stop', { receiverId: peerId });
            }
            isTypingRef.current = false;
        }

        // Handle EDIT vs SEND
        if (editingMessage) {
            // Send edit to server
            if (isGroup) {
                socket.emit('group:message:edit', {
                    groupId: groupId || peerId,
                    messageId: editingMessage.id,
                    newContent: trimmedMessage
                });
            } else {
                socket.emit('message:edit', {
                    messageId: editingMessage.id,
                    newContent: trimmedMessage,
                    receiverId: peerId
                });
            }

            setMessage('');
            setIsSending(false);
            if (onCancelEdit) onCancelEdit();
            return;
        }

        // For groups, use the onSend prop if provided
        if (isGroup && onSend) {
            onSend(trimmedMessage, 'text', { replyToId: replyingTo?.id });
            setMessage('');
            setIsSending(false);
            if (onCancelReply) onCancelReply();
            return;
        }

        // Generate temp ID for optimistic update (individual chat)
        const tempId = `temp-${Date.now()}`;

        // Add message optimistically (with reply info)
        useMessageStore.getState().addMessage(peerId, {
            id: tempId,
            sender_id: currentUser?.id,
            receiver_id: peerId,
            content: trimmedMessage,
            type: 'text',
            status: 'sending',
            reply_to: replyingTo?.id || null,
            repliedMessage: replyingTo || null,
            created_at: new Date().toISOString()
        });

        // Send to server (with replyTo if replying)
        socket.emit('message:send', {
            receiverId: peerId,
            content: trimmedMessage,
            tempId: tempId,
            replyTo: replyingTo?.id || null
        });

        // Move this peer to top of chat list with last message preview and status
        usePeerStore.getState().movePeerToTop(peerId, trimmedMessage, currentUser?.id, 'text', 'sending');

        setMessage('');
        setIsSending(false);

        // Clear reply after sending
        if (onCancelReply) {
            onCancelReply();
        }
    };

    // Handle keyboard - Enter to send, Ctrl+Enter for newline
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey || e.shiftKey) {
                // Insert newline at cursor position
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = message.substring(0, start) + '\n' + message.substring(end);
                setMessage(newValue);
                // Move cursor after newline
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                    autoResizeTextarea(textarea);
                }, 0);
                return;
            }
            // Send message on plain Enter
            e.preventDefault();
            handleSend();
            // Reset textarea height after send
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleCancel = () => {
        if (editingMessage) {
            setMessage('');
            if (onCancelEdit) onCancelEdit();
        } else if (replyingTo) {
            if (onCancelReply) onCancelReply();
        }
    };

    // Handle emoji selection
    const onEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(prev => !prev);
        setShowGifPicker(false);
        setShowStickerPicker(false);
    };

    // GIF Functions
    const toggleGifPicker = () => {
        setShowGifPicker(prev => !prev);
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
        if (!showGifPicker) {
            // Load trending GIFs on open
            searchGifs('');
        }
    };

    // Sticker Functions
    const toggleStickerPicker = () => {
        setShowStickerPicker(prev => !prev);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setShowAttachmentMenu(false);
    };

    // Attachment Menu Toggle
    const toggleAttachmentMenu = () => {
        setShowAttachmentMenu(prev => !prev);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setShowStickerPicker(false);
    };

    // Media Upload Functions - Open modal for image or video
    const openMediaUpload = (type) => {
        setMediaType(type);
        setShowMediaUpload(true);
        setShowAttachmentMenu(false);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setShowStickerPicker(false);
    };

    // Detect media type from file
    const getMediaTypeFromFile = (file) => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        // Any other file type is a document
        return 'document';
    };

    // Handle drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    // Handle drag leave
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    // Handle drop - open MediaUpload with dropped file
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const type = getMediaTypeFromFile(file);
        setDroppedFile(file);
        setMediaType(type);
        setShowMediaUpload(true);
    };

    // Handle paste - detect files from clipboard (images, videos, documents)
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let item of items) {
            // Check if it's a file (not just text)
            if (item.kind === 'file') {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const type = getMediaTypeFromFile(file);
                    setDroppedFile(file);
                    setMediaType(type);
                    setShowMediaUpload(true);
                }
                break;
            }
        }
    };

    // Clear dropped file when modal closes
    const handleMediaUploadClose = () => {
        setShowMediaUpload(false);
        setDroppedFile(null);
    };

    // Unified handler for media upload - does background upload with progress in chat
    const handleMediaUploadComplete = (fileData) => {
        if (!peerId || !currentUser) return;

        const tempId = `temp-${Date.now()}`;
        const serverUrl = ''; // Same origin - use relative URLs
        const typeEmoji = mediaType === 'video' ? '🎬 Video' : mediaType === 'document' ? '📎 Document' : '📷 Photo';
        const config = fileData.config;

        // For documents, use type 'file' for message type
        const messageType = mediaType === 'document' ? 'file' : mediaType;

        // Add message to chat immediately with uploading state
        useMessageStore.getState().addMessage(peerId, {
            id: tempId,
            sender_id: currentUser.id,
            receiver_id: peerId,
            content: fileData.previewUrl || fileData.file.name, // For documents, use filename as content initially
            type: messageType,
            caption: fileData.caption || null,
            status: 'uploading',
            uploadProgress: 0,
            uploadStatus: 'uploading',
            created_at: new Date().toISOString(),
            reply_to: replyingTo?.id || null,
            repliedMessage: replyingTo || null,
            fileSize: fileData.file.size,
            fileName: fileData.file.name // Store original filename for documents
        });

        setShowMediaUpload(false);
        if (replyingTo && onCancelReply) onCancelReply();
        usePeerStore.getState().movePeerToTop(peerId, typeEmoji, currentUser.id, messageType, 'sending');

        // Background upload
        const formData = new FormData();
        formData.append(config.fieldName, fileData.file);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                useMessageStore.getState().updateUploadProgress(peerId, tempId, percent, 'uploading');
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const fullUrl = response.file.url; // Relative URL - same origin
                        // Update message with final URL
                        useMessageStore.getState().updateMessage(peerId, tempId, {
                            content: fullUrl,
                            uploadProgress: 100,
                            uploadStatus: 'complete',
                            status: 'sending',
                            fileName: response.file.originalName || fileData.file.name
                        });
                        // Now emit to socket
                        socket.emit('message:send', {
                            tempId,
                            content: fullUrl,
                            type: messageType,
                            caption: fileData.caption || null,
                            receiverId: peerId,
                            replyTo: replyingTo?.id || null,
                            fileName: response.file.originalName || fileData.file.name,
                            fileSize: fileData.file.size
                        });
                        if (fileData.previewUrl) URL.revokeObjectURL(fileData.previewUrl);
                    } else {
                        useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'failed');
                    }
                } catch (e) {
                    useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'failed');
                }
            } else {
                useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'failed');
            }
        };

        xhr.onerror = () => {
            useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'failed');
        };

        xhr.open('POST', config.uploadEndpoint); // Relative URL
        xhr.send(formData);
    };

    // Open sticker picker from attachment menu
    const openStickerFromMenu = () => {
        setShowAttachmentMenu(false);
        setShowStickerPicker(true);
    };

    const sendSticker = (sticker) => {
        if (!peerId || !currentUser) return;

        const tempId = `temp-${Date.now()}`;
        const messageData = {
            tempId,
            content: sticker,
            type: 'sticker',
            receiverId: peerId,
            replyTo: replyingTo?.id || null
        };

        // Optimistic update
        useMessageStore.getState().addMessage(peerId, {
            id: tempId,
            sender_id: currentUser.id,
            receiver_id: peerId,
            content: sticker,
            type: 'sticker',
            status: 'sending',
            created_at: new Date().toISOString(),
            reply_to: replyingTo?.id || null,
            repliedMessage: replyingTo || null
        });

        socket.emit('message:send', messageData);
        setShowStickerPicker(false);
        if (replyingTo && onCancelReply) onCancelReply();

        // Update peer list with status
        usePeerStore.getState().movePeerToTop(peerId, sticker, currentUser.id, 'sticker', 'sending');
    };

    // Handle audio recording complete - upload and send
    const handleAudioRecordingComplete = (recordingData) => {
        if (!peerId || !currentUser) return;

        const { blob, duration } = recordingData;
        const tempId = `temp-${Date.now()}`;
        const serverUrl = ''; // Same origin - use relative URLs
        const previewUrl = URL.createObjectURL(blob);

        // Add message to chat immediately with uploading state
        useMessageStore.getState().addMessage(peerId, {
            id: tempId,
            sender_id: currentUser.id,
            receiver_id: peerId,
            content: previewUrl,
            type: 'audio',
            duration: duration,
            status: 'uploading',
            uploadProgress: 0,
            uploadStatus: 'uploading',
            created_at: new Date().toISOString(),
            reply_to: replyingTo?.id || null,
            repliedMessage: replyingTo || null,
            fileSize: blob.size
        });

        setShowAudioRecorder(false);
        if (replyingTo && onCancelReply) onCancelReply();
        usePeerStore.getState().movePeerToTop(peerId, '🎵 Audio', currentUser.id, 'audio', 'sending');

        // Background upload
        const formData = new FormData();
        formData.append('audio', blob, `voice-${Date.now()}.webm`);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                useMessageStore.getState().updateUploadProgress(peerId, tempId, percent, 'uploading');
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const fileUrl = response.file.url; // Relative URL

                        // Update message with uploaded URL
                        useMessageStore.getState().updateUploadProgress(peerId, tempId, 100, 'complete');
                        useMessageStore.getState().updateMessage(peerId, tempId, {
                            content: fileUrl,
                            uploadStatus: 'complete'
                        });

                        // Send to server via socket
                        socket.emit('message:send', {
                            receiverId: peerId,
                            content: fileUrl,
                            type: 'audio',
                            tempId: tempId,
                            replyTo: replyingTo?.id || null
                        });

                        URL.revokeObjectURL(previewUrl);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                    useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'error');
                }
            } else {
                useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'error');
            }
        };

        xhr.onerror = () => {
            useMessageStore.getState().updateUploadProgress(peerId, tempId, 0, 'error');
        };

        xhr.open('POST', '/api/upload/audio'); // Relative URL
        xhr.send(formData);
    };

    const searchGifs = async (query) => {
        setLoadingGifs(true);
        try {
            // Using Tenor API (free, no key required for basic use)
            const endpoint = query
                ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20`
                : `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20`;

            const response = await fetch(endpoint);
            const data = await response.json();
            setGifs(data.results || []);
        } catch (error) {
            console.error('Error fetching GIFs:', error);
            setGifs([]);
        }
        setLoadingGifs(false);
    };

    const handleGifSearch = (e) => {
        const query = e.target.value;
        setGifSearch(query);
        // Debounce search
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            searchGifs(query);
        }, 300);
    };

    const sendGif = (gif) => {
        if (!peerId || !currentUser) return;

        const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
        if (!gifUrl) return;

        const tempId = `temp-${Date.now()}`;
        const messageData = {
            tempId,
            content: gifUrl,
            type: 'gif',
            receiverId: peerId,
            replyTo: replyingTo?.id || null
        };

        // Optimistic update
        useMessageStore.getState().addMessage(peerId, {
            id: tempId,
            sender_id: currentUser.id,
            receiver_id: peerId,
            content: gifUrl,
            type: 'gif',
            status: 'sending',
            created_at: new Date().toISOString(),
            reply_to: replyingTo?.id || null,
            repliedMessage: replyingTo || null
        });

        socket.emit('message:send', messageData);
        setShowGifPicker(false);
        setGifSearch('');
        if (replyingTo && onCancelReply) onCancelReply();

        // Update peer list with message type and status
        usePeerStore.getState().movePeerToTop(peerId, gifUrl, currentUser.id, 'gif', 'sending');
    };

    return (
        <div
            className={`message-input-container ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Edit Preview */}
            {editingMessage && (
                <div className="edit-preview">
                    <div className="edit-bar"></div>
                    <div className="edit-content">
                        <span className="edit-label">✏️ Editing message</span>
                        <span className="edit-text">
                            {editingMessage.content?.substring(0, 60)}
                            {editingMessage.content?.length > 60 ? '...' : ''}
                        </span>
                    </div>
                    <button className="cancel-edit" onClick={handleCancel}>
                        ✕
                    </button>
                </div>
            )}

            {/* Reply Preview (only if not editing) */}
            {replyingTo && !editingMessage && (
                <div className="reply-preview">
                    <div className="reply-bar"></div>
                    <div className="reply-content">
                        <span className="reply-label">
                            Replying to {replyingTo.sender_id === currentUser?.id ? 'yourself' : 'them'}
                        </span>
                        <span className="reply-text">
                            {replyingTo.type === 'image' ? (
                                '📷 Photo'
                            ) : replyingTo.type === 'video' ? (
                                '🎬 Video'
                            ) : replyingTo.type === 'gif' ? (
                                'GIF'
                            ) : replyingTo.type === 'sticker' ? (
                                replyingTo.content
                            ) : (
                                <>
                                    {replyingTo.content?.substring(0, 60)}
                                    {replyingTo.content?.length > 60 ? '...' : ''}
                                </>
                            )}
                        </span>
                    </div>
                    <button className="cancel-reply" onClick={handleCancel}>
                        ✕
                    </button>
                </div>
            )}

            <div className="message-input">
                {/* Emoji Picker Toggle */}
                <button
                    className="emoji-toggle-btn"
                    onClick={toggleEmojiPicker}
                    type="button"
                >
                    😊
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                    <div className="emoji-picker-popup" ref={emojiPickerRef}>
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme="dark"
                            width={300}
                            height={400}
                            searchPlaceHolder="Search emoji..."
                            skinTonesDisabled
                        />
                    </div>
                )}

                {/* GIF Picker Toggle */}
                <button
                    className="gif-toggle-btn"
                    onClick={toggleGifPicker}
                    type="button"
                >
                    GIF
                </button>

                {/* GIF Picker Popup */}
                {showGifPicker && (
                    <div className="gif-picker-popup" ref={gifPickerRef}>
                        <input
                            type="text"
                            placeholder="Search GIFs..."
                            value={gifSearch}
                            onChange={handleGifSearch}
                            className="gif-search-input"
                        />
                        <div className="gif-grid">
                            {loadingGifs ? (
                                <div className="gif-loading">Loading...</div>
                            ) : gifs.length > 0 ? (
                                gifs.map((gif) => (
                                    <img
                                        key={gif.id}
                                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                                        alt={gif.content_description || 'GIF'}
                                        onClick={() => sendGif(gif)}
                                        className="gif-item"
                                    />
                                ))
                            ) : (
                                <div className="gif-empty">No GIFs found</div>
                            )}
                        </div>
                        <div className="gif-powered">Powered by Tenor</div>
                    </div>
                )}

                {/* Attachment Menu Toggle */}
                <button
                    className="attachment-toggle-btn"
                    onClick={toggleAttachmentMenu}
                    type="button"
                    title="Attachments"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                </button>

                {/* Attachment Menu Popup */}
                {showAttachmentMenu && (
                    <div className="attachment-menu-popup" ref={attachmentMenuRef}>
                        <div className="attachment-menu-header">Share</div>
                        <div className="attachment-menu-grid">
                            <button className="attachment-option image-opt" onClick={() => openMediaUpload('image')}>
                                <span className="attachment-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21,15 16,10 5,21" />
                                    </svg>
                                </span>
                                <span className="attachment-label">Photo</span>
                            </button>
                            <button className="attachment-option video-opt" onClick={() => openMediaUpload('video')}>
                                <span className="attachment-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="23,7 16,12 23,17 23,7" />
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                    </svg>
                                </span>
                                <span className="attachment-label">Video</span>
                            </button>
                            <button className="attachment-option audio-opt" onClick={() => { setShowAttachmentMenu(false); setShowAudioRecorder(true); }}>
                                <span className="attachment-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </span>
                                <span className="attachment-label">Audio</span>
                            </button>
                            <button className="attachment-option doc-opt" onClick={() => openMediaUpload('document')}>
                                <span className="attachment-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                </span>
                                <span className="attachment-label">Document</span>
                            </button>
                            <button className="attachment-option sticker-opt" onClick={openStickerFromMenu}>
                                <span className="attachment-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                        <line x1="9" y1="9" x2="9.01" y2="9" />
                                        <line x1="15" y1="9" x2="15.01" y2="9" />
                                    </svg>
                                </span>
                                <span className="attachment-label">Stickers</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Sticker Picker Popup (triggered from attachment menu) */}
                {showStickerPicker && (
                    <div className="sticker-picker-popup" ref={stickerPickerRef}>
                        <div className="sticker-pack-tabs">
                            {stickerPacks.map((pack, idx) => (
                                <button
                                    key={idx}
                                    className={`pack-tab ${selectedStickerPack === idx ? 'active' : ''}`}
                                    onClick={() => setSelectedStickerPack(idx)}
                                >
                                    {pack.icon}
                                </button>
                            ))}
                        </div>
                        <div className="sticker-grid">
                            {stickerPacks[selectedStickerPack].stickers.map((sticker, idx) => (
                                <button
                                    key={idx}
                                    className="sticker-item"
                                    onClick={() => sendSticker(sticker)}
                                >
                                    {sticker}
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                <textarea
                    ref={inputRef}
                    placeholder={editingMessage ? "Edit your message..." : (replyingTo ? "Type your reply..." : "Type a message...")}
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    disabled={isSending}
                    rows={1}
                />
                <button
                    className={`send-button ${editingMessage ? 'edit-mode' : ''}`}
                    onClick={handleSend}
                    disabled={!message.trim() || isSending}
                >
                    {editingMessage ? (
                        <span>✓</span>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Unified Media Upload Modal */}
            {showMediaUpload && (
                <MediaUpload
                    mediaType={mediaType}
                    initialFile={droppedFile}
                    onUploadComplete={handleMediaUploadComplete}
                    onCancel={handleMediaUploadClose}
                />
            )}

            {/* Audio Recorder */}
            {showAudioRecorder && (
                <div className="audio-recorder-overlay">
                    <AudioRecorder
                        onRecordingComplete={handleAudioRecordingComplete}
                        onCancel={() => setShowAudioRecorder(false)}
                    />
                </div>
            )}
        </div>
    );
}

export default MessageInput;
