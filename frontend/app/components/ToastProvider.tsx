'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast types
export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastData['type'], title?: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TOAST_STORAGE_KEY = 'pending_toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const pathname = usePathname();
  const hasCheckedStorage = useRef(false);

  // Check for pending toast on mount and route changes
  useEffect(() => {
    // Small delay to ensure page has rendered
    const timer = setTimeout(() => {
      const stored = sessionStorage.getItem(TOAST_STORAGE_KEY);
      if (stored) {
        try {
          const { message, type, title, duration } = JSON.parse(stored);
          sessionStorage.removeItem(TOAST_STORAGE_KEY);
          showToast(message, type, title, duration);
        } catch (e) {
          sessionStorage.removeItem(TOAST_STORAGE_KEY);
        }
      }
      hasCheckedStorage.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  const showToast = useCallback((
    message: string, 
    type: ToastData['type'] = 'success', 
    title?: string, 
    duration: number = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, title, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

// Helper function to queue a toast that will show after navigation
export function queueToastForNavigation(
  message: string, 
  type: ToastData['type'] = 'success', 
  title?: string,
  duration: number = 2500
) {
  sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify({ message, type, title, duration }));
}

// Toast Container Component
function ToastContainer({ toasts, onClose }: { toasts: ToastData[], onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ toast, onClose }: { toast: ToastData, onClose: () => void }) {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const startTime = Date.now();
    
    // Progress bar animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-close timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Brand-themed color configurations
  const configs = {
    success: {
      bg: 'bg-[var(--dark-700)]',
      border: 'border-[var(--brand-third)]',
      iconBg: 'bg-[var(--brand-third)]/20',
      iconColor: 'text-[var(--brand-third)]',
      progressBg: 'bg-[var(--brand-third)]',
      defaultTitle: 'Success!',
      icon: CheckCircle2,
    },
    error: {
      bg: 'bg-[var(--dark-700)]',
      border: 'border-[var(--brand-red)]',
      iconBg: 'bg-[var(--brand-red)]/20',
      iconColor: 'text-[var(--brand-red)]',
      progressBg: 'bg-[var(--brand-red)]',
      defaultTitle: 'Error',
      icon: XCircle,
    },
    info: {
      bg: 'bg-[var(--dark-700)]',
      border: 'border-[var(--brand-blue)]',
      iconBg: 'bg-[var(--brand-blue)]/20',
      iconColor: 'text-[var(--brand-blue)]',
      progressBg: 'bg-[var(--brand-blue)]',
      defaultTitle: 'Info',
      icon: Info,
    },
    warning: {
      bg: 'bg-[var(--dark-700)]',
      border: 'border-[var(--brand-peach)]',
      iconBg: 'bg-[var(--brand-peach)]/20',
      iconColor: 'text-[var(--brand-peach)]',
      progressBg: 'bg-[var(--brand-peach)]',
      defaultTitle: 'Warning',
      icon: AlertCircle,
    },
  };

  const config = configs[toast.type];
  const Icon = config.icon;
  const title = toast.title || config.defaultTitle;

  return (
    <div 
      className={`transition-all duration-300 ease-out ${
        isClosing 
          ? 'opacity-0 translate-x-4 scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-4'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div 
        className={`
          ${config.bg} 
          text-[var(--brand-light)]
          rounded-2xl shadow-2xl 
          border-l-4 ${config.border}
          border-y border-r border-[var(--dark-500)]
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
            <p className="font-semibold text-sm text-[var(--brand-light)]">
              {title}
            </p>
            <p className="text-sm mt-0.5 text-[var(--brand-light)]/70">
              {toast.message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-[var(--dark-500)] text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] transition-all flex items-center justify-center"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-[var(--dark-600)]">
          <div 
            className={`h-full ${config.progressBg} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
