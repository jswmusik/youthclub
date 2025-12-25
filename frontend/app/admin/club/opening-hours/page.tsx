'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Plus, Trash2, ArrowLeft, Save, Calendar, Users, GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';
import Toast from '../../../components/Toast';

const WEEKDAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

const GENDER_RESTRICTIONS = [
  { id: 'ALL', name: 'All Genders' },
  { id: 'BOYS', name: 'Boys Only' },
  { id: 'GIRLS', name: 'Girls Only' },
  { id: 'OTHER', name: 'Other' },
];

interface OpeningHour {
  weekday: number;
  week_cycle: string;
  open_time: string;
  close_time: string;
  title: string;
  gender_restriction: string;
  restriction_mode: string;
  min_value: string;
  max_value: string;
}

const inputClasses = "w-full px-4 py-3 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all";

const selectClasses = "w-full px-4 py-3 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all appearance-none cursor-pointer";

const selectArrowStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1.25rem',
};

export default function OpeningHoursPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubId, setClubId] = useState<number | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [hourError, setHourError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const [newHour, setNewHour] = useState<OpeningHour>({
    weekday: 1,
    week_cycle: 'ALL',
    open_time: '09:00',
    close_time: '17:00',
    title: '',
    gender_restriction: 'ALL',
    restriction_mode: 'NONE',
    min_value: '',
    max_value: '',
  });

  useEffect(() => {
    if (!authLoading && user) {
      const assigned = user?.assigned_club;
      const id =
        typeof assigned === 'object' && assigned !== null
          ? (assigned as any).id
          : typeof assigned === 'number'
          ? assigned
          : null;

      if (id) {
        setClubId(id);
        fetchOpeningHours(id);
      } else {
        setIsLoading(false);
      }
    }
  }, [user, authLoading]);

  const fetchOpeningHours = async (id: number) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/clubs/${id}/`);
      const hours = res.data.regular_hours || [];
      setOpeningHours(
        hours.map((h: any) => ({
          weekday: h.weekday,
          week_cycle: h.week_cycle || 'ALL',
          open_time: h.open_time.substring(0, 5),
          close_time: h.close_time.substring(0, 5),
          title: h.title || '',
          gender_restriction: h.gender_restriction || 'ALL',
          restriction_mode: h.restriction_mode || 'NONE',
          min_value: h.min_value ? String(h.min_value) : '',
          max_value: h.max_value ? String(h.max_value) : '',
        }))
      );
    } catch (err) {
      console.error('Failed to load opening hours', err);
      setToast({ message: 'Failed to load opening hours', type: 'error', isVisible: true });
    } finally {
      setIsLoading(false);
    }
  };

  const toMins = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const checkOverlap = (hour: OpeningHour): string | null => {
    for (const h of openingHours) {
      if (h.weekday !== hour.weekday) continue;
      if (h.week_cycle !== hour.week_cycle && h.week_cycle !== 'ALL' && hour.week_cycle !== 'ALL') continue;

      const start = toMins(hour.open_time);
      const end = toMins(hour.close_time);
      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);

      if (start < e2 && end > s2) {
        return `Overlap detected with existing hour: ${h.open_time}-${h.close_time} (${h.week_cycle === 'ALL' ? 'Every Week' : h.week_cycle})`;
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) {
      setHourError(error);
      return;
    }
    setOpeningHours([...openingHours, { ...newHour }]);
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' });
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;

    setIsSaving(true);
    try {
      const data = new FormData();
      
      // Get current club data first to preserve other fields
      const clubRes = await api.get(`/clubs/${clubId}/`);
      const clubData = clubRes.data;

      // Preserve all existing club fields
      data.append('name', clubData.name);
      data.append('description', clubData.description);
      data.append('email', clubData.email);
      data.append('phone', clubData.phone);
      if (clubData.address) data.append('address', clubData.address);
      if (clubData.terms_and_conditions) data.append('terms_and_conditions', clubData.terms_and_conditions);
      if (clubData.club_policies) data.append('club_policies', clubData.club_policies);
      if (clubData.latitude) data.append('latitude', String(clubData.latitude));
      if (clubData.longitude) data.append('longitude', String(clubData.longitude));
      if (clubData.club_categories) data.append('club_categories', clubData.club_categories);
      data.append('municipality', clubData.municipality);

      // Clean up opening hours data before sending
      const cleanedHours = openingHours.map((hour) => {
        const cleaned: any = {
          weekday: hour.weekday,
          week_cycle: hour.week_cycle || 'ALL',
          open_time: hour.open_time,
          close_time: hour.close_time,
          title: hour.title || '',
          gender_restriction: hour.gender_restriction || 'ALL',
          restriction_mode: hour.restriction_mode || 'NONE',
        };

        // Only include min_value/max_value if restriction_mode is not 'NONE'
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        } else {
          cleaned.min_value = null;
          cleaned.max_value = null;
        }

        return cleaned;
      });

      data.append('regular_hours_data', JSON.stringify(cleanedHours));

      await api.patch(`/clubs/${clubId}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setToast({ message: 'Opening hours updated successfully!', type: 'success', isVisible: true });
      setTimeout(() => {
        router.push('/admin/club/details');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update opening hours.';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60 animate-pulse">Loading opening hours...</p>
        </div>
      </div>
    );
  }

  if (!clubId) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-light)]">No club assigned. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // Get today's weekday (1=Monday, 7=Sunday)
  const today = new Date();
  const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();

  return (
    <div className="space-y-0 sm:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href="/admin/club/details"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Club Details
        </Link>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[var(--brand-primary)]/30 via-[var(--dark-700)] to-[var(--brand-purple)]/20">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
        </div>
        
        {/* Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-10 sm:-mt-12">
          <div className="flex items-end gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="flex-1 space-y-1 pb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Opening Hours</h1>
              <p className="text-sm text-[var(--brand-light)]/50">Manage your club's weekly schedule and session restrictions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Hour Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[var(--brand-third)]" />
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">Add New Opening Hour</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Row 1: Day, Cycle, Times */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Day</label>
              <select
                className={selectClasses}
                style={selectArrowStyle}
                value={newHour.weekday}
                onChange={(e) => setNewHour({ ...newHour, weekday: parseInt(e.target.value) })}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Week Cycle</label>
              <select
                className={selectClasses}
                style={selectArrowStyle}
                value={newHour.week_cycle}
                onChange={(e) => setNewHour({ ...newHour, week_cycle: e.target.value })}
              >
                {CYCLES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Open Time</label>
              <input
                type="time"
                className={inputClasses}
                value={newHour.open_time}
                onChange={(e) => setNewHour({ ...newHour, open_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Close Time</label>
              <input
                type="time"
                className={inputClasses}
                value={newHour.close_time}
                onChange={(e) => setNewHour({ ...newHour, close_time: e.target.value })}
              />
            </div>
          </div>

          {/* Row 2: Restrictions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Restriction</label>
              <select
                className={selectClasses}
                style={selectArrowStyle}
                value={newHour.restriction_mode}
                onChange={(e) => setNewHour({ ...newHour, restriction_mode: e.target.value })}
              >
                <option value="NONE">No Restriction</option>
                <option value="AGE">Age Range</option>
                <option value="GRADE">Grade Range</option>
              </select>
            </div>
            {newHour.restriction_mode !== 'NONE' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Min {newHour.restriction_mode === 'AGE' ? 'Age' : 'Grade'}</label>
                  <input
                    type="number"
                    placeholder="From"
                    className={inputClasses}
                    value={newHour.min_value}
                    onChange={(e) => setNewHour({ ...newHour, min_value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Max {newHour.restriction_mode === 'AGE' ? 'Age' : 'Grade'}</label>
                  <input
                    type="number"
                    placeholder="To"
                    className={inputClasses}
                    value={newHour.max_value}
                    onChange={(e) => setNewHour({ ...newHour, max_value: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className={newHour.restriction_mode === 'NONE' ? 'col-span-2 sm:col-span-1' : ''}>
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Gender</label>
              <select
                className={selectClasses}
                style={selectArrowStyle}
                value={newHour.gender_restriction}
                onChange={(e) => setNewHour({ ...newHour, gender_restriction: e.target.value })}
              >
                {GENDER_RESTRICTIONS.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Title and Add Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-1.5">Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g., 'Teen Night', 'Open Session'"
                className={inputClasses}
                value={newHour.title}
                onChange={(e) => setNewHour({ ...newHour, title: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addHour}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-third)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-third)]/90 transition-all shadow-lg shadow-[var(--brand-third)]/20"
              >
                <Plus className="w-5 h-5" />
                Add Hour
              </button>
            </div>
          </div>

          {/* Error Message */}
          {hourError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30">
              <AlertCircle className="w-5 h-5 text-[var(--brand-red)] flex-shrink-0" />
              <p className="text-sm text-[var(--brand-red)]">{hourError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Current Opening Hours Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--brand-purple)]" />
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Current Schedule</h2>
            </div>
            <span className="text-sm text-[var(--brand-light)]/50">{openingHours.length} hour{openingHours.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {openingHours.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
              <p className="text-[var(--brand-light)]/50 mb-2">No opening hours added yet</p>
              <p className="text-sm text-[var(--brand-light)]/30">Add your first opening hour using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openingHours.map((hour, idx) => {
                const dayName = WEEKDAYS.find((d) => d.id === hour.weekday)?.name;
                const cycleName = CYCLES.find((c) => c.id === hour.week_cycle)?.name;
                const genderName = GENDER_RESTRICTIONS.find((g) => g.id === hour.gender_restriction)?.name || 'All Genders';
                const isToday = hour.weekday === todayWeekday;
                
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isToday 
                        ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/40' 
                        : 'bg-[var(--dark-700)]/50 border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`font-bold text-sm ${isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                            {dayName}
                          </span>
                          {isToday && (
                            <span className="bg-[var(--brand-primary)] text-[var(--dark-900)] text-[10px] px-2 py-0.5 rounded-full font-bold">
                              Today
                            </span>
                          )}
                          {hour.week_cycle !== 'ALL' && (
                            <span className="bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 text-[10px] px-2 py-0.5 rounded-full">
                              {cycleName}
                            </span>
                          )}
                        </div>
                        {hour.title && (
                          <p className="text-sm font-medium text-[var(--brand-light)]/80 mb-2">{hour.title}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                            isToday 
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                              : 'bg-[var(--dark-600)] text-[var(--brand-third)]'
                          }`}>
                            {hour.open_time} - {hour.close_time}
                          </div>
                          {hour.restriction_mode !== 'NONE' && (
                            <span className="inline-flex items-center gap-1 bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30 text-[10px] px-2 py-0.5 rounded-full">
                              {hour.restriction_mode === 'AGE' ? (
                                <Users className="w-3 h-3" />
                              ) : (
                                <GraduationCap className="w-3 h-3" />
                              )}
                              {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                            </span>
                          )}
                          {hour.gender_restriction !== 'ALL' && (
                            <span className="bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30 text-[10px] px-2 py-0.5 rounded-full">
                              {genderName}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHour(idx)}
                        className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 hover:bg-[var(--brand-red)]/20 flex items-center justify-center text-[var(--brand-red)] transition-all self-start sm:self-center"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/club/details')}
            className="px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--dark-400)] transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg shadow-[var(--brand-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Opening Hours'}
          </button>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode={true}
      />
    </div>
  );
}
