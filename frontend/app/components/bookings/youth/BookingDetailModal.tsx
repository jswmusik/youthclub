'use client';

import { useState } from 'react';

import api from '../../../../lib/api';
import { format } from 'date-fns';
import { X, Clock, Calendar, MapPin, XCircle, Users, AlertCircle } from 'lucide-react';
import Toast from '../../Toast';


interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
  darkMode?: boolean;
}

export default function BookingDetailModal({ booking, onClose, onUpdate, darkMode = false }: Props) {
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning', isVisible: false });
  const [showCancelOptions, setShowCancelOptions] = useState(false);

  // Check if this is a recurring booking
  const isRecurringBooking = booking.is_recurring || booking.parent_booking;
  const canCancel = booking.status === 'APPROVED' || booking.status === 'PENDING';

  const handleCancel = async (cancelSeries: boolean = false) => {
    setProcessing(true);
    try {
      const payload: any = { notes };
      if (cancelSeries) {
        payload.cancel_series = true;
      }
      
      await api.post(`/bookings/bookings/${booking.id}/cancel/`, payload);
      
      // Show success toast
      let message = '';
      if (cancelSeries) {
        message = 'Recurring booking series cancelled successfully.';
      } else {
        message = 'Booking cancelled successfully. The time slot is now available again.';
      }
      
      setToast({ 
        message, 
        type: 'success', 
        isVisible: true 
      });
      
      // Wait a moment to show toast, then update and close
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Failed to cancel booking';
      setToast({ 
        message: errorMessage, 
        type: 'error', 
        isVisible: true 
      });
      setProcessing(false);
    }
  };

  if (!booking) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !processing) {
      onClose();
    }
  };

  const getStatusStyle = (status: string) => {
    if (darkMode) {
      switch (status) {
        case 'APPROVED': return 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30';
        case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30';
        case 'CANCELLED': return 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]';
        default: return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30';
      }
    }
    switch (status) {
      case 'APPROVED': return 'bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 text-[#10B981] border-2 border-[#10B981]/30';
      case 'REJECTED': return 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-2 border-red-300';
      case 'CANCELLED': return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-2 border-gray-300';
      default: return 'bg-gradient-to-r from-[#FF8C42]/20 to-[#FF8C42]/10 text-[#FF8C42] border-2 border-[#FF8C42]/30';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className={`rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-200 animate-in zoom-in slide-in-from-bottom-4 ${
          darkMode ? 'bg-[var(--dark-800)] border border-[var(--dark-600)]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className={`flex justify-between items-start p-4 sm:p-6 border-b flex-shrink-0 ${
          darkMode ? 'border-[var(--dark-600)] bg-[var(--dark-700)]' : 'border-gray-100 bg-gradient-to-r from-[#EBEBFE]/30 to-white'
        }`}>
          <div>
            <h3 className={`text-xl sm:text-2xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'}`}>Booking Details</h3>
            <p className={`text-xs sm:text-sm font-semibold mt-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>#{booking.id} • {format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={processing}
            className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors disabled:opacity-50 ${
              darkMode 
                ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]' 
                : 'text-gray-400 hover:text-[#4D4DA4] hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`text-xs uppercase font-bold px-4 py-2 rounded-xl ${getStatusStyle(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className={`p-3 sm:p-5 rounded-xl space-y-3 sm:space-y-4 border ${
            darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gradient-to-br from-[#EBEBFE]/30 to-white border-2 border-[#4D4DA4]/10 shadow-sm'
          }`}>
            <div className="flex items-start gap-2 sm:gap-3 text-sm">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                darkMode ? 'bg-[var(--brand-primary)]/20' : 'bg-[#4D4DA4]/10'
              }`}>
                <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-bold block mb-0.5 sm:mb-1 text-xs sm:text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>Resource</span>
                <span className={`font-bold text-sm sm:text-base font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'}`}>{booking.resource_name}</span>
              </div>
            </div>
            
            {booking.club_name && (
              <div className="flex items-start gap-2 sm:gap-3 text-sm">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  darkMode ? 'bg-[var(--brand-purple)]/20' : 'bg-[#FF5485]/10'
                }`}>
                  <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#FF5485]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold block mb-0.5 sm:mb-1 text-xs sm:text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>Club</span>
                  <span className={`font-bold text-sm sm:text-base ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{booking.club_name}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-2 sm:gap-3 text-sm">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                darkMode ? 'bg-[var(--brand-third)]/20' : 'bg-[#10B981]/10'
              }`}>
                <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-bold block mb-0.5 sm:mb-1 text-xs sm:text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>Time</span>
                <span className={`font-bold text-xs sm:text-sm break-words ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                  {format(new Date(booking.start_time), 'MMM d, yyyy')} • {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                </span>
              </div>
            </div>
            
            {booking.participants?.length > 0 && (
              <div className={`border-t pt-3 sm:pt-4 mt-3 sm:mt-4 ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    darkMode ? 'bg-[var(--brand-peach)]/20' : 'bg-[#FF8C42]/10'
                  }`}>
                    <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`} />
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>Participants</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {booking.participants.map((p: any) => (
                    <span key={p.id} className={`text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold ${
                      darkMode 
                        ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)]/80' 
                        : 'bg-white border-2 border-[#4D4DA4]/20 text-[#4D4DA4] shadow-sm'
                    }`}>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recurring Booking Info */}
          {isRecurringBooking && (
            <div className={`border p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 ${
              darkMode 
                ? 'bg-[var(--brand-purple)]/10 border-[var(--brand-purple)]/30' 
                : 'bg-gradient-to-r from-[#4D4DA4]/10 to-[#4D4DA4]/5 border-2 border-[#4D4DA4]/30'
            }`}>
              <span className="text-xl sm:text-2xl">🔄</span>
              <p className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`}>
                This is a recurring booking
              </p>
            </div>
          )}

          {/* Internal Notes (if rejected) */}
          {booking.status === 'REJECTED' && booking.internal_notes && (
            <div className={`border p-3 sm:p-4 rounded-xl ${
              darkMode 
                ? 'bg-[var(--brand-red)]/10 border-[var(--brand-red)]/30' 
                : 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <AlertCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'}`} />
                <p className={`text-xs font-bold uppercase ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-800'}`}>Admin Note</p>
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-red-700'}`}>{booking.internal_notes}</p>
            </div>
          )}

          {/* Cancel Action Area */}
          {canCancel && (
            <div className="space-y-2 sm:space-y-3">
              {!showCancelOptions ? (
                <>
                  <label className={`block text-xs sm:text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>Cancellation Note (Optional)</label>
                  <textarea 
                    className={`w-full rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm font-medium transition-all ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-peach)]/30 focus:border-[var(--brand-peach)]' 
                        : 'border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42]'
                    }`} 
                    rows={2}
                    placeholder="Reason for cancellation..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={processing}
                  />
                  <button 
                    onClick={() => {
                      if (isRecurringBooking) {
                        setShowCancelOptions(true);
                      } else {
                        if (window.confirm('Are you sure you want to cancel this booking? The time slot will become available again.')) {
                          handleCancel(false);
                        }
                      }
                    }}
                    disabled={processing}
                    className={`w-full py-2.5 sm:py-3.5 border rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base ${
                      darkMode 
                        ? 'border-[var(--brand-peach)]/30 text-[var(--brand-peach)] bg-[var(--brand-peach)]/10 hover:bg-[var(--brand-peach)]/20 hover:border-[var(--brand-peach)]/50' 
                        : 'border-2 border-[#FF8C42]/30 text-[#FF8C42] bg-[#FF8C42]/10 hover:bg-[#FF8C42]/20 hover:border-[#FF8C42]/50 shadow-sm'
                    }`}
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> Cancel Booking
                  </button>
                </>
              ) : (
                <>
                  <div className={`border p-3 sm:p-5 rounded-xl ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
                      : 'bg-gradient-to-r from-[#4D4DA4]/10 to-[#4D4DA4]/5 border-2 border-[#4D4DA4]/30 shadow-sm'
                  }`}>
                    <h4 className={`font-bold mb-2 sm:mb-3 text-base sm:text-lg font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'}`}>Cancel Recurring Booking</h4>
                    <p className={`text-xs sm:text-sm mb-3 sm:mb-4 font-semibold ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'}`}>
                      This booking is part of a recurring series. What would you like to cancel?
                    </p>
                    <div className="space-y-2 sm:space-y-3">
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel only this instance? The rest of the series will remain.')) {
                            handleCancel(false);
                          }
                        }}
                        disabled={processing}
                        className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 border rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left active:scale-95 ${
                          darkMode 
                            ? 'bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-500)]' 
                            : 'bg-white border-2 border-[#4D4DA4]/30 text-[#4D4DA4] hover:bg-[#4D4DA4]/10 hover:border-[#4D4DA4]/50 shadow-sm'
                        }`}
                      >
                        <div className="font-bold text-sm sm:text-base">Cancel This Instance Only</div>
                        <div className={`text-xs mt-0.5 sm:mt-1 font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>Only this booking will be cancelled</div>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this instance and all future instances? This cannot be undone.')) {
                            handleCancel(true);
                          }
                        }}
                        disabled={processing}
                        className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 border rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left active:scale-95 ${
                          darkMode 
                            ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30 text-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/20 hover:border-[var(--brand-peach)]/50' 
                            : 'bg-[#FF8C42]/10 border-2 border-[#FF8C42]/30 text-[#FF8C42] hover:bg-[#FF8C42]/20 hover:border-[#FF8C42]/50 shadow-sm'
                        }`}
                      >
                        <div className="font-bold text-sm sm:text-base">Cancel Entire Series</div>
                        <div className={`text-xs mt-0.5 sm:mt-1 font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>This instance and all future instances will be cancelled</div>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelOptions(false)}
                    disabled={processing}
                    className={`w-full py-2 sm:py-2.5 font-bold text-xs sm:text-sm transition-colors ${
                      darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' : 'text-gray-600 hover:text-[#4D4DA4]'
                    }`}
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Status Message for non-cancellable bookings */}
          {!canCancel && (
            <div className={`p-3 sm:p-4 rounded-xl text-center font-bold text-sm sm:text-base ${
              darkMode 
                ? booking.status === 'CANCELLED' 
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-600)]' 
                  : booking.status === 'REJECTED' 
                  ? 'bg-[var(--brand-red)]/10 text-[var(--brand-red)] border border-[var(--brand-red)]/30' 
                  : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-600)]'
                : booking.status === 'CANCELLED' 
                  ? 'bg-gray-100 text-gray-700 border-2 border-gray-300' 
                  : booking.status === 'REJECTED' 
                  ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-2 border-red-300' 
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
            }`}>
              This booking is {booking.status}
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode={darkMode}
      />
    </div>
  );
}
