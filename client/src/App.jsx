/**
 * ChitChat v2 - Main App Component
 */

import { useState, useEffect } from 'react';
import socket from './socket';
import useUserStore from './store/userStore';
import PeerList from './components/PeerList';
import ChatWindow from './components/ChatWindow';
import './App.css';

function App() {
    const { currentUser, isLoading } = useUserStore();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [connectionError, setConnectionError] = useState(null);

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

    return (
        <div className="app chat-app">
            <PeerList />
            <ChatWindow />
        </div>
    );
}

export default App;
