'use client';

import { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '../../hooks/useToast';

// Toast types
export interface ToastData {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastData['type'], title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TOAST_STORAGE_KEY = 'pending_toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasCheckedStorage = useRef(false);
  const { success, error, info, warning } = useToast();

  // Check for pending toast on mount and route changes
  useEffect(() => {
    // Small delay to ensure page has rendered
    const timer = setTimeout(() => {
      const stored = sessionStorage.getItem(TOAST_STORAGE_KEY);
      if (stored) {
        try {
          const { message, type, duration } = JSON.parse(stored);
          sessionStorage.removeItem(TOAST_STORAGE_KEY);
          
          // Use the useToast hook to show the toast (bottom-right, slide animation)
          switch (type) {
            case 'success':
              success(message, { duration });
              break;
            case 'error':
              error(message, { duration });
              break;
            case 'info':
              info(message, { duration });
              break;
            case 'warning':
              warning(message, { duration });
              break;
            default:
              success(message, { duration });
          }
        } catch (e) {
          sessionStorage.removeItem(TOAST_STORAGE_KEY);
        }
      }
      hasCheckedStorage.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, success, error, info, warning]);

  const showToast = (
    message: string, 
    type: ToastData['type'] = 'success', 
    title?: string, 
    duration: number = 4000
  ) => {
    switch (type) {
      case 'success':
        success(message, { duration });
        break;
      case 'error':
        error(message, { duration });
        break;
      case 'info':
        info(message, { duration });
        break;
      case 'warning':
        warning(message, { duration });
        break;
      default:
        success(message, { duration });
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
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
  duration: number = 4000
) {
  sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify({ message, type, title, duration }));
}
