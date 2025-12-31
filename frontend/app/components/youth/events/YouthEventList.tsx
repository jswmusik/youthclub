'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Loader2, Calendar, Clock, MapPin, User, CheckCircle2, XCircle, 
  AlertCircle, CalendarDays, Sparkles, ExternalLink, Users, 
  ChevronRight, History, Search, Filter, X
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow, subWeeks, subMonths, isAfter } from 'date-fns';
import { sv, enUS, da, nb, fi } from 'date-fns/locale';
import { useToast } from '../../../../hooks/useToast';

interface YouthEventListProps {
  user: any;
  darkMode?: boolean;
}

type HistoryFilter = 'all' | 'lastWeek' | 'lastMonth' | 'last6Months';

// Helper functions defined outside component to avoid recreation
const getEventData = (reg: any) => reg.event_detail || reg.event || {};

const localeMap: Record<string, any> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
};

export default function YouthEventList({ user, darkMode = false }: YouthEventListProps) {
  const t = useTranslations('events');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  
  // Toast
  const { success, error, info, warning } = useToast();
  
  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<HistoryFilter>('all');

  // Use the helper function
  const getEvent = getEventData;

  // Helper to get full image URL
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all registrations for the current youth member
      const res = await api.get('/registrations/?page_size=1000');
      const allRegs = res.data.results || res.data;
      setRegistrations(allRegs);
    } catch (e) {
      console.error("Failed to fetch events", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter registrations for pending (awaiting guardian or admin approval)
  const pendingRegs = useMemo(() => {
    return registrations.filter((r: any) => {
      const event = getEvent(r);
      const startDate = event?.start_date ? new Date(event.start_date) : null;
      const isUpcoming = startDate && startDate > new Date();
      const isPendingStatus = ['PENDING_GUARDIAN', 'PENDING_ADMIN', 'PENDING'].includes(r.status);
      return isUpcoming && isPendingStatus;
    });
  }, [registrations]);

  // Filter registrations for upcoming (approved or waitlist)
  const upcomingRegs = useMemo(() => {
    return registrations.filter((r: any) => {
      const event = getEvent(r);
      const startDate = event?.start_date ? new Date(event.start_date) : null;
      const isUpcoming = startDate && startDate > new Date();
      const isActiveStatus = ['APPROVED', 'WAITLIST'].includes(r.status);
      return isUpcoming && isActiveStatus;
    });
  }, [registrations]);
  
  // Base history registrations (past events or history status)
  const baseHistoryRegs = useMemo(() => {
    return registrations.filter((r: any) => {
      const event = getEvent(r);
      const startDate = event?.start_date ? new Date(event.start_date) : null;
      const isPastEvent = startDate && startDate < new Date();
      const isHistoryStatus = ['CANCELLED', 'REJECTED', 'ATTENDED'].includes(r.status);
      return isPastEvent || isHistoryStatus;
    });
  }, [registrations]);

  // Filtered history registrations
  const historyRegs = useMemo(() => {
    let filtered = [...baseHistoryRegs];
    
    // Apply time filter
    if (historyTimeFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (historyTimeFilter) {
        case 'lastWeek':
          cutoffDate = subWeeks(now, 1);
          break;
        case 'lastMonth':
          cutoffDate = subMonths(now, 1);
          break;
        case 'last6Months':
          cutoffDate = subMonths(now, 6);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter((r: any) => {
        const event = getEvent(r);
        const startDate = event?.start_date ? new Date(event.start_date) : null;
        return startDate && isAfter(startDate, cutoffDate);
      });
    }
    
    // Apply search filter
    if (historySearch.trim()) {
      const searchLower = historySearch.toLowerCase().trim();
      filtered = filtered.filter((r: any) => {
        const event = getEvent(r);
        const title = (event?.title || '').toLowerCase();
        const location = (event?.location_name || '').toLowerCase();
        
        return title.includes(searchLower) || location.includes(searchLower);
      });
    }
    
    // Sort by date (most recent first)
    filtered.sort((a, b) => {
      const dateA = new Date(getEvent(a)?.start_date || 0);
      const dateB = new Date(getEvent(b)?.start_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    return filtered;
  }, [baseHistoryRegs, historyTimeFilter, historySearch]);

  // Handle cancellation
  const handleCancelRegistration = async (eventId: number, eventTitle: string) => {
    setCancellingId(eventId);
    try {
      await api.post(`/events/${eventId}/cancel/`);
      showToast(
        setToast,
        eventTitle,
        'success',
        t('cancellationSuccess') || 'Registration cancelled successfully!'
      );
      // Refresh the list
      fetchEvents();
    } catch (error: any) {
      console.error('Failed to cancel registration:', error);
      showToast(
        setToast,
        eventTitle,
        'error',
        error?.response?.data?.error || t('cancellationFailed') || 'Failed to cancel registration'
      );
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { 
          bg: darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100', 
          text: darkMode ? 'text-emerald-400' : 'text-emerald-700',
          border: darkMode ? 'border-emerald-500/30' : 'border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: t('statusApproved') || 'Approved'
        };
      case 'WAITLIST':
        return { 
          bg: darkMode ? 'bg-amber-500/20' : 'bg-amber-100', 
          text: darkMode ? 'text-amber-400' : 'text-amber-700',
          border: darkMode ? 'border-amber-500/30' : 'border-amber-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: t('statusWaitlist') || 'Waitlist'
        };
      case 'PENDING_GUARDIAN':
        return { 
          bg: darkMode ? 'bg-purple-500/20' : 'bg-purple-100', 
          text: darkMode ? 'text-purple-400' : 'text-purple-700',
          border: darkMode ? 'border-purple-500/30' : 'border-purple-200',
          icon: <User className="w-3.5 h-3.5" />,
          label: t('statusPendingGuardian') || 'Awaiting Guardian'
        };
      case 'PENDING_ADMIN':
      case 'PENDING':
        return { 
          bg: darkMode ? 'bg-blue-500/20' : 'bg-blue-100', 
          text: darkMode ? 'text-blue-400' : 'text-blue-700',
          border: darkMode ? 'border-blue-500/30' : 'border-blue-200',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: t('statusPendingAdmin') || 'Awaiting Approval'
        };
      case 'ATTENDED':
        return { 
          bg: darkMode ? 'bg-green-500/20' : 'bg-green-100', 
          text: darkMode ? 'text-green-400' : 'text-green-700',
          border: darkMode ? 'border-green-500/30' : 'border-green-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: t('statusAttended') || 'Attended'
        };
      case 'CANCELLED':
        return { 
          bg: darkMode ? 'bg-gray-500/20' : 'bg-gray-100', 
          text: darkMode ? 'text-gray-400' : 'text-gray-600',
          border: darkMode ? 'border-gray-500/30' : 'border-gray-200',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: t('statusCancelled') || 'Cancelled'
        };
      case 'REJECTED':
        return { 
          bg: darkMode ? 'bg-red-500/20' : 'bg-red-100', 
          text: darkMode ? 'text-red-400' : 'text-red-700',
          border: darkMode ? 'border-red-500/30' : 'border-red-200',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: t('statusRejected') || 'Rejected'
        };
      default:
        return { 
          bg: darkMode ? 'bg-gray-500/20' : 'bg-gray-100', 
          text: darkMode ? 'text-gray-400' : 'text-gray-600',
          border: darkMode ? 'border-gray-500/30' : 'border-gray-200',
          icon: null,
          label: status
        };
    }
  };

  const formatEventDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      if (isToday(date)) {
        return `${t('today') || 'Today'}, ${format(date, 'HH:mm')}`;
      }
      if (isTomorrow(date)) {
        return `${t('tomorrow') || 'Tomorrow'}, ${format(date, 'HH:mm')}`;
      }
      return format(date, 'd MMM, HH:mm', { locale: dateLocale });
    } catch {
      return '';
    }
  };

  const formatHistoryDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, 'd MMMM yyyy', { locale: dateLocale });
    } catch {
      return '';
    }
  };

  const getTimeUntilEvent = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
    } catch {
      return '';
    }
  };

  const timeFilterOptions: { value: HistoryFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') || 'All' },
    { value: 'lastWeek', label: t('filterLastWeek') || 'Last week' },
    { value: 'lastMonth', label: t('filterLastMonth') || 'Last month' },
    { value: 'last6Months', label: t('filterLast6Months') || 'Last 6 months' },
  ];

  // Event Card Component for Pending and Upcoming
  const EventCard = ({ reg, showCancelButton = false }: { reg: any; showCancelButton?: boolean }) => {
    const event = getEvent(reg);
    const statusConfig = getStatusConfig(reg.status);
    const imageUrl = getImageUrl(event.cover_image);
    const isCancelling = cancellingId === event.id;
    
    return (
      <div 
        className={`group rounded-xl overflow-hidden border-2 transition-all ${
          darkMode 
            ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50' 
            : 'bg-white border-[#4D4DA4]/10 hover:border-[#4D4DA4]/30 shadow-sm hover:shadow-md'
        }`}
      >
        <div 
          className="flex cursor-pointer"
          onClick={() => router.push(`/dashboard/youth/events/${event.id}`)}
        >
          {/* Event Image / Date Block */}
          <div className={`relative w-24 sm:w-32 min-h-[100px] flex-shrink-0 ${
            !imageUrl 
              ? darkMode 
                ? 'bg-gradient-to-br from-[var(--dark-600)] to-[var(--dark-500)]' 
                : 'bg-gradient-to-br from-[#4D4DA4] to-[#6B6BD4]'
              : ''
          }`}>
            {imageUrl && (
              <>
                <img 
                  src={imageUrl} 
                  alt={event.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
              </>
            )}
            
            {/* Date overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
              <span className="text-3xl sm:text-4xl font-bold drop-shadow-lg">
                {event.start_date ? format(new Date(event.start_date), 'd') : '-'}
              </span>
              <span className="text-xs sm:text-sm uppercase tracking-wider opacity-90 drop-shadow">
                {event.start_date ? format(new Date(event.start_date), 'MMM', { locale: dateLocale }) : ''}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            {/* Top row: Status */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            
            {/* Event title */}
            <h4 className={`font-bold text-base sm:text-lg mb-2 line-clamp-1 group-hover:underline ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>
              {event.title || t('untitledEvent')}
            </h4>
            
            {/* Event details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className={`text-sm flex items-center gap-1.5 ${
                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
              }`}>
                <Clock className="w-4 h-4 flex-shrink-0" />
                {formatEventDate(event.start_date)}
              </span>
              
              {event.location_name && (
                <span className={`text-sm flex items-center gap-1.5 ${
                  darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                }`}>
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{event.location_name}</span>
                </span>
              )}
            </div>

            {/* Time until event */}
            <div className={`mt-2 text-xs ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
            }`}>
              {getTimeUntilEvent(event.start_date)}
            </div>
          </div>

          {/* Arrow indicator */}
          <div className={`hidden sm:flex items-center pr-4 ${
            darkMode ? 'text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)]' : 'text-gray-300 group-hover:text-[#4D4DA4]'
          } transition-colors`}>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
        
        {/* Cancel Button */}
        {showCancelButton && (
          <div className={`px-4 pb-4 pt-2 border-t ${
            darkMode ? 'border-[var(--dark-600)]' : 'border-gray-100'
          }`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelRegistration(event.id, event.title);
              }}
              disabled={isCancelling}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isCancelling
                  ? darkMode
                    ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/50 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : darkMode
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('cancelling') || 'Cancelling...'}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  {t('cancelRegistration') || 'Cancel Registration'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      
      
      <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
          : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
      }`}>
        {/* Header */}
        <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading ${
          darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
        }`}>
          <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#FF5485]'}`}></span>
          <CalendarDays className="w-5 h-5" />
          {t('myEvents') || 'My Events'}
        </h3>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-6 ${
          darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-100'
        }`}>
          <TabButton 
            label={t('pending') || "Pending"}
            isActive={activeTab === 'PENDING'} 
            onClick={() => setActiveTab('PENDING')}
            count={pendingRegs.length}
            darkMode={darkMode}
          />
          <TabButton 
            label={t('upcoming') || "Upcoming"}
            isActive={activeTab === 'UPCOMING'} 
            onClick={() => setActiveTab('UPCOMING')}
            darkMode={darkMode}
          />
          <TabButton 
            label={t('history') || "History"}
            isActive={activeTab === 'HISTORY'} 
            onClick={() => setActiveTab('HISTORY')}
            darkMode={darkMode}
          />
        </div>

        {loading ? (
          <div className={`py-12 flex flex-col items-center justify-center gap-3 ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
          }`}>
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm opacity-70">{t('loading') || 'Loading...'}</span>
          </div>
        ) : (
          <>
            {/* Pending Tab */}
            {activeTab === 'PENDING' && (
              <div className="space-y-4">
                {pendingRegs.length > 0 ? (
                  <>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                      {t('pendingDescription') || 'These events are waiting for approval from your guardian or an administrator.'}
                    </p>
                    {pendingRegs.map((reg: any) => (
                      <EventCard key={reg.id} reg={reg} showCancelButton={true} />
                    ))}
                  </>
                ) : (
                  <EmptyState 
                    message={t('noPendingEvents') || "No pending event applications."} 
                    icon={<AlertCircle className="w-12 h-12" />}
                    darkMode={darkMode}
                  />
                )}
              </div>
            )}

            {/* Upcoming Tab */}
            {activeTab === 'UPCOMING' && (
              <div className="space-y-4">
                {upcomingRegs.length > 0 ? upcomingRegs.map((reg: any) => (
                  <EventCard key={reg.id} reg={reg} showCancelButton={true} />
                )) : (
                  <EmptyState 
                    message={t('noUpcomingEvents') || "No upcoming events."} 
                    icon={<CalendarDays className="w-12 h-12" />}
                    darkMode={darkMode}
                  />
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'HISTORY' && (
              <div className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      placeholder={t('searchHistory') || 'Search events...'}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-colors ${
                        darkMode 
                          ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:border-[var(--brand-primary)]' 
                          : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-[#4D4DA4]'
                      } focus:outline-none`}
                    />
                    {historySearch && (
                      <button
                        onClick={() => setHistorySearch('')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-opacity-20 ${
                          darkMode ? 'text-[var(--brand-light)]/60 hover:bg-white' : 'text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Time Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={historyTimeFilter}
                      onChange={(e) => setHistoryTimeFilter(e.target.value as HistoryFilter)}
                      className={`appearance-none pl-10 pr-10 py-2.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                        darkMode 
                          ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] focus:border-[var(--brand-primary)]' 
                          : 'bg-white border-gray-200 text-gray-800 focus:border-[#4D4DA4]'
                      } focus:outline-none`}
                    >
                      {timeFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                      darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                    }`} />
                    <ChevronRight className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none ${
                      darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                    }`} />
                  </div>
                </div>

                {/* Results count */}
                {(historySearch || historyTimeFilter !== 'all') && (
                  <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                    {historyRegs.length} {historyRegs.length === 1 
                      ? (t('resultFound') || 'result found') 
                      : (t('resultsFound') || 'results found')}
                    {historySearch && (
                      <span> {t('forSearch') || 'for'} "{historySearch}"</span>
                    )}
                  </div>
                )}

                {/* History List */}
                <div className="space-y-3">
                  {historyRegs.length > 0 ? historyRegs.map((reg: any) => {
                    const event = getEvent(reg);
                    const statusConfig = getStatusConfig(reg.status);
                    
                    return (
                      <div 
                        key={reg.id} 
                        className={`group rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          darkMode 
                            ? 'bg-[var(--dark-700)] border-[var(--dark-600)] hover:border-[var(--dark-500)]' 
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                        }`}
                        onClick={() => router.push(`/dashboard/youth/events/${event.id}`)}
                      >
                        <div className="flex items-center p-4 gap-4">
                          {/* Date block */}
                          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                            darkMode 
                              ? 'bg-[var(--dark-600)]' 
                              : 'bg-white shadow-sm border border-gray-100'
                          }`}>
                            <span className={`text-lg font-bold ${
                              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                            }`}>
                              {event.start_date ? format(new Date(event.start_date), 'd') : '-'}
                            </span>
                            <span className={`text-[10px] uppercase tracking-wider ${
                              darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                            }`}>
                              {event.start_date ? format(new Date(event.start_date), 'MMM', { locale: dateLocale }) : ''}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-sm mb-1 truncate group-hover:underline ${
                              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                            }`}>
                              {event.title || t('untitledEvent')}
                            </h4>
                            
                            <div className="flex items-center gap-3">
                              <span className={`text-xs ${
                                darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                              }`}>
                                {formatHistoryDate(event.start_date)}
                              </span>
                              
                              {event.location_name && (
                                <span className={`text-xs flex items-center gap-1 ${
                                  darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                }`}>
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate max-w-[100px]">{event.location_name}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            {statusConfig.icon}
                            <span className="hidden sm:inline">{statusConfig.label}</span>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                            darkMode ? 'text-[var(--brand-light)]/30 group-hover:text-[var(--brand-light)]/60' : 'text-gray-300 group-hover:text-gray-500'
                          } transition-colors`} />
                        </div>
                      </div>
                    );
                  }) : (
                    <EmptyState 
                      message={historySearch || historyTimeFilter !== 'all' 
                        ? (t('noResultsFound') || 'No results found.') 
                        : (t('noHistory') || 'No event history.')} 
                      icon={<History className="w-12 h-12" />}
                      darkMode={darkMode}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function TabButton({ label, isActive, onClick, count, darkMode }: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  darkMode?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
        isActive 
          ? darkMode
            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] shadow-sm'
            : 'bg-white text-[#4D4DA4] shadow-sm'
          : darkMode
            ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
            : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
          isActive
            ? darkMode
              ? 'bg-[var(--dark-900)] text-[var(--brand-primary)]'
              : 'bg-red-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ message, icon, darkMode }: { message: string; icon?: React.ReactNode; darkMode?: boolean }) {
  return (
    <div className={`p-12 text-center rounded-xl border-2 border-dashed ${
      darkMode 
        ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' 
        : 'border-gray-200 bg-gray-50/50'
    }`}>
      <div className={`mx-auto mb-3 ${
        darkMode ? 'text-[var(--brand-light)]/20' : 'text-gray-300'
      }`}>
        {icon || <CalendarDays className="w-12 h-12 mx-auto" />}
      </div>
      <p className={`text-sm ${
        darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-400'
      }`}>{message}</p>
    </div>
  );
}

