/**
 * Web Notification Utility
 * Handles browser notifications with icon generation and click handling
 * Works in Browser & Electron
 */

import { getPermission } from './notificationPermission';

// Cache for generated avatar icons
const iconCache = new Map();

/**
 * Generate avatar icon for notification
 * @param {string} name - User name
 * @returns {string} - Data URL of generated icon
 */
function generateAvatarIcon(name) {
    const initial = (name?.[0] || '?').toUpperCase();
    const cacheKey = initial;

    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 128, 128);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#a855f7');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    // Initial letter
    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 64, 68);

    const dataUrl = canvas.toDataURL('image/png');
    iconCache.set(cacheKey, dataUrl);
    return dataUrl;
}

/**
 * Show browser notification
 * @param {Object} options
 * @param {string} options.title - Notification title (sender name)
 * @param {string} options.body - Message preview
 * @param {string} options.icon - Icon URL (optional, will generate if not provided)
 * @param {string} options.tag - Tag for replacing similar notifications
 * @param {Object} options.data - Custom data (senderId, chatId, etc.)
 * @param {Function} options.onClick - Click handler
 */
export function showWebNotification({ title, body, icon, tag, data, onClick }) {
    // Check permission
    if (getPermission() !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    try {
        // Generate icon if not provided
        const notificationIcon = icon || generateAvatarIcon(title);

        const notification = new Notification(title, {
            body,
            icon: notificationIcon,
            tag: tag || `chat-${data?.senderId}`,
            badge: '/favicon.png',
            requireInteraction: false,
            silent: true, // We handle sound separately
            data
        });

        // Handle click
        notification.onclick = (event) => {
            event.preventDefault();

            // Focus window
            window.focus();

            // Call custom handler
            if (onClick) {
                onClick(data);
            }

            // Close notification
            notification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    } catch (error) {
        console.error('Failed to show notification:', error);
        return null;
    }
}

/**
 * Close all notifications with a specific tag
 */
export function closeNotificationsByTag(tag) {
    // This only works with Service Worker notifications
    // For regular notifications, they auto-close
}

/**
 * Check if tab is in background
 */
export function isTabHidden() {
    return document.hidden || !document.hasFocus();
}

/**
 * Check if we should show browser notification
 * (tab hidden or not focused)
 */
export function shouldShowBrowserNotification() {
    return isTabHidden();
}

export default {
    showWebNotification,
    closeNotificationsByTag,
    isTabHidden,
    shouldShowBrowserNotification,
    generateAvatarIcon
};
