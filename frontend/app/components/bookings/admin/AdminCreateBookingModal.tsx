'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import api from '../../../../lib/api';
import { X, Search, User, Calendar, Clock, Loader2, Plus, CalendarDays, Users, Check, AlertTriangle, RefreshCw, UserPlus, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useToast } from '../../../../hooks/useToast';
import { getMediaUrl, getInitials } from '../../../utils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedTime?: Date; // Optional: If clicked from calendar
  preSelectedSlot?: { slot: any; resource: any; date: Date } | null; // Pre-selected slot from calendar
  scope?: string;
}

export default function AdminCreateBookingModal({ onClose, onSuccess, preSelectedTime, preSelectedSlot, scope }: Props) {
  const t = useTranslations('bookingsAdmin.createBookingModal');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : undefined;
  
  // Start at step 2 if slot is pre-selected (skip resource/date/slot selection)
  const [step, setStep] = useState(preSelectedSlot ? 2 : 1);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [resources, setResources] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Selection State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [date, setDate] = useState(
    preSelectedSlot 
      ? format(preSelectedSlot.date, 'yyyy-MM-dd')
      : (preSelectedTime ? format(preSelectedTime, 'yyyy-MM-dd') : '')
  );
  const [selectedSlot, setSelectedSlot] = useState<any>(preSelectedSlot?.slot || null);
  
  // Recurring booking state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'FOREVER' | 'WEEKS'>('WEEKS');
  const [recurringWeeks, setRecurringWeeks] = useState<number>(4);
  
  // Extra participants state
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantName, setParticipantName] = useState('');
  
  // Available Slots State
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Search State
  const [userSearch, setUserSearch] = useState('');
  
  // Get max participants from selected resource (default to 1 if not set)
  const maxParticipants = selectedResource?.max_participants || 1;
  // The main booker counts as 1, so extra participants allowed = max - 1
  const maxExtraParticipants = Math.max(0, maxParticipants - 1);
  
  const addParticipant = () => {
    if (!participantName.trim()) return;
    if (participants.length >= maxExtraParticipants) {
      error(t('toast.maxParticipantsReached'));
      return;
    }
    setParticipants([...participants, participantName.trim()]);
    setParticipantName('');
  };
  
  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };
  
  // Toast State
  const { success, error, info, warning } = useToast();

  // 1. Fetch Resources and set pre-selected resource if provided
  useEffect(() => {
    api.get('/bookings/resources/?page_size=100').then(res => {
      const resourcesData = Array.isArray(res.data) ? res.data : res.data.results || [];
      setResources(resourcesData);
      
      // If pre-selected slot is provided, set the resource
      if (preSelectedSlot?.resource) {
        setSelectedResource(preSelectedSlot.resource);
      }
    });
  }, [preSelectedSlot]);

  // 2. Fetch Available Slots when resource and date are selected (but preserve pre-selected slot)
  useEffect(() => {
    if (selectedResource && date) {
      // Don't fetch if we already have a pre-selected slot (to avoid clearing it)
      if (!preSelectedSlot) {
        fetchAvailableSlots();
      } else {
        // If we have a pre-selected slot, just set it in availableSlots for display
        setAvailableSlots([preSelectedSlot.slot]);
      }
    } else {
      setAvailableSlots([]);
      if (!preSelectedSlot) {
        setSelectedSlot(null);
      }
    }
  }, [selectedResource, date, preSelectedSlot]);

  const fetchAvailableSlots = async () => {
    if (!selectedResource || !date) return;
    setLoadingSlots(true);
    try {
      const res = await api.get(`/bookings/resources/${selectedResource.id}/availability/?start_date=${date}&end_date=${date}`);
      setAvailableSlots(Array.isArray(res.data) ? res.data : []);
      setSelectedSlot(null); // Reset selection when slots change
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 3. Search Users
  const handleUserSearch = async (term: string) => {
    setUserSearch(term);
    if (term.length < 2) {
      setUsers([]); // Clear users list when search term is too short
      return;
    }
    
    try {
      // Assuming you have a user search endpoint or filter
      const res = await api.get(`/users/?search=${term}&role=YOUTH_MEMBER`);
      setUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedResource || !selectedSlot) return;
    
    // Validate recurring fields
    if (isRecurring && recurringType === 'WEEKS' && (!recurringWeeks || recurringWeeks < 1)) {
      error(t('toast.specifyWeeks'));
      return;
    }
    
    setLoading(true);
    try {
        const payload: any = {
            resource: selectedResource.id,
            target_user_id: selectedUser.id, // Using our new backend field
            start_time: selectedSlot.start,
            end_time: selectedSlot.end,
            participants: participants // Include extra participants if any
        };
        
        // Add recurring fields if enabled
        if (isRecurring) {
          payload.is_recurring = true;
          payload.recurring_type = recurringType;
          if (recurringType === 'WEEKS') {
            payload.recurring_weeks = recurringWeeks;
          }
        }
        
        const response = await api.post('/bookings/bookings/', payload);
        
        // Success - booking was created
        console.log('Booking created successfully:', response.data);
        const recurringMessage = isRecurring 
          ? (recurringType === 'FOREVER' ? t('toast.recurringForever') : t('toast.recurringWeeks', { weeks: recurringWeeks }))
          : '';
        success(t('toast.success') + (recurringMessage ? ' ' + recurringMessage : ''));
        // Wait a moment to show toast, then close and refresh
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
    } catch (err: any) {
        console.error('Error creating booking:', err);
        
        // Extract error message from response
        let errorMessage = t('toast.failedToCreate');
        
        if (err.response?.data) {
            // Handle DRF validation errors
            if (err.response.data.non_field_errors) {
                errorMessage = Array.isArray(err.response.data.non_field_errors) 
                    ? err.response.data.non_field_errors[0]
                    : err.response.data.non_field_errors;
            } else if (err.response.data.detail) {
                errorMessage = err.response.data.detail;
            } else if (typeof err.response.data === 'string') {
                errorMessage = err.response.data;
            } else if (err.response.data.error) {
                errorMessage = err.response.data.error;
            } else {
                // Try to extract first error message from any field
                const firstError = Object.values(err.response.data)[0];
                if (Array.isArray(firstError) && firstError.length > 0) {
                    errorMessage = firstError[0];
                } else if (typeof firstError === 'string') {
                    errorMessage = firstError;
                }
            }
        } else if (err.message) {
            errorMessage = err.message;
        }
        
        // Check if it's a weekly limit error and translate it
        if (errorMessage.toLowerCase().includes('weekly booking limit') || 
            errorMessage.toLowerCase().includes('weekly limit') ||
            errorMessage.toLowerCase().includes('reached the weekly')) {
            // Extract the numbers from the error message if possible
            const maxMatch = errorMessage.match(/Maximum (\d+)/i);
            const currentMatch = errorMessage.match(/currently have (\d+)/i);
            const maxBookings = maxMatch ? maxMatch[1] : '?';
            const currentBookings = currentMatch ? currentMatch[1] : '?';
            
            errorMessage = t('toast.weeklyLimitReached', { max: maxBookings, current: currentBookings });
        }
        
        error(errorMessage);
        setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-[var(--dark-800)] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border-t sm:border border-[var(--dark-600)]"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 relative">
          {/* Mobile Close Bar */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-[var(--dark-500)] rounded-full sm:hidden" />
          
          <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--dark-900)]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--brand-light)]">{t('title')}</h2>
              <p className="text-xs sm:text-sm text-[var(--brand-light)]/50">{t('description')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)] hover:text-white hover:bg-[var(--dark-500)] transition-colors flex items-center justify-center disabled:opacity-50 mt-2 sm:mt-0 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Step 1: Select User */}
          <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-visible relative z-20">
            <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)] rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--brand-purple)]" />
                </div>
                <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.selectYouthMember')}</span>
              </div>
            </div>
            <div className="p-4">
              {selectedUser ? (
                <div className="bg-[var(--dark-600)] rounded-xl border border-[var(--brand-primary)]/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[var(--brand-primary)]/30">
                        {selectedUser.avatar ? (
                          <img src={getMediaUrl(selectedUser.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-[var(--brand-primary)]">
                            {getInitials(selectedUser.first_name, selectedUser.last_name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[var(--brand-light)] truncate">
                          {selectedUser.first_name} {selectedUser.last_name}
                        </div>
                        <div className="text-xs text-[var(--brand-light)]/50 truncate">{selectedUser.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)} 
                      className="px-3 py-1.5 text-xs font-medium text-[var(--brand-red)] hover:text-white hover:bg-[var(--brand-red)] rounded-lg transition-colors"
                    >
                      {t('change')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--brand-light)]/40 z-0" />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    className="w-full h-10 pl-10 pr-4 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors relative z-0"
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                  />
                  {users.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--dark-600)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                      {users.map(u => (
                        <button 
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(''); }}
                          className="w-full text-left p-4 hover:bg-[var(--dark-500)] text-sm border-b border-[var(--dark-500)] last:border-0 transition-colors flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--dark-700)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[var(--dark-500)]">
                            {u.avatar ? (
                              <img src={getMediaUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-[var(--brand-primary)]">
                                {getInitials(u.first_name, u.last_name)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[var(--brand-light)]">{u.first_name} {u.last_name}</div>
                            <div className="text-xs text-[var(--brand-light)]/50">{u.email}</div>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Resource (only show if not pre-selected) */}
          {!preSelectedSlot && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden relative z-10">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.selectResource')}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="relative">
                  <select 
                    className="w-full h-10 px-4 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none pr-10"
                    value={selectedResource?.id || ''}
                    onChange={e => {
                      const resource = resources.find(r => r.id === parseInt(e.target.value));
                      setSelectedResource(resource);
                      setDate(''); // Reset date when resource changes
                      setSelectedSlot(null);
                    }}
                  >
                    <option value="">{t('chooseResource')}</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.club_name})</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[var(--brand-light)]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2b: Show Resource Info if pre-selected */}
          {preSelectedSlot && selectedResource && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden relative z-10">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.resource')}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-[var(--dark-600)] rounded-xl border border-[var(--brand-primary)]/30 p-4">
                  <div className="font-semibold text-[var(--brand-primary)]">{selectedResource.name}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 mt-0.5">{selectedResource.club_name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Date (only show if not pre-selected) */}
          {!preSelectedSlot && selectedResource && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden relative z-10">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.selectDate')}</span>
                </div>
              </div>
              <div className="p-4">
                <input 
                  type="date" 
                  className="w-full h-10 px-4 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                  value={date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={selectedResource?.booking_window_weeks 
                    ? format(addDays(new Date(), selectedResource.booking_window_weeks * 7), 'yyyy-MM-dd') 
                    : undefined
                  }
                  onChange={e => {
                    setDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                />
                {selectedResource?.booking_window_weeks && (
                  <p className="text-xs text-[var(--brand-light)]/50 mt-2">
                    {t('maxBookingWindow', { weeks: selectedResource.booking_window_weeks })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3b: Show Date Info if pre-selected */}
          {preSelectedSlot && date && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden relative z-10">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.date')}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-[var(--dark-600)] rounded-xl border border-[var(--brand-primary)]/30 p-4">
                  <div className="font-semibold text-[var(--brand-light)]">{format(new Date(date), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Time Slot */}
          {preSelectedSlot && selectedSlot ? (
            // Show locked pre-selected slot - cannot be changed
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[var(--brand-green)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.timeSlot')}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-[var(--dark-600)] rounded-xl border-2 border-[var(--brand-primary)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-[var(--dark-900)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--brand-light)] text-base">
                          {format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}
                        </div>
                        <div className="text-xs text-[var(--brand-primary)] mt-0.5">{t('preSelectedFromCalendar')}</div>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-primary)] text-[var(--dark-900)]">
                      {t('locked')}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--dark-500)]">
                    <p className="text-xs text-[var(--brand-light)]/60">
                      {t('selectDifferentSlot')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !preSelectedSlot && selectedResource && date && (
            // Show slot picker only if not pre-selected
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[var(--brand-green)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.selectTimeSlot')}</span>
                </div>
              </div>
              <div className="p-4">
                {loadingSlots ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--brand-primary)]" />
                    <p className="text-xs text-[var(--brand-light)]/50">{t('loadingSlots')}</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="bg-[var(--brand-peach)]/10 rounded-xl border border-[var(--brand-peach)]/30 p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-[var(--brand-peach)] mx-auto mb-2" />
                    <p className="text-xs text-[var(--brand-peach)] font-medium">{t('noSlotsAvailable')}</p>
                    <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">{t('noSlotsHint')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 border-2 border-[var(--dark-500)] rounded-xl bg-[var(--dark-600)]">
                    {availableSlots.map((slot, idx) => {
                      const slotStart = new Date(slot.start);
                      const slotEnd = new Date(slot.end);
                      const isSelected = selectedSlot?.start === slot.start;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          className={`h-auto py-3 px-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)] border-[var(--dark-500)] hover:border-[var(--brand-primary)] hover:bg-[var(--dark-600)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Clock className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[var(--brand-light)]/40'}`} />
                            <span className="text-xs font-semibold">
                              {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Extra Participants (Optional) */}
          {selectedSlot && maxExtraParticipants > 0 && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)] flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.extraParticipants')}</span>
                      <span className="text-xs text-[var(--brand-light)]/50 ml-2">({t('optional')})</span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--brand-light)]/50">
                    {participants.length}/{maxExtraParticipants}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--brand-light)]/60">
                  {t('extraParticipantsHint', { max: maxExtraParticipants })}
                </p>
                
                {/* Add participant input */}
                {participants.length < maxExtraParticipants && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('participantNamePlaceholder')}
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addParticipant();
                        }
                      }}
                      className="flex-1 h-10 px-4 bg-[var(--dark-600)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={addParticipant}
                      disabled={!participantName.trim()}
                      className="h-10 px-4 bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-xl font-medium text-sm hover:bg-[var(--brand-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {t('addParticipant')}
                    </button>
                  </div>
                )}
                
                {/* List of added participants */}
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {participants.map((name, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--dark-600)] border border-[var(--dark-500)] rounded-full"
                      >
                        <span className="text-sm text-[var(--brand-light)]">{name}</span>
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="w-5 h-5 rounded-full bg-[var(--brand-red)]/20 hover:bg-[var(--brand-red)] text-[var(--brand-red)] hover:text-white flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {participants.length >= maxExtraParticipants && (
                  <div className="bg-[var(--brand-peach)]/10 rounded-xl border border-[var(--brand-peach)]/30 p-3">
                    <p className="text-xs text-[var(--brand-peach)] font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {t('maxParticipantsReachedHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Recurring Booking Options */}
          {selectedSlot && (
            <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--dark-600)] border-b border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-[var(--brand-purple)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">{t('steps.recurringOptions')}</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isRecurring 
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' 
                      : 'bg-[var(--dark-600)] border-[var(--dark-500)]'
                  }`}>
                    {isRecurring && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      setIsRecurring(e.target.checked);
                      if (!e.target.checked) {
                        setRecurringType('WEEKS');
                        setRecurringWeeks(4);
                      }
                    }}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-[var(--brand-light)]">{t('makeRecurring')}</span>
                </label>
                
                {isRecurring && (
                  <div className="bg-[var(--dark-600)] rounded-xl border border-[var(--dark-500)] p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider">{t('recurrenceType')}</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            recurringType === 'WEEKS' 
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' 
                              : 'border-[var(--dark-400)] bg-transparent'
                          }`}>
                            {recurringType === 'WEEKS' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="recurringType"
                            value="WEEKS"
                            checked={recurringType === 'WEEKS'}
                            onChange={(e) => setRecurringType(e.target.value as 'WEEKS')}
                            className="sr-only"
                          />
                          <span className="text-xs text-[var(--brand-light)]">{t('forSpecificWeeks')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            recurringType === 'FOREVER' 
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' 
                              : 'border-[var(--dark-400)] bg-transparent'
                          }`}>
                            {recurringType === 'FOREVER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="recurringType"
                            value="FOREVER"
                            checked={recurringType === 'FOREVER'}
                            onChange={(e) => setRecurringType(e.target.value as 'FOREVER')}
                            className="sr-only"
                          />
                          <span className="text-xs text-[var(--brand-light)]">{t('forever')}</span>
                        </label>
                      </div>
                    </div>
                    
                    {recurringType === 'WEEKS' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-[var(--brand-light)]/40 uppercase tracking-wider">{t('numberOfWeeks')}</label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={recurringWeeks}
                          onChange={(e) => setRecurringWeeks(parseInt(e.target.value) || 1)}
                          className="w-full h-10 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                          placeholder={t('weeksPlaceholder')}
                        />
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('recurringWeeksHint')}
                        </p>
                      </div>
                    )}
                    
                    {recurringType === 'FOREVER' && (
                      <div className="bg-[var(--brand-peach)]/10 rounded-xl border border-[var(--brand-peach)]/30 p-3">
                        <p className="text-xs text-[var(--brand-peach)] font-medium flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {t('recurringForeverHint')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex flex-col sm:flex-row justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] bg-[var(--dark-600)] hover:bg-[var(--dark-500)] rounded-xl transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || !selectedUser || !selectedResource || !selectedSlot}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-[var(--dark-900)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 rounded-xl transition-colors shadow-lg shadow-[var(--brand-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('creating')}</span>
              </>
            ) : (
              t('createBooking')
            )}
          </button>
        </div>
      </div>
      
      {/* Toast Notification */}
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
