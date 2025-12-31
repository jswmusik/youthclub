'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Package, Users, AlertCircle } from 'lucide-react';
import BookingDetailModal from './BookingDetailModal';
import AdminCreateBookingModal from './AdminCreateBookingModal';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

export interface BookingCalendarRef {
  openCreateModal: () => void;
}

const BookingCalendar = forwardRef<BookingCalendarRef, { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }>(
  ({ scope }, ref) => {
  const t = useTranslations('bookingsAdmin.calendar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const dateLocale = locale === 'sv' ? sv : undefined;
  
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookings, setBookings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]); // For showing schedule slots
  const [preSelectedSlot, setPreSelectedSlot] = useState<{slot: any, resource: any, date: Date} | null>(null);
  
  // Filters
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  
  // Expose method to open create modal via ref
  useImperativeHandle(ref, () => ({
    openCreateModal: () => setShowCreateModal(true)
  }));
  
  // Initialize selectedResource from URL params or localStorage
  const [selectedResource, setSelectedResource] = useState(() => {
    // First try URL params (from Next.js searchParams)
    const urlResource = searchParams.get('resource');
    if (urlResource) return urlResource;
    
    // Then try localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`booking-calendar-resource-${scope || 'default'}`);
      if (stored) return stored;
    }
    return '';
  });
  
  // Sync selectedResource when URL params change
  useEffect(() => {
    const urlResource = searchParams.get('resource');
    if (urlResource && urlResource !== selectedResource) {
      setSelectedResource(urlResource);
    } else if (!urlResource && selectedResource) {
      // If URL doesn't have resource but state does, check localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`booking-calendar-resource-${scope || 'default'}`);
        if (stored && stored !== selectedResource) {
          setSelectedResource(stored);
        }
      }
    }
  }, [searchParams, scope]);

  // 1. Fetch Clubs (if needed)
  useEffect(() => {
    if (scope === 'MUNICIPALITY' || scope === 'SUPER') {
      api.get('/clubs/?page_size=100').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
  }, [scope]);

  // 2. Fetch Resources (Filtered by Club if selected)
  useEffect(() => {
    const fetchResources = async () => {
      try {
        let url = '/bookings/resources/?page_size=100';
        if (selectedClub) url += `&club=${selectedClub}`;
        
        const res = await api.get(url);
        setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (e) { console.error(e); }
    };
    fetchResources();
  }, [selectedClub]); // Re-fetch resources when club changes

  // Fetch Available Slots function
  const fetchAvailableSlots = async () => {
    if (!selectedResource) {
      setAvailableSlots([]);
      return;
    }
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      
      const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
      const slotsData = Array.isArray(res.data) ? res.data : [];
      setAvailableSlots(slotsData);
    } catch (e) {
      console.error('Error fetching available slots:', e);
      setAvailableSlots([]);
    }
  };

  // 3. Fetch Bookings
  useEffect(() => {
    fetchBookings();
  }, [currentWeekStart, selectedResource, selectedClub]);

  // 4. Fetch Available Slots (schedule slots) when a resource is selected
  useEffect(() => {
    if (selectedResource) {
      const fetchSlots = async () => {
        if (!selectedResource) {
          setAvailableSlots([]);
          return;
        }
        try {
          const startStr = format(currentWeekStart, 'yyyy-MM-dd');
          const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
          
          const url = `/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`;
          const res = await api.get(url);
          const slotsData = Array.isArray(res.data) ? res.data : [];
          setAvailableSlots(slotsData);
        } catch (e: any) {
          console.error('Error fetching available slots:', e);
          setAvailableSlots([]);
        }
      };
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedResource, currentWeekStart]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      
      let url = `/bookings/bookings/?start_date=${startStr}&end_date=${endStr}&page_size=500`;
      
      if (selectedResource) {
          url += `&resource=${selectedResource}`;
      } else if (selectedClub) {
          // If no specific resource picked, but club is picked, filter bookings by club
          url += `&club=${selectedClub}`;
      }
      
      const res = await api.get(url);
      const bookingsData = Array.isArray(res.data) ? res.data : res.data.results || [];
      setBookings(bookingsData);
    } catch (e) { 
      console.error('Error fetching bookings:', e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Helper to place booking on grid
  const getPosition = (booking: any) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    
    // Calculate top offset (minutes from 8:00)
    const startMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    return {
      top: `${(startMinutes / 60) * 60}px`, // 60px height per hour
      height: `${(durationMinutes / 60) * 60}px`
    };
  };

  // Status badge styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-[var(--brand-primary)] border-l-4 border-[var(--brand-purple)] text-white shadow-sm';
      case 'PENDING':
        return 'bg-[var(--brand-peach)] border-l-4 border-[var(--brand-peach)] text-[var(--dark-900)] shadow-sm';
      case 'CANCELLED':
        return 'bg-[var(--dark-600)] border-l-4 border-[var(--dark-500)] text-[var(--brand-light)]/50 opacity-60 line-through';
      case 'REJECTED':
        return 'bg-[var(--brand-red)]/30 border-l-4 border-[var(--brand-red)] text-[var(--brand-red)] opacity-60';
      default:
        return 'bg-[var(--dark-600)] border-l-4 border-[var(--dark-500)] text-[var(--brand-light)]/50 opacity-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-3 animate-pulse">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div className="text-[var(--brand-light)]/50 animate-pulse">{t('loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-[var(--dark-600)] p-4 flex-shrink-0">
        <div className="flex flex-col gap-4">
          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                <h2 className="text-lg sm:text-xl font-bold text-[var(--brand-light)]">
                  {format(currentWeekStart, 'MMMM d', { locale: dateLocale })} - {format(addDays(currentWeekStart, 6), 'd, yyyy', { locale: dateLocale })}
                </h2>
              </div>
              <div className="flex items-center rounded-xl border border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden">
                <button 
                  onClick={() => setCurrentWeekStart(d => addDays(d, -7))}
                  className="h-9 w-9 flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
                  aria-label={t('previousWeek')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="h-9 px-3 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors border-x border-[var(--dark-500)]"
                >
                  {t('today')}
                </button>
                <button 
                  onClick={() => setCurrentWeekStart(d => addDays(d, 7))}
                  className="h-9 w-9 flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
                  aria-label={t('nextWeek')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
              <div className="relative">
                <select 
                  className="h-10 w-full sm:w-auto sm:min-w-[150px] rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 py-2 text-sm text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none pr-10"
                  value={selectedClub}
                  onChange={e => {
                    setSelectedClub(e.target.value);
                    setSelectedResource(''); // Reset resource when club changes
                  }}
                >
                  <option value="">{t('allClubs')}</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[var(--brand-light)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            <div className="relative">
              <select 
                className="h-10 w-full sm:w-auto sm:min-w-[200px] rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 py-2 text-sm text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none pr-10"
                value={selectedResource}
                onChange={e => {
                  const newResourceId = e.target.value;
                  setSelectedResource(newResourceId);
                  
                  // Update URL params
                  const params = new URLSearchParams(searchParams.toString());
                  if (newResourceId) {
                    params.set('resource', newResourceId);
                  } else {
                    params.delete('resource');
                  }
                  router.replace(`${pathname}?${params.toString()}`);
                  
                  // Persist to localStorage
                  if (typeof window !== 'undefined') {
                    if (newResourceId) {
                      localStorage.setItem(`booking-calendar-resource-${scope || 'default'}`, newResourceId);
                    } else {
                      localStorage.removeItem(`booking-calendar-resource-${scope || 'default'}`);
                    }
                  }
                }}
              >
                <option value="">{t('allResources')}</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-[var(--brand-light)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-0 min-h-0 flex flex-col">
        {/* Desktop View */}
        <div className="hidden lg:flex flex-1 overflow-y-auto overflow-x-hidden bg-[var(--dark-800)] min-h-0">
          {/* Time Column */}
          <div className="w-20 flex-shrink-0 border-r border-[var(--dark-600)] bg-[var(--dark-700)] pt-12 sticky left-0 z-10">
            {HOURS.map(h => (
              <div key={h} className="h-[60px] text-right pr-3 text-xs text-[var(--brand-light)]/40 font-normal -mt-2">
                {locale === 'sv' ? `${h}:00` : (h === 12 ? t('timeFormat.noon') : h < 12 ? `${h} ${t('timeFormat.am')}` : `${h - 12} ${t('timeFormat.pm')}`)}
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex-1 flex min-w-0">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => {
              try {
                return isSameDay(parseISO(b.start_time), day);
              } catch (e) {
                console.error('Error parsing booking date:', b.start_time, e);
                return false;
              }
            });
            
            const daySlots = selectedResource ? availableSlots.filter(slot => {
              try {
                // Handle both ISO string and datetime object formats
                let slotDate: Date;
                if (typeof slot.start === 'string') {
                  slotDate = parseISO(slot.start);
                } else if (slot.start instanceof Date) {
                  slotDate = slot.start;
                } else {
                  // Try to parse as ISO string
                  slotDate = new Date(slot.start);
                }
                
                if (isNaN(slotDate.getTime())) {
                  console.warn('Invalid slot date:', slot.start);
                  return false;
                }
                
                return isSameDay(slotDate, day);
              } catch (e) {
                console.error('Error filtering slot for day:', slot, e);
                return false;
              }
            }) : [];
            
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toString()} className="flex-1 border-r border-[var(--dark-600)] min-w-0 relative bg-[var(--dark-800)] last:border-r-0">
                {/* Header */}
                <div className={`h-12 border-b border-[var(--dark-600)] flex flex-col items-center justify-center px-2 ${
                  isToday ? 'bg-[var(--brand-primary)]/10' : 'bg-[var(--dark-700)]'
                }`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${
                    isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/50'
                  }`}>
                    {format(day, 'EEE', { locale: dateLocale })}
                  </div>
                  <div className={`text-base font-semibold mt-0.5 ${
                    isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'
                  }`}>
                    {format(day, 'd', { locale: dateLocale })}
                  </div>
                </div>
                
              {/* Grid Lines */}
              <div className="relative h-[900px]"> 
                {HOURS.map(h => (
                  <div key={h} className="h-[60px] border-b border-[var(--dark-700)]"></div>
                ))}

                {/* Available Slots (Schedule) - Show as green when available, grey when booked */}
                {daySlots.length > 0 && daySlots.map((slot, idx) => {
                    try {
                      // Parse slot times - handle different formats
                      let slotStart: Date;
                      let slotEnd: Date;
                      
                      if (typeof slot.start === 'string') {
                        slotStart = parseISO(slot.start);
                      } else {
                        slotStart = new Date(slot.start);
                      }
                      
                      if (typeof slot.end === 'string') {
                        slotEnd = parseISO(slot.end);
                      } else {
                        slotEnd = new Date(slot.end);
                      }
                      
                      if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
                        console.error('Invalid slot times:', slot);
                        return null;
                      }
                      
                      const startMinutes = (slotStart.getHours() - 8) * 60 + slotStart.getMinutes();
                      const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                      
                      // Check if this slot overlaps with any APPROVED booking (CANCELLED/REJECTED don't block)
                      const isBooked = dayBookings.some(booking => {
                        try {
                          // Only APPROVED bookings block availability
                          if (booking.status !== 'APPROVED') {
                            return false;
                          }
                          const bookingStart = new Date(booking.start_time);
                          const bookingEnd = new Date(booking.end_time);
                          // Check for overlap: slot overlaps if slotStart < bookingEnd AND slotEnd > bookingStart
                          return slotStart < bookingEnd && slotEnd > bookingStart;
                        } catch {
                          return false;
                        }
                      });
                      
                      return (
                        <button
                          key={`slot-${day.toString()}-${idx}-${slot.start}`}
                          onClick={() => {
                            if (!isBooked && selectedResource) {
                              // Open modal with pre-selected slot
                              const resource = resources.find(r => r.id === parseInt(selectedResource));
                              setShowCreateModal(true);
                              // We'll pass the slot data via a ref or state
                              setPreSelectedSlot({ slot, resource, date: day });
                            }
                          }}
                          disabled={isBooked}
                          style={{
                            top: `${(startMinutes / 60) * 60}px`,
                            height: `${(durationMinutes / 60) * 60}px`,
                            zIndex: 0
                          }}
                          className={`absolute left-0 right-0 border-l-4 transition-all ${
                            isBooked 
                              ? 'bg-[var(--dark-600)] border-[var(--dark-500)] opacity-50 cursor-not-allowed pointer-events-none' 
                              : 'bg-[var(--brand-green)]/20 border-[var(--brand-green)] opacity-70 cursor-pointer hover:bg-[var(--brand-green)]/30 hover:opacity-90'
                          }`}
                          title={`${isBooked ? t('slotTooltip.booked') : t('slotTooltip.clickToBook')}: ${format(slotStart, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`}
                        >
                          {!isBooked && (
                            <div className="text-[10px] font-medium text-[var(--brand-green)] px-1.5 pt-1 leading-tight">
                              {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
                            </div>
                          )}
                        </button>
                      );
                    } catch (e) {
                      console.error('Error rendering slot:', slot, e);
                      return null;
                    }
                  })}

                {/* Bookings (Actual Reservations) */}
                {dayBookings.map(b => {
                  const style = getPosition(b);
                  // Only show APPROVED and PENDING bookings prominently (CANCELLED/REJECTED shown faded)
                  const isActive = b.status === 'APPROVED' || b.status === 'PENDING';
                  const isCancelled = b.status === 'CANCELLED';
                  const isRejected = b.status === 'REJECTED';
                  const isInactive = isCancelled || isRejected;
                  
                  return (
                    <div
                      key={b.id}
                      onClick={() => !isInactive && setSelectedBooking(b)}
                      style={{ 
                        top: style.top, 
                        height: style.height, 
                        zIndex: isActive ? 10 : 0,
                        pointerEvents: isInactive ? 'none' : 'auto',
                        minHeight: '20px'
                      }}
                      className={`absolute left-1 right-1 rounded-lg text-xs px-2 py-1 text-left overflow-hidden transition-all
                        ${isInactive ? '' : 'hover:z-20 hover:shadow-lg cursor-pointer'}
                        ${getStatusStyles(b.status)}
                      `}
                      title={b.status === 'CANCELLED' ? t('bookingTooltip.cancelled') : 
                             b.status === 'REJECTED' ? t('bookingTooltip.rejected') : 
                             t('bookingTooltip.clickToView', { status: b.status })}
                    >
                      <div className="font-medium truncate text-[11px] leading-tight">
                        {b.user_detail?.first_name && b.user_detail?.last_name 
                          ? `${b.user_detail.first_name} ${b.user_detail.last_name}`
                          : b.user_detail?.first_name || t('unknown')}
                      </div>
                      {style.height && parseFloat(style.height.replace('px', '')) > 30 && (
                        <div className="truncate text-[10px] opacity-90 mt-0.5 leading-tight">{b.resource_name || t('unknownResource')}</div>
                      )}
                      {b.status === 'CANCELLED' && (
                        <div className="text-[9px] uppercase font-semibold mt-0.5">{t('statusLabels.CANCELLED')}</div>
                      )}
                      {b.status === 'REJECTED' && (
                        <div className="text-[9px] uppercase font-semibold mt-0.5">{t('statusLabels.REJECTED')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Mobile View - List of days with bookings */}
        <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => {
              try {
                return isSameDay(parseISO(b.start_time), day);
              } catch (e) {
                return false;
              }
            });
            
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toString()} 
                className={`bg-[var(--dark-700)] rounded-xl border-2 overflow-hidden ${
                  isToday ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-600)]'
                }`}
              >
                {/* Day Header */}
                <div className={`px-4 py-3 border-b ${
                  isToday ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-600)] border-[var(--dark-500)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-bold ${isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                        {format(day, 'EEEE', { locale: dateLocale })}
                      </h3>
                      <p className={`text-xs mt-0.5 ${isToday ? 'text-[var(--brand-primary)]/70' : 'text-[var(--brand-light)]/50'}`}>
                        {format(day, 'MMMM d', { locale: dateLocale })}
                      </p>
                    </div>
                    {isToday && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--brand-primary)] text-white">
                        {t('today')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Day Content */}
                <div className="p-3 space-y-2">
                  {dayBookings.length === 0 ? (
                    <p className="text-xs text-[var(--brand-light)]/40 text-center py-3">{t('mobile.noBookings')}</p>
                  ) : (
                    dayBookings.map(b => {
                      const start = new Date(b.start_time);
                      const end = new Date(b.end_time);
                      const isCancelled = b.status === 'CANCELLED';
                      const isRejected = b.status === 'REJECTED';
                      const isInactive = isCancelled || isRejected;
                      
                      // Status colors for mobile
                      const getMobileStatusStyles = () => {
                        switch (b.status) {
                          case 'APPROVED':
                            return 'bg-[var(--dark-600)] border-[var(--brand-primary)]';
                          case 'PENDING':
                            return 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]';
                          case 'CANCELLED':
                            return 'bg-[var(--dark-600)] border-[var(--dark-500)] opacity-60';
                          case 'REJECTED':
                            return 'bg-[var(--brand-red)]/10 border-[var(--brand-red)] opacity-60';
                          default:
                            return 'bg-[var(--dark-600)] border-[var(--dark-500)]';
                        }
                      };
                      
                      const getStatusBadge = () => {
                        switch (b.status) {
                          case 'APPROVED':
                            return 'bg-[var(--brand-primary)] text-white';
                          case 'PENDING':
                            return 'bg-[var(--brand-peach)] text-[var(--dark-900)]';
                          case 'CANCELLED':
                            return 'bg-[var(--dark-500)] text-[var(--brand-light)]/60';
                          case 'REJECTED':
                            return 'bg-[var(--brand-red)] text-white';
                          default:
                            return 'bg-[var(--dark-500)] text-[var(--brand-light)]/60';
                        }
                      };
                      
                      return (
                        <div
                          key={b.id}
                          onClick={() => !isInactive && setSelectedBooking(b)}
                          className={`p-3 rounded-xl border-2 transition-all ${getMobileStatusStyles()} ${
                            !isInactive ? 'cursor-pointer active:scale-[0.98]' : 'line-through'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-sm truncate ${isInactive ? 'text-[var(--brand-light)]/50' : 'text-[var(--brand-light)]'}`}>
                                {b.user_detail?.first_name && b.user_detail?.last_name 
                                  ? `${b.user_detail.first_name} ${b.user_detail.last_name}`
                                  : b.user_detail?.first_name || t('unknown')}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-[var(--brand-light)]/40" />
                                <span className="text-xs text-[var(--brand-light)]/60">
                                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                </span>
                              </div>
                              {b.resource_name && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Package className="w-3 h-3 text-[var(--brand-light)]/40" />
                                  <span className="text-xs text-[var(--brand-light)]/60 truncate">
                                    {b.resource_name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold ${getStatusBadge()}`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          
          {bookings.length === 0 && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="w-6 h-6 text-[var(--brand-light)]/40" />
              </div>
              <p className="text-sm text-[var(--brand-light)]/60 font-medium mb-1">
                {selectedResource 
                  ? t('mobile.noBookingsForResource')
                  : t('mobile.noBookingsForWeek')}
              </p>
              <p className="text-xs text-[var(--brand-light)]/40">
                {selectedResource 
                  ? t('mobile.noBookingsHint')
                  : t('mobile.noBookingsHintGeneral')}
              </p>
            </div>
          )}
        </div>

        {/* Empty State Message - Desktop */}
        {bookings.length === 0 && !loading && (!selectedResource || availableSlots.length === 0) && (
          <div className="hidden lg:flex p-8 text-center border-t border-[var(--dark-600)] bg-[var(--dark-700)] items-center justify-center">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="w-6 h-6 text-[var(--brand-light)]/40" />
              </div>
              <p className="text-[var(--brand-light)]/60 font-medium mb-2">
                {selectedResource 
                  ? t('emptyState.noBookingsForResource')
                  : t('emptyState.noBookingsForWeek')}
              </p>
              <p className="text-sm text-[var(--brand-light)]/40">
                {selectedResource 
                  ? t('emptyState.hintForResource')
                  : t('emptyState.hintGeneral')}
              </p>
            </div>
          </div>
        )}
        
        {/* Info message when resource is selected and has slots but no bookings */}
        {selectedResource && availableSlots.length > 0 && bookings.length === 0 && !loading && (
          <div className="hidden lg:flex p-4 text-center border-t border-[var(--dark-600)] bg-[var(--brand-primary)]/10 items-center justify-center">
            <p className="text-sm text-[var(--brand-primary)]">
              {t('availableSlots.message', { count: availableSlots.length })}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <AdminCreateBookingModal 
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedSlot(null);
          }}
          onSuccess={() => {
            fetchBookings(); // Refresh calendar
            // Refresh slots if resource is selected
            if (selectedResource) {
              const refreshSlots = async () => {
                try {
                  const startStr = format(currentWeekStart, 'yyyy-MM-dd');
                  const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
                  const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
                  const slotsData = Array.isArray(res.data) ? res.data : [];
                  setAvailableSlots(slotsData);
                } catch (e) {
                  console.error('Error refreshing slots:', e);
                }
              };
              refreshSlots();
            }
            setPreSelectedSlot(null);
          }}
          scope={scope}
          preSelectedSlot={preSelectedSlot}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={() => {
            fetchBookings(); // Refresh bookings
            // Refresh available slots if resource is selected
            if (selectedResource) {
              const refreshSlots = async () => {
                try {
                  const startStr = format(currentWeekStart, 'yyyy-MM-dd');
                  const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
                  const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
                  const slotsData = Array.isArray(res.data) ? res.data : [];
                  setAvailableSlots(slotsData);
                } catch (e) {
                  console.error('Error refreshing slots:', e);
                }
              };
              refreshSlots();
            }
          }}
          darkMode
        />
      )}
    </div>
  );
});

BookingCalendar.displayName = 'BookingCalendar';

export default BookingCalendar;
