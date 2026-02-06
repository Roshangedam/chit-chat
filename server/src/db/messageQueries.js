/**
 * Message Database Queries
 * CRUD operations for messages table
 */

const db = require('./database');

/**
 * Save a new message to the database
 * @param {string} senderId - Sender user IP
 * @param {string} receiverId - Receiver user IP
 * @param {string} content - Message content (text or URL)
 * @param {string} type - Message type (text, image, video, audio, file, gif, sticker)
 * @param {number|null} replyTo - Reply to message ID
 * @param {boolean} isForwarded - Whether message is forwarded
 * @param {string|null} caption - Optional caption for media messages
 * @param {string|null} fileName - Original file name for file messages
 * @param {number|null} fileSize - File size in bytes for file messages
 * @returns {Object} - Saved message with ID
 */
function saveMessage(senderId, receiverId, content, type = 'text', replyTo = null, isForwarded = false, caption = null, fileName = null, fileSize = null) {
  const stmt = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, content, type, reply_to, is_forwarded, caption, file_name, file_size, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
  `);

  const result = stmt.run(senderId, receiverId, content, type, replyTo, isForwarded ? 1 : 0, caption, fileName, fileSize);

  const message = getMessageById(result.lastInsertRowid);

  // If it's a reply, attach the replied message
  if (replyTo) {
    message.repliedMessage = getMessageById(replyTo);
  }

  return message;
}

/**
 * Get message by ID
 * @param {number} id - Message ID
 * @returns {Object|null} - Message object
 */
function getMessageById(id) {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  return stmt.get(id);
}

/**
 * Get messages between two users
 * @param {string} userId1 - First user IP (current user)
 * @param {string} userId2 - Second user IP
 * @param {number} limit - Max messages to return
 * @param {number} offset - Offset for pagination
 * @returns {Array} - Array of messages (filtered for deleted)
 */
function getMessagesBetweenUsers(userId1, userId2, limit = 50, offset = 0) {
  // Subquery to get NEWEST messages first, then reverse for proper display order
  const stmt = db.prepare(`
    SELECT * FROM (
      SELECT * FROM messages 
      WHERE ((sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?))
        AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    ) sub ORDER BY created_at ASC
  `);

  const messages = stmt.all(userId1, userId2, userId2, userId1, `%${userId1}%`, limit, offset);

  if (messages.length > 0) {
    // Get reactions for these messages
    const { getReactionsForMessages } = require('./reactionQueries');
    const messageIds = messages.map(m => m.id);
    const reactionsMap = getReactionsForMessages(messageIds);

    // Create a map of messages for reply lookup
    const messageMap = {};
    messages.forEach(m => messageMap[m.id] = m);

    // Attach reactions and replied messages
    messages.forEach(msg => {
      msg.reactions = reactionsMap[msg.id] || [];

      // Attach replied message if exists
      if (msg.reply_to) {
        msg.repliedMessage = messageMap[msg.reply_to] || getMessageById(msg.reply_to);
      }
    });
  }

  return messages;
}

/**
 * Update message status
 * @param {number} messageId - Message ID
 * @param {string} status - New status
 * @returns {Object} - Updated message
 */
function updateMessageStatus(messageId, status) {
  const stmt = db.prepare('UPDATE messages SET status = ? WHERE id = ?');
  stmt.run(status, messageId);
  return getMessageById(messageId);
}

/**
 * Update multiple messages status
 * @param {Array} messageIds - Array of message IDs
 * @param {string} status - New status
 */
function updateMessagesStatus(messageIds, status) {
  if (messageIds.length === 0) return;

  const placeholders = messageIds.map(() => '?').join(',');
  const stmt = db.prepare(`UPDATE messages SET status = ? WHERE id IN (${placeholders})`);
  stmt.run(status, ...messageIds);
}

/**
 * Get unread messages for a user
 * @param {string} receiverId - Receiver's IP
 * @returns {Array} - Array of unread messages
 */
function getUnreadMessages(receiverId) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE receiver_id = ? AND status != 'read'
    ORDER BY created_at ASC
  `);
  return stmt.all(receiverId);
}

/**
 * Get unread message counts grouped by sender
 * @param {string} receiverId - Receiver's IP (current user)
 * @returns {Object} - Object with senderId as key and count as value
 */
