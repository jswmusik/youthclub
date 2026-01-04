'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clock, Plus, Trash2, Save, Calendar, Users, GraduationCap, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';
import { useToast } from '../../../../hooks/useToast';

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

export default function OpeningHoursPage() {
  const t = useTranslations('clubsAdmin.openingHours');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubId, setClubId] = useState<number | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [hourError, setHourError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { success, error, info, warning } = useToast();

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

  // Consistent form styling classes (matching YouthForm reference)
  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
  
  const inputClasses = (fieldName: string) => `
    w-full px-4 py-3 rounded-xl 
    bg-[var(--dark-700)] 
    border-2 ${focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/30 
    focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 
    transition-all
  `;
  
  const selectClasses = (fieldName: string) => `
    w-full px-4 py-3 rounded-xl 
    bg-[var(--dark-700)] 
    border-2 ${focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] 
    focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 
    transition-all appearance-none cursor-pointer
  `;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25rem',
  };

  // Translation-based constants
  const WEEKDAYS = [
    { id: 1, name: t('weekdays.monday') },
    { id: 2, name: t('weekdays.tuesday') },
    { id: 3, name: t('weekdays.wednesday') },
    { id: 4, name: t('weekdays.thursday') },
    { id: 5, name: t('weekdays.friday') },
    { id: 6, name: t('weekdays.saturday') },
    { id: 7, name: t('weekdays.sunday') },
  ];

  const CYCLES = [
    { id: 'ALL', name: t('cycles.all') },
    { id: 'ODD', name: t('cycles.odd') },
    { id: 'EVEN', name: t('cycles.even') },
  ];

  const GENDER_RESTRICTIONS = [
    { id: 'ALL', name: t('genderRestrictions.all') },
    { id: 'BOYS', name: t('genderRestrictions.boys') },
    { id: 'GIRLS', name: t('genderRestrictions.girls') },
    { id: 'OTHER', name: t('genderRestrictions.other') },
  ];

  const RESTRICTION_MODES = [
    { id: 'NONE', name: t('restrictionModes.none') },
    { id: 'AGE', name: t('restrictionModes.age') },
    { id: 'GRADE', name: t('restrictionModes.grade') },
  ];

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
      error(t('toast.loadFailed'));
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
        const cycleName = CYCLES.find(c => c.id === h.week_cycle)?.name || t('cycles.all');
        return t('overlapError', { openTime: h.open_time, closeTime: h.close_time, cycle: cycleName });
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
      success(t('toast.updateSuccess'));
      setTimeout(() => {
        router.push('/admin/club/details');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || t('toast.updateFailed');
      error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate completion percentage based on having at least one opening hour
  const completionPercent = openingHours.length > 0 ? 100 : 0;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Clock className="w-8 h-8 text-[var(--dark-900)]" />
          </div>
          <p className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!clubId) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-red)]/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-light)]">{t('noClubAssigned')}</p>
        </div>
      </div>
    );
  }

  // Get today's weekday (1=Monday, 7=Sunday)
  const today = new Date();
  const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Back Button */}
        <div className="px-4 sm:px-0 mb-6">
          <Link 
            href="/admin/club/details"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDetails')}
          </Link>
        </div>

        {/* Header Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--brand-light)]">{t('title')}</h1>
                <p className="text-sm text-[var(--brand-light)]/50">{t('description')}</p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">{t('currentSchedule.hoursPlural', { count: openingHours.length })}</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('currentSchedule.noHoursDescription').replace('Add your first opening hour using the form above', 'Schedule configured')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Add New Hour Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-third)] flex items-center justify-center">
                <Plus className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('addNewHour.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Row 1: Day, Cycle, Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t('addNewHour.day')} <span className="text-[var(--brand-primary)]">*</span></label>
                <select
                  className={selectClasses('weekday')}
                  style={selectArrowStyle}
                  value={newHour.weekday}
                  onChange={(e) => setNewHour({ ...newHour, weekday: parseInt(e.target.value) })}
                  onFocus={() => setFocusedField('weekday')}
                  onBlur={() => setFocusedField(null)}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('addNewHour.weekCycle')}</label>
                <select
                  className={selectClasses('week_cycle')}
                  style={selectArrowStyle}
                  value={newHour.week_cycle}
                  onChange={(e) => setNewHour({ ...newHour, week_cycle: e.target.value })}
                  onFocus={() => setFocusedField('week_cycle')}
                  onBlur={() => setFocusedField(null)}
                >
                  {CYCLES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t('addNewHour.openTime')} <span className="text-[var(--brand-primary)]">*</span></label>
                <input
                  type="time"
                  className={inputClasses('open_time')}
                  value={newHour.open_time}
                  onChange={(e) => setNewHour({ ...newHour, open_time: e.target.value })}
                  onFocus={() => setFocusedField('open_time')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label className={labelClasses}>{t('addNewHour.closeTime')} <span className="text-[var(--brand-primary)]">*</span></label>
                <input
                  type="time"
                  className={inputClasses('close_time')}
                  value={newHour.close_time}
                  onChange={(e) => setNewHour({ ...newHour, close_time: e.target.value })}
                  onFocus={() => setFocusedField('close_time')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--dark-600)]" />

            {/* Row 2: Restrictions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t('addNewHour.restriction')}</label>
                <select
                  className={selectClasses('restriction_mode')}
                  style={selectArrowStyle}
                  value={newHour.restriction_mode}
                  onChange={(e) => setNewHour({ ...newHour, restriction_mode: e.target.value })}
                  onFocus={() => setFocusedField('restriction_mode')}
                  onBlur={() => setFocusedField(null)}
                >
                  {RESTRICTION_MODES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('addNewHour.gender')}</label>
                <select
                  className={selectClasses('gender_restriction')}
                  style={selectArrowStyle}
                  value={newHour.gender_restriction}
                  onChange={(e) => setNewHour({ ...newHour, gender_restriction: e.target.value })}
                  onFocus={() => setFocusedField('gender_restriction')}
                  onBlur={() => setFocusedField(null)}
                >
                  {GENDER_RESTRICTIONS.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {newHour.restriction_mode !== 'NONE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>
                    {newHour.restriction_mode === 'AGE' ? t('addNewHour.minAge') : t('addNewHour.minGrade')}
                  </label>
                  <input
                    type="number"
                    placeholder={t('addNewHour.from')}
                    className={inputClasses('min_value')}
                    value={newHour.min_value}
                    onChange={(e) => setNewHour({ ...newHour, min_value: e.target.value })}
                    onFocus={() => setFocusedField('min_value')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                <div>
                  <label className={labelClasses}>
                    {newHour.restriction_mode === 'AGE' ? t('addNewHour.maxAge') : t('addNewHour.maxGrade')}
                  </label>
                  <input
                    type="number"
                    placeholder={t('addNewHour.to')}
                    className={inputClasses('max_value')}
                    value={newHour.max_value}
                    onChange={(e) => setNewHour({ ...newHour, max_value: e.target.value })}
                    onFocus={() => setFocusedField('max_value')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[var(--dark-600)]" />

            {/* Row 3: Title */}
            <div>
              <label className={labelClasses}>{t('addNewHour.titleLabel')}</label>
              <input
                type="text"
                placeholder={t('addNewHour.titlePlaceholder')}
                className={inputClasses('title')}
                value={newHour.title}
                onChange={(e) => setNewHour({ ...newHour, title: e.target.value })}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            {/* Add Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addHour}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-green)]/10 border border-[var(--brand-green)] text-[var(--brand-green)] font-semibold hover:bg-[var(--brand-green)]/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                {t('addNewHour.addHour')}
              </button>
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
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('currentSchedule.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">
                  {openingHours.length === 1 ? t('currentSchedule.hours', { count: openingHours.length }) : t('currentSchedule.hoursPlural', { count: openingHours.length })}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {openingHours.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[var(--brand-light)]/30" />
                </div>
                <p className="text-[var(--brand-light)]/50 mb-2">{t('currentSchedule.noHours')}</p>
                <p className="text-sm text-[var(--brand-light)]/30">{t('currentSchedule.noHoursDescription')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openingHours.map((hour, idx) => {
                  const dayName = WEEKDAYS.find((d) => d.id === hour.weekday)?.name;
                  const cycleName = CYCLES.find((c) => c.id === hour.week_cycle)?.name;
                  const genderName = GENDER_RESTRICTIONS.find((g) => g.id === hour.gender_restriction)?.name || t('genderRestrictions.all');
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
                                {t('currentSchedule.today')}
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
                                {hour.restriction_mode === 'AGE' ? t('restrictionLabels.age') : t('restrictionLabels.grade')} {hour.min_value}-{hour.max_value}
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
                          title={t('currentSchedule.remove')}
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

        {/* Action Buttons Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/club/details')}
              className="px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--dark-400)] transition-all font-medium"
            >
              {t('buttons.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg shadow-[var(--brand-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSaving ? t('buttons.saving') : t('buttons.saveOpeningHours')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
