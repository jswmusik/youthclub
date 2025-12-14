'use client';

import { useState } from 'react';
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  if (!isOpen || !visit || !visit.id) return null;

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

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-[#050505] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border border-[#262626]">
          
          {/* Header */}
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center mb-3 backdrop-blur-md border border-emerald-500/40">
              <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-200">Currently Checked In</h2>
            <p className="text-emerald-400 text-sm mt-1">{visit.club_name}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-xl border border-[#262626]">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Arrived</p>
                <p className="text-lg font-bold text-gray-200">{timeString}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-semibold">Duration</p>
                <p className="text-lg font-bold text-emerald-400">
                  {hours > 0 ? `${hours}h ` : ''}{minutes}m
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full py-3.5 bg-[#FF5485] text-white font-bold rounded-xl border-2 border-[#FF5485] hover:bg-[#FF6595] hover:border-[#FF6595] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#FF5485]/30"
              >
                {loading ? (
                  <span>Checking out...</span>
                ) : (
                  <>
                    <span>Check out!</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                  </>
                )}
              </button>
              
              <button 
                onClick={onClose}
                className="w-full py-3 text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors"
              >
                Close / Stay Checked In
              </button>
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
}

