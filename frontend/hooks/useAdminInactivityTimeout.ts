'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Admin roles that should have inactivity timeout
const ADMIN_ROLES = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];

// Inactivity timeout duration: 20 minutes
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

// Warning before logout: 2 minutes before timeout
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000;

interface UseAdminInactivityTimeoutOptions {
  onWarning?: () => void;
  onTimeout?: () => void;
}

/**
 * Hook that tracks admin user activity and logs them out after 20 minutes of inactivity.
 * 
 * Activity is tracked through:
 * - Mouse movements
 * - Mouse clicks
 * - Keyboard input
 * - Touch events
 * - Scroll events
 * 
 * Only applies to admin roles (SUPER_ADMIN, MUNICIPALITY_ADMIN, CLUB_ADMIN).
 * Youth members and guardians are not affected by this timeout.
 */
export function useAdminInactivityTimeout(options?: UseAdminInactivityTimeoutOptions) {
  const { logout, user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasWarnedRef = useRef<boolean>(false);

  // Check if current user is an admin
  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // Handle logout due to inactivity
  const handleInactivityLogout = useCallback(() => {
    console.log('[Inactivity] Admin logged out due to inactivity');
    options?.onTimeout?.();
    logout();
  }, [logout, options]);

  // Handle warning before logout
  const handleWarning = useCallback(() => {
    if (!hasWarnedRef.current) {
      hasWarnedRef.current = true;
      console.log('[Inactivity] Warning: Admin will be logged out in 2 minutes');
      options?.onWarning?.();
    }
  }, [options]);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!isAdmin) return;

    lastActivityRef.current = Date.now();
    hasWarnedRef.current = false;

    // Clear existing timers
    clearTimers();

    // Set warning timer (fires 2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      handleWarning();
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleInactivityLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAdmin, clearTimers, handleWarning, handleInactivityLogout]);

  // Set up activity listeners
  useEffect(() => {
    if (!isAdmin) {
      clearTimers();
      return;
    }

    // Events that count as "activity"
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Throttle activity tracking to avoid excessive timer resets
    let lastReset = 0;
    const THROTTLE_MS = 1000; // Only reset timer once per second max

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > THROTTLE_MS) {
        lastReset = now;
        resetTimer();
      }
    };

    // Add listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also track visibility changes (tab becomes active)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we've been inactive too long while tab was hidden
        const inactiveTime = Date.now() - lastActivityRef.current;
        if (inactiveTime >= INACTIVITY_TIMEOUT_MS) {
          handleInactivityLogout();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
    };
  }, [isAdmin, resetTimer, clearTimers, handleInactivityLogout]);

  // Return useful values for components that want to show remaining time
  return {
    resetTimer,
    isAdmin,
    lastActivity: lastActivityRef.current,
    timeoutDuration: INACTIVITY_TIMEOUT_MS,
    warningDuration: WARNING_BEFORE_TIMEOUT_MS,
  };
}

export default useAdminInactivityTimeout;

