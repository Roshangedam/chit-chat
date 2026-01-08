/**
 * Database Schema
 * Creates all required tables
 */

const db = require('./database');

/**
 * Initialize all database tables
 */
function initializeSchema() {
  console.log('🔧 Initializing database schema...');

  // Users table (IP-based, no password for normal users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      hostname TEXT,
      custom_name TEXT,
      email TEXT UNIQUE,
      email_verified INTEGER DEFAULT 0,
      email_linked_by TEXT,
      email_linked_at TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'offline',
      status_message TEXT,
      device_info TEXT,
      first_seen TEXT,
      last_seen TEXT,
      is_blocked INTEGER DEFAULT 0,
      blocked_reason TEXT,
      blocked_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add new columns if they don't exist (for existing DBs)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN hostname TEXT`);
  } catch (e) { /* Column exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN custom_name TEXT`);
  } catch (e) { /* Column exists */ }

  console.log('  ✓ Users table ready');

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      socket_id TEXT,
      device_info TEXT,
      user_agent TEXT,
      connected_at TEXT,
      last_active TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('  ✓ Sessions table ready');

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      group_id TEXT,
      content TEXT,
      type TEXT DEFAULT 'text',
      file_id TEXT,
      file_name TEXT,
      file_size INTEGER,
      reply_to INTEGER,
      status TEXT DEFAULT 'sent',
      is_edited INTEGER DEFAULT 0,
      edited_at TEXT,
      is_forwarded INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      deleted_for TEXT,
      is_pinned INTEGER DEFAULT 0,
      pinned_at TEXT,
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // Add caption column if not exists (for existing databases)
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN caption TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add file_name column if not exists
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN file_name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add file_size column if not exists
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN file_size INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  console.log('  ✓ Messages table ready');

  // Message read status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_status (
      message_id INTEGER,
      user_id TEXT,
      status TEXT DEFAULT 'delivered',
      delivered_at TEXT,
      read_at TEXT,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `);
  console.log('  ✓ Message status table ready');

  // Reactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('  ✓ Reactions table ready');

  // Attachments table (for file uploads)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id INTEGER,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      mimetype TEXT,
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      thumbnail_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `);
  console.log('  ✓ Attachments table ready');

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
  `);
  console.log('  ✓ Indexes created');

  // Migration: Add is_forwarded column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_forwarded INTEGER DEFAULT 0`);
    console.log('  ✓ Added is_forwarded column');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add is_deleted column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_deleted INTEGER DEFAULT 0`);
    console.log('  ✓ Added is_deleted column');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add deleted_for column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN deleted_for TEXT`);
    console.log('  ✓ Added deleted_for column');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add is_pinned column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0`);
    console.log('  ✓ Added is_pinned column');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add pinned_at column if it doesn't exist
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN pinned_at TEXT`);
    console.log('  ✓ Added pinned_at column');
  } catch (e) {
    // Column already exists
  }

  console.log('✅ Database schema initialized');
}

module.exports = { initializeSchema };
