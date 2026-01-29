/**
 * Notification Manager
 * Central manager for all notification types
 * Decides when to show toast vs browser notification
 */

import { showToast } from '../components/Toast';
import { showWebNotification, isTabHidden } from './webNotification';
import { playNotificationSound } from './soundPlayer';
import { formatMessagePreview } from './messagePreview';
import useSettingsStore from '../store/settingsStore';
import usePeerStore from '../store/peerStore';

/**
 * Show notification for new message
 * @param {Object} options
 * @param {string} options.senderId - Sender user ID
 * @param {string} options.senderName - Sender display name
 * @param {Object} options.message - Message object
 * @param {Function} options.onNavigate - Function to navigate to chat
 */
export function notifyNewMessage({ senderId, senderName, message, onNavigate }) {
    const settings = useSettingsStore.getState();
    const selectedPeer = usePeerStore.getState().selectedPeer;

    // Check if we should notify this user
    if (!settings.shouldNotify(senderId)) {
        return;
    }

    // Check if chat is open with sender and tab is focused
    const isChatOpenWithSender = selectedPeer?.id === senderId && document.hasFocus();
    if (isChatOpenWithSender) {
        return; // Don't notify when chatting with sender
    }

    // Format message preview
    const preview = formatMessagePreview(message);
    const messageType = message.type || 'text';

    // Click handler
    const handleClick = () => {
        if (onNavigate) {
            onNavigate(senderId);
        }
    };

    // Play sound if enabled
    if (settings.shouldPlaySound(senderId)) {
        playNotificationSound(settings.soundVolume);
    }

    // Always show in-app toast (works without permission)
    showToast({
        title: senderName,
        body: settings.showPreview ? preview : 'New message',
        type: messageType,
        onClick: handleClick
    });

    // Browser notification when tab hidden or not focused
    const tabHidden = document.hidden || !document.hasFocus();
    const hasPermission = typeof Notification !== 'undefined' && Notification.permission === 'granted';

    console.log('🔔 Notification check:', { tabHidden, hasPermission, permission: Notification?.permission });

    if (tabHidden && hasPermission) {
        console.log('🔔 Showing browser notification');
        showWebNotification({
            title: senderName,
            body: settings.showPreview ? preview : 'New message',
            tag: `chat-${senderId}`,
            data: { senderId, messageId: message.id },
            onClick: handleClick
        });
    }
}

/**
 * Request notification permission with UI feedback
 */
export async function requestNotificationPermission() {
    const { requestPermission } = await import('./notificationPermission');
    return requestPermission();
}

/**
 * Initialize notification system
 */
export async function initializeNotifications() {
    const { preloadNotificationSound } = await import('./soundPlayer');

    // Preload sound
    preloadNotificationSound();

    console.log('🔔 Notification system initialized');
}

export default {
    notifyNewMessage,
    requestNotificationPermission,
    initializeNotifications
};
