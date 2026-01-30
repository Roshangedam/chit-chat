/**
 * Notification Permission Request Component
 * Shows a banner asking user to enable notifications
 */

import { useState, useEffect } from 'react';
import { shouldShowPermissionPrompt, requestPermission, deferPermission, getPermission } from '../utils/notificationPermission';
import { registerServiceWorker, subscribeToPush } from '../utils/serviceWorker';
import socket from '../socket';
import './NotificationPermission.css';

export default function NotificationPermission() {
    const [show, setShow] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        // Check if we should show the prompt after a short delay
        const timer = setTimeout(() => {
            if (shouldShowPermissionPrompt()) {
                setShow(true);
            }
        }, 3000); // Show after 3 seconds

        // Register SW on mount regardless
        registerServiceWorker();

        // Auto-subscribe if permission already granted (for returning users)
        const autoSubscribe = async () => {
            if (getPermission() === 'granted') {
                try {
                    socket.emit('push:getVapidKey', async (response) => {
                        if (response?.vapidPublicKey) {
                            const subscription = await subscribeToPush(response.vapidPublicKey);
                            if (subscription) {
                                socket.emit('push:subscribe', { subscription: subscription.toJSON() });
                                console.log('🔔 Auto push subscription successful');
                            }
                        }
                    });
                } catch (error) {
                    console.error('Auto push subscribe failed:', error);
                }
            }
        };

        // Small delay to ensure socket is connected
        const autoTimer = setTimeout(autoSubscribe, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoTimer);
        };
    }, []);

    const handleEnable = async () => {
        setRequesting(true);
        const result = await requestPermission();
        setRequesting(false);

        if (result === 'granted') {
            setShow(false);

            // Subscribe to push notifications
            try {
                socket.emit('push:getVapidKey', async (response) => {
                    if (response?.vapidPublicKey) {
                        const subscription = await subscribeToPush(response.vapidPublicKey);
                        if (subscription) {
                            socket.emit('push:subscribe', { subscription: subscription.toJSON() });
                            console.log('🔔 Push subscription successful');
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to subscribe to push:', error);
            }
        } else if (result === 'denied') {
            setShow(false);
        }
    };

    const handleLater = () => {
        deferPermission(24);
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="notification-permission-banner">
            <div className="permission-icon">🔔</div>
            <div className="permission-content">
                <h4>Enable Notifications?</h4>
                <p>Get notified when you receive new messages</p>
            </div>
            <div className="permission-actions">
                <button
                    className="permission-btn enable"
                    onClick={handleEnable}
                    disabled={requesting}
                >
                    {requesting ? 'Requesting...' : 'Enable'}
                </button>
                <button
                    className="permission-btn later"
                    onClick={handleLater}
                >
                    Later
                </button>
            </div>
        </div>
    );
}
