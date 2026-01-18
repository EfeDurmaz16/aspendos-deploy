'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// OneSignal Web SDK types
declare global {
    interface Window {
        OneSignalDeferred?: ((oneSignal: OneSignalInstance) => void)[];
        OneSignal?: OneSignalInstance;
    }
}

interface OneSignalInstance {
    init: (config: OneSignalConfig) => Promise<void>;
    User: {
        PushSubscription: {
            id: string | null;
            optedIn: boolean;
        };
        addAlias: (label: string, id: string) => Promise<void>;
    };
    Notifications: {
        permission: boolean;
        requestPermission: () => Promise<void>;
        addEventListener: (event: string, callback: (event: NotificationEventData) => void) => void;
        removeEventListener: (event: string, callback: (event: NotificationEventData) => void) => void;
    };
}

interface OneSignalConfig {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    notifyButton?: { enable: boolean };
}

interface NotificationEventData {
    notification: {
        title: string;
        body: string;
        data?: Record<string, unknown>;
    };
}

export interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone: string;
    maxDailyNotifications: number;
    minIntervalMinutes: number;
    pacFollowupEnabled: boolean;
    pacEmailFallback: boolean;
}

export interface PACNotification {
    type: 'pac_followup';
    title: string;
    body: string;
    taskId?: string;
    chatId?: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

interface UseNotificationsOptions {
    autoConnect?: boolean;
    onNotification?: (notification: PACNotification) => void;
}

/**
 * Hook to manage notifications (push, in-app, preferences)
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied'>('default');
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [isSSEConnected, setIsSSEConnected] = useState(false);
    const [notifications, setNotifications] = useState<PACNotification[]>([]);

    const sseRef = useRef<EventSource | null>(null);
    const onNotificationRef = useRef(options.onNotification);

    // Keep callback ref updated
    useEffect(() => {
        onNotificationRef.current = options.onNotification;
    }, [options.onNotification]);

    // ============================================
    // PREFERENCES MANAGEMENT
    // ============================================

    const fetchPreferences = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/notifications/preferences`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch preferences');
            }

            const data = await response.json();
            setPreferences(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/preferences`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update preferences');
            }

            const data = await response.json();
            setPreferences(data.preferences);
            return data.preferences;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return null;
        }
    }, []);

    // ============================================
    // PUSH NOTIFICATION MANAGEMENT (OneSignal)
    // ============================================

    const initOneSignal = useCallback(async () => {
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
            console.warn('OneSignal App ID not configured');
            return;
        }

        // Load OneSignal SDK if not already loaded
        if (!window.OneSignal) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
            script.async = true;
            document.head.appendChild(script);
        }

        // Wait for OneSignal to be ready
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.init({
                appId,
                allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
                notifyButton: { enable: false },
            });

            // Check permission and subscription status
            setPushPermission(OneSignal.Notifications.permission ? 'granted' : 'default');
            setIsPushSubscribed(OneSignal.User.PushSubscription.optedIn);

            // Listen for notification events
            OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: NotificationEventData) => {
                const notification: PACNotification = {
                    type: 'pac_followup',
                    title: event.notification.title,
                    body: event.notification.body,
                    data: event.notification.data,
                    timestamp: new Date().toISOString(),
                };

                setNotifications((prev) => [notification, ...prev].slice(0, 50));
                onNotificationRef.current?.(notification);
            });
        });
    }, []);

    const requestPushPermission = useCallback(async () => {
        if (!window.OneSignal) {
            await initOneSignal();
        }

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.Notifications.requestPermission();
            setPushPermission(OneSignal.Notifications.permission ? 'granted' : 'denied');
            setIsPushSubscribed(OneSignal.User.PushSubscription.optedIn);

            // Register subscription with backend
            if (OneSignal.User.PushSubscription.id) {
                await registerPushSubscription(OneSignal.User.PushSubscription.id);
            }
        });
    }, [initOneSignal]);

    const registerPushSubscription = async (playerId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/notifications/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    oneSignalPlayerId: playerId,
                    platform: 'web',
                    browserName: navigator.userAgent,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to register push subscription');
            }

            return true;
        } catch (err) {
            console.error('Push registration failed:', err);
            return false;
        }
    };

    const setOneSignalExternalUserId = useCallback(async (userId: string) => {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
            await OneSignal.User.addAlias('external_id', userId);
        });
    }, []);

    // ============================================
    // SSE CONNECTION FOR IN-APP NOTIFICATIONS
    // ============================================

    const connectSSE = useCallback(() => {
        if (sseRef.current) {
            sseRef.current.close();
        }

        const eventSource = new EventSource(`${API_URL}/api/notifications/stream`, {
            withCredentials: true,
        });

        eventSource.onopen = () => {
            setIsSSEConnected(true);
            console.log('[SSE] Connected to notification stream');
        };

        eventSource.onerror = (err) => {
            console.error('[SSE] Connection error:', err);
            setIsSSEConnected(false);

            // Auto-reconnect after 5 seconds
            setTimeout(() => {
                if (options.autoConnect) {
                    connectSSE();
                }
            }, 5000);
        };

        eventSource.addEventListener('connected', (e) => {
            console.log('[SSE] Server confirmed connection:', e.data);
        });

        eventSource.addEventListener('heartbeat', () => {
            // Connection still alive
        });

        eventSource.onmessage = (e) => {
            try {
                const notification = JSON.parse(e.data) as PACNotification;

                // Add to notifications list
                setNotifications((prev) => [notification, ...prev].slice(0, 50));

                // Call callback
                onNotificationRef.current?.(notification);
            } catch (err) {
                console.error('[SSE] Failed to parse notification:', err);
            }
        };

        sseRef.current = eventSource;
    }, [options.autoConnect]);

    const disconnectSSE = useCallback(() => {
        if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
            setIsSSEConnected(false);
        }
    }, []);

    // ============================================
    // NOTIFICATION MANAGEMENT
    // ============================================

    const clearNotification = useCallback((index: number) => {
        setNotifications((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const markNotificationAsRead = useCallback(async (taskId: string) => {
        // TODO: Send to backend to update notification log
        setNotifications((prev) =>
            prev.filter((n) => n.taskId !== taskId)
        );
    }, []);

    // ============================================
    // LIFECYCLE
    // ============================================

    useEffect(() => {
        // Fetch preferences on mount
        fetchPreferences();

        // Initialize OneSignal
        initOneSignal();

        // Connect SSE if auto-connect enabled
        if (options.autoConnect) {
            connectSSE();
        }

        return () => {
            disconnectSSE();
        };
    }, [fetchPreferences, initOneSignal, connectSSE, disconnectSSE, options.autoConnect]);

    // Check browser notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setPushPermission(Notification.permission);
        }
    }, []);

    return {
        // Preferences
        preferences,
        isLoading,
        error,
        fetchPreferences,
        updatePreferences,

        // Push notifications
        pushPermission,
        isPushSubscribed,
        requestPushPermission,
        setOneSignalExternalUserId,

        // SSE
        isSSEConnected,
        connectSSE,
        disconnectSSE,

        // Notifications
        notifications,
        clearNotification,
        clearAllNotifications,
        markNotificationAsRead,
    };
}

export default useNotifications;