function getUnreadCountsBySender(receiverId) {
  const stmt = db.prepare(`
    SELECT sender_id, COUNT(*) as count 
    FROM messages 
    WHERE receiver_id = ? AND status != 'read'
    GROUP BY sender_id
  `);
  const rows = stmt.all(receiverId);

  // Convert to object for easy lookup
  const counts = {};
  rows.forEach(row => {
    counts[row.sender_id] = row.count;
  });
  return counts;
}

/**
 * Mark messages as delivered
 * @param {string} senderId - Sender's IP
 * @param {string} receiverId - Receiver's IP
 */
function markMessagesDelivered(senderId, receiverId) {
  const stmt = db.prepare(`
    UPDATE messages SET status = 'delivered'
    WHERE sender_id = ? AND receiver_id = ? AND status = 'sent'
  `);
  stmt.run(senderId, receiverId);
}

/**
 * Mark messages as read
 * @param {string} senderId - Sender's IP
 * @param {string} receiverId - Receiver's IP
 */
function markMessagesRead(senderId, receiverId) {
  const stmt = db.prepare(`
    UPDATE messages SET status = 'read'
    WHERE sender_id = ? AND receiver_id = ? AND status IN ('sent', 'delivered')
  `);
  stmt.run(senderId, receiverId);
}

/**
 * Edit a message
 * @param {number} messageId - Message ID
 * @param {string} senderId - Sender's IP (for verification)
 * @param {string} newContent - New message content
 * @returns {Object|null} - Updated message or null if not allowed
 */
function editMessage(messageId, senderId, newContent) {
  // First verify the sender owns this message
  const message = getMessageById(messageId);
  console.log(`  Edit check - Message:`, message?.id, 'Owner:', message?.sender_id, 'Requester:', senderId);

  if (!message || message.sender_id !== senderId) {
    console.log(`  ❌ Edit denied - not owner`);
    return null;
  }

  // Check if message is too old (15 minutes limit)
  // Handle SQLite datetime format (YYYY-MM-DD HH:MM:SS)
  let messageTime;
  if (message.created_at.includes('T')) {
    messageTime = new Date(message.created_at).getTime();
  } else {
    messageTime = new Date(message.created_at.replace(' ', 'T') + 'Z').getTime();
  }

  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  const ageMinutes = Math.round((now - messageTime) / 60000);

  console.log(`  Time check - Message age: ${ageMinutes} minutes`);

  if (now - messageTime > fifteenMinutes) {
    console.log(`  ❌ Edit denied - too old`);
    return { error: 'Message too old to edit' };
  }

  // Update message and reset status to 'sent' (since it's essentially a new message)
  const stmt = db.prepare(`
    UPDATE messages 
    SET content = ?, is_edited = 1, edited_at = datetime('now'), status = 'sent'
    WHERE id = ?
  `);
  const result = stmt.run(newContent, messageId);
  console.log(`  ✓ Message updated, changes: ${result.changes}`);

  return getMessageById(messageId);
}

/**
 * Delete a message
 * @param {number} messageId - Message ID
 * @param {string} userId - User requesting deletion
 * @param {boolean} deleteForEveryone - If true, delete for all participants
 * @returns {Object|null} - Result or null if not allowed
 */
function deleteMessage(messageId, userId, deleteForEveryone = false) {
  const message = getMessageById(messageId);

  if (!message) {
    return { error: 'Message not found' };
  }

  if (deleteForEveryone) {
    // Only sender can delete for everyone
    if (message.sender_id !== userId) {
      return { error: 'Only sender can delete for everyone' };
    }

    // Check time limit (15 minutes for delete for everyone)
    let messageTime;
    if (message.created_at.includes('T')) {
      messageTime = new Date(message.created_at).getTime();
    } else {
      messageTime = new Date(message.created_at.replace(' ', 'T') + 'Z').getTime();
    }

    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - messageTime > fifteenMinutes) {
      return { error: 'Message too old to delete for everyone' };
    }

    // Mark as deleted for everyone
    const stmt = db.prepare(`
      UPDATE messages 
      SET is_deleted = 1, content = 'This message was deleted'
      WHERE id = ?
    `);
    stmt.run(messageId);

    return { success: true, deleteForEveryone: true, messageId };
  } else {
    // Delete for me only - add user to deleted_for list
    const deletedFor = message.deleted_for ? message.deleted_for.split(',') : [];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    const stmt = db.prepare(`
      UPDATE messages 
      SET deleted_for = ?
      WHERE id = ?
    `);
    stmt.run(deletedFor.join(','), messageId);

    return { success: true, deleteForEveryone: false, messageId };
  }
}
/**
 * Pin a message
 * @param {number} messageId - Message ID to pin
 * @param {string} chatId - Chat identifier (peer ID for 1-1 chat)
 * @returns {Object} - Result with pinned message
 */
