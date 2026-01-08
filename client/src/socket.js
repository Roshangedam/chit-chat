/**
 * Socket.io Client Connection
 * Handles WebSocket connection to server
 */

import { io } from 'socket.io-client';
import useUserStore from './store/userStore';
import usePeerStore from './store/peerStore';
import useMessageStore from './store/messageStore';

// Server URL - Use LAN IP for network access
const SERVER_URL = 'http://192.168.0.71:3000';

// Create socket connection
const socket = io(SERVER_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
});

// ==========================================
// Connection Events
// ==========================================

socket.on('connect', () => {
    console.log('🟢 Connected to server');
    console.log('   Socket ID:', socket.id);

    // Send system hostname to server for display name
    // This will show computer name instead of User-IP
    const hostname = window.location.hostname !== 'localhost'
        ? null  // Can't get hostname from browser, will use server-side detection
        : null;

    // Emit to update hostname (server will try to resolve from IP)
    socket.emit('user:updateHostname');
});

socket.on('disconnect', (reason) => {
    console.log('🔴 Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

// ==========================================
// User Events
// ==========================================

socket.on('user:identified', (data) => {
    console.log('👤 Identified as:', data.user);
    useUserStore.getState().setCurrentUser(data.user);
});

// ==========================================
// Peer/User List Events
// ==========================================

socket.on('users:list', (data) => {
    console.log('📋 Received users list:', data.users.length, 'users');
    const currentUser = useUserStore.getState().currentUser;
    const peers = data.users.filter(u => u.id !== currentUser?.id);
    usePeerStore.getState().setPeers(peers);
});

// User came online - update their status
socket.on('user:online', (data) => {
    console.log('🟢 User online:', data.user?.name || data.id);
    const currentUser = useUserStore.getState().currentUser;
    const userId = data.id || data.user?.id;

    if (userId !== currentUser?.id) {
        const peerStore = usePeerStore.getState();
        const existingPeer = peerStore.peers.find(p => p.id === userId);

        if (existingPeer) {
            // Update existing peer to online
            peerStore.updatePeer(userId, {
                status: 'online',
                ...data.user
            });
        } else if (data.user) {
            // Add new peer
            peerStore.addPeer({ ...data.user, status: 'online' });
        }
    }
});

// User went offline - update their status
socket.on('user:offline', (data) => {
    console.log('🔴 User offline:', data.name, 'Last seen:', data.last_seen);
    usePeerStore.getState().updatePeer(data.id, {
        status: 'offline',
        last_seen: data.last_seen
    });
});

// User updated their profile
socket.on('user:updated', (data) => {
    console.log('📝 User updated:', data.user.name);
    const currentUser = useUserStore.getState().currentUser;
    if (data.user.id === currentUser?.id) {
        useUserStore.getState().updateUser(data.user);
    } else {
        usePeerStore.getState().updatePeer(data.user.id, data.user);
    }
});

// ==========================================
// Message Events
// ==========================================

// New message received
socket.on('message:new', (data) => {
    console.log('💬 New message from:', data.senderId);

    // Map snake_case to camelCase for file fields
    const message = {
        ...data.message,
        fileName: data.message.file_name || data.message.fileName,
        fileSize: data.message.file_size || data.message.fileSize
    };

    useMessageStore.getState().addMessage(data.senderId, message);

    // Move sender to top of chat list with last message preview and type
    usePeerStore.getState().movePeerToTop(data.senderId, message.content, data.senderId, message.type || 'text');

    // Auto send read receipt if chat is open with this sender
    const selectedPeer = usePeerStore.getState().selectedPeer;
    if (selectedPeer?.id === data.senderId && document.hasFocus()) {
        socket.emit('message:read', {
            senderId: data.senderId,
            messageIds: [data.message.id]
        });
    }
});

// Message sent confirmation
socket.on('message:sent', (data) => {
    console.log('✓ Message sent:', data.messageId);
    useMessageStore.getState().updateMessage(
        data.receiverId,
        data.tempId,
        {
            id: data.messageId,
            status: 'sent',
            fileName: data.message?.file_name || undefined,
            fileSize: data.message?.file_size || undefined
        }
    );
    // Update peer list status
    usePeerStore.getState().updatePeerMessageStatus(data.receiverId, 'sent');
});

// Message delivered - update status
socket.on('message:delivered', (data) => {
    console.log('✓✓ Message delivered:', data.messageId, 'to', data.receiverId);
    const messageStore = useMessageStore.getState();

    // Update by message ID
    const peerMessages = messageStore.messages[data.receiverId] || [];
    const updatedMessages = peerMessages.map(m =>
        m.id === data.messageId ? { ...m, status: 'delivered' } : m
    );
    messageStore.setMessages(data.receiverId, updatedMessages);

    // Update peer list status
    usePeerStore.getState().updatePeerMessageStatus(data.receiverId, 'delivered');
});

// Message read - update status
socket.on('message:read', (data) => {
    console.log('👁️ Message read by:', data.readerId);
    const messageStore = useMessageStore.getState();
    const receiverId = data.receiverId || data.readerId;

    // Update all messages to this receiver as read
    const peerMessages = messageStore.messages[receiverId] || [];
    const updatedMessages = peerMessages.map(m => ({
        ...m,
        status: m.status !== 'read' ? 'read' : m.status
    }));
    messageStore.setMessages(receiverId, updatedMessages);

    // Update peer list status
    usePeerStore.getState().updatePeerMessageStatus(receiverId, 'read');
});

// Messages read batch - mark multiple as read
socket.on('messages:read', (data) => {
    console.log('👁️ Messages read:', data.messageIds?.length || 0);
    const messageStore = useMessageStore.getState();
    const receiverId = data.receiverId;

    const peerMessages = messageStore.messages[receiverId] || [];
    const messageIdSet = new Set(data.messageIds || []);
    const updatedMessages = peerMessages.map(m =>
        messageIdSet.has(m.id) ? { ...m, status: 'read' } : m
    );
    messageStore.setMessages(receiverId, updatedMessages);
});

// ==========================================
// Typing Events
// ==========================================

socket.on('typing:start', (data) => {
    useMessageStore.getState().setTyping(data.senderId, true);
});

socket.on('typing:stop', (data) => {
    useMessageStore.getState().setTyping(data.senderId, false);
});

// ==========================================
// Message History
// ==========================================

socket.on('messages:history', (data) => {
    console.log('📥 Received message history:', data.messages.length, 'messages');

    // Map snake_case to camelCase for file fields in all messages
    const mappedMessages = data.messages.map(msg => ({
        ...msg,
        fileName: msg.file_name || msg.fileName,
        fileSize: msg.file_size || msg.fileSize
    }));

    useMessageStore.getState().setMessages(data.peerId, mappedMessages);

    // Send read receipt for unread messages
    const currentUser = useUserStore.getState().currentUser;
    const unreadMessages = data.messages.filter(m =>
        m.sender_id !== currentUser?.id && m.status !== 'read'
    );

    if (unreadMessages.length > 0) {
        socket.emit('message:read', {
            senderId: data.peerId,
            messageIds: unreadMessages.map(m => m.id)
        });
    }
});

// Handle jumped to message result
socket.on('messages:jumped', (data) => {
    console.log('🎯 Jumped to message:', data.targetMessageId);

    const mappedMessages = data.messages.map(msg => ({
        ...msg,
        fileName: msg.file_name || msg.fileName,
        fileSize: msg.file_size || msg.fileSize
    }));

    // Replace messages with the new batch centered around target
    useMessageStore.getState().setMessages(data.peerId, mappedMessages);
    useMessageStore.getState().setJumpedToMessage(data.targetMessageId);
    useMessageStore.getState().setHasOlder(data.peerId, data.hasOlder);
    useMessageStore.getState().setHasNewer(data.peerId, data.hasNewer);
});

// Handle older messages loaded (infinite scroll)
socket.on('messages:olderLoaded', (data) => {
    console.log('📜 Loaded older messages:', data.messages.length);

    const mappedMessages = data.messages.map(msg => ({
        ...msg,
        fileName: msg.file_name || msg.fileName,
        fileSize: msg.file_size || msg.fileSize
    }));

    // Prepend older messages
    useMessageStore.getState().prependMessages(data.peerId, mappedMessages);
    useMessageStore.getState().setHasOlder(data.peerId, data.hasMore);
    useMessageStore.getState().setLoadingOlder(false);
});

// ==========================================
// Reaction Events
// ==========================================

socket.on('reaction:updated', (data) => {
    console.log('👍 Reaction updated for message:', data.messageId);
    const messageStore = useMessageStore.getState();

    // Find which peer's messages to update
    Object.keys(messageStore.messages).forEach(peerId => {
        const peerMessages = messageStore.messages[peerId];
        const messageIndex = peerMessages.findIndex(m => m.id === data.messageId);

        if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                reactions: data.reactions
            };
            messageStore.setMessages(peerId, updatedMessages);
        }
    });
});

// ==========================================
// Message Edit Events
// ==========================================

socket.on('message:edited', (data) => {
    console.log('✏️ Message edited:', data.messageId);
    const messageStore = useMessageStore.getState();

    // Find and update the message
    Object.keys(messageStore.messages).forEach(peerId => {
        const peerMessages = messageStore.messages[peerId];
        const messageIndex = peerMessages.findIndex(m => m.id === data.messageId);

        if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: data.newContent,
                is_edited: 1,
                edited_at: data.editedAt,
                status: 'sent' // Reset status on edit
            };
            messageStore.setMessages(peerId, updatedMessages);
        }
    });
});

