/**
 * AudioRecorder Component
 * Voice message recording with MediaRecorder API
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import './AudioRecorder.css';

function AudioRecorder({ onRecordingComplete, onCancel }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);
    const [waveformValues, setWaveformValues] = useState([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);
    const streamRef = useRef(null);

    const MAX_DURATION = 5 * 60; // 5 minutes

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start recording
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            audioChunksRef.current = [];

            // Check if mediaDevices is available (requires HTTPS or localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Microphone not available. Use HTTPS or localhost.');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            streamRef.current = stream;

            // Set up audio analysis for waveform
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            mediaRecorder.start(100);
            setIsRecording(true);

            // Start waveform animation
            updateWaveform();

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= MAX_DURATION) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Recording error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Microphone permission denied');
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found');
            } else {
                setError('Recording failed. Try HTTPS.');
            }
        }
    }, []);

    // Update waveform visualization
    const updateWaveform = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Take 20 bars from the frequency data
        const bars = [];
        const step = Math.floor(dataArray.length / 20);
        for (let i = 0; i < 20; i++) {
            bars.push(dataArray[i * step] / 255);
        }
        setWaveformValues(bars);

        animationRef.current = requestAnimationFrame(updateWaveform);
    }, []);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
        setIsPaused(false);
    }, []);

    // Cancel recording
    const cancelRecording = useCallback(() => {
        stopRecording();
        setRecordingTime(0);
        setAudioBlob(null);
        setAudioUrl(null);
        setWaveformValues([]);
        if (onCancel) onCancel();
    }, [stopRecording, onCancel]);

    // Send recording
    const sendRecording = useCallback(() => {
        if (audioBlob && onRecordingComplete) {
            onRecordingComplete({
                blob: audioBlob,
                duration: recordingTime,
                url: audioUrl
            });
        }
    }, [audioBlob, recordingTime, audioUrl, onRecordingComplete]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    return (
        <div className="audio-recorder">
            {error ? (
                <div className="recorder-error">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button onClick={cancelRecording} className="cancel-btn">Close</button>
                </div>
            ) : !audioBlob ? (
                <>
                    {/* Recording UI */}
                    <div className="recording-controls">
                        {!isRecording ? (
                            <button className="record-btn" onClick={startRecording} title="Start Recording">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                </svg>
                            </button>
                        ) : (
                            <>
                                <button className="cancel-recording-btn" onClick={cancelRecording} title="Cancel">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>

                                <div className="waveform-container">
                                    {waveformValues.map((value, index) => (
                                        <div
                                            key={index}
                                            className="waveform-bar"
                                            style={{ height: `${Math.max(4, value * 40)}px` }}
                                        />
                                    ))}
                                </div>

                                <div className="recording-timer">
                                    <span className="recording-dot" />
                                    {formatTime(recordingTime)}
                                </div>

                                <button className="stop-btn" onClick={stopRecording} title="Stop">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Preview UI */}
                    <div className="preview-controls">
                        <button className="delete-btn" onClick={cancelRecording} title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>

                        <audio src={audioUrl} controls className="audio-preview" />

                        <span className="duration-label">{formatTime(recordingTime)}</span>

                        <button className="send-btn" onClick={sendRecording} title="Send">
                            <svg viewBox="0 0 24 24" fill="white">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default AudioRecorder;
