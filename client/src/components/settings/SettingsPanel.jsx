/**
 * Settings Panel - Main Container
 */

import { useState } from 'react';
import {
    ArrowLeft,
    User,
    MessageCircle,
    HardDrive,
    Bell,
    Shield,
    Info,
    Lock
} from 'lucide-react';
import ProfileSettings from './ProfileSettings';
import NotificationSettings from './NotificationSettings';
import AboutSettings from './AboutSettings';
import ComingSoon from './ComingSoon';
import './SettingsPanel.css';

const categories = [
    { id: 'profile', label: 'Profile', icon: User, locked: false },
    { id: 'chat', label: 'Chat', icon: MessageCircle, locked: true },
    { id: 'storage', label: 'Storage', icon: HardDrive, locked: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, locked: false },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, locked: true },
    { id: 'about', label: 'About', icon: Info, locked: false },
];

function SettingsPanel({ onBack, initialCategory = 'profile' }) {
    const [activeCategory, setActiveCategory] = useState(initialCategory);

    const handleCategoryClick = (category) => {
        if (!category.locked) {
            setActiveCategory(category.id);
        }
    };

    // Render content based on active category
    const renderContent = () => {
        switch (activeCategory) {
            case 'profile':
                return <ProfileSettings />;
            case 'notifications':
                return <NotificationSettings />;
            case 'about':
                return <AboutSettings />;
            default:
                return <ComingSoon title="Coming Soon" />;
        }
    };

    return (
        <div className="main-settings-panel">
            {/* Sidebar with categories */}
            <div className="main-settings-sidebar">
                <div className="settings-header">
                    <button className="settings-back-btn" onClick={onBack} title="Back to Chats">
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Settings</h2>
                </div>

                <div className="settings-categories">
                    {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <button
                                key={category.id}
                                className={`category-item ${activeCategory === category.id ? 'active' : ''} ${category.locked ? 'locked' : ''}`}
                                onClick={() => handleCategoryClick(category)}
                            >
                                <Icon />
                                <span className="category-label">{category.label}</span>
                                {category.locked && <Lock size={14} className="lock-badge" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content area */}
            <div className="main-settings-content">
                {renderContent()}
            </div>
        </div>
    );
}

export default SettingsPanel;
