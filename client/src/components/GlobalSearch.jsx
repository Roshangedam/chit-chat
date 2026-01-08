/**
 * GlobalSearch Component
 * Searches across all chats with user grouping and date sorting
 */

import { useState, useEffect, useCallback } from 'react';
import usePeerStore from '../store/peerStore';
import socket from '../socket';
import './GlobalSearch.css';

function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const peers = usePeerStore((state) => state.peers);
    const selectPeer = usePeerStore((state) => state.selectPeer);

    // Get peer info by ID
    const getPeerInfo = useCallback((peerId) => {
        return peers.find(p => p.id === peerId);
    }, [peers]);

    // Format date for grouping
    const formatDateGroup = (dateStr) => {
        const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    // Format time
    const formatTime = (dateStr) => {
        const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Group results by user then date
    const groupResults = useCallback((messages) => {
        const grouped = {};

        messages.forEach(msg => {
            // Determine the other user (not current user)
            const otherId = msg.sender_id;
            const otherInfo = getPeerInfo(otherId) || getPeerInfo(msg.receiver_id);
            const peerId = otherInfo?.id || otherId;

            if (!grouped[peerId]) {
                grouped[peerId] = {
                    peer: otherInfo || { id: peerId, name: peerId },
                    dateGroups: {}
                };
            }

            const dateGroup = formatDateGroup(msg.created_at);
            if (!grouped[peerId].dateGroups[dateGroup]) {
                grouped[peerId].dateGroups[dateGroup] = [];
            }
            grouped[peerId].dateGroups[dateGroup].push(msg);
        });

        return grouped;
    }, [getPeerInfo]);

    // Handle search
    const handleSearch = useCallback((searchQuery) => {
        setQuery(searchQuery);

        if (searchQuery.trim().length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        socket.emit('messages:globalSearch', { query: searchQuery });
    }, []);

    // Listen for search results
    useEffect(() => {
        const handleResults = (data) => {
            setResults(data.results || []);
            setLoading(false);
        };

        socket.on('messages:globalSearch:results', handleResults);
        return () => socket.off('messages:globalSearch:results', handleResults);
    }, []);

    // Handle result click - open chat and jump to message
    const handleResultClick = (msg) => {
        // Find the peer to select
        const peerId = msg.sender_id;
        const peer = getPeerInfo(peerId) || getPeerInfo(msg.receiver_id);

        if (peer) {
            selectPeer(peer);
            // Emit jump to message after chat loads
            setTimeout(() => {
                socket.emit('messages:jump', {
                    peerId: peer.id,
                    messageId: msg.id
                });
            }, 300);
        }

        // Collapse search
        setIsExpanded(false);
        setQuery('');
        setResults([]);
    };

    const groupedResults = groupResults(results);
    const hasResults = Object.keys(groupedResults).length > 0;

    return (
        <div className={`global-search ${isExpanded ? 'expanded' : ''}`}>
            {/* Search Input */}
            <div className="search-input-container">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Search all messages..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                />
                {query && (
                    <button
                        className="clear-btn"
                        onClick={() => { setQuery(''); setResults([]); setIsExpanded(false); }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Search Results */}
            {isExpanded && query.length >= 2 && (
                <div className="search-results-container">
                    {loading ? (
                        <div className="search-loading">
                            <div className="spinner"></div>
                            <span>Searching...</span>
                        </div>
                    ) : !hasResults ? (
                        <div className="no-results">
                            <span>No messages found for "{query}"</span>
                        </div>
                    ) : (
                        <div className="results-list">
                            {Object.entries(groupedResults).map(([peerId, { peer, dateGroups }]) => (
                                <div key={peerId} className="user-group">
                                    {/* User Header */}
                                    <div className="user-header">
                                        <div className="user-avatar">
                                            {peer.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <span className="user-name">{peer.name || peerId}</span>
                                        <span className="result-count">
                                            {Object.values(dateGroups).flat().length} results
                                        </span>
                                    </div>

                                    {/* Date Groups */}
                                    {Object.entries(dateGroups).map(([date, messages]) => (
                                        <div key={date} className="date-group">
                                            <div className="date-header">{date}</div>
                                            {messages.map(msg => (
                                                <div
                                                    key={msg.id}
                                                    className="result-item"
                                                    onClick={() => handleResultClick(msg)}
                                                >
                                                    <div className="result-content">
                                                        <HighlightedText
                                                            text={msg.content || '[Media]'}
                                                            highlight={query}
                                                        />
                                                    </div>
                                                    <span className="result-time">
                                                        {formatTime(msg.created_at)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Overlay to close when clicking outside */}
            {isExpanded && (
                <div className="search-overlay" onClick={() => setIsExpanded(false)} />
            )}
        </div>
    );
}

// Highlight matched text component
function HighlightedText({ text, highlight }) {
    if (!highlight || !text) return <span>{text}</span>;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i}>{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
}

export default GlobalSearch;
