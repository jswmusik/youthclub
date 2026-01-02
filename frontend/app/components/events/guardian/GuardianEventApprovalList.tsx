'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
  Check, X, Calendar, MapPin, User, Clock, AlertTriangle, 
  ChevronRight, Users, CreditCard, Info, ExternalLink,
  Timer, Sparkles, CalendarDays
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';
import { getMediaUrl } from '@/app/utils';
import Link from 'next/link';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
};

interface EventData {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  location_name: string;
  cost?: number;
  cover_image?: string;
  description?: string;
  registration_close_date?: string;
  max_seats?: number;
  confirmed_participants_count?: number;
}

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string;
}

interface PendingRegistration {
  id: number;
  event?: EventData;
  event_detail?: EventData;
  user?: UserData;
  user_detail?: UserData;
  created_at: string;
}

// Helper to get event data regardless of field name
const getEventData = (reg: PendingRegistration): EventData | null => {
  return reg.event_detail || reg.event || null;
};

// Helper to get user data regardless of field name
const getUserData = (reg: PendingRegistration): UserData | null => {
  return reg.user_detail || reg.user || null;
};

interface Props {
  registrations: PendingRegistration[];
  onRefresh: () => void;
  onActionComplete?: (action: 'approve' | 'reject', eventTitle: string, childName: string) => void;
  darkMode?: boolean;
}

