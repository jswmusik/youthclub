'use client';

import { useState } from 'react';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import { X, Check, AlertCircle, Clock, Calendar, User } from 'lucide-react';
import { getMediaUrl } from '../../../utils';

interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookingDetailModal({ booking, onClose, onUpdate }: Props) {
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await api.post(`/bookings/bookings/${booking.id}/${action}/`, { notes });
      onUpdate();
      onClose();
    } catch (err) {
      alert('Action failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Booking Request</h3>
            <p className="text-sm text-gray-500">#{booking.id} • {format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            {booking.user_detail?.avatar ? (
              <img src={getMediaUrl(booking.user_detail.avatar) || ''} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <User className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="font-bold text-lg">{booking.user_detail?.first_name} {booking.user_detail?.last_name}</div>
              <div className="text-sm text-gray-500">{booking.user_detail?.email}</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Resource:</span>
              <span>{booking.resource_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Time:</span>
              <span>
                {format(new Date(booking.start_time), 'MMM d, HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
              </span>
            </div>
            {booking.participants?.length > 0 && (
              <div className="border-t pt-2 mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Participants</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {booking.participants.map((p: any) => (
                    <span key={p.id} className="text-xs bg-white border px-2 py-1 rounded shadow-sm">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Area */}
          {booking.status === 'PENDING' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Message to User (Optional)</label>
              <textarea 
                className="w-full border rounded p-2 text-sm" 
                rows={3}
                placeholder="Reason for rejection or extra info..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleAction('reject')}
                  disabled={processing}
                  className="flex-1 py-3 border border-red-200 text-red-700 bg-red-50 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => handleAction('approve')}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          )}
          
          {booking.status !== 'PENDING' && (
             <div className={`p-3 rounded-lg text-center font-bold ${booking.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                This booking is {booking.status}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

