// frontend/hooks/useWebSocket.ts
/**
 * Custom hook for WebSocket connections in the messenger.
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Typing indicators
 * - Real-time message reception
 * - Read receipt handling
 * - Connection state management
 * - JWT authentication for WebSocket connections
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { Message } from '../types/messenger';

interface TypingUser {
    id: number;
    name: string;
    startedAt: number;
}

interface WebSocketHookOptions {
    onNewMessage?: (message: Message) => void;
    onTypingUpdate?: (users: Map<number, TypingUser>) => void;
    onReadReceipt?: (userId: number, messageIds: number[]) => void;
    onPresenceChange?: (userId: number, status: 'online' | 'offline') => void;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    typingUsers: Map<number, TypingUser>;
    sendTyping: (isTyping: boolean) => void;
    sendReadReceipt: (messageIds: number[]) => void;
}

// Typing indicator timeout (5 seconds)
const TYPING_TIMEOUT = 5000;

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useWebSocket(
    conversationId: number | null,
    options: WebSocketHookOptions = {}
): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
    const isConnectingRef = useRef(false);
    
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Map<number, TypingUser>>(new Map());
    
    // Store callbacks in refs to avoid re-creating connect function
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Clear typing indicator for a user
    const clearTypingIndicator = useCallback((userId: number) => {
        setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
        
        // Clear the timeout
        const timeout = typingTimeoutRef.current.get(userId);
        if (timeout) {
            clearTimeout(timeout);
            typingTimeoutRef.current.delete(userId);
        }
    }, []);

    // Send typing indicator
    const sendTyping = useCallback((isTyping: boolean) => {
        console.log('sendTyping called:', isTyping, 'wsRef:', !!wsRef.current, 'readyState:', wsRef.current?.readyState);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('sendTyping: Sending typing event');
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: isTyping
            }));
        } else {
            console.warn('sendTyping: WebSocket not ready');
        }
    }, []);

    // Send read receipt
    const sendReadReceipt = useCallback((messageIds: number[]) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && messageIds.length > 0) {
            wsRef.current.send(JSON.stringify({
                type: 'message_read',
                message_ids: messageIds
            }));
        }
    }, []);

    // Connect when conversation changes
    useEffect(() => {
        console.log('useWebSocket: Effect triggered, conversationId:', conversationId);
        
        if (!conversationId) {
            console.log('useWebSocket: No conversationId, skipping connection');
            return;
        }
        
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current) {
            console.log('useWebSocket: Already connecting, skipping');
            return;
        }
        
        // Get the JWT token from cookies
        const token = Cookies.get('access_token');
        if (!token) {
            console.warn('WebSocket: No access token available');
            return;
        }
        console.log('useWebSocket: Token found, proceeding with connection');
        
        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = process.env.NEXT_PUBLIC_WS_URL || 'localhost:8000';
        const url = `${protocol}//${host}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;
        
        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        
        isConnectingRef.current = true;
        
        const connect = () => {
            try {
                console.log('WebSocket: Connecting...');
                const ws = new WebSocket(url);
                
                ws.onopen = () => {
                    setIsConnected(true);
                    reconnectAttemptRef.current = 0;
                    isConnectingRef.current = false;
                    console.log('WebSocket: Connected successfully');
                };
                
                ws.onclose = (event) => {
                    setIsConnected(false);
                    wsRef.current = null;
                    isConnectingRef.current = false;
                    
                    console.log(`WebSocket: Closed (code: ${event.code}, clean: ${event.wasClean})`);
                    
                    // Only reconnect if not a clean close and we haven't exceeded attempts
                    // Code 1000 = normal closure, 1001 = going away (page navigation)
                    if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
                        const delay = Math.min(
                            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
                            MAX_RECONNECT_DELAY
                        );
                        
                        console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
                        reconnectAttemptRef.current++;
                        
                        reconnectTimeoutRef.current = setTimeout(connect, delay);
                    }
                };
                
                ws.onerror = () => {
                    // Note: The error event doesn't contain useful info in browsers for security reasons
                    console.error('WebSocket: Connection error');
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const { onNewMessage, onTypingUpdate, onReadReceipt, onPresenceChange } = optionsRef.current;
                        
                        switch (data.type) {
                            case 'new_message':
                                if (onNewMessage && data.message) {
                                    onNewMessage(data.message);
                                }
                                break;
                            
                            case 'typing':
                                console.log('WebSocket: Received typing event:', data);
                                if (data.is_typing) {
                                    setTypingUsers(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(data.user_id, {
                                            id: data.user_id,
                                            name: data.user_name,
                                            startedAt: Date.now()
                                        });
                                        console.log('WebSocket: Updated typingUsers:', Array.from(newMap.values()));
                                        
                                        if (onTypingUpdate) {
                                            onTypingUpdate(newMap);
                                        }
                                        
                                        return newMap;
                                    });
                                    
                                    // Set timeout to clear typing indicator
                                    const existingTimeout = typingTimeoutRef.current.get(data.user_id);
                                    if (existingTimeout) {
                                        clearTimeout(existingTimeout);
                                    }
                                    
                                    const timeout = setTimeout(() => {
                                        clearTypingIndicator(data.user_id);
                                    }, TYPING_TIMEOUT);
                                    typingTimeoutRef.current.set(data.user_id, timeout);
                                } else {
                                    clearTypingIndicator(data.user_id);
                                }
                                break;
                            
                            case 'read_receipt':
                                if (onReadReceipt) {
                                    onReadReceipt(data.user_id, data.message_ids);
                                }
                                break;
                            
                            case 'presence':
                                if (onPresenceChange) {
                                    onPresenceChange(data.user_id, data.status);
                                }
                                break;
                            
                            case 'pong':
                                // Keep-alive response received
                                break;
                            
                            case 'error':
                                console.error('WebSocket server error:', data.message);
                                break;
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
                
                wsRef.current = ws;
            } catch (error) {
                console.error('WebSocket: Failed to create connection:', error);
                isConnectingRef.current = false;
            }
        };
        
        connect();
        
        return () => {
            // Cleanup on unmount or conversation change
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmount');
                wsRef.current = null;
            }
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            // Clear all typing timeouts
            typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
            typingTimeoutRef.current.clear();
            setTypingUsers(new Map());
            isConnectingRef.current = false;
        };
    }, [conversationId, clearTypingIndicator]); // Only re-run when conversationId changes

    // Keep-alive ping every 30 seconds
    useEffect(() => {
        if (!isConnected) return;
        
        const pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
        
        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return {
        isConnected,
        typingUsers,
        sendTyping,
        sendReadReceipt
    };
}

export default useWebSocket;
