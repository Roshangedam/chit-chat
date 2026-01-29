/**
 * Service Worker Registration and Management
 * Handles SW registration and push subscription
 */

let swRegistration = null;

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
    if (!isServiceWorkerSupported()) {
        console.warn('[SW] Service Workers not supported');
        return null;
    }

    try {
        swRegistration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        console.log('[SW] Service Worker registered:', swRegistration);

        // Handle updates
        swRegistration.addEventListener('updatefound', () => {
            const newWorker = swRegistration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[SW] New version available');
                }
            });
        });

        return swRegistration;
    } catch (error) {
        console.error('[SW] Registration failed:', error);
        return null;
    }
}

/**
 * Get push subscription
 */
export async function getPushSubscription() {
    if (!swRegistration) {
        await registerServiceWorker();
    }

    if (!swRegistration) return null;

    try {
        return await swRegistration.pushManager.getSubscription();
    } catch (error) {
        console.error('[SW] Failed to get subscription:', error);
        return null;
    }
}

/**
 * Subscribe to push notifications
 * @param {string} vapidPublicKey - VAPID public key from server
 */
export async function subscribeToPush(vapidPublicKey) {
    if (!swRegistration) {
        await registerServiceWorker();
    }

    if (!swRegistration) {
        throw new Error('Service Worker not registered');
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    try {
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });

        console.log('[SW] Push subscription created:', subscription);
        return subscription;
    } catch (error) {
        console.error('[SW] Push subscription failed:', error);
        throw error;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
    const subscription = await getPushSubscription();
    if (subscription) {
        await subscription.unsubscribe();
        console.log('[SW] Unsubscribed from push');
    }
}

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Listen for messages from Service Worker
 */
export function listenForSwMessages(callback) {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
        callback(event.data);
    });
}

/**
 * Send message to Service Worker
 */
export function sendMessageToSw(message) {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
    }
}

export default {
    isServiceWorkerSupported,
    registerServiceWorker,
    getPushSubscription,
    subscribeToPush,
    unsubscribeFromPush,
    listenForSwMessages,
    sendMessageToSw
};