// Message Delivery Status Update
socket.on('message:delivered', (data) => {
    console.log('✓✓ Message delivered:', data.messageId);
    const messageStore = useMessageStore.getState();
    const { receiverId, messageId } = data;

    // Update message status to 'delivered'
    const peerMessages = messageStore.messages[receiverId];
    if (peerMessages) {
        const messageIndex = peerMessages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                status: 'delivered'
            };
            messageStore.setMessages(receiverId, updatedMessages);
        }
    }
});

// ==========================================
// Message Forward Events
// ==========================================

socket.on('message:forwarded', (data) => {
    console.log('➡️ Message forwarded to:', data.receiverId);

    // Replace temp message with actual message from server
    if (data.tempId && data.message) {
        useMessageStore.getState().updateMessage(
            data.receiverId,
            data.tempId,
            {
                id: data.messageId,
                status: data.message.status || 'sent',
                is_forwarded: 1,
                isForwarded: true
            }
        );
        // Update peer list status
        usePeerStore.getState().updatePeerMessageStatus(data.receiverId, 'sent');
    }
});

// ==========================================
// Message Delete Events
// ==========================================

socket.on('message:deleted', (data) => {
    console.log('🗑️ Message deleted:', data.messageId);
    const messageStore = useMessageStore.getState();

    // Find and update/remove the message
    Object.keys(messageStore.messages).forEach(peerId => {
        const peerMessages = messageStore.messages[peerId];
        const messageIndex = peerMessages.findIndex(m => m.id === data.messageId);

        if (messageIndex !== -1) {
            if (data.deleteForEveryone) {
                // Show "This message was deleted" placeholder
                const updatedMessages = [...peerMessages];
                updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    is_deleted: 1,
                    content: 'This message was deleted'
                };
                messageStore.setMessages(peerId, updatedMessages);

                // Update peer list last message if this was the last message
                if (messageIndex === peerMessages.length - 1) {
                    usePeerStore.getState().updatePeer(peerId, {
                        last_message: 'This message was deleted'
                    });
                }
            } else {
                // Remove message from local view
                const updatedMessages = peerMessages.filter(m => m.id !== data.messageId);
                messageStore.setMessages(peerId, updatedMessages);

                // Update peer list last message to previous message
                if (updatedMessages.length > 0) {
                    const lastMsg = updatedMessages[updatedMessages.length - 1];
                    usePeerStore.getState().updatePeer(peerId, {
                        last_message: lastMsg.content,
                        last_message_sender: lastMsg.sender_id
                    });
                }
            }
        }
    });
});

// ==========================================
// Message Pin Events
// ==========================================

socket.on('message:pinned', (data) => {
    console.log('📌 Message pinned:', data.message?.id);
    const messageStore = useMessageStore.getState();

    // Update message in store to show as pinned
    Object.keys(messageStore.messages).forEach(peerId => {
        const peerMessages = messageStore.messages[peerId];
        const messageIndex = peerMessages.findIndex(m => m.id === data.message?.id);

        if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                is_pinned: 1,
                pinned_at: data.message.pinned_at
            };
            messageStore.setMessages(peerId, updatedMessages);
        }
    });
});

socket.on('message:unpinned', (data) => {
    console.log('📌 Message unpinned:', data.messageId);
    const messageStore = useMessageStore.getState();

    // Update message in store to show as unpinned
    Object.keys(messageStore.messages).forEach(peerId => {
        const peerMessages = messageStore.messages[peerId];
        const messageIndex = peerMessages.findIndex(m => m.id === data.messageId);

        if (messageIndex !== -1) {
            const updatedMessages = [...peerMessages];
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                is_pinned: 0,
                pinned_at: null
            };
            messageStore.setMessages(peerId, updatedMessages);
        }
    });
});

export default socket;
