/**
 * Push Notification Service
 * Handles Web Push notifications using web-push library
 * Persists subscriptions in SQLite database
 */

const webpush = require('web-push');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');

// VAPID keys file path
const VAPID_KEYS_FILE = path.join(__dirname, '../../vapid-keys.json');

/**
 * Initialize VAPID keys
 * Generates new keys if they don't exist
 */
function initializeVapidKeys() {
    let vapidKeys;

    // Try to load existing keys
    if (fs.existsSync(VAPID_KEYS_FILE)) {
        try {
            vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf8'));
            console.log('📧 VAPID keys loaded');
        } catch (error) {
            console.error('Failed to load VAPID keys:', error);
        }
    }

    // Generate new keys if not found
    if (!vapidKeys) {
        vapidKeys = webpush.generateVAPIDKeys();
        fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2));
        console.log('📧 New VAPID keys generated');
    }

    // Configure web-push
    webpush.setVapidDetails(
        'mailto:admin@chitchat.local',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );

    return vapidKeys;
}

// Initialize on module load
const vapidKeys = initializeVapidKeys();

/**
 * Get VAPID public key (for client)
 */
function getVapidPublicKey() {
    return vapidKeys.publicKey;
}

/**
 * Save push subscription for user (persisted in database)
 * @param {string} userId - User ID
 * @param {Object} subscription - Push subscription object
 */
function saveSubscription(userId, subscription) {
    try {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO push_subscriptions 
            (user_id, endpoint, p256dh, auth, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `);

        stmt.run(
            userId,
            subscription.endpoint,
            subscription.keys.p256dh,
            subscription.keys.auth
        );

        console.log(`📧 Push subscription saved for user: ${userId}`);
    } catch (error) {
        console.error(`📧 Failed to save subscription for ${userId}:`, error.message);
    }
}

/**
 * Remove push subscription (from database)
 * @param {string} userId - User ID
 */
function removeSubscription(userId) {
    try {
        const stmt = db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?');
        stmt.run(userId);
        console.log(`📧 Push subscription removed for user: ${userId}`);
    } catch (error) {
        console.error(`📧 Failed to remove subscription for ${userId}:`, error.message);
    }
}

/**
 * Get subscription for user (from database)
 * @param {string} userId - User ID
 * @returns {Object|null} - Subscription object or null
 */
function getSubscription(userId) {
    try {
        const stmt = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?');
        const row = stmt.get(userId);

        if (!row) return null;

        // Reconstruct subscription object format expected by web-push
        return {
            endpoint: row.endpoint,
            keys: {
                p256dh: row.p256dh,
                auth: row.auth
            }
        };
    } catch (error) {
        console.error(`📧 Failed to get subscription for ${userId}:`, error.message);
        return null;
    }
}

/**
 * Send push notification to user
 * @param {string} userId - Target user ID
 * @param {Object} payload - Notification payload
 */
async function sendPushToUser(userId, payload) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        console.log(`📧 No push subscription for user: ${userId}`);
        return false;
    }

    try {
        await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );
        console.log(`📧 Push sent to user: ${userId}`);
        return true;
    } catch (error) {
        console.error(`📧 Push failed for user ${userId}:`, error.message);

        // Remove invalid subscription
        if (error.statusCode === 410 || error.statusCode === 404) {
            removeSubscription(userId);
            console.log(`📧 Removed invalid subscription for: ${userId}`);
        }

        return false;
    }
}

/**
 * Send message notification
 * @param {string} receiverId - Receiver user ID
 * @param {string} senderName - Sender name
 * @param {string} messagePreview - Message preview text
 * @param {string} senderId - Sender user ID
 * @param {string} senderAvatar - Sender avatar URL (optional)
 */
async function sendMessageNotification(receiverId, senderName, messagePreview, senderId, senderAvatar = null) {
    // Build icon URL - use avatar if available, otherwise default favicon
    let iconUrl = '/favicon.png';
    if (senderAvatar) {
        // Avatar is stored as relative path like /uploads/avatars/filename.jpg
        iconUrl = senderAvatar;
    }

    return sendPushToUser(receiverId, {
        title: senderName,
        body: messagePreview,
        icon: iconUrl,
        tag: `chat-${senderId}`,
        data: {
            senderId,
            url: '/'
        }
    });
}

module.exports = {
    getVapidPublicKey,
    saveSubscription,
    removeSubscription,
    getSubscription,
    sendPushToUser,
    sendMessageNotification
};
