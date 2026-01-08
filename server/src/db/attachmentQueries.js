/**
 * Attachment Database Queries
 * CRUD operations for attachments table
 */

const db = require('./database');
const { v4: uuidv4 } = require('uuid');

/**
 * Save attachment info to database
 * @param {Object} attachmentData - Attachment details
 * @returns {Object} - Saved attachment with ID
 */
function saveAttachment(attachmentData) {
    const id = uuidv4();
    const stmt = db.prepare(`
        INSERT INTO attachments (id, message_id, type, filename, filepath, filesize, mimetype, width, height, duration, thumbnail_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
        id,
        attachmentData.messageId || null,
        attachmentData.type,
        attachmentData.filename,
        attachmentData.filepath,
        attachmentData.filesize,
        attachmentData.mimetype || null,
        attachmentData.width || null,
        attachmentData.height || null,
        attachmentData.duration || null,
        attachmentData.thumbnailPath || null
    );

    return getAttachmentById(id);
}

/**
 * Get attachment by ID
 * @param {string} id - Attachment ID
 * @returns {Object|null} - Attachment object
 */
function getAttachmentById(id) {
    const stmt = db.prepare('SELECT * FROM attachments WHERE id = ?');
    return stmt.get(id);
}

/**
 * Get attachments for a message
 * @param {number} messageId - Message ID
 * @returns {Array} - Array of attachments
 */
function getAttachmentsByMessageId(messageId) {
    const stmt = db.prepare('SELECT * FROM attachments WHERE message_id = ?');
    return stmt.all(messageId);
}

/**
 * Link attachment to message
 * @param {string} attachmentId - Attachment ID
 * @param {number} messageId - Message ID
 */
function linkAttachmentToMessage(attachmentId, messageId) {
    const stmt = db.prepare('UPDATE attachments SET message_id = ? WHERE id = ?');
    stmt.run(messageId, attachmentId);
}

/**
 * Delete attachment
 * @param {string} id - Attachment ID
 */
function deleteAttachment(id) {
    const stmt = db.prepare('DELETE FROM attachments WHERE id = ?');
    stmt.run(id);
}

/**
 * Get media between users (for gallery)
 * @param {string} userId1 - First user
 * @param {string} userId2 - Second user
 * @param {string} type - Media type filter (image/video/audio/document or null for all)
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 */
function getMediaBetweenUsers(userId1, userId2, type = null, limit = 50, offset = 0) {
    let query = `
        SELECT a.*, m.sender_id, m.receiver_id, m.created_at as message_created_at
        FROM attachments a
        JOIN messages m ON a.message_id = m.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        AND m.is_deleted = 0
    `;

    const params = [userId1, userId2, userId2, userId1];

    if (type) {
        query += ' AND a.type = ?';
        params.push(type);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

module.exports = {
    saveAttachment,
    getAttachmentById,
    getAttachmentsByMessageId,
    linkAttachmentToMessage,
    deleteAttachment,
    getMediaBetweenUsers
};
