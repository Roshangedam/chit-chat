/**
 * Notification Settings for Settings Panel
 * Inline version (not modal) for use inside SettingsPanel
 */

import { useState } from 'react';
import { Bell, Volume2, Eye, Moon, VolumeX } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';
import { testSound } from '../../utils/soundPlayer';
import { getPermission, requestPermission } from '../../utils/notificationPermission';
import './NotificationSettings.css';

function NotificationSettings() {
    const {
        notificationsEnabled,
        soundEnabled,
        soundVolume,
        showPreview,
        dndEnabled,
        setNotificationsEnabled,
        setSoundEnabled,
        setSoundVolume,
        setShowPreview,
        setDndEnabled
    } = useSettingsStore();

    const [permission, setPermission] = useState(getPermission());

    const handleRequestPermission = async () => {
        const result = await requestPermission();
        setPermission(result);
    };

    const handleTestSound = () => {
        testSound(soundVolume);
    };

    return (
        <div className="notification-settings">
            <h3 className="settings-section-title">
                <Bell /> Notifications
            </h3>

            {/* Browser Permission Status */}
            <div className="notif-section">
                <h4>Browser Permission</h4>
                <div className="permission-box">
                    {permission === 'granted' && (
                        <span className="permission-status granted">✅ Notifications Allowed</span>
                    )}
                    {permission === 'denied' && (
                        <span className="permission-status denied">
                            ❌ Blocked - Please enable in browser settings
                        </span>
                    )}
                    {permission === 'default' && (
                        <button className="permission-btn" onClick={handleRequestPermission}>
                            Enable Browser Notifications
                        </button>
                    )}
                </div>
            </div>

            {/* Settings Grid */}
            <div className="notif-settings-list">
                {/* Enable Notifications */}
                <div className="notif-setting-row">
                    <div className="setting-icon">
                        <Bell size={20} />
                    </div>
                    <div className="setting-details">
                        <span className="setting-name">Enable Notifications</span>
                        <span className="setting-desc">Show notifications for new messages</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        />
                        <span className="toggle-track"></span>
                    </label>
                </div>

                {/* Sound */}
                <div className="notif-setting-row">
                    <div className="setting-icon">
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </div>
                    <div className="setting-details">
                        <span className="setting-name">Sound</span>
                        <span className="setting-desc">Play sound for new messages</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(e) => setSoundEnabled(e.target.checked)}
                        />
                        <span className="toggle-track"></span>
                    </label>
                </div>

                {/* Volume Slider (shows when sound enabled) */}
                {soundEnabled && (
                    <div className="volume-control">
                        <span className="volume-label">🔈</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={soundVolume}
                            onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                            className="volume-range"
                        />
                        <span className="volume-value">{soundVolume}%</span>
                        <button className="test-sound-btn" onClick={handleTestSound}>
                            Test
                        </button>
                    </div>
                )}

                {/* Message Preview */}
                <div className="notif-setting-row">
                    <div className="setting-icon">
                        <Eye size={20} />
                    </div>
                    <div className="setting-details">
                        <span className="setting-name">Show Message Preview</span>
                        <span className="setting-desc">Display message content in notifications</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={showPreview}
                            onChange={(e) => setShowPreview(e.target.checked)}
                        />
                        <span className="toggle-track"></span>
                    </label>
                </div>

                {/* Do Not Disturb */}
                <div className="notif-setting-row">
                    <div className="setting-icon dnd">
                        <Moon size={20} />
                    </div>
                    <div className="setting-details">
                        <span className="setting-name">Do Not Disturb</span>
                        <span className="setting-desc">Mute all notifications</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={dndEnabled}
                            onChange={(e) => setDndEnabled(e.target.checked)}
                        />
                        <span className="toggle-track"></span>
                    </label>
                </div>
            </div>

            {/* DND Active Warning */}
            {dndEnabled && (
                <div className="dnd-warning">
                    <Moon size={16} />
                    <span>Do Not Disturb is active - All notifications are muted</span>
                </div>
            )}
        </div>
    );
}

export default NotificationSettings;
