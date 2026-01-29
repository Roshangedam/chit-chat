/**
 * ChitChat v2 - Main App Component
 */

import { useState, useEffect } from 'react';
import socket from './socket';
import useUserStore from './store/userStore';
import Sidebar from './components/Sidebar';
import PeerList from './components/PeerList';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/settings/SettingsPanel';
import { ToastContainer } from './components/Toast';
import NotificationPermission from './components/NotificationPermission';
import './App.css';

function App() {
    const { currentUser, isLoading } = useUserStore();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [connectionError, setConnectionError] = useState(null);
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'settings'
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
            case 'chats':
            default:
                return <PeerList />;
        }
    };

    return (
        <div className="app chat-app">
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
            {renderContent()}
            {activeTab === 'chats' && <ChatWindow />}
            <ToastContainer />
            <NotificationPermission />
        </div>
    );
}

export default App;

