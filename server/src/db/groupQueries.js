/**
 * Group Database Queries
 * All database operations for groups, members, settings, and permissions
 */

const db = require('./database');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// GROUP OPERATIONS
// ============================================================

/**
 * Create a new group
 */
function createGroup(name, createdBy, description = null, avatar = null, type = 'group') {
  const id = uuidv4();
  const inviteLink = generateInviteLink();

  const stmt = db.prepare(`
    INSERT INTO groups (id, name, description, avatar, type, invite_link, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, description, avatar, type, inviteLink, createdBy);

  // Create default settings for the group
  const settingsStmt = db.prepare(`
    INSERT INTO group_settings (group_id)
    VALUES (?)
  `);
  settingsStmt.run(id);

  // Add creator as member with 'creator' role
  const memberStmt = db.prepare(`
    INSERT INTO group_members (group_id, user_id, role, added_by)
    VALUES (?, ?, 'creator', ?)
  `);
  memberStmt.run(id, createdBy, createdBy);

  return getGroupById(id);
}

/**
 * Generate unique invite link
 */
function generateInviteLink() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let link = '';
  for (let i = 0; i < 22; i++) {
    link += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return link;
}

/**
 * Get group by ID
 */
function getGroupById(groupId) {
  const stmt = db.prepare(`
    SELECT g.*, 
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
           u.name as creator_name,
           u.custom_name as creator_custom_name
    FROM groups g
    LEFT JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `);
  return stmt.get(groupId);
}

/**
 * Get group by invite link
 */
function getGroupByInviteLink(inviteLink) {
  const stmt = db.prepare(`
    SELECT g.*, 
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups g
    WHERE g.invite_link = ?
  `);
  return stmt.get(inviteLink);
}

/**
 * Get all groups for a user
 */
function getUserGroups(userId) {
  const stmt = db.prepare(`
    SELECT g.*, 
           gm.role,
           gm.joined_at,
           (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
           (SELECT content FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT type FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
           (SELECT COALESCE(u.custom_name, CASE WHEN u.name != m.sender_id THEN u.name ELSE u.hostname END, m.sender_id)
            FROM messages m 
            LEFT JOIN users u ON m.sender_id = u.id 
            WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) as last_message_sender,
           (SELECT created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY last_message_time DESC NULLS LAST
  `);
  return stmt.all(userId);
}

/**
 * Update group info
 */
function updateGroup(groupId, updates) {
  const allowedFields = ['name', 'description', 'avatar'];
  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) return null;

  values.push(groupId);
  const stmt = db.prepare(`
    UPDATE groups SET ${setClauses.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getGroupById(groupId);
}

/**
 * Delete group
 */
function deleteGroup(groupId) {
  // Delete in order due to foreign keys
  db.prepare(`DELETE FROM permission_logs WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM appeal_requests WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM mute_history WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM member_permissions WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM group_settings WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM group_members WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM messages WHERE group_id = ?`).run(groupId);
  db.prepare(`DELETE FROM groups WHERE id = ?`).run(groupId);
  return true;
}

/**
 * Regenerate invite link
 */
function regenerateInviteLink(groupId) {
  const newLink = generateInviteLink();
  const stmt = db.prepare(`UPDATE groups SET invite_link = ? WHERE id = ?`);
  stmt.run(newLink, groupId);
  return newLink;
}

// ============================================================
// MEMBER OPERATIONS
// ============================================================

/**
 * Add member to group
 */
function addMember(groupId, userId, addedBy, role = 'member') {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO group_members (group_id, user_id, role, added_by)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(groupId, userId, role, addedBy);

  if (result.changes > 0) {
    // Initialize member permissions
    const permStmt = db.prepare(`
      INSERT OR IGNORE INTO member_permissions (group_id, user_id)
      VALUES (?, ?)
    `);
    permStmt.run(groupId, userId);
  }

  return result.changes > 0;
}

/**
 * Remove member from group
 */
function removeMember(groupId, userId) {
  // Clean up member permissions
  db.prepare(`DELETE FROM member_permissions WHERE group_id = ? AND user_id = ?`).run(groupId, userId);

  const stmt = db.prepare(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`);
  const result = stmt.run(groupId, userId);
  return result.changes > 0;
}

/**
 * Get all members of a group
 */
function getGroupMembers(groupId) {
  const stmt = db.prepare(`
    SELECT gm.*, 
           u.name, 
           u.custom_name, 
           u.avatar,
           u.status,
           u.last_seen,
           mp.can_send_message,
           mp.can_send_media,
           mp.is_muted,
           mp.muted_until
    FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    LEFT JOIN member_permissions mp ON gm.group_id = mp.group_id AND gm.user_id = mp.user_id
    WHERE gm.group_id = ?
    ORDER BY 
      CASE gm.role 
        WHEN 'creator' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
      END,
      gm.joined_at ASC
  `);
  return stmt.all(groupId);
}

/**
 * Get member info
 */
function getMember(groupId, userId) {
  const stmt = db.prepare(`
    SELECT gm.*, 
           u.name, 
           u.custom_name, 
           u.avatar,
           mp.can_send_message,
           mp.can_send_media,
           mp.is_muted,
           mp.muted_until,
           mp.muted_reason
    FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    LEFT JOIN member_permissions mp ON gm.group_id = mp.group_id AND gm.user_id = mp.user_id
    WHERE gm.group_id = ? AND gm.user_id = ?
  `);
  return stmt.get(groupId, userId);
}

/**
 * Check if user is member of group
 */
function isMember(groupId, userId) {
  const stmt = db.prepare(`
    SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?
  `);
  return !!stmt.get(groupId, userId);
}

/**
 * Update member role
 */
function updateMemberRole(groupId, userId, newRole) {
  const stmt = db.prepare(`
    UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?
  `);
  const result = stmt.run(newRole, groupId, userId);
  return result.changes > 0;
}

/**
 * Check if user is admin or creator
 */
function isAdmin(groupId, userId) {
  const stmt = db.prepare(`
    SELECT role FROM group_members WHERE group_id = ? AND user_id = ?
  `);
  const member = stmt.get(groupId, userId);
  return member && (member.role === 'admin' || member.role === 'creator');
}

/**
 * Check if user is creator
 */
function isCreator(groupId, userId) {
  const stmt = db.prepare(`
    SELECT role FROM group_members WHERE group_id = ? AND user_id = ?
  `);
  const member = stmt.get(groupId, userId);
  return member && member.role === 'creator';
}

// ============================================================
// SETTINGS OPERATIONS
// ============================================================

/**
 * Get group settings
 */
function getGroupSettings(groupId) {
  const stmt = db.prepare(`SELECT * FROM group_settings WHERE group_id = ?`);
  return stmt.get(groupId);
}

/**
 * Update group settings
 */
function updateGroupSettings(groupId, settings) {
  const allowedFields = ['who_can_send', 'who_can_send_media', 'who_can_add_members', 'who_can_edit_info', 'is_locked', 'require_approval'];
  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(settings)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) return null;

  values.push(groupId);
  const stmt = db.prepare(`
    UPDATE group_settings SET ${setClauses.join(', ')} WHERE group_id = ?
  `);
  stmt.run(...values);

  return getGroupSettings(groupId);
}

// ============================================================
// MEMBER PERMISSIONS OPERATIONS
// ============================================================

/**
 * Get member permissions
 */
function getMemberPermissions(groupId, userId) {
  const stmt = db.prepare(`
    SELECT * FROM member_permissions WHERE group_id = ? AND user_id = ?
  `);
  return stmt.get(groupId, userId);
}

/**
 * Update member permissions
 */
function updateMemberPermissions(groupId, userId, permissions) {
  const allowedFields = ['can_send_message', 'can_send_media', 'can_add_members', 'is_muted', 'muted_until', 'muted_reason', 'muted_by', 'muted_at'];
  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(permissions)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) return null;

  values.push(groupId, userId);

  // First ensure the record exists
  db.prepare(`
    INSERT OR IGNORE INTO member_permissions (group_id, user_id) VALUES (?, ?)
  `).run(groupId, userId);

  const stmt = db.prepare(`
    UPDATE member_permissions SET ${setClauses.join(', ')} WHERE group_id = ? AND user_id = ?
  `);
  stmt.run(...values);

  return getMemberPermissions(groupId, userId);
}

/**
 * Mute member
 */
function muteMember(groupId, userId, duration, reason, mutedBy) {
  let mutedUntil = null;

  if (duration !== 'forever') {
    const now = new Date();
    switch (duration) {
      case '1h':
        now.setHours(now.getHours() + 1);
        break;
      case '1d':
        now.setDate(now.getDate() + 1);
        break;
      case '1w':
        now.setDate(now.getDate() + 7);
        break;
    }
    mutedUntil = now.toISOString();
  }

  updateMemberPermissions(groupId, userId, {
    is_muted: 1,
    muted_until: mutedUntil,
    muted_reason: reason,
    muted_by: mutedBy,
    muted_at: new Date().toISOString()
  });

  // Log mute action
  logMuteAction(groupId, userId, 'muted', duration, reason, mutedBy);

  return getMemberPermissions(groupId, userId);
}

/**
 * Unmute member
 */
function unmuteMember(groupId, userId, unmutedBy) {
  updateMemberPermissions(groupId, userId, {
    is_muted: 0,
    muted_until: null,
    muted_reason: null,
    muted_by: null,
    muted_at: null
  });

  // Log unmute action
  logMuteAction(groupId, userId, 'unmuted', null, null, unmutedBy);

  return getMemberPermissions(groupId, userId);
}

/**
 * Check if member can send message
 */
function canSendMessage(groupId, userId) {
  const member = getMember(groupId, userId);
  if (!member) return false;

  // Admins and creators can always send messages
  if (member.role === 'admin' || member.role === 'creator') {
    return true;
  }

  // Check if muted
  if (member.is_muted) {
    // Check if mute has expired
    if (member.muted_until && new Date(member.muted_until) < new Date()) {
      // Auto-unmute
      unmuteMember(groupId, userId, 'system');
    } else {
      return false;
    }
  }

  // Check group settings
  const settings = getGroupSettings(groupId);
  if (settings.is_locked || settings.who_can_send === 'admins') {
    return false; // Only admins can send (already checked above)
  }

  // Default to true if can_send_message is not explicitly set to 0
  // (NULL or 1 means allowed, 0 means not allowed)
  return member.can_send_message !== 0;
}

/**
 * Check if member can send media
 */
function canSendMedia(groupId, userId) {
  const member = getMember(groupId, userId);
  if (!member) return false;

  // Admins can always send media
  if (isAdmin(groupId, userId)) return true;

  // Check group settings
  const settings = getGroupSettings(groupId);
  if (settings.who_can_send_media === 'admins') {
    return false;
  }

  return member.can_send_media === 1;
}

// ============================================================
// AUDIT LOG OPERATIONS
// ============================================================

/**
 * Log mute action
 */
function logMuteAction(groupId, userId, action, duration, reason, performedBy) {
  const stmt = db.prepare(`
    INSERT INTO mute_history (group_id, user_id, action, duration, reason, performed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(groupId, userId, action, duration, reason, performedBy);
}

/**
 * Get mute history for a user in a group
 */
function getMuteHistory(groupId, userId = null) {
  if (userId) {
    const stmt = db.prepare(`
      SELECT mh.*, u.name as user_name, p.name as performed_by_name
      FROM mute_history mh
      LEFT JOIN users u ON mh.user_id = u.id
      LEFT JOIN users p ON mh.performed_by = p.id
      WHERE mh.group_id = ? AND mh.user_id = ?
      ORDER BY mh.created_at DESC
    `);
    return stmt.all(groupId, userId);
  } else {
    const stmt = db.prepare(`
      SELECT mh.*, u.name as user_name, p.name as performed_by_name
      FROM mute_history mh
      LEFT JOIN users u ON mh.user_id = u.id
      LEFT JOIN users p ON mh.performed_by = p.id
      WHERE mh.group_id = ?
      ORDER BY mh.created_at DESC
    `);
    return stmt.all(groupId);
  }
}

/**
 * Log permission change
 */
function logPermissionChange(groupId, userId, changeType, oldValue, newValue, changedBy, reason = null) {
  const stmt = db.prepare(`
    INSERT INTO permission_logs (group_id, user_id, change_type, old_value, new_value, changed_by, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(groupId, userId, changeType, oldValue, newValue, changedBy, reason);
}

/**
 * Get permission logs
 */
function getPermissionLogs(groupId, userId = null) {
  if (userId) {
    const stmt = db.prepare(`
      SELECT pl.*, u.name as user_name, c.name as changed_by_name
      FROM permission_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      LEFT JOIN users c ON pl.changed_by = c.id
      WHERE pl.group_id = ? AND pl.user_id = ?
      ORDER BY pl.created_at DESC
    `);
    return stmt.all(groupId, userId);
  } else {
    const stmt = db.prepare(`
      SELECT pl.*, u.name as user_name, c.name as changed_by_name
      FROM permission_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      LEFT JOIN users c ON pl.changed_by = c.id
      WHERE pl.group_id = ?
      ORDER BY pl.created_at DESC
    `);
    return stmt.all(groupId);
  }
}

// ============================================================
// APPEAL OPERATIONS
// ============================================================

/**
 * Create appeal request
 */
function createAppeal(groupId, userId, message) {
  const stmt = db.prepare(`
    INSERT INTO appeal_requests (group_id, user_id, message)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(groupId, userId, message);
  return getAppealById(result.lastInsertRowid);
}

/**
 * Get appeal by ID
 */
function getAppealById(appealId) {
  const stmt = db.prepare(`
    SELECT ar.*, u.name as user_name, r.name as reviewer_name
    FROM appeal_requests ar
    LEFT JOIN users u ON ar.user_id = u.id
    LEFT JOIN users r ON ar.reviewed_by = r.id
    WHERE ar.id = ?
  `);
  return stmt.get(appealId);
}

/**
 * Get appeals for a group
 */
function getAppeals(groupId, status = null) {
  if (status) {
    const stmt = db.prepare(`
      SELECT ar.*, u.name as user_name, u.avatar as user_avatar
      FROM appeal_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      WHERE ar.group_id = ? AND ar.status = ?
      ORDER BY ar.created_at DESC
    `);
    return stmt.all(groupId, status);
  } else {
    const stmt = db.prepare(`
      SELECT ar.*, u.name as user_name, u.avatar as user_avatar
      FROM appeal_requests ar
      LEFT JOIN users u ON ar.user_id = u.id
      WHERE ar.group_id = ?
      ORDER BY ar.created_at DESC
    `);
    return stmt.all(groupId);
  }
}

/**
 * Review appeal
 */
function reviewAppeal(appealId, reviewedBy, status, reviewNote = null) {
  const stmt = db.prepare(`
    UPDATE appeal_requests 
    SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, reviewedBy, reviewNote, appealId);

  const appeal = getAppealById(appealId);

  // If approved, unmute the user
  if (status === 'approved' && appeal) {
    unmuteMember(appeal.group_id, appeal.user_id, reviewedBy);
  }

  return appeal;
}

/**
 * Get user's appeal history in a group
 */
function getUserAppealHistory(groupId, userId) {
  const stmt = db.prepare(`
    SELECT * FROM appeal_requests 
    WHERE group_id = ? AND user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(groupId, userId);
}

// ============================================================
// UNREAD COUNT OPERATIONS
// ============================================================

/**
 * Get unread count for a group (for a specific user)
 */
function getGroupUnreadCount(groupId, userId, lastReadMessageId = 0) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE group_id = ? AND id > ? AND sender_id != ?
  `);
  const result = stmt.get(groupId, lastReadMessageId, userId);
  return result ? result.count : 0;
}

module.exports = {
  // Group operations
  createGroup,
  getGroupById,
  getGroupByInviteLink,
  getUserGroups,
  updateGroup,
  deleteGroup,
  regenerateInviteLink,

  // Member operations
  addMember,
  removeMember,
  getGroupMembers,
  getMember,
  isMember,
  updateMemberRole,
  isAdmin,
  isCreator,

  // Settings operations
  getGroupSettings,
  updateGroupSettings,

  // Permission operations
  getMemberPermissions,
  updateMemberPermissions,
  muteMember,
  unmuteMember,
  canSendMessage,
  canSendMedia,

  // Audit operations
  logMuteAction,
  getMuteHistory,
  logPermissionChange,
  getPermissionLogs,

  // Appeal operations
  createAppeal,
  getAppealById,
  getAppeals,
  reviewAppeal,
  getUserAppealHistory,

  // Unread operations
  getGroupUnreadCount
};
