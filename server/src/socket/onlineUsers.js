/**
 * Online Users Tracker
 * Tracks currently connected users and their sockets
 */

// Map of IP -> { user, sockets: Set<socketId> }
const onlineUsers = new Map();

/**
 * Add a socket connection for a user
 * @param {string} ip - User's IP address
 * @param {string} socketId - Socket.io socket ID
 * @param {Object} user - User object from database
 * @returns {boolean} - True if this is a new user (first socket)
 */
function addUserSocket(ip, socketId, user) {
    const existing = onlineUsers.get(ip);

    if (existing) {
        // User already online, just add the new socket
        existing.sockets.add(socketId);
        existing.user = user; // Update user data
        return false; // Not a new user
    } else {
        // New user coming online
        onlineUsers.set(ip, {
            user: user,
            sockets: new Set([socketId])
        });
        return true; // New user
    }
}

/**
 * Remove a socket connection for a user
 * @param {string} ip - User's IP address
 * @param {string} socketId - Socket.io socket ID
 * @returns {boolean} - True if user is now completely offline (no sockets left)
 */
function removeUserSocket(ip, socketId) {
    const existing = onlineUsers.get(ip);

    if (!existing) {
        return false;
    }

    existing.sockets.delete(socketId);

    if (existing.sockets.size === 0) {
        // No more sockets, user is offline
        onlineUsers.delete(ip);
        return true; // User went offline
    }

    return false; // User still has other tabs open
}

/**
 * Get all socket IDs for a user
 * @param {string} ip - User's IP address
 * @returns {Array} - Array of socket IDs
 */
function getUserSockets(ip) {
    const existing = onlineUsers.get(ip);
    return existing ? Array.from(existing.sockets) : [];
}

/**
 * Get user data by IP
 * @param {string} ip - User's IP address
 * @returns {Object|null} - User object or null
 */
function getOnlineUser(ip) {
    const existing = onlineUsers.get(ip);
    return existing ? existing.user : null;
}

/**
 * Get all online users
 * @returns {Array} - Array of user objects
 */
function getAllOnlineUsers() {
    const users = [];
    for (const [ip, data] of onlineUsers) {
        users.push({
            ...data.user,
            socketCount: data.sockets.size
        });
    }
    return users;
}

/**
 * Get count of online users
 * @returns {number} - Number of online users
 */
function getOnlineCount() {
    return onlineUsers.size;
}

/**
 * Check if user is online
 * @param {string} ip - User's IP address
 * @returns {boolean} - True if user is online
 */
function isUserOnline(ip) {
    return onlineUsers.has(ip);
}

/**
 * Update user data in memory
 * @param {string} ip - User's IP address
 * @param {Object} userData - Updated user data
 */
function updateOnlineUser(ip, userData) {
    const existing = onlineUsers.get(ip);
    if (existing) {
        existing.user = { ...existing.user, ...userData };
    }
}

module.exports = {
    addUserSocket,
    removeUserSocket,
    getUserSockets,
    getOnlineUser,
    getAllOnlineUsers,
    getOnlineCount,
    isUserOnline,
    updateOnlineUser
};
