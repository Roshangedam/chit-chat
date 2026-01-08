/**
 * Reaction Database Queries
 * CRUD operations for reactions table
 */

const db = require('./database');

/**
 * Add a reaction to a message
 * @param {number} messageId - Message ID
 * @param {string} userId - User's IP
 * @param {string} emoji - Emoji reaction
 * @returns {Object} - Reaction object
 */
function addReaction(messageId, userId, emoji) {
    try {
        const stmt = db.prepare(`
      INSERT INTO reactions (message_id, user_id, emoji, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
        const result = stmt.run(messageId, userId, emoji);

        return {
            id: result.lastInsertRowid,
            message_id: messageId,
            user_id: userId,
            emoji: emoji
        };
    } catch (error) {
        // Unique constraint - reaction already exists
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return null;
        }
        throw error;
    }
}

/**
 * Remove a reaction from a message
 * @param {number} messageId - Message ID
 * @param {string} userId - User's IP
 * @param {string} emoji - Emoji to remove
 * @returns {boolean} - True if deleted
 */
function removeReaction(messageId, userId, emoji) {
    const stmt = db.prepare(`
    DELETE FROM reactions 
    WHERE message_id = ? AND user_id = ? AND emoji = ?
  `);
    const result = stmt.run(messageId, userId, emoji);
    return result.changes > 0;
}

/**
 * Get all reactions for a message
 * @param {number} messageId - Message ID
 * @returns {Array} - Array of reactions grouped by emoji
 */
function getReactionsForMessage(messageId) {
    const stmt = db.prepare(`
    SELECT emoji, user_id, created_at
    FROM reactions 
    WHERE message_id = ?
    ORDER BY created_at ASC
  `);
    const reactions = stmt.all(messageId);

    // Group by emoji with user list
    const grouped = {};
    reactions.forEach(r => {
        if (!grouped[r.emoji]) {
            grouped[r.emoji] = {
                emoji: r.emoji,
                count: 0,
                users: []
            };
        }
        grouped[r.emoji].count++;
        grouped[r.emoji].users.push(r.user_id);
    });

    return Object.values(grouped);
}

/**
 * Get reactions for multiple messages (for loading chat history)
 * @param {Array} messageIds - Array of message IDs
 * @returns {Object} - Reactions keyed by message ID
 */
function getReactionsForMessages(messageIds) {
    if (messageIds.length === 0) return {};

    const placeholders = messageIds.map(() => '?').join(',');
    const stmt = db.prepare(`
    SELECT message_id, emoji, user_id
    FROM reactions 
    WHERE message_id IN (${placeholders})
  `);
    const reactions = stmt.all(...messageIds);

    // Group by message_id, then by emoji
    const result = {};
    reactions.forEach(r => {
        if (!result[r.message_id]) {
            result[r.message_id] = {};
        }
        if (!result[r.message_id][r.emoji]) {
            result[r.message_id][r.emoji] = {
                emoji: r.emoji,
                count: 0,
                users: []
            };
        }
        result[r.message_id][r.emoji].count++;
        result[r.message_id][r.emoji].users.push(r.user_id);
    });

    // Convert emoji objects to arrays
    Object.keys(result).forEach(msgId => {
        result[msgId] = Object.values(result[msgId]);
    });

    return result;
}

/**
 * Check if user has reacted with specific emoji
 * @param {number} messageId - Message ID
 * @param {string} userId - User's IP
 * @param {string} emoji - Emoji
 * @returns {boolean} - True if user has reacted
 */
function hasUserReacted(messageId, userId, emoji) {
    const stmt = db.prepare(`
    SELECT 1 FROM reactions 
    WHERE message_id = ? AND user_id = ? AND emoji = ?
  `);
    return !!stmt.get(messageId, userId, emoji);
}

/**
 * Toggle reaction (add if not exists, remove if exists)
 * @param {number} messageId - Message ID
 * @param {string} userId - User's IP
 * @param {string} emoji - Emoji
 * @returns {Object} - { action: 'added'|'removed', reaction }
 */
function toggleReaction(messageId, userId, emoji) {
    const exists = hasUserReacted(messageId, userId, emoji);

    if (exists) {
        removeReaction(messageId, userId, emoji);
        return { action: 'removed', messageId, userId, emoji };
    } else {
        const reaction = addReaction(messageId, userId, emoji);
        return { action: 'added', ...reaction };
    }
}

module.exports = {
    addReaction,
    removeReaction,
    getReactionsForMessage,
    getReactionsForMessages,
    hasUserReacted,
    toggleReaction
};
