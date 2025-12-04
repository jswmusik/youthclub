'use client';

import { useState } from 'react';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import { X, Clock, Calendar, MapPin, XCircle, Users } from 'lucide-react';
import Toast from '../../Toast';

interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookingDetailModal({ booking, onClose, onUpdate }: Props) {
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
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all duration-200"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
            <p className="text-sm text-gray-500">#{booking.id} • {format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={processing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`text-xs uppercase font-bold px-3 py-1.5 rounded border ${getStatusStyle(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium">Resource:</span>
              <span className="text-gray-900">{booking.resource_name}</span>
            </div>
            
            {booking.club_name && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">Club:</span>
                <span className="text-gray-900">{booking.club_name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium">Time:</span>
              <span className="text-gray-900">
                {format(new Date(booking.start_time), 'MMM d, yyyy')} • {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
              </span>
            </div>
            
            {booking.participants?.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase">Participants</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {booking.participants.map((p: any) => (
                    <span key={p.id} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recurring Booking Info */}
          {isRecurringBooking && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                🔄 This is a recurring booking
              </p>
            </div>
          )}

          {/* Internal Notes (if rejected) */}
          {booking.status === 'REJECTED' && booking.internal_notes && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-xs font-bold text-red-800 uppercase mb-1">Admin Note</p>
              <p className="text-sm text-red-700">{booking.internal_notes}</p>
            </div>
          )}

          {/* Cancel Action Area */}
          {canCancel && (
            <div className="space-y-3">
              {!showCancelOptions ? (
                <>
                  <label className="block text-sm font-bold text-gray-700">Cancellation Note (Optional)</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                    rows={3}
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
                    className="w-full py-3 border border-orange-200 text-orange-700 bg-orange-50 rounded-xl font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Cancel Booking
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-900 mb-3">Cancel Recurring Booking</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      This booking is part of a recurring series. What would you like to cancel?
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel only this instance? The rest of the series will remain.')) {
                            handleCancel(false);
                          }
                        }}
                        disabled={processing}
                        className="w-full py-2.5 px-4 bg-white border-2 border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <div className="font-bold">Cancel This Instance Only</div>
                        <div className="text-xs text-blue-600 mt-0.5">Only this booking will be cancelled</div>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this instance and all future instances? This cannot be undone.')) {
                            handleCancel(true);
                          }
                        }}
                        disabled={processing}
                        className="w-full py-2.5 px-4 bg-orange-100 border-2 border-orange-300 text-orange-800 rounded-lg font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <div className="font-bold">Cancel Entire Series</div>
                        <div className="text-xs text-orange-700 mt-0.5">This instance and all future instances will be cancelled</div>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelOptions(false)}
                    disabled={processing}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Status Message for non-cancellable bookings */}
          {!canCancel && (
            <div className={`p-3 rounded-lg text-center font-bold ${
              booking.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' : 
              booking.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
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
      />
    </div>
  );
}

