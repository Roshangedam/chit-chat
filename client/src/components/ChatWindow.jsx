/**
 * ChatWindow Component
 * Displays messages with selected peer
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePeerStore from '../store/peerStore';
import useMessageStore from '../store/messageStore';
import useUserStore from '../store/userStore';
import MessageInput from './MessageInput';
import Message from './Message';
import ForwardModal from './ForwardModal';
import MediaGallery from './MediaGallery';
import UserAvatar from './UserAvatar';
import ProfileInfoModal from './ProfileInfoModal';
import socket from '../socket';
import './ChatWindow.css';

function ChatWindow() {
    const selectedPeer = usePeerStore((state) => state.selectedPeer);
    const currentUser = useUserStore((state) => state.currentUser);
    const allMessages = useMessageStore((state) => state.messages);
    const typingUsers = useMessageStore((state) => state.typingUsers);

    // Navigation states
    const jumpedToMessage = useMessageStore((state) => state.jumpedToMessage);
    const hasOlder = useMessageStore((state) => state.hasOlder);
    const hasNewer = useMessageStore((state) => state.hasNewer);
    const loadingOlder = useMessageStore((state) => state.loadingOlder);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const readSentRef = useRef(new Set());
    const loadMoreTriggerRef = useRef(null);
    const scrollHeightBeforeLoad = useRef(0);

    // Reply state
    const [replyingTo, setReplyingTo] = useState(null);

    // Forward state
    const [forwardingMessage, setForwardingMessage] = useState(null);

    // Edit state
    const [editingMessage, setEditingMessage] = useState(null);

    // Search state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Header menu state
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // Media gallery state
    const [showMediaGallery, setShowMediaGallery] = useState(false);

    // Profile info modal state
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Show Go to Recent button
    const [showGoToRecent, setShowGoToRecent] = useState(false);

    // Chat loading state - single source of truth
    const [chatLoading, setChatLoading] = useState(true);

    // Previous peer tracking
    const prevPeerIdRef = useRef(null);

    // Click outside to close header menu and search panel
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Close header menu
            if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
            // Close search panel when clicking outside (in chat area)
            if (showSearch && e.target.closest('.chat-window') && !e.target.closest('.search-panel') && !e.target.closest('.search-toggle-btn')) {
                setShowSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu, showSearch]);

    const messages = selectedPeer ? (allMessages[selectedPeer.id] || []) : [];
    const isTyping = selectedPeer ? typingUsers[selectedPeer.id] : false;
    // Default hasOlder to true since we initially load 100 messages
    const peerHasOlder = selectedPeer ? (hasOlder[selectedPeer.id] !== false) : false;
    const peerHasNewer = selectedPeer ? hasNewer[selectedPeer.id] : false;

    // === PEER CHANGE: Fetch messages ===
    useEffect(() => {
        if (!selectedPeer) return;

        const peerChanged = prevPeerIdRef.current !== selectedPeer.id;
        prevPeerIdRef.current = selectedPeer.id;

        if (peerChanged) {
            setChatLoading(true);
            setShowGoToRecent(false);
            readSentRef.current.clear();
            setReplyingTo(null);
            socket.emit('messages:fetch', { peerId: selectedPeer.id });
        }
    }, [selectedPeer?.id]);

    // === INITIAL LOAD: Scroll to bottom ===
    useEffect(() => {
        if (!chatLoading || messages.length === 0) return;

        const timer = setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
            setChatLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, [messages.length, chatLoading]);

    // === NEW MESSAGE: Scroll if at bottom ===
    useEffect(() => {
        if (chatLoading || messages.length === 0) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages.length, chatLoading]);

    // Send read receipts
    useEffect(() => {
        if (!selectedPeer || !currentUser) return;

        const unreadFromPeer = messages.filter(msg =>
            msg.sender_id === selectedPeer.id &&
            msg.status !== 'read' &&
            !readSentRef.current.has(msg.id)
        );

        if (unreadFromPeer.length > 0 && document.hasFocus()) {
            const messageIds = unreadFromPeer.map(m => m.id);
            messageIds.forEach(id => readSentRef.current.add(id));

            socket.emit('message:read', {
                senderId: selectedPeer.id,
                messageIds: messageIds
            });
        }
    }, [messages, selectedPeer?.id, currentUser?.id]);

    // Listen for search results
    useEffect(() => {
        const handleSearchResults = (data) => {
            setSearchResults(data.results || []);
        };

        socket.on('messages:search:results', handleSearchResults);
        return () => socket.off('messages:search:results', handleSearchResults);
    }, []);

    // Auto-scroll when typing indicator appears (if near bottom)
    useEffect(() => {
        if (!isTyping) return;

        const container = messagesContainerRef.current;
        if (!container) return;

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 200) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }, [isTyping]);

    // Handle scroll for Go to Recent button visibility
    const handleScroll = useCallback(() => {
        if (chatLoading) return; // Don't show during loading

        const container = messagesContainerRef.current;
        if (!container) return;

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowGoToRecent(distanceFromBottom > 500);
    }, [chatLoading]);

    // Add scroll listener
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Highlight jumped-to message
    useEffect(() => {
        if (jumpedToMessage) {
            const messageElement = document.getElementById(`message-${jumpedToMessage}`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlight-message');
                setTimeout(() => {
                    messageElement.classList.remove('highlight-message');
                    useMessageStore.getState().clearJumpedToMessage();
                }, 2000);
            }
        }
    }, [jumpedToMessage, messages]);

    // Infinite scroll up - load older messages
    useEffect(() => {
        if (!selectedPeer || loadingOlder) return;
        if (!peerHasOlder) return;
        if (chatLoading) return; // Wait until chat is loaded
        if (messages.length === 0) return;

        const container = messagesContainerRef.current;
        const trigger = loadMoreTriggerRef.current;
        if (!container || !trigger) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingOlder) {
                    scrollHeightBeforeLoad.current = container.scrollHeight;

                    useMessageStore.getState().setLoadingOlder(true);
                    const oldestId = messages[0].id;
                    console.log('Loading older messages before:', oldestId);
                    socket.emit('messages:loadOlder', {
                        peerId: selectedPeer.id,
                        beforeId: oldestId
                    });
                }
            },
            {
                root: container,
                threshold: 0.1,
                rootMargin: '100px 0px 0px 0px'
            }
        );

        observer.observe(trigger);

        return () => observer.disconnect();
    }, [selectedPeer?.id, peerHasOlder, loadingOlder, messages.length, chatLoading]);

    // Restore scroll position after prepending older messages
    useEffect(() => {
        if (scrollHeightBeforeLoad.current > 0 && messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - scrollHeightBeforeLoad.current;
            messagesContainerRef.current.scrollTop = scrollDiff;
            scrollHeightBeforeLoad.current = 0;
        }
    }, [messages.length]);

    // Jump to message function (for search results and gallery)
    const jumpToMessage = useCallback((messageId) => {
        // Check if message is already loaded
        const existingMessage = messages.find(m => m.id === messageId);
        if (existingMessage) {
            // Just scroll to it
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlight-message');
                setTimeout(() => messageElement.classList.remove('highlight-message'), 2000);
            }
        } else {
            // Need to fetch messages around this ID
            socket.emit('messages:jump', {
                peerId: selectedPeer.id,
                messageId: messageId
            });
        }
        // Close search panel
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    }, [messages, selectedPeer?.id]);

    // Go to recent messages
    const goToRecent = useCallback(() => {
        // Hide button immediately
        setShowGoToRecent(false);

        // Reset loading state to trigger fresh load
        setChatLoading(true);

        // Fetch fresh messages
        socket.emit('messages:fetch', { peerId: selectedPeer.id });
    }, [selectedPeer?.id]);

    // Handle search
    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length >= 2) {
            socket.emit('messages:search', {
                query: query.trim(),
                peerId: selectedPeer?.id
            });
        } else {
            setSearchResults([]);
        }
    };

    // Toggle search
    const toggleSearch = () => {
        setShowSearch(!showSearch);
        if (showSearch) {
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    // Handle reply to message
    const handleReply = (message) => {
        setReplyingTo(message);
    };

    // Cancel reply
    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    // Handle forward message
    const handleForward = (message) => {
        setForwardingMessage(message);
    };

    // Close forward modal
    const handleCloseForward = () => {
        setForwardingMessage(null);
    };

    // Handle edit message
    const handleEdit = (message) => {
        setEditingMessage(message);
        setReplyingTo(null); // Clear reply when editing
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingMessage(null);
    };

    // Scroll to specific message
    const handleScrollToMessage = (messageId) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight');
            setTimeout(() => element.classList.remove('highlight'), 2000);
        }
    };

    // Handle delete message
    const handleDelete = (message, deleteForEveryone) => {
        socket.emit('message:delete', {
            messageId: message.id,
            receiverId: selectedPeer.id,
            deleteForEveryone: deleteForEveryone
        });
    };

    // Handle pin/unpin message
    const handlePin = (message, shouldPin) => {
        if (shouldPin) {
            socket.emit('message:pin', {
                messageId: message.id,
                peerId: selectedPeer.id
            });
        } else {
            socket.emit('message:unpin', {
                messageId: message.id,
                peerId: selectedPeer.id
            });
        }
    };

    // Format date for separator (Today, Yesterday, or full date)
    const formatDateSeparator = (timestamp) => {
        if (!timestamp) return null;
        const date = new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    // Format time for search results
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z');
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Check if we should show date separator between messages
    const shouldShowDateSeparator = (currentMsg, prevMsg) => {
        if (!prevMsg) return true; // First message always shows date

        const currentDate = currentMsg.created_at;
        const prevDate = prevMsg.created_at;

        if (!currentDate || !prevDate) return false;

        const current = new Date(currentDate.includes('T') ? currentDate : currentDate.replace(' ', 'T') + 'Z');
        const prev = new Date(prevDate.includes('T') ? prevDate : prevDate.replace(' ', 'T') + 'Z');

        return current.toDateString() !== prev.toDateString();
    };

    if (!selectedPeer) {
        return (
            <div className="chat-window empty">
                <div className="empty-chat">
                    <span className="emoji">💬</span>
                    <h3>Welcome to ChitChat</h3>
                    <p>Select a conversation to start messaging</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-header">
                <UserAvatar user={selectedPeer} size="medium" showStatus={true} onClick={() => setShowProfileModal(true)} />
                <div className="peer-details">
                    <span className="peer-name">{selectedPeer.name}</span>
                    <span className={`peer-status ${isTyping ? 'typing' : ''}`}>
                        {isTyping ? (
                            <span className="typing-status">typing...</span>
                        ) : (
                            selectedPeer.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(selectedPeer.last_seen)}`
                        )}
                    </span>
                </div>

                {/* 3-dot Menu */}
                <div className="header-menu-container" ref={menuRef}>
                    <button
                        className="menu-toggle-btn"
                        onClick={() => setShowMenu(!showMenu)}
                        title="More options"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                        </svg>
                    </button>
                    {showMenu && (
                        <div className="header-dropdown-menu">
                            <button onClick={() => { toggleSearch(); setShowMenu(false); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <span>Search Messages</span>
                            </button>
                            <button onClick={() => { setShowMediaGallery(true); setShowMenu(false); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span>Media</span>
                            </button>
                            <button onClick={() => setShowMenu(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="12" y2="5" />
                                    <line x1="19" y1="12" x2="12" y2="5" />
                                </svg>
                                <span>Pinned Messages</span>
                            </button>
                            <button onClick={() => setShowMenu(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Clear Chat</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Panel */}
            {showSearch && (
                <div className="search-panel">
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={handleSearch}
                        autoFocus
                    />
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            <div className="search-count">{searchResults.length} results found</div>
                            {searchResults.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="search-result-item"
                                    onClick={() => jumpToMessage(msg.id)}
                                >
                                    <span className="result-content">{msg.content}</span>
                                    <span className="result-time">{formatTime(msg.created_at)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className={`messages-container ${chatLoading ? 'loading' : 'ready'}`} ref={messagesContainerRef}>
                {/* Load More Trigger at Top - only show when loaded */}
                {!chatLoading && peerHasOlder && (
                    <div ref={loadMoreTriggerRef} className="load-more-trigger">
                        {loadingOlder && (
                            <div className="loading-older">
                                <div className="loading-spinner"></div>
                                <span>Loading older messages...</span>
                            </div>
                        )}
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet</p>
                        <p className="hint">Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);

                        return (
                            <React.Fragment key={msg.id || `msg-${index}`}>
                                {/* Date Separator */}
                                {showDateSeparator && (
                                    <div className="date-separator">
                                        <span>{formatDateSeparator(msg.created_at)}</span>
                                    </div>
                                )}

                                <Message
                                    message={msg}
                                    isMine={msg.sender_id === currentUser?.id}
                                    currentUserId={currentUser?.id}
                                    selectedPeerId={selectedPeer.id}
                                    onReply={handleReply}
                                    onForward={handleForward}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onPin={handlePin}
                                    onScrollToMessage={handleScrollToMessage}
                                />
                            </React.Fragment>
                        );
                    })
                )}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="typing-indicator">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="text">{selectedPeer.name} is typing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />

                {/* Go to Recent Button */}
                {showGoToRecent && (
                    <button className="go-to-recent-btn" onClick={goToRecent}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <polyline points="19 12 12 19 5 12" />
                        </svg>
                        <span>Go to Recent</span>
                    </button>
                )}
            </div>

            {/* Input with reply/edit */}
            <MessageInput
                peerId={selectedPeer.id}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
            />

            {/* Forward Modal */}
            {forwardingMessage && (
                <ForwardModal
                    message={forwardingMessage}
                    onClose={handleCloseForward}
                />
            )}

            {/* Media Gallery */}
            {showMediaGallery && (
                <MediaGallery
                    peerId={selectedPeer.id}
                    onClose={() => setShowMediaGallery(false)}
                />
            )}

            {/* Profile Info Modal */}
            {showProfileModal && (
                <ProfileInfoModal
                    user={selectedPeer}
                    onClose={() => setShowProfileModal(false)}
                    onSelectPeer={() => { }}
                />
            )}
        </div>
    );
}

function formatLastSeen(lastSeen) {
    if (!lastSeen) return 'recently';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default ChatWindow;
