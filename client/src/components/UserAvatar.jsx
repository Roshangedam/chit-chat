/**
 * UserAvatar Component
 * Reusable avatar component with image support and fallback to initials
 * Use this EVERYWHERE avatars are displayed for consistency
 */

import './UserAvatar.css';

function UserAvatar({
    user,           // User object with avatar, name, status properties
    size = 'medium', // 'small' (32px), 'medium' (42px), 'large' (100px)
    showStatus = true, // Show online/offline dot
    className = '',
    onClick = null  // Click handler for opening profile modal
}) {
    // Get first letter for fallback
    const getInitial = () => {
        const name = user?.name || user?.custom_name || '';
        return name.charAt(0).toUpperCase() || 'U';
    };

    // Determine status
    const isOnline = user?.status === 'online';

    // Handle click - prevent bubble from status dot
    const handleClick = (e) => {
        if (onClick) {
            e.stopPropagation();
            onClick(user);
        }
    };

    return (
        <div
            className={`user-avatar user-avatar--${size} ${className} ${onClick ? 'user-avatar--clickable' : ''}`}
            onClick={handleClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="user-avatar__image"
                />
            ) : (
                <div className="user-avatar__fallback">
                    {getInitial()}
                </div>
            )}
            {showStatus && (
                <span
                    className={`user-avatar__status ${isOnline ? 'online' : 'offline'}`}
                    onClick={(e) => e.stopPropagation()}
                ></span>
            )}
        </div>
    );
}

export default UserAvatar;
