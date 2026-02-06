/**
 * ChitChat v2 - Main App Component
 */

import { useState, useEffect } from 'react';
import socket from './socket';
import useUserStore from './store/userStore';
import usePeerStore from './store/peerStore';
import useGroupStore from './store/groupStore';
import Sidebar from './components/Sidebar';
import PeerList from './components/PeerList';
import GroupList from './components/GroupList';
import ChatWindow from './components/ChatWindow';
import GroupChatWindow from './components/GroupChatWindow';
import SettingsPanel from './components/settings/SettingsPanel';
import { ToastContainer } from './components/Toast';
import NotificationPermission from './components/NotificationPermission';
import './App.css';

function App() {
    const { currentUser, isLoading } = useUserStore();
    const selectedPeer = usePeerStore((state) => state.selectedPeer);
    const selectedGroup = useGroupStore((state) => state.selectedGroup);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [connectionError, setConnectionError] = useState(null);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'groups' | 'settings'
    const [settingsCategory, setSettingsCategory] = useState('profile');

    // Handle tab change with optional settings category
    const handleTabChange = (tab, category = null) => {
        setActiveTab(tab);
        if (tab === 'settings' && category) {
            setSettingsCategory(category);
        }
    };

    useEffect(() => {
        function onConnect() {
            console.log('App: Socket connected');
            setIsConnected(true);
            setConnectionError(null);
        }

        function onDisconnect() {
            console.log('App: Socket disconnected');
            setIsConnected(false);
        }

        function onConnectError(error) {
            console.error('App: Connection error', error.message);
            setConnectionError(error.message);
            // Set loading to false so we can show error
            useUserStore.getState().setCurrentUser(null);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // Check if already connected
        if (socket.connected) {
            setIsConnected(true);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
    }, []);

    // Connection error
    if (connectionError) {
        return (
            <div className="app loading">
                <div className="loader error">
                    <span className="emoji">❌</span>
                    <h3>Connection Failed</h3>
                    <p>{connectionError}</p>
                    <p className="hint">Make sure the server is running on port 3000</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    // Loading state - waiting for connection and identification
    if (isLoading || !currentUser) {
        return (
            <div className="app loading">
                <div className="loader">
                    <div className="spinner"></div>
                    <p>Connecting to ChitChat...</p>
                    {!isConnected && <p className="hint">Waiting for server...</p>}
                </div>
            </div>
        );
    }

    // Render content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'settings':
                return <SettingsPanel onBack={() => setActiveTab('chats')} initialCategory={settingsCategory} />;
            case 'groups':
                return <GroupList />;
            case 'chats':
            default:
                return <PeerList />;
        }
    };

    // Render chat window (individual or group)
    const renderChatWindow = () => {
        if (selectedGroup) {
            return <GroupChatWindow />;
        }
        return <ChatWindow />;
    };

    // Show chat window only when in chats or groups tab
    const shouldShowChatWindow = activeTab === 'chats' || activeTab === 'groups';

    return (
        <div className="app chat-app">
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
            {renderContent()}
            {shouldShowChatWindow && renderChatWindow()}
            <ToastContainer />
            <NotificationPermission />
        </div>
    );
}

export default App;


