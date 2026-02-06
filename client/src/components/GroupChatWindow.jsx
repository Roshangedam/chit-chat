/**
 * Group Chat Window
 * Component for displaying and interacting with group messages
 * Matches features of individual ChatWindow
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useGroupStore from '../store/groupStore';
import useGroupMessageStore from '../store/groupMessageStore';
import useUserStore from '../store/userStore';
import socket from '../socket';
import Message from './Message';
import MessageInput from './MessageInput';
import ForwardModal from './ForwardModal';
import UserAvatar from './UserAvatar';
import GroupInfoPanel from './GroupInfoPanel';
import './GroupChatWindow.css';

function GroupChatWindow() {
    // Get stable selectors from stores
    const selectedGroup = useGroupStore((state) => state.selectedGroup);
    const clearSelectedGroup = useGroupStore((state) => state.clearSelectedGroup);
    const clearUnread = useGroupStore((state) => state.clearUnread);
    const setGroupMembers = useGroupStore((state) => state.setGroupMembers);
    const allGroupMembers = useGroupStore((state) => state.groupMembers);
    const allTypingUsers = useGroupStore((state) => state.typingUsers);

    // Message store
    const allMessages = useGroupMessageStore((state) => state.messages);
    const setMessages = useGroupMessageStore((state) => state.setMessages);
    const addMessage = useGroupMessageStore((state) => state.addMessage);
    const setLoading = useGroupMessageStore((state) => state.setLoading);
    const setHasMore = useGroupMessageStore((state) => state.setHasMore);
    const loading = useGroupMessageStore((state) => state.loading);
    const hasMoreState = useGroupMessageStore((state) => state.hasMore);

    const currentUser = useUserStore((state) => state.currentUser);

    // Derived values
    const groupId = selectedGroup?.id;
    const groupMembers = groupId ? (allGroupMembers[groupId] || []) : [];
    const typingUsers = groupId ? (allTypingUsers[groupId] || []) : [];
    const messages = groupId ? (allMessages[groupId] || []) : [];
    const isLoading = groupId ? (loading[groupId] || false) : false;
    const hasMore = groupId ? (hasMoreState[groupId] !== false) : false;

    // UI States
    const [showInfo, setShowInfo] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
    const [showGoToRecent, setShowGoToRecent] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Reply/Forward/Edit states
    const [replyingTo, setReplyingTo] = useState(null);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    // Search state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const loadMoreTriggerRef = useRef(null);
    const scrollHeightBeforeLoad = useRef(0);
    const prevGroupIdRef = useRef(null);
    const menuRef = useRef(null);

    // === GROUP CHANGE: Fetch messages ===
    useEffect(() => {
        if (!groupId) return;

        const groupChanged = prevGroupIdRef.current !== groupId;
        prevGroupIdRef.current = groupId;

        if (groupChanged) {
            setChatLoading(true);
            setShowGoToRecent(false);
            setReplyingTo(null);
            setEditingMessage(null);

            // Fetch messages
            socket.emit('group:message:get', { groupId, limit: 50 }, (response) => {
                if (response.success) {
                    setMessages(groupId, response.messages || []);
                    setHasMore(groupId, (response.messages || []).length === 50);
                }
                setChatLoading(false);
            });

            // Fetch members
            socket.emit('group:getDetails', { groupId }, (response) => {
                if (response.success) {
                    setGroupMembers(groupId, response.members || []);
                }
            });

            // Clear unread
            clearUnread(groupId);
        }
    }, [groupId]);

    // === INITIAL LOAD: Scroll to bottom ===
    useEffect(() => {
        if (chatLoading || messages.length === 0) return;

        const timer = setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
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

    // Handle scroll for Go to Recent button visibility
    const handleScroll = useCallback(() => {
        if (chatLoading) return;

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

    // Infinite scroll up - load older messages
    useEffect(() => {
        if (!groupId || loadingMore) return;
        if (!hasMore) return;
        if (chatLoading) return;
        if (messages.length === 0) return;

        const container = messagesContainerRef.current;
        const trigger = loadMoreTriggerRef.current;
        if (!container || !trigger) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore) {
                    scrollHeightBeforeLoad.current = container.scrollHeight;
                    setLoadingMore(true);
                    const oldestId = messages[0].id;

                    socket.emit('group:message:getOlder', {
                        groupId,
                        beforeId: oldestId,
                        limit: 50
                    }, (response) => {
                        setLoadingMore(false);
                        if (response.success) {
                            const store = useGroupMessageStore.getState();
                            store.prependMessages(groupId, response.messages || []);
                            setHasMore(groupId, response.hasMore);
                        }
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
    }, [groupId, hasMore, loadingMore, messages.length, chatLoading]);

    // Restore scroll position after prepending older messages
    useEffect(() => {
        if (scrollHeightBeforeLoad.current > 0 && messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - scrollHeightBeforeLoad.current;
            messagesContainerRef.current.scrollTop = scrollDiff;
            scrollHeightBeforeLoad.current = 0;
        }
    }, [messages.length]);

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    // Send message
    const handleSendMessage = useCallback((content, type = 'text', options = {}) => {
        if (!content?.trim() && type === 'text') return;

        console.log('📤 GroupChatWindow: Sending group message:', { groupId, content, type });

        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
            id: tempId,
            sender_id: currentUser?.id,
            sender_name: currentUser?.custom_name || currentUser?.name,
            group_id: groupId,
            content,
            type,
            status: 'sending',
            created_at: new Date().toISOString(),
            reply_to_id: replyingTo?.id || null,
            ...options
        };

        addMessage(groupId, tempMessage);
        setReplyingTo(null);

        socket.emit('group:message:send', {
            groupId,
            content,
            type,
            replyToId: replyingTo?.id,
            ...options
        }, (response) => {
            console.log('📨 GroupChatWindow: Server response:', response);
            if (response?.success) {
                const store = useGroupMessageStore.getState();
                store.updateMessage(groupId, tempId, {
                    id: response.message.id,
                    status: 'sent'
                });
            } else {
                console.error('❌ GroupChatWindow: Failed to send message:', response?.error);
                // Update temp message to show error
                const store = useGroupMessageStore.getState();
                store.updateMessage(groupId, tempId, {
                    status: 'failed'
                });
            }
        });
    }, [groupId, currentUser, replyingTo]);

    // Typing indicator
    const handleTyping = useCallback((isTyping) => {
        socket.emit('group:typing', { groupId, isTyping });
    }, [groupId]);

    // Get typing indicator text
    const getTypingText = () => {
        if (typingUsers.length === 0) return null;
        if (typingUsers.length === 1) {
            // Use userName from typing object (already has name from server)
            return `${typingUsers[0]?.userName || 'Someone'} is typing...`;
        }
        if (typingUsers.length === 2) {
            return `${typingUsers.map(t => t.userName).join(' and ')} are typing...`;
        }
        return 'Several people are typing...';
    };

    // Go to recent messages
    const goToRecent = useCallback(() => {
        setShowGoToRecent(false);
        setChatLoading(true);

        socket.emit('group:message:get', { groupId, limit: 50 }, (response) => {
            if (response.success) {
                setMessages(groupId, response.messages || []);
                setHasMore(groupId, (response.messages || []).length === 50);
            }
            setChatLoading(false);
        });
    }, [groupId]);

    // Handle reply to message
    const handleReply = (message) => {
        setReplyingTo(message);
        setEditingMessage(null);
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
        setReplyingTo(null);
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingMessage(null);
    };

    // Handle delete message
    const handleDelete = (message, deleteForEveryone) => {
        socket.emit('group:message:delete', {
            groupId,
            messageId: message.id,
            deleteForEveryone
        });
    };

    // Handle pin/unpin message
    const handlePin = (message, shouldPin) => {
        if (shouldPin) {
            socket.emit('group:message:pin', { groupId, messageId: message.id });
        } else {
            socket.emit('group:message:unpin', { groupId, messageId: message.id });
        }
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

    // Search
    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length >= 2) {
            socket.emit('group:message:search', { groupId, query: query.trim() }, (response) => {
                if (response.success) {
                    setSearchResults(response.results || []);
                }
            });
        } else {
            setSearchResults([]);
        }
    };

    // Format date for separator
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

    // Check if we should show date separator
    const shouldShowDateSeparator = (currentMsg, prevMsg) => {
        if (!prevMsg) return true;

        const currentDate = currentMsg.created_at;
        const prevDate = prevMsg.created_at;

        if (!currentDate || !prevDate) return false;

        const current = new Date(currentDate.includes('T') ? currentDate : currentDate.replace(' ', 'T') + 'Z');
        const prev = new Date(prevDate.includes('T') ? prevDate : prevDate.replace(' ', 'T') + 'Z');

        return current.toDateString() !== prev.toDateString();
    };

    // Format time
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

    // Get my role
    const myRole = groupMembers.find(m => m.user_id === currentUser?.id)?.role || 'member';
    const isAdmin = myRole === 'admin' || myRole === 'creator';

    if (!selectedGroup) {
        return (
            <div className="chat-window empty">
                <div className="empty-chat">
                    <span className="emoji">👥</span>
                    <h3>Select a group</h3>
                    <p>Choose a group from the sidebar to start chatting</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window group-chat-window">
            {/* Header */}
            <div className="chat-header">
                <div className="group-avatar" onClick={() => setShowInfo(!showInfo)}>
                    {selectedGroup.avatar ? (
                        <img src={selectedGroup.avatar} alt="" className="avatar-img" />
                    ) : (
                        <div className="avatar-placeholder">
                            {selectedGroup.name?.[0]?.toUpperCase() || '👥'}
                        </div>
                    )}
                </div>
                <div className="peer-details" onClick={() => setShowInfo(!showInfo)}>
                    <span className="peer-name">{selectedGroup.name}</span>
                    <span className="peer-status">
                        {typingUsers.length > 0 ? (
                            <span className="typing-status">{getTypingText()}</span>
                        ) : (
                            `${groupMembers.length} member${groupMembers.length !== 1 ? 's' : ''}`
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
                            <button onClick={() => { setShowSearch(!showSearch); setShowMenu(false); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <span>Search Messages</span>
                            </button>
                            <button onClick={() => { setShowInfo(true); setShowMenu(false); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <span>Group Info</span>
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
                                    onClick={() => {
                                        handleScrollToMessage(msg.id);
                                        setShowSearch(false);
                                    }}
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
                {/* Load More Trigger at Top */}
                {!chatLoading && hasMore && (
                    <div ref={loadMoreTriggerRef} className="load-more-trigger">
                        {loadingMore && (
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
                                    selectedPeerId={groupId}
                                    onReply={handleReply}
                                    onForward={handleForward}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onPin={handlePin}
                                    onScrollToMessage={handleScrollToMessage}
                                    showSender={msg.sender_id !== currentUser?.id}
                                    senderName={msg.sender_custom_name || msg.sender_name || msg.sender_id}
                                    senderAvatar={msg.sender_avatar}
                                    isGroup={true}
                                />
                            </React.Fragment>
                        );
                    })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="typing-indicator">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="text">{getTypingText()}</span>
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
                peerId={groupId}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
                isGroup={true}
                groupId={groupId}
                onSend={handleSendMessage}
                onTyping={handleTyping}
            />

            {/* Forward Modal */}
            {forwardingMessage && (
                <ForwardModal
                    message={forwardingMessage}
                    onClose={handleCloseForward}
                />
            )}

            {/* Info Panel */}
            {showInfo && (
                <GroupInfoPanel
                    group={selectedGroup}
                    onClose={() => setShowInfo(false)}
                    members={groupMembers}
                    onMembersUpdate={(updatedMembers) => setGroupMembers(groupId, updatedMembers)}
                />
            )}
        </div>
    );
}

export default GroupChatWindow;
