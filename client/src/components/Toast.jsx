/**
 * Toast Notification Component
 * In-app notification toasts for new messages
 */

import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

// Toast container to hold multiple toasts
let toastContainer = null;
let toasts = [];
let setToastsState = null;
let toastId = 0;

/**
 * Toast Component
 */
function Toast({ id, title, body, icon, type, onClick, onClose }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 10);

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    }, [id, onClose]);

    const handleClick = () => {
        if (onClick) onClick();
        handleClose();
    };

    const getTypeIcon = () => {
        switch (type) {
            case 'image': return '📷';
            case 'video': return '🎬';
            case 'audio': return '🎵';
            case 'file': return '📎';
            default: return '💬';
        }
    };

    return (
        <div
            className={`toast ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
            onClick={handleClick}
        >
            <div className="toast-icon">
                {icon ? (
                    <img src={icon} alt="" />
                ) : (
                    <span className="toast-avatar">{title?.[0]?.toUpperCase() || '?'}</span>
                )}
            </div>
            <div className="toast-content">
                <div className="toast-title">{title}</div>
                <div className="toast-body">
                    <span className="toast-type-icon">{getTypeIcon()}</span>
                    {body}
                </div>
            </div>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
                ×
            </button>
        </div>
    );
}

/**
 * Toast Container Component
 */
export function ToastContainer() {
    const [toastList, setToastList] = useState([]);

    useEffect(() => {
        setToastsState = setToastList;
        return () => {
            setToastsState = null;
        };
    }, []);

    const removeToast = useCallback((id) => {
        setToastList(prev => prev.filter(t => t.id !== id));
    }, []);

    // Only show max 3 toasts
    const visibleToasts = toastList.slice(-3);

    return (
        <div className="toast-container">
            {visibleToasts.map(toast => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
}

/**
 * Show toast notification
 * @param {Object} options
 * @param {string} options.title - Sender name
 * @param {string} options.body - Message preview
 * @param {string} options.icon - Avatar URL
 * @param {string} options.type - Message type
 * @param {Function} options.onClick - Click handler
 */
export function showToast({ title, body, icon, type = 'text', onClick }) {
    if (!setToastsState) {
        console.warn('ToastContainer not mounted');
        return;
    }

    const id = ++toastId;

    setToastsState(prev => [...prev, {
        id,
        title,
        body,
        icon,
        type,
        onClick
    }]);

    return id;
}

/**
 * Close all toasts
 */
export function closeAllToasts() {
    if (setToastsState) {
        setToastsState([]);
    }
}

export default Toast;
