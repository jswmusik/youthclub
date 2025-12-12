'use client';

import { useState } from 'react';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import { X, Check, AlertCircle, Clock, Calendar, User, XCircle, Users, Package } from 'lucide-react';
import { getMediaUrl, getInitials } from '../../../utils';
import Toast from '../../Toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

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

  const handleAction = async (action: 'approve' | 'reject' | 'cancel', cancelSeries: boolean = false) => {
    setProcessing(true);
    try {
      const payload: any = { notes };
      if (action === 'cancel' && cancelSeries) {
        payload.cancel_series = true;
      }
      
      const response = await api.post(`/bookings/bookings/${booking.id}/${action}/`, payload);
      
      // Show success toast
      let message = '';
      if (action === 'approve') {
        message = 'Booking approved successfully!';
      } else if (action === 'reject') {
        message = 'Booking rejected.';
      } else if (action === 'cancel') {
        if (cancelSeries && response.data?.message) {
          message = response.data.message;
        } else {
          message = 'Booking cancelled. The time slot is now available again.';
        }
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
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Action failed';
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

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <Card 
        className="bg-white w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all duration-200 max-h-[90vh] flex flex-col"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-gray-100 bg-gradient-to-r from-[#EBEBFE]/30 to-white">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold text-[#121213] mb-1">Booking Details</CardTitle>
            <p className="text-sm text-gray-500">#{booking.id} • {format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={processing}
            className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* User Info */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-full border-2 border-[#EBEBFE] bg-gray-50">
                  <AvatarImage src={booking.user_detail?.avatar ? getMediaUrl(booking.user_detail.avatar) : undefined} className="object-cover" />
                  <AvatarFallback className="rounded-full font-bold text-sm bg-[#EBEBFE] text-[#4D4DA4]">
                    {getInitials(booking.user_detail?.first_name, booking.user_detail?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-[#121213]">
                    {booking.user_detail?.first_name} {booking.user_detail?.last_name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{booking.user_detail?.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EBEBFE]/30 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-[#4D4DA4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-0.5">Resource</div>
                  <div className="text-sm font-semibold text-[#121213]">{booking.resource_name}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#EBEBFE]/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-[#4D4DA4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-0.5">Time</div>
                  <div className="text-sm font-semibold text-[#121213]">
                    {format(new Date(booking.start_time), 'MMM d, HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                  </div>
                </div>
              </div>
              
              {booking.participants?.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#EBEBFE]/30 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-[#4D4DA4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Participants</div>
                      <div className="flex flex-wrap gap-2">
                        {booking.participants.map((p: any) => (
                          <Badge key={p.id} variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE] text-xs">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Area */}
          {booking.status === 'PENDING' && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#121213]">Message to User (Optional)</Label>
                  <Textarea 
                    className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl min-h-[80px]"
                    rows={3}
                    placeholder="Reason for rejection or extra info..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => handleAction('reject')}
                    disabled={processing}
                    variant="outline"
                    className="flex-1 h-11 border-2 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 font-semibold rounded-full gap-2"
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button 
                    onClick={() => handleAction('approve')}
                    disabled={processing}
                    className="flex-1 h-11 bg-[#4D4DA4] hover:bg-[#FF5485] text-white font-semibold rounded-full gap-2 transition-colors"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {booking.status === 'APPROVED' && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <div className="p-4 rounded-xl text-center bg-green-50 border border-green-200">
                  <div className="font-bold text-green-800 text-base">This booking is APPROVED</div>
                  {isRecurringBooking && (
                    <div className="text-xs text-green-700 mt-2 font-medium">
                      🔄 This is a recurring booking
                    </div>
                  )}
                </div>
                
                {!showCancelOptions ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#121213]">Cancellation Note (Optional)</Label>
                      <Textarea 
                        className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl min-h-[80px]"
                        rows={3}
                        placeholder="Reason for cancellation..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        if (isRecurringBooking) {
                          setShowCancelOptions(true);
                        } else {
                          if (window.confirm('Are you sure you want to cancel this booking? The time slot will become available again.')) {
                            handleAction('cancel', false);
                          }
                        }
                      }}
                      disabled={processing}
                      variant="outline"
                      className="w-full h-11 border-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 font-semibold rounded-full gap-2"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Booking
                    </Button>
                  </>
                ) : (
                  <>
                    <Card className="bg-[#EBEBFE]/30 border border-[#EBEBFE]">
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <h4 className="font-bold text-[#121213] mb-2 text-base">Cancel Recurring Booking</h4>
                          <p className="text-sm text-gray-600">
                            This booking is part of a recurring series. What would you like to cancel?
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Button
                            onClick={() => {
                              if (window.confirm('Cancel only this instance? The rest of the series will remain.')) {
                                handleAction('cancel', false);
                              }
                            }}
                            disabled={processing}
                            variant="outline"
                            className="w-full h-auto py-3 px-4 bg-white border-2 border-[#4D4DA4] text-[#4D4DA4] hover:bg-[#EBEBFE] hover:border-[#4D4DA4] font-semibold rounded-xl text-left justify-start"
                          >
                            <div className="w-full">
                              <div className="font-bold text-sm">Cancel This Instance Only</div>
                              <div className="text-xs text-gray-600 mt-0.5 font-normal">Only this booking will be cancelled</div>
                            </div>
                          </Button>
                          <Button
                            onClick={() => {
                              if (window.confirm('Cancel this instance and all future instances? This cannot be undone.')) {
                                handleAction('cancel', true);
                              }
                            }}
                            disabled={processing}
                            variant="outline"
                            className="w-full h-auto py-3 px-4 bg-orange-50 border-2 border-orange-300 text-orange-800 hover:bg-orange-100 hover:border-orange-400 font-semibold rounded-xl text-left justify-start"
                          >
                            <div className="w-full">
                              <div className="font-bold text-sm">Cancel Entire Series</div>
                              <div className="text-xs text-orange-700 mt-0.5 font-normal">This instance and all future instances will be cancelled</div>
                            </div>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Button
                      onClick={() => setShowCancelOptions(false)}
                      disabled={processing}
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      ← Back
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {booking.status !== 'PENDING' && booking.status !== 'APPROVED' && (
            <Card className={`border shadow-sm ${
              booking.status === 'CANCELLED' ? 'bg-gray-50 border-gray-200' : 
              booking.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 
              'bg-gray-50 border-gray-200'
            }`}>
              <CardContent className="p-4">
                <div className={`text-center font-bold text-base ${
                  booking.status === 'CANCELLED' ? 'text-gray-800' : 
                  booking.status === 'REJECTED' ? 'text-red-800' : 
                  'text-gray-800'
                }`}>
                  This booking is {booking.status}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
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

