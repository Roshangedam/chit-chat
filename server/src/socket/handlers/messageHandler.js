/**
 * Message Event Handlers
 * Handles messaging socket events
 */

const { saveMessage, getMessagesBetweenUsers, markMessagesRead, updateMessageStatus, editMessage, deleteMessage, pinMessage, unpinMessage, getPinnedMessages, searchMessages, getMediaBetweenUsers, getMessagesAroundId, getOlderMessages } = require('../../db/messageQueries');
const { getUserSockets, isUserOnline } = require('../onlineUsers');

/**
 * Register message handlers on socket connection
 */
function registerMessageHandlers(socket, io) {
    const clientIP = socket.clientIP;

    // Handle sending a message
    socket.on('message:send', (data) => {
        const { receiverId, content, tempId, replyTo, type, caption, fileName, fileSize } = data;

        console.log(`💬 Message from ${clientIP} to ${receiverId}: "${content.substring(0, 30)}..."`);
        if (replyTo) console.log(`  ↳ Reply to message ID: ${replyTo}`);
        if (caption) console.log(`  ↳ Caption: "${caption.substring(0, 30)}..."`);
        if (fileName) console.log(`  ↳ File: ${fileName} (${fileSize} bytes)`);

        // Save to database (with type, replyTo, and caption if provided)
        const message = saveMessage(clientIP, receiverId, content, type || 'text', replyTo || null, false, caption || null, fileName || null, fileSize || null);

        // Confirm to sender with sent status
        socket.emit('message:sent', {
            tempId: tempId,
            messageId: message.id,
            receiverId: receiverId,
            message: message
        });

        // Check if recipient is online
        if (isUserOnline(receiverId)) {
            // Update status to delivered
            updateMessageStatus(message.id, 'delivered');

            // Deliver to all recipient's sockets
            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:new', {
                    senderId: clientIP,
                    message: { ...message, status: 'delivered' }
                });
            });

            // Notify sender of delivery
            socket.emit('message:delivered', {
                messageId: message.id,
                receiverId: receiverId
            });

            console.log(`  ✓✓ Delivered to ${recipientSockets.length} socket(s)`);
        } else {
            console.log(`  ✓ Recipient offline, message stored`);
        }
    });

    // Handle fetching message history
    socket.on('messages:fetch', (data) => {
        const { peerId, limit = 100, offset = 0 } = data;

        console.log(`📥 Fetching messages: ${clientIP} <-> ${peerId}`);

        const messages = getMessagesBetweenUsers(clientIP, peerId, limit, offset);

        socket.emit('messages:history', {
            peerId: peerId,
            messages: messages
        });

        console.log(`  → Sent ${messages.length} messages`);
    });

    // Handle typing events
    socket.on('typing:start', (data) => {
        const { receiverId } = data;

        if (isUserOnline(receiverId)) {
            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('typing:start', { senderId: clientIP });
            });
        }
    });

    socket.on('typing:stop', (data) => {
        const { receiverId } = data;

        if (isUserOnline(receiverId)) {
            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('typing:stop', { senderId: clientIP });
            });
        }
    });

    // Handle read receipts
    socket.on('message:read', (data) => {
        const { senderId, messageIds } = data;

        console.log(`👁️ ${clientIP} read ${messageIds?.length || 'all'} messages from ${senderId}`);

        // Mark messages as read in database
        markMessagesRead(senderId, clientIP);

        // Notify sender if online
        if (isUserOnline(senderId)) {
            const senderSockets = getUserSockets(senderId);
            senderSockets.forEach(socketId => {
                io.to(socketId).emit('message:read', {
                    readerId: clientIP,
                    receiverId: clientIP,
                    messageIds: messageIds
                });
            });
            console.log(`  → Notified sender about read receipt`);
        }
    });

    // Handle forwarding a message
    socket.on('message:forward', (data) => {
        const { tempId, content, type, receiverId, originalSenderId } = data;

        console.log(`➡️ ${clientIP} forwarding ${type || 'text'} message to ${receiverId}`);

        // Save forwarded message with isForwarded = true, preserve type
        const message = saveMessage(clientIP, receiverId, content, type || 'text', null, true);

        console.log(`  ✓ Forwarded message saved with ID: ${message.id}`);

        // Confirm to sender with tempId for optimistic update replacement
        socket.emit('message:forwarded', {
            success: true,
            tempId: tempId,
            receiverId: receiverId,
            messageId: message.id,
            message: message
        });

        // Deliver to recipient if online
        if (isUserOnline(receiverId)) {
            updateMessageStatus(message.id, 'delivered');

            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:new', {
                    senderId: clientIP,
                    message: { ...message, status: 'delivered' }
                });
            });

            socket.emit('message:delivered', {
                messageId: message.id,
                receiverId: receiverId
            });

            console.log(`  ✓✓ Forwarded to ${recipientSockets.length} socket(s)`);
        } else {
            console.log(`  ✓ Recipient offline, forwarded message stored`);
        }
    });

    // Handle editing a message
    socket.on('message:edit', (data) => {
        const { messageId, newContent, receiverId } = data;

        console.log(`✏️ ${clientIP} editing message ${messageId}`);

        // Edit message in database
        const result = editMessage(messageId, clientIP, newContent);

        if (!result) {
            socket.emit('message:editError', { error: 'Cannot edit this message' });
            return;
        }

        if (result.error) {
            socket.emit('message:editError', { error: result.error });
            return;
        }

        // Notify sender
        socket.emit('message:edited', {
            messageId: messageId,
            newContent: newContent,
            editedAt: result.edited_at
        });

        // Notify recipient if online
        if (isUserOnline(receiverId)) {
            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:edited', {
                    messageId: messageId,
                    newContent: newContent,
                    editedAt: result.edited_at,
                    senderId: clientIP
                });
            });
            console.log(`  ✓ Edit broadcasted`);

            // Mark as delivered since recipient is online (after reset to 'sent')
            updateMessageStatus(messageId, 'delivered');

            // Notify sender about delivery
            socket.emit('message:delivered', {
                messageId: messageId,
                receiverId: receiverId
            });
            console.log(`  ✓ Marked as delivered`);
        }
    });

    // Handle deleting a message
    socket.on('message:delete', (data) => {
        const { messageId, receiverId, deleteForEveryone } = data;

        console.log(`🗑️ ${clientIP} deleting message ${messageId} (forEveryone: ${deleteForEveryone})`);

        const result = deleteMessage(messageId, clientIP, deleteForEveryone);

        if (result.error) {
            console.log(`  ❌ Delete failed: ${result.error}`);
            socket.emit('message:delete:error', { error: result.error });
            return;
        }

        // Confirm to sender
        socket.emit('message:deleted', {
            messageId: messageId,
            deleteForEveryone: deleteForEveryone
        });

        // If delete for everyone, notify recipient
        if (deleteForEveryone && isUserOnline(receiverId)) {
            const recipientSockets = getUserSockets(receiverId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:deleted', {
                    messageId: messageId,
                    deleteForEveryone: true,
                    senderId: clientIP
                });
            });
            console.log(`  ✓ Delete broadcasted to recipient`);
        }

        console.log(`  ✓ Message deleted successfully`);
    });

    // Handle pinning a message
    socket.on('message:pin', (data) => {
        const { messageId, peerId } = data;

        console.log(`📌 ${clientIP} pinning message ${messageId}`);

        const result = pinMessage(messageId, peerId);

        if (result.error) {
            console.log(`  ❌ Pin failed: ${result.error}`);
            socket.emit('message:pin:error', { error: result.error });
            return;
        }

        // Confirm to sender
        socket.emit('message:pinned', {
            message: result.message
        });

        // Notify recipient if online
        if (isUserOnline(peerId)) {
            const recipientSockets = getUserSockets(peerId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:pinned', {
                    message: result.message,
                    senderId: clientIP
                });
            });
            console.log(`  ✓ Pin broadcasted`);
        }
    });

    // Handle unpinning a message
    socket.on('message:unpin', (data) => {
        const { messageId, peerId } = data;

        console.log(`📌 ${clientIP} unpinning message ${messageId}`);

        const result = unpinMessage(messageId);

        // Confirm to sender
        socket.emit('message:unpinned', { messageId });

        // Notify recipient if online
        if (isUserOnline(peerId)) {
            const recipientSockets = getUserSockets(peerId);
            recipientSockets.forEach(socketId => {
                io.to(socketId).emit('message:unpinned', {
                    messageId,
                    senderId: clientIP
                });
            });
        }
    });

    // Fetch pinned messages for a chat
    socket.on('messages:pinned:fetch', (data) => {
        const { peerId } = data;
        const pinnedMessages = getPinnedMessages(clientIP, peerId);
        socket.emit('messages:pinned:list', { messages: pinnedMessages });
    });

    // Handle message search
    socket.on('messages:search', (data) => {
        const { query, peerId } = data;
        console.log(`🔍 ${clientIP} searching for: "${query}" in chat: ${peerId || 'all'}`);

        const results = searchMessages(clientIP, peerId, query);
        socket.emit('messages:search:results', {
            query,
            results,
            count: results.length
        });

        console.log(`  → Found ${results.length} results`);
    });

    // Handle global search (across all chats)
    socket.on('messages:globalSearch', (data) => {
        const { query } = data;
        console.log(`🔍 ${clientIP} global searching: "${query}"`);

        // Search all chats (peerId = null)
        const results = searchMessages(clientIP, null, query, 100);
        socket.emit('messages:globalSearch:results', {
            query,
            results,
            count: results.length
        });

        console.log(`  → Found ${results.length} global results`);
    });

    // Handle fetching media gallery with pagination
    socket.on('media:fetch', (data) => {
        const { peerId, type, limit = 30, offset = 0, append = false } = data;

        console.log(`📸 Fetching media: ${clientIP} <-> ${peerId} (limit: ${limit}, offset: ${offset})`);

        const media = getMediaBetweenUsers(clientIP, peerId, type || null, limit);

        socket.emit('media:list', {
            peerId: peerId,
            media: media,
            append: append
        });

        console.log(`  → Sent ${media.length} media items`);
    });

    // Handle jump to specific message (from search/gallery)
    socket.on('messages:jump', (data) => {
        const { peerId, messageId } = data;

        console.log(`🎯 Jump to message: ${messageId} in chat ${clientIP} <-> ${peerId}`);

        const result = getMessagesAroundId(clientIP, peerId, messageId);

        socket.emit('messages:jumped', {
            peerId: peerId,
            messages: result.messages,
            targetMessageId: messageId,
            targetIndex: result.targetIndex,
            hasOlder: result.hasOlder,
            hasNewer: result.hasNewer
        });

        console.log(`  → Sent ${result.messages.length} messages around target`);
    });

    // Handle loading older messages (infinite scroll)
    socket.on('messages:loadOlder', (data) => {
        const { peerId, beforeId } = data;

        console.log(`📜 Loading older messages: ${clientIP} <-> ${peerId} (before ID: ${beforeId})`);

        const messages = getOlderMessages(clientIP, peerId, beforeId);

        socket.emit('messages:olderLoaded', {
            peerId: peerId,
            messages: messages,
            hasMore: messages.length === 50
        });

        console.log(`  → Sent ${messages.length} older messages`);
    });
}

module.exports = { registerMessageHandlers };
