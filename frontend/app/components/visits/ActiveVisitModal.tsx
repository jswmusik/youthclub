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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
          
          {/* Header */}
          <div className="bg-emerald-600 p-6 text-center text-white">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-md">
              <span className="text-2xl">📍</span>
            </div>
            <h2 className="text-xl font-bold">Currently Checked In</h2>
            <p className="text-emerald-100 text-sm mt-1">{visit.club_name}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Arrived</p>
                <p className="text-lg font-bold text-gray-800">{timeString}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                <p className="text-lg font-bold text-emerald-600">
                  {hours > 0 ? `${hours}h ` : ''}{minutes}m
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleCheckOut}
                disabled={loading}
                className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-xl border-2 border-red-100 hover:bg-red-100 hover:border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Checking out...</span>
                ) : (
                  <>
                    <span>Log Out / Leave</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </>
                )}
              </button>
              
              <button 
                onClick={onClose}
                className="w-full py-3 text-gray-400 hover:text-gray-600 text-sm font-medium"
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

