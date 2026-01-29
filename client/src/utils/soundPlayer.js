/**
 * Sound Player Utility
 * Handles notification sounds with volume control and throttling
 */

let audioContext = null;
let notificationBuffer = null;
let lastPlayTime = 0;
const THROTTLE_MS = 2000; // Min 2 seconds between sounds

/**
 * Initialize Web Audio API context
 */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Preload notification sound
 */
export async function preloadNotificationSound() {
    try {
        const response = await fetch('/sounds/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        const ctx = getAudioContext();
        notificationBuffer = await ctx.decodeAudioData(arrayBuffer);
        console.log('🔊 Notification sound preloaded');
    } catch (error) {
        console.warn('Failed to preload notification sound:', error);
    }
}

/**
 * Play notification sound with volume control
 * @param {number} volume - Volume 0-100
 */
export function playNotificationSound(volume = 80) {
    // Throttle to prevent sound spam
    const now = Date.now();
    if (now - lastPlayTime < THROTTLE_MS) {
        return;
    }
    lastPlayTime = now;

    // Try Web Audio API first
    if (notificationBuffer) {
        try {
            const ctx = getAudioContext();

            // Resume context if suspended (required by browsers)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const source = ctx.createBufferSource();
            source.buffer = notificationBuffer;

            // Volume control
            const gainNode = ctx.createGain();
            gainNode.gain.value = volume / 100;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
            return;
        } catch (error) {
            console.warn('Web Audio failed, falling back to HTML5:', error);
        }
    }

    // Fallback to HTML5 Audio
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = volume / 100;
        audio.play().catch(() => {
            // Autoplay blocked, ignore
        });
    } catch (error) {
        console.warn('Failed to play notification sound:', error);
    }
}

/**
 * Create a simple beep sound (fallback when no audio file)
 */
export function playBeep(volume = 80) {
    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime((volume / 100) * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
        console.warn('Failed to play beep:', error);
    }
}

/**
 * Test sound (for settings UI)
 */
export function testSound(volume = 80) {
    playNotificationSound(volume);
}

export default {
    preloadNotificationSound,
    playNotificationSound,
    playBeep,
    testSound
};
