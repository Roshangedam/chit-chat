/**
 * Reaction Event Handlers
 * Handles reaction socket events
 */

const { toggleReaction, getReactionsForMessage } = require('../../db/reactionQueries');
const { getUserSockets, isUserOnline } = require('../onlineUsers');

/**
 * Register reaction handlers on socket connection
 */
function registerReactionHandlers(socket, io) {
    const clientIP = socket.clientIP;

    // Handle adding/toggling a reaction
    socket.on('reaction:toggle', (data) => {
        const { messageId, emoji, senderId } = data;

        console.log(`👍 ${clientIP} reacted ${emoji} to message ${messageId}`);

        // Toggle reaction in database
        const result = toggleReaction(messageId, clientIP, emoji);

        // Get updated reactions for this message
        const reactions = getReactionsForMessage(messageId);

        // Notify sender of the message
        if (isUserOnline(senderId)) {
            const senderSockets = getUserSockets(senderId);
            senderSockets.forEach(socketId => {
                io.to(socketId).emit('reaction:updated', {
                    messageId: messageId,
                    reactions: reactions
                });
            });
        }

        // Notify the reactor (for their own UI)
        socket.emit('reaction:updated', {
            messageId: messageId,
            reactions: reactions
        });

        console.log(`  → ${result.action}: ${emoji}`);
    });

    // Handle getting reactions for a message
    socket.on('reaction:get', (data) => {
        const { messageId } = data;
        const reactions = getReactionsForMessage(messageId);

        socket.emit('reaction:list', {
            messageId: messageId,
            reactions: reactions
        });
    });
}

module.exports = { registerReactionHandlers };
