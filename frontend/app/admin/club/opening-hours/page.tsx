'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="p-10 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading opening hours...</p>
      </div>
    );
  }

  if (!clubId) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">No club assigned. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/70 font-semibold">Club Admin</p>
            <h1 className="text-3xl font-bold mt-1">Manage Opening Hours</h1>
            <p className="text-white/80 mt-2 max-w-2xl">
              Set your club's weekly schedule, including time restrictions and age/grade limits for specific sessions.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Builder */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Add New Opening Hour</h3>
            
            <div className="flex flex-wrap gap-3">
              <select
                className="border border-slate-300 p-2 rounded-lg text-sm w-36 bg-white"
                value={newHour.weekday}
                onChange={(e) => setNewHour({ ...newHour, weekday: parseInt(e.target.value) })}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              
              <select
                className="border border-slate-300 p-2 rounded-lg text-sm w-36 bg-white"
                value={newHour.week_cycle}
                onChange={(e) => setNewHour({ ...newHour, week_cycle: e.target.value })}
              >
                {CYCLES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              
              <input
                type="time"
                className="border border-slate-300 p-2 rounded-lg text-sm bg-white"
                value={newHour.open_time}
                onChange={(e) => setNewHour({ ...newHour, open_time: e.target.value })}
              />
              <span className="self-center text-slate-600 font-medium">-</span>
              <input
                type="time"
                className="border border-slate-300 p-2 rounded-lg text-sm bg-white"
                value={newHour.close_time}
                onChange={(e) => setNewHour({ ...newHour, close_time: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <select
                className="border border-slate-300 p-2 rounded-lg text-sm w-40 bg-white"
                value={newHour.restriction_mode}
                onChange={(e) => setNewHour({ ...newHour, restriction_mode: e.target.value })}
              >
                <option value="NONE">No Restriction</option>
                <option value="AGE">Age Range</option>
                <option value="GRADE">Grade Range</option>
              </select>
              
              {newHour.restriction_mode !== 'NONE' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="From"
                    className="border border-slate-300 p-2 rounded-lg text-sm w-20 bg-white"
                    value={newHour.min_value}
                    onChange={(e) => setNewHour({ ...newHour, min_value: e.target.value })}
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    placeholder="To"
                    className="border border-slate-300 p-2 rounded-lg text-sm w-20 bg-white"
                    value={newHour.max_value}
                    onChange={(e) => setNewHour({ ...newHour, max_value: e.target.value })}
                  />
                  <span className="text-xs text-slate-500 font-bold uppercase ml-1">
                    {newHour.restriction_mode}
                  </span>
                </div>
              )}
              
              <select
                className="border border-slate-300 p-2 rounded-lg text-sm w-40 bg-white"
                value={newHour.gender_restriction}
                onChange={(e) => setNewHour({ ...newHour, gender_restriction: e.target.value })}
              >
                {GENDER_RESTRICTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="Title (Optional, e.g., 'Teen Night')"
                className="border border-slate-300 p-2 rounded-lg text-sm flex-1 bg-white"
                value={newHour.title}
                onChange={(e) => setNewHour({ ...newHour, title: e.target.value })}
              />
              
              <button
                type="button"
                onClick={addHour}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
              >
                + Add Hour
              </button>
            </div>
            
            {hourError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm font-medium">{hourError}</p>
              </div>
            )}
          </div>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Current Opening Hours</h3>
            {openingHours.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <p className="text-slate-500 italic">No opening hours added yet. Add your first opening hour above.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {openingHours.map((hour, idx) => {
                  const dayName = WEEKDAYS.find((d) => d.id === hour.weekday)?.name;
                  const cycleName = CYCLES.find((c) => c.id === hour.week_cycle)?.name;
                  const genderName = GENDER_RESTRICTIONS.find((g) => g.id === hour.gender_restriction)?.name || 'All Genders';
                  
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900 w-28">{dayName}</span>
                        <span className="text-xs text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded w-24 text-center">
                          {cycleName}
                        </span>
                        <span className="text-slate-700 font-medium">
                          {hour.open_time} - {hour.close_time}
                        </span>
                        {hour.title && (
                          <span className="text-slate-600 italic text-sm">"{hour.title}"</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        {hour.restriction_mode !== 'NONE' && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                            {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                          </span>
                        )}
                        {hour.gender_restriction !== 'ALL' && (
                          <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs font-bold">
                            {genderName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeHour(idx)}
                          className="text-red-600 hover:text-red-800 font-bold text-xl px-2 hover:bg-red-50 rounded transition"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => router.push('/admin/club/details')}
              className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Opening Hours'}
            </button>
          </div>
        </form>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

