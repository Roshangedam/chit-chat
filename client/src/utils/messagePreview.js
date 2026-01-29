/**
 * Message Preview Formatter
 * Formats messages for notification preview display
 */

/**
 * Format message content for notification preview
 * @param {Object} message - Message object
 * @param {number} maxLength - Max text length
 * @returns {string} - Formatted preview text
 */
export function formatMessagePreview(message, maxLength = 50) {
    if (!message) return 'New message';

    const type = message.type || 'text';

    switch (type) {
        case 'text':
            const text = message.content || '';
            if (text.length > maxLength) {
                return text.substring(0, maxLength) + '...';
            }
            return text;

        case 'image':
            return '📷 Photo';

        case 'video':
            return '🎬 Video';

        case 'audio':
            return '🎵 Voice message';

        case 'file':
            const fileName = message.fileName || message.file_name || 'File';
            return `📎 ${fileName}`;

        case 'gif':
            return 'GIF';

        case 'sticker':
            return 'Sticker';

        default:
            // Check for special message properties
            if (message.is_forwarded || message.isForwarded) {
                return '↪️ Forwarded message';
            }
            if (message.reply_to || message.replyTo) {
                return '↩️ Replied to a message';
            }
            return message.content?.substring(0, maxLength) || 'New message';
    }
}

/**
 * Get emoji icon for message type
 */
export function getMessageTypeIcon(type) {
    const icons = {
        text: '💬',
        image: '📷',
        video: '🎬',
        audio: '🎵',
        file: '📎',
        gif: '🎞️',
        sticker: '😊'
    };
    return icons[type] || '💬';
}

/**
 * Format notification body with sender name
 */
export function formatNotificationBody(senderName, message) {
    const preview = formatMessagePreview(message);
    return `${senderName}: ${preview}`;
}

export default {
    formatMessagePreview,
    getMessageTypeIcon,
    formatNotificationBody
};
