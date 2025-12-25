'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { visits } from '@/lib/api';
import Toast from '@/app/components/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  visit: {
    id: number;
    club_name: string;
    check_in_at: string;
  } | null;
  onCheckout: () => void; // Callback to refresh navbar state
}

export default function ActiveVisitModal({ isOpen, onClose, visit, onCheckout }: Props) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !visit || !visit.id || !mounted) return null;

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await visits.checkOut(visit.id);
      setToast({ message: "Checked out successfully 👋", type: 'success', isVisible: true });
      onCheckout(); // Tell parent to clear the state
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error || "Failed to check out", 
        type: 'error', 
        isVisible: true 
      });
      setLoading(false);
    }
  };

  const checkInTime = new Date(visit.check_in_at);
  const timeString = checkInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  // Calculate duration roughly (for display)
  const diffInMinutes = Math.floor((new Date().getTime() - checkInTime.getTime()) / 60000);
  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div className="min-h-full flex items-center justify-center py-8" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-sm overflow-hidden transform transition-all border border-[var(--dark-500)]">
          
            {/* Header */}
            <div className="bg-[var(--brand-green)]/10 border-b border-[var(--brand-green)]/20 p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-[var(--brand-green)]/20 rounded-full flex items-center justify-center mb-3 border-2 border-[var(--brand-green)]/40">
                <svg className="w-7 h-7 text-[var(--brand-green)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[var(--brand-light)]">Currently Checked In</h2>
              <p className="text-[var(--brand-green)] text-sm mt-1 font-medium">{visit.club_name}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)]">
                <div>
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold tracking-wide">Arrived</p>
                  <p className="text-lg font-bold text-[var(--brand-light)]">{timeString}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold tracking-wide">Duration</p>
                  <p className="text-lg font-bold text-[var(--brand-green)]">
                    {hours > 0 ? `${hours}h ` : ''}{minutes}m
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full py-3.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl border-2 border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 hover:border-[var(--brand-primary)]/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <span>Checking out...</span>
                  ) : (
                    <>
                      <span>Check out!</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={onClose}
                  className="w-full py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] text-sm font-medium transition-colors active:scale-95"
                >
                  Close / Stay Checked In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );

  return createPortal(modalContent, document.body);
}

