/**
 * ChitChat Service Worker
 * Handles push notifications when browser is closed
 */

const CACHE_NAME = 'chitchat-v1';
const APP_URL = self.location.origin;

// Install event
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated');
    event.waitUntil(clients.claim());
});

// Push event - received push notification
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {
        title: 'New Message',
        body: 'You have a new message',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'chitchat-message',
        data: {}
    };

    // Parse push data if available
    if (event.data) {
        try {
            const payload = event.data.json();
            data = {
                title: payload.title || data.title,
                body: payload.body || data.body,
                icon: payload.icon || data.icon,
                badge: data.badge,
                tag: payload.tag || data.tag,
                data: payload.data || {}
            };
        } catch (e) {
            console.error('[SW] Error parsing push data:', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        requireInteraction: false,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();

    const urlToOpen = data.data?.url || APP_URL;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(APP_URL) && 'focus' in client) {
                        // Post message to navigate to chat
                        if (event.notification.data?.senderId) {
                            client.postMessage({
                                type: 'NOTIFICATION_CLICK',
                                senderId: event.notification.data.senderId
                            });
                        }
                        return client.focus();
                    }
                }
                // Open new window if not open
                if (clients.openWindow) {
                    return clients.openWindow(APP_URL);
                }
            })
    );
});

// Message from client
self.addEventListener('message', (event) => {
    console.log('[SW] Message from client:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
