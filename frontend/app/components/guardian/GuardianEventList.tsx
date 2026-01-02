'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import GuardianEventApprovalList from '../events/guardian/GuardianEventApprovalList';
import { 
  Loader2, Calendar, Clock, MapPin, User, CheckCircle2, XCircle, 
  AlertCircle, CalendarDays, Sparkles, ExternalLink, Users, 
  DollarSign, ChevronRight, History, Search, Filter, X
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow, subWeeks, subMonths, isAfter } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

interface GuardianEventListProps {
  user: any;
  darkMode?: boolean;
}

type HistoryFilter = 'all' | 'lastWeek' | 'lastMonth' | 'last6Months';

// Helper functions defined outside component to avoid recreation
const getEventData = (reg: any) => reg.event_detail || reg.event || {};
const getUserData = (reg: any) => reg.user_detail || reg.user || {};

export default function GuardianEventList({ user, darkMode = false }: GuardianEventListProps) {
  const t = useTranslations('events');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'APPROVALS' | 'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<HistoryFilter>('all');

  // Use the helper functions defined outside the component
  const getEvent = getEventData;
  const getUser = getUserData;

  // Helper to get full image URL
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Otherwise, prepend the API base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // 1. Fetch all registrations for my children (with large page size to get all)
      const res = await api.get('/registrations/?page_size=1000');
      const allRegs = res.data.results || res.data; // Handle paginated or non-paginated

      // 2. Filter locally
      const pending = allRegs.filter((r: any) => r.status === 'PENDING_GUARDIAN');
      const others = allRegs.filter((r: any) => r.status !== 'PENDING_GUARDIAN');
      
      setApprovals(pending);
      setRegistrations(others);
      
      // If we have pending approvals, default to that tab on first load
      if (pending.length > 0 && activeTab === 'UPCOMING') {
         // Optional: Auto-switch logic could go here
      }
    } catch (e) {
      console.error("Failed to fetch events", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter registrations for display
  const upcomingRegs = useMemo(() => {
    return registrations.filter((r: any) => {
      const event = getEvent(r);
      const startDate = event?.start_date ? new Date(event.start_date) : null;
      const isUpcoming = startDate && startDate > new Date();
      const isActiveStatus = ['APPROVED', 'WAITLIST', 'PENDING_ADMIN', 'PENDING'].includes(r.status);
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
          cutoffDate = new Date(0); // Beginning of time
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
        const userData = getUser(r);
        const title = (event?.title || '').toLowerCase();
        const location = (event?.location_name || '').toLowerCase();
        const childName = (userData?.first_name || '').toLowerCase();
        
        return title.includes(searchLower) || 
               location.includes(searchLower) || 
               childName.includes(searchLower);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { 
          bg: darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100', 
          text: darkMode ? 'text-emerald-400' : 'text-emerald-700',
          border: darkMode ? 'border-emerald-500/30' : 'border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: t('statusApproved') || 'Godkänd'
        };
      case 'WAITLIST':
        return { 
          bg: darkMode ? 'bg-amber-500/20' : 'bg-amber-100', 
          text: darkMode ? 'text-amber-400' : 'text-amber-700',
          border: darkMode ? 'border-amber-500/30' : 'border-amber-200',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: t('statusWaitlist') || 'Väntelista'
        };
      case 'PENDING_ADMIN':
      case 'PENDING':
        return { 
          bg: darkMode ? 'bg-blue-500/20' : 'bg-blue-100', 
          text: darkMode ? 'text-blue-400' : 'text-blue-700',
          border: darkMode ? 'border-blue-500/30' : 'border-blue-200',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: t('statusPending') || 'Väntar'
        };
      case 'ATTENDED':
        return { 
          bg: darkMode ? 'bg-green-500/20' : 'bg-green-100', 
          text: darkMode ? 'text-green-400' : 'text-green-700',
          border: darkMode ? 'border-green-500/30' : 'border-green-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: t('statusAttended') || 'Deltog'
        };
      case 'CANCELLED':
        return { 
          bg: darkMode ? 'bg-[#F8F7FE]0/20' : 'bg-[#EBEBFE]', 
          text: darkMode ? 'text-gray-400' : 'text-gray-600',
          border: darkMode ? 'border-gray-500/30' : 'border-[#4D4DA4]/15',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: t('statusCancelled') || 'Avbokad'
        };
      case 'REJECTED':
        return { 
          bg: darkMode ? 'bg-red-500/20' : 'bg-red-100', 
          text: darkMode ? 'text-red-400' : 'text-red-700',
          border: darkMode ? 'border-red-500/30' : 'border-red-200',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: t('statusRejected') || 'Avvisad'
        };
      default:
        return { 
          bg: darkMode ? 'bg-[#F8F7FE]0/20' : 'bg-[#EBEBFE]', 
          text: darkMode ? 'text-gray-400' : 'text-gray-600',
          border: darkMode ? 'border-gray-500/30' : 'border-[#4D4DA4]/15',
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
        return `Idag, ${format(date, 'HH:mm')}`;
      }
      if (isTomorrow(date)) {
        return `Imorgon, ${format(date, 'HH:mm')}`;
      }
      return format(date, 'd MMM, HH:mm', { locale: sv });
    } catch {
      return '';
    }
  };

  const formatHistoryDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, 'd MMMM yyyy', { locale: sv });
    } catch {
      return '';
    }
  };

  const getTimeUntilEvent = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return formatDistanceToNow(date, { addSuffix: true, locale: sv });
    } catch {
      return '';
    }
  };

  const timeFilterOptions: { value: HistoryFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') || 'Alla' },
    { value: 'lastWeek', label: t('filterLastWeek') || 'Senaste veckan' },
    { value: 'lastMonth', label: t('filterLastMonth') || 'Senaste månaden' },
    { value: 'last6Months', label: t('filterLast6Months') || 'Senaste 6 månaderna' },
  ];

  return (
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
        {t('eventApplications') || 'Event Applications'}
      </h3>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 ${
        darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'
      }`}>
        <TabButton 
          label={t('approvals') || "Approvals"}
          isActive={activeTab === 'APPROVALS'} 
          onClick={() => setActiveTab('APPROVALS')}
          count={approvals.length}
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
          {activeTab === 'APPROVALS' && (
            <GuardianEventApprovalList 
              registrations={approvals} 
              onRefresh={fetchEvents}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'UPCOMING' && (
            <div className="space-y-4">
              {upcomingRegs.length > 0 ? upcomingRegs.map((reg: any) => {
                const event = getEvent(reg);
                const userData = getUser(reg);
                const statusConfig = getStatusConfig(reg.status);
                const imageUrl = getImageUrl(event.cover_image);
                
                return (
                  <div 
                    key={reg.id} 
                    className={`group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50' 
                        : 'bg-white border-[#4D4DA4]/10 hover:border-[#4D4DA4]/30 shadow-sm hover:shadow-md'
                    }`}
                    onClick={() => router.push(`/dashboard/guardian/events/${event.id}`)}
                  >
                    <div className="flex">
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
                            {event.start_date ? format(new Date(event.start_date), 'MMM', { locale: sv }) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 min-w-0">
                        {/* Top row: Child badge + Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                            darkMode 
                              ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                              : 'bg-[#FF5485]/10 text-[#FF5485]'
                          }`}>
                            <User className="w-3 h-3" />
                            {userData?.first_name || t('child')}
                          </span>
                          
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
                  </div>
                );
              }) : (
                <EmptyState 
                  message={t('noUpcomingEvents') || "No upcoming events."} 
                  icon={<CalendarDays className="w-12 h-12" />}
                  darkMode={darkMode}
                />
              )}
            </div>
          )}

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
                    placeholder={t('searchHistory') || 'Sök efter evenemang...'}
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-colors ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:border-[var(--brand-primary)]' 
                        : 'bg-white border-[#4D4DA4]/15 text-gray-800 placeholder:text-gray-400 focus:border-[#4D4DA4]'
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
                        : 'bg-white border-[#4D4DA4]/15 text-gray-800 focus:border-[#4D4DA4]'
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
                    ? (t('resultFound') || 'resultat hittat') 
                    : (t('resultsFound') || 'resultat hittade')}
                  {historySearch && (
                    <span> {t('forSearch') || 'för'} "{historySearch}"</span>
                  )}
                </div>
              )}

              {/* History List */}
              <div className="space-y-3">
                {historyRegs.length > 0 ? historyRegs.map((reg: any) => {
                  const event = getEvent(reg);
                  const userData = getUser(reg);
                  const statusConfig = getStatusConfig(reg.status);
                  
                  return (
                    <div 
                      key={reg.id} 
                      className={`group rounded-xl overflow-hidden border transition-all cursor-pointer ${
                        darkMode 
                          ? 'bg-[var(--dark-700)] border-[var(--dark-600)] hover:border-[var(--dark-500)]' 
                          : 'bg-[#F8F7FE] border-[#4D4DA4]/15 hover:border-gray-300 hover:bg-white'
                      }`}
                      onClick={() => router.push(`/dashboard/guardian/events/${event.id}`)}
                    >
                      <div className="flex items-center p-4 gap-4">
                        {/* Date block */}
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                          darkMode 
                            ? 'bg-[var(--dark-600)]' 
                            : 'bg-white shadow-sm border border-[#4D4DA4]/10'
                        }`}>
                          <span className={`text-lg font-bold ${
                            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                          }`}>
                            {event.start_date ? format(new Date(event.start_date), 'd') : '-'}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider ${
                            darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                          }`}>
                            {event.start_date ? format(new Date(event.start_date), 'MMM', { locale: sv }) : ''}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              darkMode 
                                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/70' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {userData?.first_name || t('child')}
                            </span>
                          </div>
                          
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
                      ? (t('noResultsFound') || 'Inga resultat hittades.') 
                      : (t('noHistory') || 'Ingen evenemangshistorik.')} 
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
        : 'border-[#4D4DA4]/15 bg-[#F8F7FE]/50'
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
