/**
 * About Settings Component
 * App info, version, credits
 */

import { Info, Server, Code, Heart, ExternalLink, Github, Globe } from 'lucide-react';
import socket from '../../socket';
import './AboutSettings.css';

function AboutSettings() {
    const isConnected = socket.connected;

    return (
        <div className="about-settings">
            <h3 className="settings-section-title">
                <Info /> About
            </h3>

            {/* App Info Card */}
            <div className="about-card app-info">
                <div className="app-logo">
                    <span className="logo-icon">💬</span>
                </div>
                <div className="app-details">
                    <h2 className="app-name">ChitChat</h2>
                    <span className="app-version">Version 2.0.0</span>
                    <span className="app-tagline">LAN Chat Application</span>
                </div>
            </div>

            {/* Server Status */}
            <div className="about-section">
                <h4>Server Status</h4>
                <div className="status-card">
                    <Server size={20} />
                    <span className="status-label">Connection</span>
                    <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Features */}
            <div className="about-section">
                <h4>Features</h4>
                <div className="features-list">
                    <div className="feature-item">
                        <span className="feature-emoji">💬</span>
                        <span>Real-time messaging</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-emoji">📎</span>
                        <span>File sharing</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-emoji">🔔</span>
                        <span>Desktop notifications</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-emoji">🎤</span>
                        <span>Voice messages</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-emoji">📷</span>
                        <span>Image & video sharing</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-emoji">😊</span>
                        <span>Emoji & GIF support</span>
                    </div>
                </div>
            </div>

            {/* Developer Credits */}
            <div className="about-section">
                <h4>Credits</h4>
                <div className="credits-card">
                    <div className="credit-row">
                        <Code size={18} />
                        <span>Built with React, Node.js & Socket.IO</span>
                    </div>
                    <div className="credit-row">
                        <Heart size={18} className="heart-icon" />
                        <span>Made with love for local networks</span>
                    </div>
                </div>
            </div>

            {/* Tech Stack */}
            <div className="about-section">
                <h4>Tech Stack</h4>
                <div className="tech-badges">
                    <span className="tech-badge react">React</span>
                    <span className="tech-badge node">Node.js</span>
                    <span className="tech-badge socket">Socket.IO</span>
                    <span className="tech-badge sqlite">SQLite</span>
                    <span className="tech-badge vite">Vite</span>
                </div>
            </div>

            {/* Footer */}
            <div className="about-footer">
                <p>© 2024 ChitChat - LAN Chat Application</p>
                <p className="footer-note">
                    Designed for seamless communication within local networks
                </p>
            </div>
        </div>
    );
}

export default AboutSettings;
