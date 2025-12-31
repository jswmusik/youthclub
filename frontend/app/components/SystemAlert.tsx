'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Info, AlertCircle, AlertTriangle, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function SystemAlert() {
  const { user, loading: authLoading } = useAuth();
  const [msg, setMsg] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for auth to finish loading before fetching messages
    if (authLoading) return;
    
    // Always check for messages - use different endpoints based on auth status
    checkMessage();
  }, [pathname, user, authLoading]);

  const checkMessage = async () => {
    try {
      // Use authenticated endpoint if logged in, public endpoint otherwise
      const endpoint = user ? '/messages/my_latest/' : '/messages/public_latest/';
      const res = await api.get(endpoint);
      const message = res.data;

      // Handle null or empty response
      if (!message || (typeof message === 'object' && Object.keys(message).length === 0)) {
        setIsVisible(false);
        setMsg(null);
        return;
      }

      // CHECK DISMISSAL LOGIC
      const isClosed = localStorage.getItem(`closed_msg_${message.id}`);
      
      // If it's sticky, we show it regardless of history.
      // If it's NOT sticky and was closed, we hide it.
      if (!message.is_sticky && isClosed) {
        setIsVisible(false);
        setMsg(null);
      } else {
        setMsg(message);
        setIsVisible(true);
      }
    } catch (err: any) {
      // Silently fail - don't show errors for missing messages or auth issues
      // Only log actual errors (not 404s, 401s, or empty responses)
      if (err?.response?.status !== 404 && err?.response?.status !== 401) {
        console.error('Error fetching system message:', err);
      }
      setIsVisible(false);
      setMsg(null);
    }
  };

  // Hide system alert on kiosk page
  const isKioskPage = pathname?.includes('/kiosk');

  // Update CSS variable for system alert height
  useEffect(() => {
    // Always reset height on kiosk page
    if (isKioskPage) {
      document.documentElement.style.setProperty('--system-alert-height', '0px');
      return;
    }
    
    if (isVisible && alertRef.current) {
      const height = alertRef.current.offsetHeight;
      document.documentElement.style.setProperty('--system-alert-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--system-alert-height', '0px');
    }
    
    return () => {
      document.documentElement.style.setProperty('--system-alert-height', '0px');
    };
  }, [isVisible, msg, isKioskPage]);

  const handleDismiss = () => {
    if (!msg) return;
    setIsVisible(false);
    // Remember that this specific message ID was closed
    localStorage.setItem(`closed_msg_${msg.id}`, 'true');
    // Reset the CSS variable immediately
    document.documentElement.style.setProperty('--system-alert-height', '0px');
  };

  // Don't render on kiosk page
  if (isKioskPage) return null;

  if (!isVisible || !msg) return null;

  // Theme Configuration with brand colors and flat icons
  const themes = {
    INFO: { 
      bg: 'bg-[#0EA5E9]', 
      icon: Info, 
      border: 'border-[#0EA5E9]' 
    },
    IMPORTANT: { 
      bg: 'bg-[#F59E0B]', 
      icon: AlertCircle, 
      border: 'border-[#F59E0B]' 
    },
    WARNING: { 
      bg: 'bg-[#EF4444]', 
      icon: AlertTriangle, 
      border: 'border-[#EF4444]' 
    },
  };

  const theme = themes[msg.message_type as keyof typeof themes] || themes.INFO;
  const IconComponent = theme.icon;

  return (
    <div ref={alertRef} className={`${theme.bg} text-white fixed top-0 left-0 right-0 z-[100] shadow-md`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
        
        {/* Message Content */}
        <div className="flex items-center gap-3 flex-1">
          <IconComponent className="h-5 w-5 text-white flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold uppercase tracking-wide mr-2 opacity-90">
              {msg.title}:
            </span>
            <span className="font-medium opacity-95">
              {msg.message}
            </span>
            {msg.external_link && (
              <a 
                href={msg.external_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-3 underline hover:text-white/80 font-bold"
              >
                Read More →
              </a>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded p-1 transition"
          title="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}