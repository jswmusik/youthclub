// frontend/hooks/useNotificationWebSocket.ts
/**
 * Global WebSocket hook for real-time notification updates.
 * 
 * This hook connects to the user's personal notification channel and
 * broadcasts unread count updates to all components that need them.
 * 
 * Features:
 * - Real-time unread message count updates
 * - Auto-reconnect with exponential backoff
 * - Broadcasts updates via a global event system
 */
import { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';

// Event name for broadcasting unread count updates
export const UNREAD_COUNT_UPDATE_EVENT = 'messenger:unread_count_update';

interface NotificationWebSocketOptions {
    onUnreadCountUpdate?: (count: number) => void;
    onNewMessage?: (data: { conversationId: number; messagePreview?: string; senderName?: string }) => void;
}

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 60000;

export function useNotificationWebSocket(options: NotificationWebSocketOptions = {}) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const [isConnected, setIsConnected] = useState(false);
    
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        // Small delay to ensure token is available after login
        const initTimeout = setTimeout(() => {
            // Get the JWT token from cookies
            const token = Cookies.get('access_token');
            if (!token) {
                console.log('NotificationWebSocket: No access token, skipping connection');
                return;
            }
            
            // Prevent multiple simultaneous connection attempts
            if (isConnectingRef.current || wsRef.current) return;
            
            // Build WebSocket URL for notifications
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = process.env.NEXT_PUBLIC_WS_URL || 'localhost:8000';
            const url = `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
            
            isConnectingRef.current = true;
            
            const connect = () => {
                // Check token again before reconnecting
                const currentToken = Cookies.get('access_token');
                if (!currentToken) {
                    console.log('NotificationWebSocket: No token available, stopping reconnection');
                    isConnectingRef.current = false;
                    return;
                }
                
                try {
                    console.log('NotificationWebSocket: Connecting...');
                    const reconnectUrl = `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(currentToken)}`;
                    const ws = new WebSocket(reconnectUrl);
                    
                    ws.onopen = () => {
                        reconnectAttemptRef.current = 0;
                        isConnectingRef.current = false;
                        setIsConnected(true);
                        console.log('NotificationWebSocket: Connected');
                    };
                    
                    ws.onclose = (event) => {
                        wsRef.current = null;
                        isConnectingRef.current = false;
                        setIsConnected(false);
                        
                        console.log(`NotificationWebSocket: Closed (code: ${event.code})`);
                        
                        // Only reconnect if not a clean close and token exists
                        const tokenExists = !!Cookies.get('access_token');
                        if (tokenExists && event.code !== 1000 && event.code !== 1001 && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
                            const delay = Math.min(
                                INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
                                MAX_RECONNECT_DELAY
                            );
                            
                            console.log(`NotificationWebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
                            reconnectAttemptRef.current++;
                            
                            reconnectTimeoutRef.current = setTimeout(connect, delay);
                        }
                    };
                    
                    ws.onerror = (error) => {
                        console.error('NotificationWebSocket: Connection error', error);
                    };
                    
                    ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log('NotificationWebSocket: Received message:', data);
                            const { onUnreadCountUpdate, onNewMessage } = optionsRef.current;
                            
                            switch (data.type) {
                                case 'new_message':
                                    console.log('NotificationWebSocket: New message notification - unread_count:', data.unread_count);
                                    // New message received - trigger callback and dispatch global event
                                    if (onNewMessage) {
                                        onNewMessage({
                                            conversationId: data.conversation_id,
                                            messagePreview: data.message_preview,
                                            senderName: data.sender_name
                                        });
                                    }
                                    
                                    // Dispatch global event for unread count update
                                    // Only update if we have a valid number (not null/undefined)
                                    if (typeof data.unread_count === 'number') {
                                        console.log('NotificationWebSocket: Updating unread count to:', data.unread_count);
                                        if (onUnreadCountUpdate) {
                                            onUnreadCountUpdate(data.unread_count);
                                        }
                                        
                                        // Also dispatch a custom event for other components
                                        window.dispatchEvent(new CustomEvent(UNREAD_COUNT_UPDATE_EVENT, {
                                            detail: { count: data.unread_count }
                                        }));
                                    }
                                    break;
                                
                                case 'unread_count':
                                    // Direct unread count update
                                    if (onUnreadCountUpdate) {
                                        onUnreadCountUpdate(data.count);
                                    }
                                    
                                    // Dispatch global event
                                    window.dispatchEvent(new CustomEvent(UNREAD_COUNT_UPDATE_EVENT, {
                                        detail: { count: data.count }
                                    }));
                                    break;
                                
                                case 'pong':
                                    // Keep-alive response
                                    break;
                            }
                        } catch (error) {
                            console.error('NotificationWebSocket: Error parsing message:', error);
                        }
                    };
                    
                    wsRef.current = ws;
                } catch (error) {
                    console.error('NotificationWebSocket: Failed to create connection:', error);
                    isConnectingRef.current = false;
                }
            };
            
            connect();
        }, 500); // Small delay to ensure token is available
        
        // Keep-alive ping every 30 seconds
        const pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
        
        return () => {
            clearTimeout(initTimeout);
            clearInterval(pingInterval);
            
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmount');
                wsRef.current = null;
            }
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            isConnectingRef.current = false;
        };
    }, []); // Only run once on mount
    
    return { isConnected };
}

/**
 * Hook to listen for unread count updates from the global event system.
 * Use this in components that need to display the unread count but don't
 * need to manage the WebSocket connection themselves.
 */
export function useUnreadCountListener(onUpdate: (count: number) => void) {
    useEffect(() => {
        const handler = (event: CustomEvent<{ count: number }>) => {
            onUpdate(event.detail.count);
        };
        
        window.addEventListener(UNREAD_COUNT_UPDATE_EVENT, handler as EventListener);
        
        return () => {
            window.removeEventListener(UNREAD_COUNT_UPDATE_EVENT, handler as EventListener);
        };
    }, [onUpdate]);
}

export default useNotificationWebSocket;

