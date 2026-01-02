'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { X, Check, AlertCircle, Clock, Calendar, User, XCircle, Users, Package, CalendarDays, ArrowLeft, AlertTriangle } from 'lucide-react';
import { getMediaUrl, getInitials } from '../../../utils';
import { useToast } from '../../../../hooks/useToast';

interface Props {
  booking: any;
  onClose: () => void;
  onUpdate: () => void;
  darkMode?: boolean;
}

export default function BookingDetailModal({ booking, onClose, onUpdate, darkMode = false }: Props) {
  const t = useTranslations('bookingsAdmin.detailModal');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : enUS;
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { success, error, info, warning } = useToast();
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'single' | 'instance' | 'series';
  }>({ show: false, type: 'single' });

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
        message = t('toast.bookingApproved');
      } else if (action === 'reject') {
        message = t('toast.bookingRejected');
      } else if (action === 'cancel') {
        if (cancelSeries && response.data?.message) {
          message = response.data.message;
        } else {
          message = t('toast.bookingCancelled');
        }
      }
      
      // Wait a moment to show toast, then update and close
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || t('toast.actionFailed');
      error(errorMessage);
      setProcessing(false);
    }
  };

  if (!booking) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !processing) {
      onClose();
    }
  };

  // Status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
      case 'APPROVED':
        return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'REJECTED':
        return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      case 'CANCELLED':
        return 'bg-[var(--dark-500)]/50 text-[var(--brand-light)]/60 border-[var(--dark-500)]';
      default:
        return 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-[var(--dark-800)] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 max-h-[85vh] sm:max-h-[90vh] flex flex-col border-t sm:border border-[var(--dark-600)]"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 relative">
          {/* Mobile Drag Handle with extra top padding */}
          <div className="flex items-center justify-center pt-4 pb-3 sm:pt-0 sm:pb-0 sm:hidden">
            <div className="w-12 h-1 bg-[var(--dark-400)] rounded-full" />
          </div>
          
          {/* Header Content with Close Button */}
          <div className="flex items-start justify-between px-4 sm:px-6 pt-2 pb-4 sm:py-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--brand-light)]">{t('title')}</h2>
                <p className="text-xs sm:text-sm text-[var(--brand-light)]/50">#{booking.id} • {format(new Date(booking.created_at), 'MMM d, yyyy', { locale: dateLocale })}</p>
              </div>
            </div>
            {/* Close Button - visible on all screen sizes */}
            <button
              onClick={onClose}
              disabled={processing}
              className="w-10 h-10 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)] hover:text-white hover:bg-[var(--dark-500)] transition-colors flex items-center justify-center disabled:opacity-50 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* User Info Card */}
          <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[var(--brand-primary)]/30">
                {booking.user_detail?.avatar ? (
                  <img 
                    src={getMediaUrl(booking.user_detail.avatar)} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-lg font-bold text-[var(--brand-primary)]">
                    {getInitials(booking.user_detail?.first_name, booking.user_detail?.last_name)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-[var(--brand-light)]">
                  {booking.user_detail?.first_name} {booking.user_detail?.last_name}
                </div>
                <div className="text-sm text-[var(--brand-light)]/50 truncate">{booking.user_detail?.email}</div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusBadge(booking.status)}`}>
                {t(`status.${booking.status.toLowerCase()}`)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] divide-y divide-[var(--dark-600)]">
            {/* Resource */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-[var(--brand-purple)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider mb-0.5">{t('labels.resource')}</div>
                <div className="text-sm font-semibold text-[var(--brand-primary)]">{booking.resource_name}</div>
              </div>
            </div>
            
            {/* Club (if available) */}
            {booking.club_name && (
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-[var(--brand-blue)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider mb-0.5">{t('labels.club')}</div>
                  <div className="text-sm font-semibold text-[var(--brand-light)]">{booking.club_name}</div>
                </div>
              </div>
            )}
            
            {/* Date & Time */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)]/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[var(--brand-peach)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider mb-0.5">{t('labels.dateTime')}</div>
                <div className="text-sm font-semibold text-[var(--brand-light)]">
                  {format(new Date(booking.start_time), 'EEEE, MMM d, yyyy', { locale: dateLocale })}
                </div>
                <div className="text-sm text-[var(--brand-light)]/70">
                  {format(new Date(booking.start_time), 'HH:mm', { locale: dateLocale })} - {format(new Date(booking.end_time), 'HH:mm', { locale: dateLocale })}
                </div>
              </div>
            </div>
            
            {/* Participants */}
            {booking.participants?.length > 0 && (
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)]/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-[var(--brand-green)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider mb-2">{t('labels.participants')} ({booking.participants.length + 1})</div>
                    <div className="flex flex-wrap gap-2">
                      {booking.participants.map((p: any) => (
                        <span 
                          key={p.id} 
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Area - Pending */}
          {booking.status === 'PENDING' && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider">{t('pendingActions.messageLabel')}</label>
                <textarea 
                  className="w-full min-h-[80px] px-4 py-3 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                  rows={3}
                  placeholder={t('pendingActions.messagePlaceholder')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleAction('reject')}
                  disabled={processing}
                  className="flex-1 h-12 bg-[var(--brand-red)]/10 border-2 border-[var(--brand-red)]/30 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> {t('pendingActions.reject')}
                </button>
                <button 
                  onClick={() => handleAction('approve')}
                  disabled={processing}
                  className="flex-1 h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {t('pendingActions.approve')}
                </button>
              </div>
            </div>
          )}
          
          {/* Action Area - Approved */}
          {booking.status === 'APPROVED' && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] p-4 space-y-4">
              {/* Approved Status Banner */}
              <div className="p-4 rounded-xl text-center bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/30">
                <div className="font-bold text-[var(--brand-green)] text-base flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  {t('approvedActions.approvedBanner')}
                </div>
                {isRecurringBooking && (
                  <div className="text-xs text-[var(--brand-green)]/80 mt-2 font-medium">
                    {t('approvedActions.recurringBooking')}
                  </div>
                )}
              </div>
              
              {!showCancelOptions ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider">{t('approvedActions.cancellationNoteLabel')}</label>
                    <textarea 
                      className="w-full min-h-[80px] px-4 py-3 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                      rows={3}
                      placeholder={t('approvedActions.cancellationNotePlaceholder')}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (isRecurringBooking) {
                        setShowCancelOptions(true);
                      } else {
                        setConfirmModal({ show: true, type: 'single' });
                      }
                    }}
                    disabled={processing}
                    className="w-full h-12 bg-[var(--brand-peach)]/10 border-2 border-[var(--brand-peach)]/30 text-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/20 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> {t('approvedActions.cancelBooking')}
                  </button>
                </>
              ) : (
                <>
                  {/* Recurring Booking Cancel Options */}
                  <div className="bg-[var(--dark-600)] rounded-xl border border-[var(--dark-500)] p-4 space-y-4">
                    <div>
                      <h4 className="font-bold text-[var(--brand-light)] mb-2 text-base">{t('approvedActions.cancelRecurringTitle')}</h4>
                      <p className="text-sm text-[var(--brand-light)]/60">
                        {t('approvedActions.cancelRecurringDescription')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => setConfirmModal({ show: true, type: 'instance' })}
                        disabled={processing}
                        className="w-full p-4 bg-[var(--dark-700)] border-2 border-[var(--brand-primary)]/50 text-[var(--brand-light)] hover:bg-[var(--dark-600)] hover:border-[var(--brand-primary)] font-semibold rounded-xl text-left transition-colors disabled:opacity-50"
                      >
                        <div className="font-bold text-sm text-[var(--brand-primary)]">{t('approvedActions.cancelThisInstance')}</div>
                        <div className="text-xs text-[var(--brand-light)]/60 mt-0.5 font-normal">{t('approvedActions.cancelThisInstanceDescription')}</div>
                      </button>
                      <button
                        onClick={() => setConfirmModal({ show: true, type: 'series' })}
                        disabled={processing}
                        className="w-full p-4 bg-[var(--brand-peach)]/10 border-2 border-[var(--brand-peach)]/50 text-[var(--brand-light)] hover:bg-[var(--brand-peach)]/20 hover:border-[var(--brand-peach)] font-semibold rounded-xl text-left transition-colors disabled:opacity-50"
                      >
                        <div className="font-bold text-sm text-[var(--brand-peach)]">{t('approvedActions.cancelEntireSeries')}</div>
                        <div className="text-xs text-[var(--brand-light)]/60 mt-0.5 font-normal">{t('approvedActions.cancelEntireSeriesDescription')}</div>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelOptions(false)}
                    disabled={processing}
                    className="w-full h-10 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('approvedActions.back')}
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Status Display - Rejected/Cancelled */}
          {booking.status !== 'PENDING' && booking.status !== 'APPROVED' && (
            <div className={`rounded-xl border p-4 ${
              booking.status === 'CANCELLED' 
                ? 'bg-[var(--dark-600)] border-[var(--dark-500)]' 
                : booking.status === 'REJECTED' 
                ? 'bg-[var(--brand-red)]/10 border-[var(--brand-red)]/30' 
                : 'bg-[var(--dark-600)] border-[var(--dark-500)]'
            }`}>
              <div className={`text-center font-bold text-base flex items-center justify-center gap-2 ${
                booking.status === 'CANCELLED' 
                  ? 'text-[var(--brand-light)]/60' 
                  : booking.status === 'REJECTED' 
                  ? 'text-[var(--brand-red)]' 
                  : 'text-[var(--brand-light)]/60'
              }`}>
                {booking.status === 'REJECTED' && <X className="w-5 h-5" />}
                {booking.status === 'CANCELLED' && <XCircle className="w-5 h-5" />}
                {t('statusDisplay.thisBookingIs')} {t(`status.${booking.status.toLowerCase()}`)}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setConfirmModal({ ...confirmModal, show: false })}
        >
          <div 
            className="bg-[var(--dark-800)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--dark-600)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--brand-light)]">
                    {t('confirmModal.title')}
                  </h3>
                  <p className="text-sm text-[var(--brand-light)]/50">
                    {t('confirmModal.subtitle')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-[var(--brand-light)]/80 leading-relaxed">
                {confirmModal.type === 'single' && t('confirmations.cancelBooking')}
                {confirmModal.type === 'instance' && t('confirmations.cancelThisInstance')}
                {confirmModal.type === 'series' && t('confirmations.cancelEntireSeries')}
              </p>
              
              {confirmModal.type === 'series' && (
                <div className="mt-4 p-3 rounded-xl bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30">
                  <p className="text-xs text-[var(--brand-peach)] font-medium flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {t('confirmModal.seriesWarning')}
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                disabled={processing}
                className="flex-1 h-11 bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {t('confirmModal.cancel')}
              </button>
              <button
                onClick={() => {
                  setConfirmModal({ ...confirmModal, show: false });
                  handleAction('cancel', confirmModal.type === 'series');
                }}
                disabled={processing}
                className="flex-1 h-11 bg-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/90 text-[var(--dark-900)] font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {t('confirmModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
