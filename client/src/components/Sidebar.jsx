/**
 * Sidebar Component - Main Navigation
 * Icons: Lucide React
 */

import { MessageSquare, Users, Settings } from 'lucide-react';
import useUserStore from '../store/userStore';
import UserAvatar from './UserAvatar';
import './Sidebar.css';

function Sidebar({ activeTab, onTabChange }) {
    const { currentUser } = useUserStore();

    return (
        <div className="sidebar">
            <nav className="sidebar-nav">
                {/* Chats Tab */}
                <button
                    className={`sidebar-icon ${activeTab === 'chats' ? 'active' : ''}`}
                    onClick={() => onTabChange('chats')}
                    title="Chats"
                >
                    <MessageSquare />
                    <span className="tooltip">Chats</span>
                </button>

                {/* Groups Tab */}
                <button
                    className={`sidebar-icon ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => onTabChange('groups')}
                    title="Groups"
                >
                    <Users />
                    <span className="tooltip">Groups</span>
                </button>

                {/* Settings Tab */}
                <button
                    className={`sidebar-icon ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => onTabChange('settings')}
                    title="Settings"
                >
                    <Settings />
                    <span className="tooltip">Settings</span>
                </button>
            </nav>

            {/* Spacer */}
            <div className="sidebar-spacer"></div>

            {/* User Avatar - Click to open Profile Settings */}
            <div className="sidebar-user" title={currentUser?.name || 'You'}>
                <UserAvatar
                    user={currentUser}
                    size="small"
                    showStatus={true}
                    onClick={() => onTabChange('settings', 'profile')}
                />
            </div>
        </div>
    );
}

export default Sidebar;

