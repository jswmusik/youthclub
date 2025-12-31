'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Users, LogOut, QrCode, Hand, Clock, ChevronLeft } from 'lucide-react';
import { visits } from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { useToast } from '../../../hooks/useToast';

// Define the shape of our session data based on the API serializer
interface Session {
  id: number;
  user_details: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    age?: number;
  };
  check_in_at: string;
  check_out_at: string | null;
  method: string;
}

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onCheckOut: () => void;
  hasCheckedOut: boolean;
}

function SwipeableCard({ children, onCheckOut, hasCheckedOut }: SwipeableCardProps) {
  const t = useTranslations('clubVisits.liveAttendance');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 70;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || hasCheckedOut) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (hasCheckedOut) {
      setCurrentX(0);
      setIsOpen(false);
      return;
    }
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      // Allow normal click behavior
      return;
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleCheckOutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckOut();
    setIsOpen(false);
    setCurrentX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      {!hasCheckedOut && (
        <div className="absolute inset-y-0 right-0 flex items-stretch">
          <button
            onClick={handleCheckOutClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium">{t('checkOut')}</span>
          </button>
        </div>
      )}

      <div
        className="relative bg-[var(--dark-800)] transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {!isOpen && !hasCheckedOut && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveAttendanceList({ clubId, refreshTrigger }: { clubId: string | number, refreshTrigger: number }) {
  const t = useTranslations('clubVisits.liveAttendance');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error, info, warning } = useToast();

  const fetchSessions = async () => {
    try {
      const res = await visits.getActiveSessions(clubId);
      // Handle paginated response (results array) or direct array
      const data = res.data;
      let sessionsList: Session[] = [];
      
      if (Array.isArray(data)) {
        sessionsList = data;
      } else if (data && Array.isArray(data.results)) {
        sessionsList = data.results;
      }
      
      // Additional frontend filter: Only show sessions that haven't been checked out
      // This is a safety check in case backend filtering isn't working
      sessionsList = sessionsList.filter(session => !session.check_out_at);
      
      // Additional safety: Only show the most recent active session per user
      // Group by user ID and take the most recent check-in
      const userSessionsMap = new Map<number, Session>();
      sessionsList.forEach(session => {
        const userId = session.user_details.id;
        const existing = userSessionsMap.get(userId);
        if (!existing || new Date(session.check_in_at) > new Date(existing.check_in_at)) {
          userSessionsMap.set(userId, session);
        }
      });
      
      setSessions(Array.from(userSessionsMap.values()));
    } catch (error) {
      console.error("Failed to fetch sessions", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when the trigger changes (e.g. after a manual check-in)
  useEffect(() => {
    fetchSessions();
    // Optional: Auto-refresh every 30 seconds to keep list live
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [clubId, refreshTrigger]);

  const handleCheckOut = async (sessionId: number) => {
    try {
      await visits.checkOut(sessionId);
      success(t('toast.checkOutSuccess'));
      fetchSessions(); // Refresh list immediately
    } catch (error) {
      error(t('toast.checkOutError'));
    }
  };

  const getInitials = (first?: string, last?: string) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const checkIn = new Date(dateString);
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
        <div className="py-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center animate-pulse">
              <Users className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loadingLiveData')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Ensure sessions is always an array
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  return (
    <>
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-third)]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--brand-third)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                {t('currentlyInside')}
              </h3>
              <p className="text-sm text-[var(--brand-light)]/50">
                {sessionsArray.length === 1 
                  ? t('personCheckedIn', { count: sessionsArray.length })
                  : t('peopleCheckedIn', { count: sessionsArray.length })}
              </p>
            </div>
          </div>
          <button 
            onClick={fetchSessions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" /> 
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>
        </div>

        {sessionsArray.length === 0 ? (
          <div className="p-8 sm:p-12">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
              <p className="text-[var(--brand-light)]/50 font-medium">{t('noActiveCheckIns')}</p>
              <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('clubCurrentlyEmpty')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.member')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.checkInTime')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.method')}</th>
                    <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsArray.map((session) => (
                    <tr key={session.id} className="border-b border-[var(--dark-600)] hover:bg-[var(--dark-700)]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                            {session.user_details.avatar ? (
                              <img src={getMediaUrl(session.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                                <span className="text-xs font-bold text-white">
                                  {getInitials(session.user_details.first_name, session.user_details.last_name)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--brand-light)]">
                              {session.user_details.first_name || t('userFallback')} {session.user_details.last_name}
                            </div>
                            <div className="text-xs text-[var(--brand-light)]/50">
                              {session.user_details.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--brand-light)]/40" />
                          <span className="text-[var(--brand-light)]/70">{formatTime(session.check_in_at)}</span>
                          <span className="text-xs text-[var(--brand-light)]/40">({getTimeSince(session.check_in_at)})</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          session.method === 'QR_KIOSK' 
                            ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' 
                            : 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]'
                        }`}>
                          {session.method === 'QR_KIOSK' ? (
                            <><QrCode className="w-3 h-3" /> {t('selfScan')}</>
                          ) : (
                            <><Hand className="w-3 h-3" /> {t('manual')}</>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {session.check_out_at ? (
                          <span className="text-[var(--brand-light)]/40 text-sm">
                            {t('checkedOutAt', { time: formatTime(session.check_out_at) })}
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleCheckOut(session.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all text-sm font-medium"
                          >
                            <LogOut className="w-4 h-4" /> {t('checkOut')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards with Swipe */}
            <div className="md:hidden">
              {sessionsArray.map((session) => (
                <SwipeableCard
                  key={session.id}
                  onCheckOut={() => handleCheckOut(session.id)}
                  hasCheckedOut={!!session.check_out_at}
                >
                  <div className="border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                        {session.user_details.avatar ? (
                          <img src={getMediaUrl(session.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                            <span className="text-sm font-bold text-white">
                              {getInitials(session.user_details.first_name, session.user_details.last_name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-[var(--brand-light)]">
                              {session.user_details.first_name || t('userFallback')} {session.user_details.last_name}
                            </div>
                            <div className="text-xs text-[var(--brand-light)]/50 truncate">
                              {session.user_details.email}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0 ${
                            session.method === 'QR_KIOSK' 
                              ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' 
                              : 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]'
                          }`}>
                            {session.method === 'QR_KIOSK' ? (
                              <><QrCode className="w-3 h-3" /> QR</>
                            ) : (
                              <><Hand className="w-3 h-3" /> {t('manual')}</>
                            )}
                          </span>
                        </div>

                        {/* Time Row */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--dark-600)]">
                          <Clock className="w-4 h-4 text-[var(--brand-light)]/40" />
                          <span className="text-sm text-[var(--brand-light)]/70">{formatTime(session.check_in_at)}</span>
                          <span className="text-xs text-[var(--brand-third)]">• {getTimeSince(session.check_in_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast Notification */}
    </>
  );
}
