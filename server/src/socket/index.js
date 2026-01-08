/**
 * Socket.io Server Setup
 * Handles real-time WebSocket connections
 */

const { Server } = require('socket.io');
const { findOrCreateUser, updateUserStatus, getAllUsers, getAllUsersWithLastChat } = require('../db/userQueries');
const { getUnreadMessages, markMessagesDelivered, getMessagesBetweenUsers } = require('../db/messageQueries');
const { addUserSocket, removeUserSocket, getAllOnlineUsers, getUserSockets, isUserOnline } = require('./onlineUsers');
const { registerUserHandlers } = require('./handlers/userHandler');
const { registerMessageHandlers } = require('./handlers/messageHandler');
const { registerReactionHandlers } = require('./handlers/reactionHandler');

/**
 * Initialize Socket.io with the HTTP server
 */
function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        const clientIP = getClientIP(socket);
        socket.clientIP = clientIP;

        console.log(`\n👤 User connecting: ${clientIP}`);

        // Find or create user in database
        const user = findOrCreateUser(clientIP);

        // Update status to online
        updateUserStatus(clientIP, 'online');

        // Track this socket
        const isNewUser = addUserSocket(clientIP, socket.id, user);

        // Send user their info
        socket.emit('user:identified', {
            user: { ...user, status: 'online' },
            socketId: socket.id
        });

        // Get ALL users from database sorted by recent chat (WhatsApp-like)
        const allDbUsers = getAllUsersWithLastChat(clientIP);
        const onlineUserIds = getAllOnlineUsers().map(u => u.id);

        const allUsers = allDbUsers.map(u => ({
            ...u,
            status: onlineUserIds.includes(u.id) ? 'online' : 'offline'
        }));

        // Send list of all users
        socket.emit('users:list', { users: allUsers });
        console.log(`  📋 Sent users list (${allUsers.length} total, ${onlineUserIds.length} online)`);

        // =============================================
        // Deliver pending messages to this user
        // =============================================
        const unreadMessages = getUnreadMessages(clientIP);
        if (unreadMessages.length > 0) {
            console.log(`  � Delivering ${unreadMessages.length} pending messages`);

            // Group messages by sender
            const messagesBySender = {};
            unreadMessages.forEach(msg => {
                if (!messagesBySender[msg.sender_id]) {
                    messagesBySender[msg.sender_id] = [];
                }
                messagesBySender[msg.sender_id].push(msg);
            });

            // Deliver messages and notify senders
            Object.entries(messagesBySender).forEach(([senderId, messages]) => {
                // Mark as delivered in DB
                markMessagesDelivered(senderId, clientIP);

                // Notify sender if online
                if (isUserOnline(senderId)) {
                    const senderSockets = getUserSockets(senderId);
                    senderSockets.forEach(socketId => {
                        messages.forEach(msg => {
                            io.to(socketId).emit('message:delivered', {
                                messageId: msg.id,
                                receiverId: clientIP
                            });
                        });
                    });
                    console.log(`    → Notified ${senderId} about delivery`);
                }
            });
        }

        // =============================================
        // Broadcast user online status to ALL clients
        // =============================================
        if (isNewUser) {
            // Broadcast to everyone that this user is online
            io.emit('user:online', {
                user: { ...user, status: 'online' },
                id: clientIP
            });
            console.log(`  📢 Broadcasted: ${user.name} is now online`);
        }

        // Register event handlers
        registerUserHandlers(socket, io);
        registerMessageHandlers(socket, io);
        registerReactionHandlers(socket, io);

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`\n👋 User disconnecting: ${clientIP} (${reason})`);

            const wentOffline = removeUserSocket(clientIP, socket.id);

            if (wentOffline) {
                updateUserStatus(clientIP, 'offline');
                const lastSeen = new Date().toISOString();

                // Broadcast to ALL clients
                io.emit('user:offline', {
                    id: clientIP,
                    name: user.name,
                    last_seen: lastSeen,
                    status: 'offline'
                });
                console.log(`  📢 Broadcasted: ${user.name} went offline`);
            } else {
                console.log(`  → User still has other tabs open`);
            }
        });

        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${clientIP}:`, error);
        });
    });

    console.log('🔌 Socket.io initialized');
    return io;
}

/**
 * Extract client IP address from socket
 */
function getClientIP(socket) {
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = socket.handshake.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    let ip = socket.handshake.address;
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    if (ip === '::1') {
        ip = '127.0.0.1';
    }

    return ip;
}

module.exports = { initializeSocket };
