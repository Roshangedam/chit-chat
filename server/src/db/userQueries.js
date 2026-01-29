/**
 * User Database Queries
 * CRUD operations for users table
 */

const db = require('./database');

/**
 * Find user by IP address
 * @param {string} ip - User's IP address
 * @returns {Object|null} - User object or null
 */
function findUserByIP(ip) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(ip) || null;
}

/**
 * Create a new user
 * @param {string} ip - User's IP address
 * @param {Object} data - Additional user data
 * @returns {Object} - Created user object
 */
function createUser(ip, data = {}) {
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, name, status, first_seen, last_seen, created_at)
    VALUES (?, ?, 'online', ?, ?, ?)
  `);

  const name = data.name || `User-${ip.split('.').pop()}`;
  stmt.run(ip, name, now, now, now);

  return findUserByIP(ip);
}

/**
 * Find or create user by IP
 * @param {string} ip - User's IP address
 * @returns {Object} - User object (existing or newly created)
 */
function findOrCreateUser(ip) {
  let user = findUserByIP(ip);

  if (!user) {
    user = createUser(ip);
    console.log(`  → New user created: ${user.name} (${ip})`);
  } else {
    console.log(`  → Existing user found: ${user.name} (${ip})`);
  }

  return user;
}

/**
 * Update user's name
 * @param {string} ip - User's IP address
 * @param {string} name - New name
 * @returns {Object} - Updated user object
 */
function updateUserName(ip, name) {
  const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
  stmt.run(name, ip);
  return findUserByIP(ip);
}

/**
 * Update user's status
 * @param {string} ip - User's IP address
 * @param {string} status - New status ('online', 'offline', 'away', 'busy')
 * @returns {Object} - Updated user object
 */
function updateUserStatus(ip, status) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET status = ?, last_seen = ? WHERE id = ?');
  stmt.run(status, now, ip);
  return findUserByIP(ip);
}

/**
 * Get all online users
 * @returns {Array} - Array of online users
 */
function getOnlineUsers() {
  const stmt = db.prepare("SELECT * FROM users WHERE status = 'online'");
  return stmt.all();
}

/**
 * Get all users
 * @returns {Array} - Array of all users
 */
function getAllUsers() {
  const stmt = db.prepare('SELECT * FROM users ORDER BY last_seen DESC');
  return stmt.all();
}

/**
 * Get all users with last chat time and last message (sorted by recent chat)
 * @param {string} currentUserId - Current user's ID to check chat history
 * @returns {Array} - Array of users sorted by most recent chat with last message
 */
function getAllUsersWithLastChat(currentUserId) {
  const stmt = db.prepare(`
    SELECT u.*, 
      (SELECT MAX(created_at) 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
      ) as last_chat_time,
      (SELECT content 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
       ORDER BY created_at DESC LIMIT 1
      ) as last_message,
      (SELECT sender_id 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
       ORDER BY created_at DESC LIMIT 1
      ) as last_message_sender,
      (SELECT type 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
       ORDER BY created_at DESC LIMIT 1
      ) as last_message_type,
      (SELECT status 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
       ORDER BY created_at DESC LIMIT 1
      ) as last_message_status,
      (SELECT is_deleted 
       FROM messages 
       WHERE ((sender_id = u.id AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = u.id))
         AND (deleted_for IS NULL OR deleted_for NOT LIKE ?)
       ORDER BY created_at DESC LIMIT 1
      ) as last_message_deleted
    FROM users u
    WHERE u.id != ?
    ORDER BY last_chat_time DESC NULLS LAST, u.last_seen DESC
  `);
  const likeParam = `%${currentUserId}%`;
  return stmt.all(currentUserId, currentUserId, likeParam, currentUserId, currentUserId, likeParam, currentUserId, currentUserId, likeParam, currentUserId, currentUserId, likeParam, currentUserId, currentUserId, likeParam, currentUserId, currentUserId, likeParam, currentUserId);
}

/**
 * Update user's hostname (from system) - stored but not used for display
 * @param {string} ip - User's IP address
 * @param {string} hostname - System hostname
 * @returns {Object} - Updated user object
 */
function updateUserHostname(ip, hostname) {
  if (!hostname) return findUserByIP(ip);

  const stmt = db.prepare('UPDATE users SET hostname = ? WHERE id = ?');
  stmt.run(hostname, ip);

  return findUserByIP(ip);
}

/**
 * Update user's custom name (user-defined, highest priority)
 * @param {string} ip - User's IP address
 * @param {string} customName - Custom display name
 * @returns {Object} - Updated user object
 */
function updateUserCustomName(ip, customName) {
  const stmt = db.prepare('UPDATE users SET custom_name = ?, name = ? WHERE id = ?');
  stmt.run(customName, customName, ip);
  return findUserByIP(ip);
}

/**
 * Get display name with priority: custom_name > User-IP
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
function getDisplayName(user) {
  if (!user) return 'Unknown';
  // Priority: custom_name (if set) > User-{last_octet}
  const defaultName = `User-${user.id.split('.').pop()}`;
  return user.custom_name || defaultName;
}

/**
 * Update user's full profile
 * @param {string} userId - User's IP address
 * @param {Object} profile - Profile data { name, statusMessage, bio }
 * @returns {Object} - Updated user object
 */
function updateUserProfile(userId, profile) {
  const updates = [];
  const values = [];

  if (profile.name !== undefined) {
    updates.push('name = ?', 'custom_name = ?');
    values.push(profile.name, profile.name);
  }

  if (profile.statusMessage !== undefined) {
    updates.push('status_message = ?');
    values.push(profile.statusMessage);
  }

  if (profile.bio !== undefined) {
    updates.push('bio = ?');
    values.push(profile.bio);
  }

  if (updates.length === 0) {
    return findUserByIP(userId);
  }

  values.push(userId);
  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return findUserByIP(userId);
}

/**
 * Update user's avatar
 * @param {string} userId - User's IP address
 * @param {string} avatarPath - Path to avatar image
 * @returns {Object} - Updated user object
 */
function updateUserAvatar(userId, avatarPath) {
  const stmt = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
  stmt.run(avatarPath, userId);
  return findUserByIP(userId);
}

module.exports = {
  findUserByIP,
  createUser,
  findOrCreateUser,
  updateUserName,
  updateUserStatus,
  updateUserHostname,
  updateUserCustomName,
  updateUserProfile,
  updateUserAvatar,
  getDisplayName,
  getOnlineUsers,
  getAllUsers,
  getAllUsersWithLastChat
};