function pinMessage(messageId, chatId) {
  const message = getMessageById(messageId);
  if (!message) {
    return { error: 'Message not found' };
  }

  // Check max 3 pinned messages per chat
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE is_pinned = 1 
      AND ((sender_id = ? OR receiver_id = ?) 
       OR (sender_id = ? OR receiver_id = ?))
  `);
  const result = stmt.get(chatId, chatId, message.sender_id, message.sender_id);

  if (result.count >= 3) {
    return { error: 'Maximum 3 pinned messages allowed' };
  }

  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE messages SET is_pinned = 1, pinned_at = ? WHERE id = ?
  `);
  updateStmt.run(now, messageId);

  return { success: true, message: getMessageById(messageId) };
}

/**
 * Unpin a message
 * @param {number} messageId - Message ID to unpin
 * @returns {Object} - Result
 */
function unpinMessage(messageId) {
  const stmt = db.prepare(`
    UPDATE messages SET is_pinned = 0, pinned_at = NULL WHERE id = ?
  `);
  stmt.run(messageId);
  return { success: true, messageId };
}

/**
 * Get pinned messages for a chat
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Array} - Pinned messages
 */
function getPinnedMessages(userId1, userId2) {
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE is_pinned = 1 
      AND ((sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?))
    ORDER BY pinned_at DESC
    LIMIT 3
  `);
  return stmt.all(userId1, userId2, userId2, userId1);
}

/**
 * Search messages within a chat
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID (if null, search all chats)
 * @param {string} searchQuery - Search query string
 * @param {number} limit - Max results
 * @returns {Array} - Matching messages
 */
function searchMessages(userId1, userId2, searchQuery, limit = 50) {
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  const searchPattern = `%${searchQuery}%`;

  let stmt;
  let params;

  if (userId2) {
    // Search within specific chat
    stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE content LIKE ?
        AND is_deleted = 0
        AND ((sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?))
        AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
    `);
    params = [searchPattern, userId1, userId2, userId2, userId1, `%${userId1}%`, limit];
  } else {
    // Search all chats for this user
    stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE content LIKE ?
        AND is_deleted = 0
        AND (sender_id = ? OR receiver_id = ?)
        AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
    `);
    params = [searchPattern, userId1, userId1, `%${userId1}%`, limit];
  }

  return stmt.all(...params);
}

/**
 * Get all media messages between two users with pagination
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string|null} type - Filter by type (image, video, file) or null for all
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 * @returns {Array} - Media messages
 */
function getMediaBetweenUsers(userId1, userId2, type = null, limit = 30, offset = 0) {
  let query = `
    SELECT * FROM messages 
    WHERE (
      (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
    )
    AND type IN ('image', 'video', 'file')
    AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
    AND is_deleted = 0
  `;

  const params = [userId1, userId2, userId2, userId1, `%${userId1}%`];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const messages = stmt.all(...params);

  // Map file_name and file_size to camelCase
  return messages.map(msg => ({
    ...msg,
    fileName: msg.file_name,
    fileSize: msg.file_size
  }));
}

/**
 * Get messages around a specific message ID (for jump-to-message feature)
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {number} messageId - Target message ID
 * @param {number} beforeCount - Messages before target
 * @param {number} afterCount - Messages after target
 * @returns {Object} - { messages, targetIndex }
 */
function getMessagesAroundId(userId1, userId2, messageId, beforeCount = 50, afterCount = 50) {
  // Get messages before the target (older)
  const beforeQuery = db.prepare(`
    SELECT * FROM messages 
    WHERE (
      (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
    )
    AND id < ?
    AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
    AND is_deleted = 0
    ORDER BY id DESC
    LIMIT ?
  `);
  const beforeMessages = beforeQuery.all(userId1, userId2, userId2, userId1, messageId, `%${userId1}%`, beforeCount);

  // Get the target message
  const targetQuery = db.prepare(`SELECT * FROM messages WHERE id = ?`);
  const targetMessage = targetQuery.get(messageId);

  // Get messages after the target (newer)
  const afterQuery = db.prepare(`
    SELECT * FROM messages 
    WHERE (
      (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
    )
    AND id > ?
    AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
    AND is_deleted = 0
    ORDER BY id ASC
    LIMIT ?
  `);
  const afterMessages = afterQuery.all(userId1, userId2, userId2, userId1, messageId, `%${userId1}%`, afterCount);

  // Combine: older (reversed) + target + newer
  const allMessages = [
    ...beforeMessages.reverse(),
    ...(targetMessage ? [targetMessage] : []),
    ...afterMessages
  ];

  return {
    messages: allMessages.map(msg => ({
      ...msg,
      fileName: msg.file_name,
      fileSize: msg.file_size
    })),
    targetIndex: beforeMessages.length,
    hasOlder: beforeMessages.length === beforeCount,
    hasNewer: afterMessages.length === afterCount
  };
}

/**
 * Get older messages before a specific message ID (for infinite scroll)
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {number} beforeId - Load messages before this ID
 * @param {number} limit - Max messages to return
 * @returns {Array} - Older messages
 */
function getOlderMessages(userId1, userId2, beforeId, limit = 50) {
  const query = db.prepare(`
    SELECT * FROM messages 
    WHERE (
      (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
    )
    AND id < ?
    AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
    AND is_deleted = 0
    ORDER BY id DESC
    LIMIT ?
  `);

  const messages = query.all(userId1, userId2, userId2, userId1, beforeId, `%${userId1}%`, limit);

  // Return in chronological order (oldest first)
  return messages.reverse().map(msg => ({
    ...msg,
    fileName: msg.file_name,
    fileSize: msg.file_size
  }));
}

// ============================================================
// GROUP MESSAGE FUNCTIONS
// ============================================================

/**
 * Save a group message
 * @param {string} senderId - Sender user IP
 * @param {string} groupId - Group ID
 * @param {string} content - Message content
 * @param {string} type - Message type
 * @param {number|null} replyTo - Reply to message ID
 * @param {boolean} isForwarded - Whether message is forwarded
 * @param {string|null} caption - Optional caption
 * @param {string|null} fileName - Original file name
 * @param {number|null} fileSize - File size
 * @returns {Object} - Saved message
 */
function saveGroupMessage(senderId, groupId, content, type = 'text', replyTo = null, isForwarded = false, caption = null, fileName = null, fileSize = null) {
  const stmt = db.prepare(`
    INSERT INTO messages (sender_id, group_id, content, type, reply_to, is_forwarded, caption, file_name, file_size, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
  `);

  const result = stmt.run(senderId, groupId, content, type, replyTo, isForwarded ? 1 : 0, caption, fileName, fileSize);

  const message = getMessageById(result.lastInsertRowid);

  // If it's a reply, attach the replied message
  if (replyTo) {
    message.repliedMessage = getMessageById(replyTo);
  }

  return message;
}

/**
 * Get messages for a group
 * @param {string} groupId - Group ID
 * @param {string} userId - Current user (for deleted_for filter)
 * @param {number} limit - Max messages
 * @param {number} offset - Offset for pagination
 * @returns {Array} - Group messages
 */
function getGroupMessages(groupId, userId, limit = 50, offset = 0) {
  const stmt = db.prepare(`
    SELECT m.*, u.name as sender_name, u.custom_name as sender_custom_name, u.avatar as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.group_id = ?
      AND (m.deleted_for IS NULL OR m.deleted_for NOT LIKE ?)
      AND m.is_deleted = 0
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `);

  const messages = stmt.all(groupId, `%${userId}%`, limit, offset);

  if (messages.length > 0) {
    // Get reactions for these messages
    const { getReactionsForMessages } = require('./reactionQueries');
    const messageIds = messages.map(m => m.id);
    const reactionsMap = getReactionsForMessages(messageIds);

    // Create a map of messages for reply lookup
    const messageMap = {};
    messages.forEach(m => messageMap[m.id] = m);

    // Attach reactions and replied messages
    messages.forEach(msg => {
      msg.reactions = reactionsMap[msg.id] || [];

      // Attach replied message if exists
      if (msg.reply_to) {
        msg.repliedMessage = messageMap[msg.reply_to] || getMessageById(msg.reply_to);
      }
    });
  }

  // Return in chronological order
  return messages.reverse();
}

/**
 * Get older group messages (for infinite scroll)
 * @param {string} groupId - Group ID
 * @param {string} userId - Current user
 * @param {number} beforeId - Load before this ID
 * @param {number} limit - Max messages
 * @returns {Array} - Older messages
 */
function getOlderGroupMessages(groupId, userId, beforeId, limit = 50) {
  const stmt = db.prepare(`
    SELECT m.*, u.name as sender_name, u.custom_name as sender_custom_name, u.avatar as sender_avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.group_id = ?
      AND m.id < ?
      AND (m.deleted_for IS NULL OR m.deleted_for NOT LIKE ?)
      AND m.is_deleted = 0
    ORDER BY m.id DESC
    LIMIT ?
  `);

  const messages = stmt.all(groupId, beforeId, `%${userId}%`, limit);

  // Return in chronological order
  return messages.reverse().map(msg => ({
    ...msg,
    fileName: msg.file_name,
    fileSize: msg.file_size
  }));
}

/**
 * Get pinned messages for a group
 * @param {string} groupId - Group ID
 * @returns {Array} - Pinned messages
 */
function getGroupPinnedMessages(groupId) {
  const stmt = db.prepare(`
    SELECT m.*, u.name as sender_name, u.custom_name as sender_custom_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.group_id = ? AND m.is_pinned = 1
    ORDER BY m.pinned_at DESC
    LIMIT 3
  `);
  return stmt.all(groupId);
}

/**
 * Search messages in a group
 * @param {string} groupId - Group ID
 * @param {string} userId - Current user
 * @param {string} searchQuery - Search query
 * @param {number} limit - Max results
 * @returns {Array} - Matching messages
 */
function searchGroupMessages(groupId, userId, searchQuery, limit = 50) {
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  const stmt = db.prepare(`
    SELECT m.*, u.name as sender_name, u.custom_name as sender_custom_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.group_id = ?
      AND m.content LIKE ?
      AND m.is_deleted = 0
      AND (m.deleted_for IS NULL OR m.deleted_for NOT LIKE ?)
    ORDER BY m.created_at DESC
    LIMIT ?
  `);

  return stmt.all(groupId, `%${searchQuery}%`, `%${userId}%`, limit);
}

/**
 * Get media messages for a group
 * @param {string} groupId - Group ID
 * @param {string} userId - Current user
 * @param {string|null} type - Filter by type
 * @param {number} limit - Max results
 * @param {number} offset - Offset
 * @returns {Array} - Media messages
 */
function getGroupMedia(groupId, userId, type = null, limit = 30, offset = 0) {
  let query = `
    SELECT m.*, u.name as sender_name, u.custom_name as sender_custom_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.group_id = ?
      AND m.type IN ('image', 'video', 'file')
      AND (m.deleted_for IS NULL OR m.deleted_for NOT LIKE ?)
      AND m.is_deleted = 0
  `;

  const params = [groupId, `%${userId}%`];

  if (type) {
    query += ` AND m.type = ?`;
    params.push(type);
  }

  query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params).map(msg => ({
    ...msg,
    fileName: msg.file_name,
    fileSize: msg.file_size
  }));
}

/**
 * Get unread count for a group (messages after last read)
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID
 * @param {number} lastReadMessageId - Last message ID the user has read
 * @returns {number} - Unread count
 */
function getGroupUnreadCount(groupId, userId, lastReadMessageId = 0) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE group_id = ? AND id > ? AND sender_id != ? AND is_deleted = 0
  `);
  const result = stmt.get(groupId, lastReadMessageId, userId);
  return result ? result.count : 0;
}

module.exports = {
  saveMessage,
  getMessageById,
  getMessagesBetweenUsers,
  updateMessageStatus,
  updateMessagesStatus,
  getUnreadMessages,
  getUnreadCountsBySender,
  markMessagesDelivered,
  markMessagesRead,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  searchMessages,
  getMediaBetweenUsers,
  getMessagesAroundId,
  getOlderMessages,
  // Group message functions
  saveGroupMessage,
  getGroupMessages,
  getOlderGroupMessages,
  getGroupPinnedMessages,
  searchGroupMessages,
  getGroupMedia,
  getGroupUnreadCount
};