export default function GuardianEventApprovalList({ registrations, onRefresh, onActionComplete, darkMode = false }: Props) {
  const t = useTranslations('events');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [selectedReg, setSelectedReg] = useState<PendingRegistration | null>(null);

  const handleAction = async (regId: number, decision: 'approve' | 'reject', reg?: PendingRegistration) => {
    setLoadingId(regId);
    try {
      await api.post(`/registrations/${regId}/guardian-respond/`, { decision });
      setSelectedReg(null);
      
      // Get event and user info for the callback
      const registration = reg || registrations.find(r => r.id === regId);
      const event = registration ? getEventData(registration) : null;
      const user = registration ? getUserData(registration) : null;
      
      // Call the callback with action details
      if (onActionComplete) {
        onActionComplete(
          decision, 
          event?.title || t('untitledEvent') || 'Event',
          user?.first_name || t('child') || 'Child'
        );
      }
      
      onRefresh();
    } catch (error) {
      console.error(error);
      alert(t('failedToRegister') || "Failed to update status.");
    } finally {
      setLoadingId(null);
    }
  };

  // Calculate deadline - either registration_close_date or event start_date
  const getDeadline = (reg: PendingRegistration): Date | null => {
    const event = getEventData(reg);
    if (!event) return null;
    
    if (event.registration_close_date) {
      const date = new Date(event.registration_close_date);
      return isNaN(date.getTime()) ? null : date;
    }
    if (event.start_date) {
      const date = new Date(event.start_date);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const getDeadlineInfo = (reg: PendingRegistration) => {
    const deadline = getDeadline(reg);
    
    // If no valid deadline, return non-urgent default
    if (!deadline) {
      return { text: '', urgent: false, expired: false };
    }
    
    const now = new Date();
    const hoursLeft = differenceInHours(deadline, now);
    const daysLeft = differenceInDays(deadline, now);
    
    if (isPast(deadline)) {
      return { text: t('expired') || 'Expired', urgent: true, expired: true };
    }
    
    if (hoursLeft < 24) {
      return { 
        text: `${hoursLeft}h ${t('left') || 'left'}`, 
        urgent: true, 
        expired: false 
      };
    }
    
    if (daysLeft < 3) {
      return { 
        text: `${daysLeft} ${t('daysLeft') || 'days left'}`, 
        urgent: true, 
        expired: false 
      };
    }
    
    return { 
      text: formatDistanceToNow(deadline, { addSuffix: false, locale: dateLocale }), 
      urgent: false, 
      expired: false 
    };
  };

  if (registrations.length === 0) {
    return (
      <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${
        darkMode 
          ? 'border-[var(--dark-500)] bg-[var(--dark-700)]/50' 
          : 'border-[#4D4DA4]/20 bg-gradient-to-br from-[#EBEBFE]/30 to-white'
      }`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
          darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'
        }`}>
          <Sparkles className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
        </div>
        <p className={`text-lg font-semibold mb-1 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
          {t('allCaughtUp') || "All caught up!"}
        </p>
        <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
          {t('noPendingApprovals') || "No applications waiting for your approval."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {registrations.map((reg) => {
          const deadlineInfo = getDeadlineInfo(reg);
          const event = getEventData(reg);
          const user = getUserData(reg);
          const eventDate = event?.start_date ? new Date(event.start_date) : null;
          
          return (
            <div 
              key={reg.id} 
              className={`group overflow-hidden transition-all duration-300 ${
                darkMode 
                  ? 'bg-gradient-to-r from-[var(--dark-700)] to-[var(--dark-800)] rounded-2xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                  : 'bg-white rounded-2xl border-2 border-[#4D4DA4]/10 hover:border-[#4D4DA4]/30 shadow-lg shadow-[#4D4DA4]/5 hover:shadow-xl hover:shadow-[#4D4DA4]/10'
              }`}
            >
              {/* Urgent Banner */}
              {deadlineInfo.urgent && !deadlineInfo.expired && (
                <div className={`px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold ${
                  darkMode 
                    ? 'bg-gradient-to-r from-[var(--brand-red)]/20 to-[var(--brand-coral)]/20 text-[var(--brand-coral)]' 
                    : 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-600'
                }`}>
                  <Timer className="w-3.5 h-3.5 animate-pulse" />
                  <span>{t('approvalDeadline') || 'Approval deadline'}: {deadlineInfo.text}</span>
                </div>
              )}
              
              {deadlineInfo.expired && (
                <div className={`px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold ${
                  darkMode 
                    ? 'bg-[var(--brand-red)]/30 text-[var(--brand-red)]' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('registrationExpired') || 'Registration deadline has passed'}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row">
                {/* Event Image / Date Block */}
                <div className="relative sm:w-32 flex-shrink-0">
                  {event?.cover_image ? (
                    <div className="h-32 sm:h-full relative">
                      <img 
                        src={getMediaUrl(event.cover_image) || ''} 
                        alt={event.title || ''}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {/* Date overlay */}
                      {eventDate && (
                        <div className="absolute bottom-2 left-2 text-white">
                          <div className="text-2xl font-bold leading-none">{format(eventDate, 'd')}</div>
                          <div className="text-xs uppercase tracking-wide opacity-90">{format(eventDate, 'MMM', { locale: dateLocale })}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-32 sm:h-full flex flex-col items-center justify-center ${
                      darkMode 
                        ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-purple)]' 
                        : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4]'
                    }`}>
                      {eventDate && (
                        <div className="text-white text-center">
                          <div className="text-xs uppercase tracking-wider opacity-80">{format(eventDate, 'EEE', { locale: dateLocale })}</div>
                          <div className="text-3xl font-bold leading-none my-1">{format(eventDate, 'd')}</div>
                          <div className="text-sm uppercase tracking-wide opacity-90">{format(eventDate, 'MMM', { locale: dateLocale })}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 sm:p-5">
                  {/* Child Info Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                      darkMode 
                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                        : 'bg-[#FF5485]/10 text-[#FF5485]'
                    }`}>
                      <div className={`w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ${
                        darkMode ? 'bg-[var(--dark-600)]' : 'bg-white'
                      }`}>
                        {user?.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        {user?.first_name || t('child') || 'Child'} {t('wantsToAttend') || 'wants to attend'}
                      </span>
                    </div>
                  </div>

                  {/* Event Title */}
                  <h4 className={`font-bold text-lg sm:text-xl leading-tight mb-3 ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                  }`}>
                    {event?.title || t('untitledEvent') || 'Untitled Event'}
                  </h4>
                  
                  {/* Event Meta */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
                    {eventDate && (
                      <div className={`flex items-center gap-1.5 text-sm ${
                        darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span>{format(eventDate, 'HH:mm')}</span>
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 text-sm ${
                      darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                    }`}>
                      <MapPin className="w-4 h-4" />
                      <span>{event?.location_name || 'TBD'}</span>
                    </div>
                    {event?.cost !== undefined && event.cost > 0 && (
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${
                        darkMode ? 'text-[var(--brand-green)]' : 'text-emerald-600'
                      }`}>
                        <CreditCard className="w-4 h-4" />
                        <span>{event.cost} SEK</span>
                      </div>
                    )}
                    {event?.cost === 0 && (
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${
                        darkMode ? 'text-[var(--brand-green)]' : 'text-emerald-600'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                        <span>{t('free') || 'Free'}</span>
                      </div>
                    )}
                    {event?.max_seats && event.max_seats > 0 && (
                      <div className={`flex items-center gap-1.5 text-sm ${
                        darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                      }`}>
                        <Users className="w-4 h-4" />
                        <span>{event.confirmed_participants_count || 0}/{event.max_seats}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Details Button */}
                    <button
                      onClick={() => setSelectedReg(reg)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        darkMode
                          ? 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)] border border-[var(--dark-500)]'
                          : 'bg-[#EBEBFE] text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white'
                      }`}
                    >
                      <Info className="w-4 h-4" />
                      <span>{t('viewDetails') || 'View Details'}</span>
                    </button>

                    {/* Reject Button */}
                    <button
                      onClick={() => handleAction(reg.id, 'reject', reg)}
                      disabled={loadingId === reg.id || deadlineInfo.expired}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode 
                          ? 'border border-[var(--brand-red)]/30 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10' 
                          : 'border-2 border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>{t('reject') || 'Reject'}</span>
                    </button>

                    {/* Approve Button */}
                    <button
                      onClick={() => handleAction(reg.id, 'approve', reg)}
                      disabled={loadingId === reg.id || deadlineInfo.expired}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode
                          ? 'bg-gradient-to-r from-[var(--brand-green)] to-emerald-500 text-[var(--dark-900)] hover:shadow-lg hover:shadow-[var(--brand-green)]/25'
                          : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-200'
                      }`}
                    >
                      {loadingId === reg.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{t('approve') || 'Approve'}</span>
                    </button>
                  </div>
                </div>

                {/* Arrow Indicator */}
                <div className={`hidden sm:flex w-14 items-center justify-center ${
                  darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#F8F7FE]'
                }`}>
                  <button
                    onClick={() => setSelectedReg(reg)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      darkMode 
                        ? 'bg-[var(--dark-500)] text-[var(--brand-light)]/50 group-hover:bg-[var(--brand-primary)] group-hover:text-[var(--dark-900)]' 
                        : 'bg-[#EBEBFE] text-gray-400 group-hover:bg-[#4D4DA4] group-hover:text-white'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Modal */}
      {selectedReg && (
        <EventDetailModal
          reg={selectedReg}
          darkMode={darkMode}
          onClose={() => setSelectedReg(null)}
          onApprove={() => handleAction(selectedReg.id, 'approve', selectedReg)}
          onReject={() => handleAction(selectedReg.id, 'reject', selectedReg)}
          loading={loadingId === selectedReg.id}
          deadlineInfo={getDeadlineInfo(selectedReg)}
          dateLocale={dateLocale}
          t={t}
        />
      )}
    </>
  );
}

// Event Detail Modal Component
function EventDetailModal({ 
  reg, 
  darkMode, 
  onClose, 
  onApprove, 
  onReject, 
  loading,
  deadlineInfo,
  dateLocale,
  t
}: {
  reg: PendingRegistration;
  darkMode: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
  deadlineInfo: { text: string; urgent: boolean; expired: boolean };
  dateLocale: Locale;
  t: any;
}) {
  const event = getEventData(reg);
  const user = getUserData(reg);
  const eventDate = event?.start_date ? new Date(event.start_date) : null;
  const endDate = event?.end_date ? new Date(event.end_date) : null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className={`w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden transform transition-all duration-300 ${
          darkMode 
            ? 'bg-[var(--dark-800)] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--dark-500)]' 
            : 'bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Mobile Drag Handle */}
        <div className="flex items-center justify-center pt-3 pb-1 sm:hidden">
          <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-[var(--dark-500)]' : 'bg-gray-300'}`} />
        </div>

        {/* Header with Image */}
        <div className="relative flex-shrink-0">
          {event?.cover_image ? (
            <div className="h-48 relative">
              <img 
                src={getMediaUrl(event.cover_image) || ''} 
                alt={event.title || ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Event Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight">
                  {event.title || t('untitledEvent') || 'Untitled Event'}
                </h2>
              </div>
            </div>
          ) : (
            <div className={`relative p-5 ${
              darkMode 
                ? 'bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-purple)]' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4]'
            }`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight pr-12">
                {event?.title || t('untitledEvent') || 'Untitled Event'}
              </h2>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Child Info Card */}
          <div className={`p-4 rounded-xl ${
            darkMode 
              ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20' 
              : 'bg-[#FF5485]/5 border border-[#FF5485]/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${
                darkMode ? 'bg-[var(--dark-600)]' : 'bg-white shadow-sm'
              }`}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                  }`}>
                    <User className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                }`}>
                  {t('applicant') || 'Applicant'}
                </p>
                <p className={`font-bold text-lg ${
                  darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                }`}>
                  {user?.first_name || ''} {user?.last_name || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Deadline Warning */}
          {deadlineInfo.urgent && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              deadlineInfo.expired
                ? darkMode 
                  ? 'bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30' 
                  : 'bg-red-50 border border-red-200'
                : darkMode 
                  ? 'bg-orange-500/20 border border-orange-500/30' 
                  : 'bg-orange-50 border border-orange-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                deadlineInfo.expired
                  ? darkMode ? 'bg-[var(--brand-red)]/30' : 'bg-red-100'
                  : darkMode ? 'bg-orange-500/30' : 'bg-orange-100'
              }`}>
                {deadlineInfo.expired ? (
                  <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'}`} />
                ) : (
                  <Timer className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                )}
              </div>
              <div>
                <p className={`font-semibold text-sm ${
                  deadlineInfo.expired
                    ? darkMode ? 'text-[var(--brand-red)]' : 'text-red-700'
                    : darkMode ? 'text-orange-400' : 'text-orange-700'
                }`}>
                  {deadlineInfo.expired 
                    ? (t('registrationExpired') || 'Registration deadline has passed')
                    : (t('approvalDeadline') || 'Approval deadline')
                  }
                </p>
                {!deadlineInfo.expired && (
                  <p className={`text-xs ${darkMode ? 'text-orange-400/70' : 'text-orange-600'}`}>
                    {deadlineInfo.text} {t('remaining') || 'remaining'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Event Details */}
          <div className="space-y-3">
            {/* Date & Time */}
            {eventDate && (
              <div className={`flex items-start gap-3 p-3 rounded-xl ${
                darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-[var(--dark-600)]' : 'bg-white shadow-sm'
                }`}>
                  <CalendarDays className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {format(eventDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                    {format(eventDate, 'HH:mm')}
                    {endDate && ` - ${format(endDate, 'HH:mm')}`}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            {event?.location_name && (
              <div className={`flex items-start gap-3 p-3 rounded-xl ${
                darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-[var(--dark-600)]' : 'bg-white shadow-sm'
                }`}>
                  <MapPin className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {event.location_name}
                  </p>
                </div>
              </div>
            )}

            {/* Price & Capacity */}
            <div className="flex gap-3">
              {/* Price */}
              <div className={`flex-1 flex items-center gap-3 p-3 rounded-xl ${
                darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-[var(--dark-600)]' : 'bg-white shadow-sm'
                }`}>
                  <CreditCard className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-green)]' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                    {t('price') || 'Price'}
                  </p>
                  <p className={`font-bold ${darkMode ? 'text-[var(--brand-green)]' : 'text-emerald-600'}`}>
                    {event?.cost && event.cost > 0 ? `${event.cost} SEK` : (t('free') || 'Free')}
                  </p>
                </div>
              </div>

              {/* Capacity */}
              {event?.max_seats && event.max_seats > 0 && (
                <div className={`flex-1 flex items-center gap-3 p-3 rounded-xl ${
                  darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-[var(--dark-600)]' : 'bg-white shadow-sm'
                  }`}>
                    <Users className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                      {t('spots') || 'Spots'}
                    </p>
                    <p className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                      {event.confirmed_participants_count || 0}/{event.max_seats}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {event?.description && (
            <div>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                {t('aboutThisEvent') || 'About this event'}
              </h4>
              <div 
                className={`text-sm leading-relaxed ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description.substring(0, 300) + (event.description.length > 300 ? '...' : '')) }}
              />
            </div>
          )}

          {/* Link to Event Page */}
          {event?.id && (
            <Link
              href={`/dashboard/guardian/events/${event.id}`}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all ${
                darkMode
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                  : 'bg-[#EBEBFE] text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('viewFullEvent') || 'View Full Event Page'}</span>
            </Link>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex-shrink-0 p-5 border-t ${
          darkMode ? 'border-[var(--dark-600)] bg-[var(--dark-700)]' : 'border-[#4D4DA4]/10 bg-[#F8F7FE]'
        }`}>
          <div className="flex gap-3">
            <button
              onClick={onReject}
              disabled={loading || deadlineInfo.expired}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode 
                  ? 'border-2 border-[var(--brand-red)]/30 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10' 
                  : 'border-2 border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              <X className="w-5 h-5" />
              <span>{t('reject') || 'Reject'}</span>
            </button>
            <button
              onClick={onApprove}
              disabled={loading || deadlineInfo.expired}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-gradient-to-r from-[var(--brand-green)] to-emerald-500 text-[var(--dark-900)] hover:shadow-lg hover:shadow-[var(--brand-green)]/25'
                  : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-200'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>{t('approve') || 'Approve'}</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
