// frontend/app/components/notifications/NotificationItem.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Notification } from '../../../types/notification';
import { Gift, Megaphone, Calendar, Newspaper, Bell, MessageSquare, Trash2 } from 'lucide-react';

interface NotificationItemProps {
    notification: Notification;
    onClick: (notif: Notification) => void;
    onDelete: (id: number) => void;
    darkMode?: boolean;
}

export default function NotificationItem({ notification, onClick, onDelete, darkMode = false }: NotificationItemProps) {
    const [translateX, setTranslateX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const ACTION_WIDTH = 80; // Width of delete button revealed
    const THRESHOLD = 40; // Minimum swipe distance to reveal action
    
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable swipe on mobile (md breakpoint is 768px)
        if (window.innerWidth >= 768) return;
        
        startX.current = e.touches[0].clientX;
        currentX.current = e.touches[0].clientX;
        isDragging.current = true;
        setIsAnimating(false);
    }, []);
    
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current || window.innerWidth >= 768) return;
        
        currentX.current = e.touches[0].clientX;
        const diff = currentX.current - startX.current;
        
        // Only allow swiping left (negative diff)
        if (diff < 0) {
            // Limit the swipe to ACTION_WIDTH
            const newTranslate = Math.max(diff, -ACTION_WIDTH);
            setTranslateX(newTranslate);
        } else if (translateX < 0) {
            // Allow swiping back to close
            const newTranslate = Math.min(translateX + diff, 0);
            setTranslateX(newTranslate);
            startX.current = currentX.current;
        }
    }, [translateX]);
    
    const handleTouchEnd = useCallback(() => {
        if (!isDragging.current || window.innerWidth >= 768) return;
        
        isDragging.current = false;
        setIsAnimating(true);
        
        // If swiped past threshold, snap to open, otherwise snap closed
        if (translateX < -THRESHOLD) {
            setTranslateX(-ACTION_WIDTH);
        } else {
            setTranslateX(0);
        }
    }, [translateX]);
    
    const closeSwipe = useCallback(() => {
        setIsAnimating(true);
        setTranslateX(0);
    }, []);
    
    const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        closeSwipe();
        onDelete(notification.id);
    }, [closeSwipe, onDelete, notification.id]);
    
    const handleClick = useCallback(() => {
        // Don't trigger click if swiped
        if (translateX < -10) {
            closeSwipe();
            return;
        }
        onClick(notification);
    }, [translateX, closeSwipe, onClick, notification]);
    
    // Helper for Icons with brand colors
    const getIconConfig = (category: string) => {
        switch(category) {
            case 'REWARD': 
                return { 
                    icon: Gift, 
                    bgColor: darkMode ? 'bg-[var(--brand-third)]/20' : 'bg-amber-50',
                    iconColor: darkMode ? 'text-[var(--brand-third)]' : 'text-amber-500'
                };
            case 'SYSTEM': 
                return { 
                    icon: Megaphone, 
                    bgColor: darkMode ? 'bg-[var(--brand-peach)]/20' : 'bg-orange-50',
                    iconColor: darkMode ? 'text-[var(--brand-peach)]' : 'text-orange-500'
                };
            case 'EVENT': 
                return { 
                    icon: Calendar, 
                    bgColor: darkMode ? 'bg-[var(--brand-sky)]/20' : 'bg-blue-50',
                    iconColor: darkMode ? 'text-[var(--brand-sky)]' : 'text-blue-500'
                };
            case 'NEWS': 
                return { 
                    icon: Newspaper, 
                    bgColor: darkMode ? 'bg-[var(--brand-purple)]/20' : 'bg-purple-50',
                    iconColor: darkMode ? 'text-[var(--brand-purple)]' : 'text-purple-500'
                };
            case 'POST': 
                return { 
                    icon: MessageSquare, 
                    bgColor: darkMode ? 'bg-[var(--brand-primary)]/20' : 'bg-pink-50',
                    iconColor: darkMode ? 'text-[var(--brand-primary)]' : 'text-pink-500'
                };
            default: 
                return { 
                    icon: Bell, 
                    bgColor: darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100',
                    iconColor: darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                };
        }
    };

    const { icon: Icon, bgColor, iconColor } = getIconConfig(notification.category);

    return (
        <div className="relative overflow-hidden md:overflow-visible" ref={containerRef}>
            {/* Delete action button revealed on swipe - only visible on mobile */}
            <div 
                className="absolute right-0 top-0 bottom-0 flex items-stretch md:hidden"
                style={{ width: ACTION_WIDTH }}
            >
                <button
                    onClick={handleDelete}
                    className={`flex-1 flex items-center justify-center transition-colors ${
                        darkMode 
                            ? 'bg-[var(--brand-red)] text-white active:bg-[var(--brand-red)]/80' 
                            : 'bg-red-500 text-white active:bg-red-600'
                    }`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <Trash2 className="w-5 h-5" />
                        <span className="text-xs font-medium">Delete</span>
                    </div>
                </button>
            </div>
            
            {/* Main content that slides */}
            <div
                className={`relative z-10 ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}`}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div 
                    onClick={handleClick}
                    className={`relative group flex gap-3 sm:gap-4 px-4 py-4 sm:p-5 transition-all cursor-pointer ${
                        darkMode
                            ? notification.is_read 
                                ? 'bg-[var(--dark-800)] border-y sm:border sm:rounded-xl border-[var(--dark-600)] opacity-70 hover:opacity-100' 
                                : 'bg-[var(--dark-700)] border-y sm:border sm:rounded-xl border-[var(--brand-primary)]/30 ring-1 ring-[var(--brand-primary)]/10'
                            : notification.is_read 
                                ? 'bg-white border-y sm:border sm:border-gray-200 sm:rounded-xl opacity-70 hover:opacity-100'
                                : 'bg-white border-y sm:border sm:border-[var(--brand-primary)]/30 sm:rounded-xl shadow-sm ring-1 ring-[var(--brand-primary)]/10'
                    }`}
                >
                    {/* Icon Box */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${bgColor}`}>
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pr-6 sm:pr-8">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm sm:text-base truncate ${
                                darkMode
                                    ? notification.is_read 
                                        ? 'font-medium text-[var(--brand-light)]/80' 
                                        : 'font-bold text-[var(--brand-light)]'
                                    : notification.is_read 
                                        ? 'font-medium text-gray-700' 
                                        : 'font-bold text-gray-900'
                            }`}>
                                {notification.title}
                            </h4>
                            <span className={`text-[10px] sm:text-xs whitespace-nowrap ${
                                darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                            }`}>
                                {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className={`text-xs sm:text-sm mt-1 line-clamp-2 ${
                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                        }`}>
                            {notification.body}
                        </p>
                    </div>

                    {/* Delete Button (Visible on Hover on desktop only) */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                        }}
                        className={`absolute top-3 sm:top-4 right-2 sm:right-4 p-1.5 rounded-full transition-colors hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/30 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10' 
                                : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title="Delete notification"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    
                    {/* Unread Indicator Dot */}
                    {!notification.is_read && (
                        <span className={`absolute top-4 sm:top-5 left-4 sm:left-5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border-2 ${
                            darkMode 
                                ? 'bg-[var(--brand-primary)] border-[var(--dark-700)]' 
                                : 'bg-blue-600 border-white'
                        }`}></span>
                    )}
                </div>
            </div>
        </div>
    );
}
