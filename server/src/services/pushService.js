/**
 * Push Notification Service
 * Handles Web Push notifications using web-push library
 */

const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

// VAPID keys file path
const VAPID_KEYS_FILE = path.join(__dirname, '../../vapid-keys.json');

// Store for push subscriptions (in production, use database)
const subscriptions = new Map(); // userId -> subscription

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
 * Save push subscription for user
 * @param {string} userId - User ID
 * @param {Object} subscription - Push subscription object
 */
function saveSubscription(userId, subscription) {
    subscriptions.set(userId, subscription);
    console.log(`📧 Push subscription saved for user: ${userId}`);
}

/**
 * Remove push subscription
 * @param {string} userId - User ID
 */
function removeSubscription(userId) {
    subscriptions.delete(userId);
}

/**
 * Get subscription for user
 * @param {string} userId - User ID
 */
function getSubscription(userId) {
    return subscriptions.get(userId);
}

/**
 * Send push notification to user
 * @param {string} userId - Target user ID
 * @param {Object} payload - Notification payload
 */
async function sendPushToUser(userId, payload) {
    const subscription = subscriptions.get(userId);

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
 */
async function sendMessageNotification(receiverId, senderName, messagePreview, senderId) {
    return sendPushToUser(receiverId, {
        title: senderName,
        body: messagePreview,
        icon: '/favicon.png',
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
