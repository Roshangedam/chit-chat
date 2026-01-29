/**
 * Notification Permission Utility
 * Handles browser notification permission requests and state management
 * Works in Browser & Electron (same Notification API)
 */

const PERMISSION_KEY = 'notification_permission_asked';
const DEFER_UNTIL_KEY = 'notification_defer_until';

/**
 * Check if Notification API is supported
 */
export function isNotificationSupported() {
    return 'Notification' in window;
}

/**
 * Get current permission state
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getPermission() {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Check if permission was already asked
 */
export function wasPermissionAsked() {
    return localStorage.getItem(PERMISSION_KEY) === 'true';
}

/**
 * Check if user deferred the permission request
 */
export function isDeferred() {
    const deferUntil = localStorage.getItem(DEFER_UNTIL_KEY);
    if (!deferUntil) return false;
    return Date.now() < parseInt(deferUntil, 10);
}

/**
 * Defer permission request for specified hours
 */
export function deferPermission(hours = 24) {
    const deferUntil = Date.now() + (hours * 60 * 60 * 1000);
    localStorage.setItem(DEFER_UNTIL_KEY, deferUntil.toString());
}

/**
 * Request notification permission
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export async function requestPermission() {
    if (!isNotificationSupported()) {
        console.warn('Notifications not supported in this browser');
        return 'unsupported';
    }

    // Already granted or denied
    if (Notification.permission !== 'default') {
        return Notification.permission;
    }

    try {
        const result = await Notification.requestPermission();
        localStorage.setItem(PERMISSION_KEY, 'true');
        return result;
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
    }
}

/**
 * Check if we should show permission prompt
 */
export function shouldShowPermissionPrompt() {
    // Not supported
    if (!isNotificationSupported()) return false;

    // Already granted or denied
    if (Notification.permission !== 'default') return false;

    // User deferred
    if (isDeferred()) return false;

    return true;
}

/**
 * Mark permission as asked (for tracking)
 */
export function markPermissionAsked() {
    localStorage.setItem(PERMISSION_KEY, 'true');
}

export default {
    isNotificationSupported,
    getPermission,
    wasPermissionAsked,
    isDeferred,
    deferPermission,
    requestPermission,
    shouldShowPermissionPrompt,
    markPermissionAsked
};
