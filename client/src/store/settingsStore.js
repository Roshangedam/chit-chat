/**
 * Notification Settings Store
 * Zustand store for all notification preferences
 * Persists to localStorage and syncs across tabs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
    persist(
        (set, get) => ({
            // Global notification settings
            notificationsEnabled: true,
            soundEnabled: true,
            soundVolume: 80, // 0-100
            showPreview: true, // Show message content in notification

            // Do Not Disturb
            dndEnabled: false,
            dndSchedule: null, // { start: '22:00', end: '08:00' }

            // Muted users
            mutedUsers: [], // Array of user IDs permanently muted
            mutedUntil: {}, // { [userId]: timestamp } for temporary mutes

            // Actions
            setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
            setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
            setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(100, volume)) }),
            setShowPreview: (show) => set({ showPreview: show }),

            // DND actions
            setDndEnabled: (enabled) => set({ dndEnabled: enabled }),
            setDndSchedule: (schedule) => set({ dndSchedule: schedule }),

            // Check if DND is currently active
            isDndActive: () => {
                const { dndEnabled, dndSchedule } = get();
                if (dndEnabled) return true;
                if (!dndSchedule) return false;

                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = dndSchedule.start.split(':').map(Number);
                const [endH, endM] = dndSchedule.end.split(':').map(Number);
                const startTime = startH * 60 + startM;
                const endTime = endH * 60 + endM;

                if (startTime < endTime) {
                    return currentTime >= startTime && currentTime < endTime;
                } else {
                    // Overnight schedule (e.g., 22:00 - 08:00)
                    return currentTime >= startTime || currentTime < endTime;
                }
            },

            // Mute actions
            muteUser: (userId, duration = null) => {
                if (duration) {
                    // Temporary mute
                    const until = Date.now() + duration;
                    set((state) => ({
                        mutedUntil: { ...state.mutedUntil, [userId]: until }
                    }));
                } else {
                    // Permanent mute
                    set((state) => ({
                        mutedUsers: [...state.mutedUsers.filter(id => id !== userId), userId]
                    }));
                }
            },

            unmuteUser: (userId) => {
                set((state) => ({
                    mutedUsers: state.mutedUsers.filter(id => id !== userId),
                    mutedUntil: Object.fromEntries(
                        Object.entries(state.mutedUntil).filter(([id]) => id !== userId)
                    )
                }));
            },

            // Check if user is muted
            isUserMuted: (userId) => {
                const { mutedUsers, mutedUntil } = get();

                // Permanently muted
                if (mutedUsers.includes(userId)) return true;

                // Temporarily muted
                const until = mutedUntil[userId];
                if (until) {
                    if (Date.now() < until) return true;
                    // Mute expired, clean up
                    get().unmuteUser(userId);
                }

                return false;
            },

            // Check if notifications should show for a user
            shouldNotify: (userId) => {
                const { notificationsEnabled, isUserMuted, isDndActive } = get();

                if (!notificationsEnabled) return false;
                if (isDndActive()) return false;
                if (isUserMuted(userId)) return false;

                return true;
            },

            // Check if sound should play
            shouldPlaySound: (userId) => {
                const { soundEnabled, shouldNotify } = get();
                return soundEnabled && shouldNotify(userId);
            }
        }),
        {
            name: 'chitchat-settings',
            version: 1
        }
    )
);

export default useSettingsStore;
