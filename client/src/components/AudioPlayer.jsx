/**
 * AudioPlayer Component
 * WhatsApp-style audio message player with waveform visualization
 */

import { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

function AudioPlayer({ src, duration: initialDuration }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const audioRef = useRef(null);
    const progressRef = useRef(null);

    // Format time as MM:SS
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle play/pause
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Handle seek
    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percent * duration;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    // Cycle playback speed
    const cyclePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    // Audio event handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleCanPlay = () => {
            setIsLoading(false);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('canplay', handleCanPlay);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('canplay', handleCanPlay);
        };
    }, []);

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button className="play-btn" onClick={togglePlay} disabled={isLoading}>
                {isLoading ? (
                    <div className="loading-spinner" />
                ) : isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                    </svg>
                )}
            </button>

            {/* Waveform/Progress Container */}
            <div className="audio-content">
                <div
                    className="progress-container"
                    ref={progressRef}
                    onClick={handleSeek}
                >
                    {/* Static waveform bars (visual only) */}
                    <div className="waveform-static">
                        {Array.from({ length: 40 }, (_, i) => {
                            const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
                            const isPlayed = (i / 40) * 100 < progress;
                            return (
                                <div
                                    key={i}
                                    className={`waveform-bar-static ${isPlayed ? 'played' : ''}`}
                                    style={{ height: `${height}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Progress overlay */}
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>

                {/* Time Display */}
                <div className="time-display">
                    <span className="current-time">{formatTime(currentTime)}</span>
                    <span className="separator">/</span>
                    <span className="total-time">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Playback Speed */}
            <button className="speed-btn" onClick={cyclePlaybackRate} title="Playback Speed">
                {playbackRate}x
            </button>
        </div>
    );
}

export default AudioPlayer;
