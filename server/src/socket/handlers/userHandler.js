/**
 * User Event Handlers
 * Handles user-related socket events
 */

const { updateUserName, findUserByIP } = require('../../db/userQueries');
const { updateOnlineUser, getAllOnlineUsers } = require('../onlineUsers');

/**
 * Register user handlers on socket connection
 * @param {Socket} socket - Socket.io socket instance
 * @param {Server} io - Socket.io server instance
 */
function registerUserHandlers(socket, io) {
    const clientIP = socket.clientIP;

    // Handle user setting their name
    socket.on('user:setName', (data) => {
        const { name } = data;

        console.log(`📝 ${clientIP} changing name to: ${name}`);

        // Update in database
        const updatedUser = updateUserName(clientIP, name);

        // Update in online users
        updateOnlineUser(clientIP, { name });

        // Confirm to user
        socket.emit('user:updated', { user: updatedUser });

        // Broadcast to all other users
        socket.broadcast.emit('user:updated', { user: updatedUser });

        console.log(`  ✓ Name updated and broadcasted`);
    });

    // Handle user updating profile
    socket.on('user:updateProfile', (data) => {
        console.log(`📝 ${clientIP} updating profile`);

        const user = findUserByIP(clientIP);
        if (user) {
            // Update and broadcast
            socket.emit('user:updated', { user });
            socket.broadcast.emit('user:updated', { user });
        }
    });

    // Request updated user list
    socket.on('users:refresh', () => {
        const { getAllUsersWithLastChat } = require('../../db/userQueries');
        const allDbUsers = getAllUsersWithLastChat(clientIP);
        const onlineUserIds = getAllOnlineUsers().map(u => u.id);

        const allUsers = allDbUsers.map(u => ({
            ...u,
            status: onlineUserIds.includes(u.id) ? 'online' : 'offline'
        }));

        socket.emit('users:list', { users: allUsers });
    });

    // Handle hostname update request (resolve from IP)
    socket.on('user:updateHostname', async () => {
        const dns = require('dns').promises;
        const { updateUserHostname } = require('../../db/userQueries');

        try {
            // Try DNS reverse lookup to get hostname
            const hostnames = await dns.reverse(clientIP);
            if (hostnames && hostnames.length > 0) {
                let hostname = hostnames[0];
                // Clean up hostname (remove domain suffix if present)
                if (hostname.includes('.')) {
                    hostname = hostname.split('.')[0];
                }

                console.log(`🖥️  Resolved hostname for ${clientIP}: ${hostname}`);
                const updatedUser = updateUserHostname(clientIP, hostname);

                // Update online user and broadcast
                updateOnlineUser(clientIP, { name: updatedUser.name, hostname });
                socket.emit('user:updated', { user: updatedUser });
                socket.broadcast.emit('user:updated', { user: updatedUser });
            }
        } catch (err) {
            // DNS lookup failed, keep User-IP format
            console.log(`   DNS lookup failed for ${clientIP}, using default name`);
        }
    });

    // Handle custom name update (user-defined, future feature)
    socket.on('user:setCustomName', (data) => {
        const { customName } = data;
        const { updateUserCustomName } = require('../../db/userQueries');

        console.log(`📝 ${clientIP} setting custom name: ${customName}`);

        const updatedUser = updateUserCustomName(clientIP, customName);
        updateOnlineUser(clientIP, { name: updatedUser.name, custom_name: customName });

        socket.emit('user:updated', { user: updatedUser });
        socket.broadcast.emit('user:updated', { user: updatedUser });

        console.log(`  ✓ Custom name set and broadcasted`);
    });
}

module.exports = { registerUserHandlers };
