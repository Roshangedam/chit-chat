/**
 * ForwardModal Component
 * Modal for selecting peers to forward message to
 */

import { useState } from 'react';
import usePeerStore from '../store/peerStore';
import useMessageStore from '../store/messageStore';
import useUserStore from '../store/userStore';
import socket from '../socket';
import './ForwardModal.css';

function ForwardModal({ message, onClose }) {
    const peers = usePeerStore((state) => state.peers);
    const currentUser = useUserStore((state) => state.currentUser);
    const [selectedPeers, setSelectedPeers] = useState([]);
    const [sending, setSending] = useState(false);

    const togglePeer = (peerId) => {
        setSelectedPeers(prev =>
            prev.includes(peerId)
                ? prev.filter(id => id !== peerId)
                : [...prev, peerId]
        );
    };

    const handleForward = () => {
        if (selectedPeers.length === 0 || !currentUser) return;

        setSending(true);

        // Forward to each selected peer
        selectedPeers.forEach(peerId => {
            const tempId = `temp-fwd-${Date.now()}-${peerId}`;

            // Optimistic update - add message to sender's view immediately
            useMessageStore.getState().addMessage(peerId, {
                id: tempId,
                sender_id: currentUser.id,
                receiver_id: peerId,
                content: message.content,
                type: message.type || 'text',
                status: 'sending',
                created_at: new Date().toISOString(),
                is_forwarded: 1,
                isForwarded: true
            });

            // Update peer list
            const previewText = message.type === 'image' ? '📷 Photo' :
                message.type === 'gif' ? 'GIF' :
                    message.type === 'sticker' ? message.content :
                        message.content?.substring(0, 30);
            usePeerStore.getState().movePeerToTop(peerId, previewText, currentUser.id, message.type || 'text', 'sending');

            socket.emit('message:forward', {
                tempId,
                messageId: message.id,
                content: message.content,
                type: message.type || 'text',
                receiverId: peerId,
                originalSenderId: message.sender_id
            });
        });

        setTimeout(() => {
            setSending(false);
            onClose();
        }, 500);
    };

    return (
        <div className="forward-modal-overlay" onClick={onClose}>
            <div className="forward-modal" onClick={e => e.stopPropagation()}>
                <div className="forward-header">
                    <h3>Forward Message</h3>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="forward-preview">
                    <span className="preview-label">Message:</span>
                    <p className="preview-content">
                        {message.type === 'image' ? (
                            '📷 Photo'
                        ) : message.type === 'video' ? (
                            '🎬 Video'
                        ) : message.type === 'gif' ? (
                            'GIF'
                        ) : message.type === 'sticker' ? (
                            message.content
                        ) : (
                            <>
                                {message.content?.substring(0, 100)}
                                {message.content?.length > 100 ? '...' : ''}
                            </>
                        )}
                    </p>
                </div>

                <div className="peers-list">
                    <span className="list-label">Select recipients:</span>
                    {peers.length === 0 ? (
                        <p className="no-peers">No other users available</p>
                    ) : (
                        peers.map(peer => (
                            <div
                                key={peer.id}
                                className={`peer-item ${selectedPeers.includes(peer.id) ? 'selected' : ''}`}
                                onClick={() => togglePeer(peer.id)}
                            >
                                <div className="peer-avatar">
                                    {peer.name?.[0]?.toUpperCase() || '?'}
                                    <span className={`status-dot ${peer.status}`}></span>
                                </div>
                                <span className="peer-name">{peer.name}</span>
                                <span className="peer-check">
                                    {selectedPeers.includes(peer.id) ? '✓' : ''}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <button
                    className="forward-btn-submit"
                    onClick={handleForward}
                    disabled={selectedPeers.length === 0 || sending}
                >
                    {sending ? 'Forwarding...' : `Forward to ${selectedPeers.length} chat${selectedPeers.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    );
}

export default ForwardModal;
