'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Sparkles } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  darkMode?: boolean;
  title?: string;
}

export default function Toast({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 1500,
  darkMode = false,
  title
}: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isVisible) {
      setIsClosing(false);
      setProgress(100);
      
      // Progress bar animation
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 50);

      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onClose();
        }, 300);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  // Brand-themed color configurations
  const configs = {
    success: {
      bg: darkMode ? 'bg-[var(--dark-700)]' : 'bg-white',
      border: 'border-[var(--brand-third)]',
      iconBg: 'bg-[var(--brand-third)]/20',
      iconColor: 'text-[var(--brand-third)]',
      progressBg: 'bg-[var(--brand-third)]',
      title: title || 'Success!',
      icon: CheckCircle2,
    },
    error: {
      bg: darkMode ? 'bg-[var(--dark-700)]' : 'bg-white',
      border: 'border-[var(--brand-red)]',
      iconBg: 'bg-[var(--brand-red)]/20',
      iconColor: 'text-[var(--brand-red)]',
      progressBg: 'bg-[var(--brand-red)]',
      title: title || 'Error',
      icon: XCircle,
    },
    info: {
      bg: darkMode ? 'bg-[var(--dark-700)]' : 'bg-white',
      border: 'border-[var(--brand-blue)]',
      iconBg: 'bg-[var(--brand-blue)]/20',
      iconColor: 'text-[var(--brand-blue)]',
      progressBg: 'bg-[var(--brand-blue)]',
      title: title || 'Info',
      icon: Info,
    },
    warning: {
      bg: darkMode ? 'bg-[var(--dark-700)]' : 'bg-white',
      border: 'border-[var(--brand-peach)]',
      iconBg: 'bg-[var(--brand-peach)]/20',
      iconColor: 'text-[var(--brand-peach)]',
      progressBg: 'bg-[var(--brand-peach)]',
      title: title || 'Warning',
      icon: AlertCircle,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-[9999] transition-all duration-300 ease-out ${
        isClosing 
          ? 'opacity-0 translate-x-4 scale-95' 
          : 'opacity-100 translate-x-0 scale-100'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div 
        className={`
          ${config.bg} 
          ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}
          rounded-2xl shadow-2xl 
          border-l-4 ${config.border}
          ${darkMode ? 'border-y border-r border-[var(--dark-500)]' : 'border-y border-r border-gray-100'}
          min-w-[340px] max-w-md 
          overflow-hidden
          backdrop-blur-sm
        `}
      >
        {/* Main Content */}
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          
          {/* Text Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
              {config.title}
            </p>
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
              {message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0 w-8 h-8 rounded-lg 
              ${darkMode ? 'hover:bg-[var(--dark-500)] text-[var(--brand-light)]/50 hover:text-[var(--brand-light)]' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}
              transition-all flex items-center justify-center
            `}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className={`h-1 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'}`}>
          <div 
            className={`h-full ${config.progressBg} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Export a hook for easier toast management
export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
  title?: string;
}

export const initialToastState: ToastState = {
  message: '',
  type: 'success',
  isVisible: false,
  title: undefined
};

export function showToast(