'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Pencil, Trash2, X, Plus, Save, Clock, Calendar, AlertCircle } from 'lucide-react';
import Toast from '../Toast';

interface ScheduleSlot {
  id?: number;
  weekday: number;
  start_time: string;
  end_time: string;
  week_cycle: 'ALL' | 'ODD' | 'EVEN';
}

interface Props {
  resourceId: number;
}

const WEEKDAYS = [
  { val: 1, label: 'Monday', short: 'Mon' },
  { val: 2, label: 'Tuesday', short: 'Tue' },
  { val: 3, label: 'Wednesday', short: 'Wed' },
  { val: 4, label: 'Thursday', short: 'Thu' },
  { val: 5, label: 'Friday', short: 'Fri' },
  { val: 6, label: 'Saturday', short: 'Sat' },
  { val: 7, label: 'Sunday', short: 'Sun' },
];

export default function ScheduleEditor({ resourceId }: Props) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [editingId, setEditingId] = useState<number | null>(null);

  // Toast State
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formSlot, setFormSlot] = useState<ScheduleSlot>({
    weekday: 1,
    start_time: '10:00',
    end_time: '12:00',
    week_cycle: 'ALL'
  });

  useEffect(() => {
    fetchSchedule();
  }, [resourceId]);

  const fetchSchedule = async () => {
    try {
      const res = await api.get(`/bookings/schedules/?resource=${resourceId}`);
      setSlots(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check for overlapping slots
  const checkOverlap = (newSlot: ScheduleSlot, excludeId?: number): boolean => {
    const newStart = newSlot.start_time;
    const newEnd = newSlot.end_time;
    
    // Check if start time is before end time
    if (newStart >= newEnd) {
      return true; // Invalid time range
    }
    
    return slots.some(existingSlot => {
      // Skip the slot being edited
      if (excludeId && existingSlot.id === excludeId) {
        return false;
      }
      
      // Only check slots on the same weekday
      if (existingSlot.weekday !== newSlot.weekday) {
        return false;
      }
      
      // Check if week cycles overlap
      const cyclesOverlap = 
        existingSlot.week_cycle === 'ALL' || 
        newSlot.week_cycle === 'ALL' ||
        existingSlot.week_cycle === newSlot.week_cycle;
      
      if (!cyclesOverlap) {
        return false;
      }
      
      // Check time overlap
      const existingStart = existingSlot.start_time;
      const existingEnd = existingSlot.end_time;
      
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const newStartMin = timeToMinutes(newStart);
      const newEndMin = timeToMinutes(newEnd);
      const existingStartMin = timeToMinutes(existingStart);
      const existingEndMin = timeToMinutes(existingEnd);
      
      return newStartMin < existingEndMin && newEndMin > existingStartMin;
    });
  };

  const handleSaveSlot = async () => {
    // Validate time range
    if (formSlot.start_time >= formSlot.end_time) {
      setToast({ message: 'End time must be after start time.', type: 'error', isVisible: true });
      return;
    }
    
    // Check for overlaps
    const hasOverlap = checkOverlap(formSlot, editingId || undefined);
    if (hasOverlap) {
      const overlappingSlot = slots.find(existingSlot => {
        if (editingId && existingSlot.id === editingId) return false;
        if (existingSlot.weekday !== formSlot.weekday) return false;
        
        const cyclesOverlap = 
          existingSlot.week_cycle === 'ALL' || 
          formSlot.week_cycle === 'ALL' ||
          existingSlot.week_cycle === formSlot.week_cycle;
        
        if (!cyclesOverlap) return false;
        
        const existingStart = existingSlot.start_time;
        const existingEnd = existingSlot.end_time;
        return formSlot.start_time < existingEnd && formSlot.end_time > existingStart;
      });
      
      const weekCycleLabel = overlappingSlot?.week_cycle === 'ALL' 
        ? 'Every Week' 
        : overlappingSlot?.week_cycle === 'ODD' 
          ? 'Odd Weeks' 
          : 'Even Weeks';
      
      const message = overlappingSlot
        ? `This time slot overlaps with an existing slot: ${overlappingSlot.start_time.slice(0, 5)} - ${overlappingSlot.end_time.slice(0, 5)} (${weekCycleLabel}).`
        : 'This time slot overlaps with an existing slot on the same day.';
      
      setToast({ message, type: 'error', isVisible: true });
      return;
    }
    
    try {
      if (editingId) {
        const res = await api.patch(`/bookings/schedules/${editingId}/`, {
            ...formSlot,
            resource: resourceId
        });
        
        setSlots(slots.map(s => s.id === editingId ? res.data : s));
        setEditingId(null);
        setToast({ message: 'Schedule slot updated successfully!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/bookings/schedules/', {
          ...formSlot,
          resource: resourceId
        });
        setSlots([...slots, res.data]);
        setToast({ message: 'Schedule slot added successfully!', type: 'success', isVisible: true });
      }
      
      // Reset Form
      setFormSlot({
        weekday: 1,
        start_time: '10:00',
        end_time: '12:00',
        week_cycle: 'ALL'
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.non_field_errors?.[0] || 
                          err.response?.data?.detail || 
                          err.response?.data?.end_time?.[0] ||
                          'Failed to save slot.';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
    }
  };

  const handleEditClick = (slot: ScheduleSlot) => {
    setEditingId(slot.id!);
    setFormSlot({ ...slot });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormSlot({
        weekday: 1,
        start_time: '10:00',
        end_time: '12:00',
        week_cycle: 'ALL'
    });
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm("Are you sure you want to remove this time slot?")) return;
    try {
      await api.delete(`/bookings/schedules/${id}/`);
      setSlots(slots.filter(s => s.id !== id));
      
      if (editingId === id) {
        handleCancelEdit();
      }
      setToast({ message: 'Schedule slot deleted successfully!', type: 'success', isVisible: true });
    } catch (err) {
      setToast({ message: 'Failed to delete slot.', type: 'error', isVisible: true });
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/50">Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Editor Form Card */}
        <div className={`bg-[var(--dark-800)] rounded-2xl border-2 transition-all ${
          editingId 
            ? 'border-[var(--brand-yellow)]/50 shadow-lg shadow-[var(--brand-yellow)]/10' 
            : 'border-[var(--dark-600)]'
        }`}>
          {/* Form Header */}
          <div className={`px-5 py-4 border-b ${editingId ? 'border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/5' : 'border-[var(--dark-600)]'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                editingId 
                  ? 'bg-[var(--brand-yellow)]/20' 
                  : 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]'
              }`}>
                {editingId ? (
                  <Pencil className="h-5 w-5 text-[var(--brand-yellow)]" />
                ) : (
                  <Plus className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--brand-light)]">
                  {editingId ? 'Edit Time Slot' : 'Add Time Slot'}
                </h3>
                <p className="text-sm text-[var(--brand-light)]/50">
                  {editingId ? 'Update the selected time slot' : 'Define when this resource is available'}
                </p>
              </div>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="ml-auto p-2 rounded-xl text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Day Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--brand-light)]/70">Day</label>
                <select 
                  className="w-full h-11 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all appearance-none cursor-pointer"
                  value={formSlot.weekday}
                  onChange={e => setFormSlot({...formSlot, weekday: parseInt(e.target.value)})}
                >
                  {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                </select>
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--brand-light)]/70">Start Time</label>
                <input 
                  type="time" 
                  className="w-full h-11 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all"
                  value={formSlot.start_time}
                  onChange={e => setFormSlot({...formSlot, start_time: e.target.value})}
                />
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--brand-light)]/70">End Time</label>
                <input 
                  type="time" 
                  className="w-full h-11 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all"
                  value={formSlot.end_time}
                  onChange={e => setFormSlot({...formSlot, end_time: e.target.value})}
                />
              </div>

              {/* Week Cycle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--brand-light)]/70">Week Cycle</label>
                <select 
                  className="w-full h-11 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all appearance-none cursor-pointer"
                  value={formSlot.week_cycle}
                  onChange={e => setFormSlot({...formSlot, week_cycle: e.target.value as any})}
                >
                  <option value="ALL">Every Week</option>
                  <option value="ODD">Odd Weeks</option>
                  <option value="EVEN">Even Weeks</option>
                </select>
              </div>
              
              {/* Submit Button */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium text-transparent hidden lg:block">Action</label>
                <button 
                  onClick={handleSaveSlot}
                  className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    editingId 
                      ? 'bg-[var(--brand-yellow)] hover:bg-[var(--brand-yellow)]/90 text-[var(--dark-900)]' 
                      : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]'
                  }`}
                >
                  {editingId ? (
                    <>
                      <Save className="w-4 h-4" />
                      Update
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Slot
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--dark-600)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--brand-light)]">Weekly Schedule</h3>
                <p className="text-sm text-[var(--brand-light)]/50">
                  {slots.length} time slot{slots.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {slots.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[var(--brand-light)]/30" />
                </div>
                <h4 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No time slots yet</h4>
                <p className="text-sm text-[var(--brand-light)]/50">Add your first time slot above to define availability.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {WEEKDAYS.map(day => {
                  const daySlots = slots
                      .filter(s => s.weekday === day.val)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time));
                  
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={day.val} className="pb-4 border-b border-[var(--dark-600)] last:border-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Day Label */}
                        <div className="sm:w-28 flex-shrink-0">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)] text-sm font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            {day.label}
                          </span>
                        </div>
                        
                        {/* Time Slots */}
                        <div className="flex-1 flex flex-wrap gap-2">
                          {daySlots.map(slot => (
                            <div 
                                key={slot.id} 
                                className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all ${
                                  editingId === slot.id 
                                    ? 'bg-[var(--brand-yellow)]/10 border-[var(--brand-yellow)]/50 ring-2 ring-[var(--brand-yellow)]/20' 
                                    : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50'
                                }`}
                            >
                              <Clock className={`h-4 w-4 flex-shrink-0 ${
                                editingId === slot.id ? 'text-[var(--brand-yellow)]' : 'text-[var(--brand-primary)]'
                              }`} />
                              
                              <div className="flex flex-col">
                                <span className={`font-mono font-semibold text-sm ${
                                  editingId === slot.id ? 'text-[var(--brand-yellow)]' : 'text-[var(--brand-light)]'
                                }`}>
                                  {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                                </span>
                                {slot.week_cycle !== 'ALL' && (
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                    slot.week_cycle === 'ODD' 
                                      ? 'text-[var(--brand-blue)]' 
                                      : 'text-[var(--brand-purple)]'
                                  }`}>
                                    {slot.week_cycle === 'ODD' ? 'Odd Weeks' : 'Even Weeks'}
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[var(--dark-500)]">
                                <button
                                  onClick={() => handleEditClick(slot)}
                                  className="p-1.5 rounded-lg text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id!)}
                                  className="p-1.5 rounded-lg text-[var(--brand-light)]/40 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode={true}
      />
    </>
  );
}
