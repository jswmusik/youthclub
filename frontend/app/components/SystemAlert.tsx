'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; 
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function SystemAlert() {
  const { user } = useAuth();
  const [msg, setMsg] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (user) {
      checkMessage();
    } else {
      setIsVisible(false);
    }
  }, [pathname, user]);

  const checkMessage = async () => {
    try {
      const res = await api.get('/messages/my_latest/');
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

  const handleDismiss = () => {
    if (!msg) return;
    setIsVisible(false);
    // Remember that this specific message ID was closed
    localStorage.setItem(`closed_msg_${msg.id}`, 'true');
  };

  if (!isVisible || !msg) return null;

  // Theme Configuration
  const themes = {
    INFO: { bg: 'bg-blue-600', icon: 'ℹ️', border: 'border-blue-700' },
    IMPORTANT: { bg: 'bg-orange-500', icon: '📢', border: 'border-orange-600' },
    WARNING: { bg: 'bg-red-600', icon: '⚠️', border: 'border-red-700' },
  };

  const theme = themes[msg.message_type as keyof typeof themes] || themes.INFO;

  return (
    <div className={`${theme.bg} text-white relative z-50 shadow-md`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
        
        {/* Message Content */}
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xl">{theme.icon}</span>
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
                className="ml-3 underline hover:text-gray-200 font-bold"
              >
                Read More →
              </a>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="text-white/70 hover:text-white hover:bg-black/10 rounded p-1 transition"
          title="Dismiss message"
        >
          ✕
        </button>
      </div>
    </div>
  );
}