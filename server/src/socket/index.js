/**
 * Socket.io Server Setup
 * Everything allowed - no restrictions
 */

const { Server } = require('socket.io');
const { findOrCreateUser, updateUserStatus, getAllUsers, getAllUsersWithLastChat } = require('../db/userQueries');
const { getUnreadMessages, getUnreadCountsBySender, markMessagesDelivered, getMessagesBetweenUsers } = require('../db/messageQueries');
const { addUserSocket, removeUserSocket, getAllOnlineUsers, getUserSockets, isUserOnline } = require('./onlineUsers');
const { registerUserHandlers } = require('./handlers/userHandler');
const { registerMessageHandlers } = require('./handlers/messageHandler');
const { registerReactionHandlers } = require('./handlers/reactionHandler');
const pushService = require('../services/pushService');

/**
 * Initialize Socket.io with the HTTP server
 */
function initializeSocket(server) {
    const io = new Server(server, {
        // ALLOW EVERYTHING
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['*'],
            credentials: true
        },
        // Allow all transports
        transports: ['websocket', 'polling'],
        // No restrictions
        allowEIO3: true
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

        // Get unread counts per sender for this user
        const unreadCounts = getUnreadCountsBySender(clientIP);

        const allUsers = allDbUsers.map(u => ({
            ...u,
            status: onlineUserIds.includes(u.id) ? 'online' : 'offline',
            unreadCount: unreadCounts[u.id] || 0  // Include unread count from DB
        }));

        // Send list of all users
        socket.emit('users:list', { users: allUsers });
        console.log(`  📋 Sent users list (${allUsers.length} total, ${onlineUserIds.length} online)`);

        // Deliver pending messages to this user
        const unreadMessages = getUnreadMessages(clientIP);
        if (unreadMessages.length > 0) {
            console.log(`  📬 Delivering ${unreadMessages.length} pending messages`);

            const messagesBySender = {};
            unreadMessages.forEach(msg => {
                if (!messagesBySender[msg.sender_id]) {
                    messagesBySender[msg.sender_id] = [];
                }
                messagesBySender[msg.sender_id].push(msg);
            });

            Object.entries(messagesBySender).forEach(([senderId, messages]) => {
                markMessagesDelivered(senderId, clientIP);

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
                }
            });
        }

        // Broadcast user online status
        if (isNewUser) {
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

        // Push notification handlers
        socket.on('push:getVapidKey', (callback) => {
            if (typeof callback === 'function') {
                callback({ vapidPublicKey: pushService.getVapidPublicKey() });
            }
        });

        socket.on('push:subscribe', (data, callback) => {
            pushService.saveSubscription(clientIP, data.subscription);
            if (typeof callback === 'function') {
                callback({ success: true });
            }
        });

        socket.on('push:unsubscribe', (callback) => {
            pushService.removeSubscription(clientIP);
            if (typeof callback === 'function') {
                callback({ success: true });
            }
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`\n👋 User disconnecting: ${clientIP} (${reason})`);

            const wentOffline = removeUserSocket(clientIP, socket.id);

            if (wentOffline) {
                updateUserStatus(clientIP, 'offline');
                const lastSeen = new Date().toISOString();

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

    console.log('🔌 Socket.io initialized (all origins allowed)');
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
