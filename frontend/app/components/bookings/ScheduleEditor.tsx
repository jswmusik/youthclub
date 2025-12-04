'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Pencil, Trash2, X, Plus, Save, AlertCircle } from 'lucide-react';

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
  { val: 1, label: 'Monday' },
  { val: 2, label: 'Tuesday' },
  { val: 3, label: 'Wednesday' },
  { val: 4, label: 'Thursday' },
  { val: 5, label: 'Friday' },
  { val: 6, label: 'Saturday' },
  { val: 7, label: 'Sunday' },
];

export default function ScheduleEditor({ resourceId }: Props) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [editingId, setEditingId] = useState<number | null>(null);

  // Error Modal State
  const [errorModal, setErrorModal] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: ''
  });

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
      // Two slots overlap if:
      // - One is 'ALL' (applies to all weeks)
      // - Both are the same cycle (ODD/ODD or EVEN/EVEN)
      const cyclesOverlap = 
        existingSlot.week_cycle === 'ALL' || 
        newSlot.week_cycle === 'ALL' ||
        existingSlot.week_cycle === newSlot.week_cycle;
      
      if (!cyclesOverlap) {
        return false; // Different cycles, no overlap
      }
      
      // Check time overlap: slots overlap if they share any time (excluding exact boundaries)
      // Allowed: 12:00-13:00 and 13:00-14:00 (touching is OK)
      // Not allowed: 12:00-13:00 and 12:59-14:00 (overlaps by 1 minute)
      // Formula: overlap if startA < endB && endA > startB
      const existingStart = existingSlot.start_time;
      const existingEnd = existingSlot.end_time;
      
      // Convert to minutes for comparison (handles HH:MM format)
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const newStartMin = timeToMinutes(newStart);
      const newEndMin = timeToMinutes(newEnd);
      const existingStartMin = timeToMinutes(existingStart);
      const existingEndMin = timeToMinutes(existingEnd);
      
      // Overlap occurs if: newStart < existingEnd && newEnd > existingStart
      // This allows exact boundaries (e.g., 12:00-13:00 and 13:00-14:00)
      return newStartMin < existingEndMin && newEndMin > existingStartMin;
    });
  };

  const handleSaveSlot = async () => {
    // Validate time range
    if (formSlot.start_time >= formSlot.end_time) {
      setErrorModal({
        isVisible: true,
        message: 'End time must be after start time.'
      });
      return;
    }
    
    // Check for overlaps
    const hasOverlap = checkOverlap(formSlot, editingId || undefined);
    if (hasOverlap) {
      // Find the overlapping slot to show details
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
        ? `This time slot overlaps with an existing slot:\n\n${overlappingSlot.start_time.slice(0, 5)} - ${overlappingSlot.end_time.slice(0, 5)} (${weekCycleLabel})\n\nPlease choose a different time or adjust the existing slot.`
        : 'This time slot overlaps with an existing slot on the same day. Please choose a different time.';
      
      setErrorModal({
        isVisible: true,
        message
      });
      return;
    }
    
    try {
      if (editingId) {
        // UPDATE Existing
        const res = await api.patch(`/bookings/schedules/${editingId}/`, {
            ...formSlot,
            resource: resourceId
        });
        
        // Update local state
        setSlots(slots.map(s => s.id === editingId ? res.data : s));
        setEditingId(null); // Exit edit mode
      } else {
        // CREATE New
        const res = await api.post('/bookings/schedules/', {
          ...formSlot,
          resource: resourceId
        });
        setSlots([...slots, res.data]);
      }
      
      // Reset Form to defaults (keep weekday to make entering multiple slots for same day easier?)
      // Let's reset purely to keep it simple
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
                          'Failed to save slot. Please check the time format and ensure there are no overlaps.';
      setErrorModal({
        isVisible: true,
        message: errorMessage
      });
    }
  };

  const handleEditClick = (slot: ScheduleSlot) => {
    setEditingId(slot.id!);
    setFormSlot({ ...slot }); // Populate form
    
    // Scroll to top to see the form
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
    if (!confirm("Are you sure you want to remove this opening hour?")) return;
    try {
      await api.delete(`/bookings/schedules/${id}/`);
      setSlots(slots.filter(s => s.id !== id));
      
      // If we deleted the item currently being edited, reset form
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      alert('Failed to delete slot.');
    }
  };

  if (loading) return <div>Loading schedule...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">Weekly Schedule</h3>
        <p className="text-sm text-gray-500">Define when this resource is available for booking.</p>
      </div>

      <div className="p-6">
        {/* Editor Form (Used for both Create and Edit) */}
        <div className={`flex flex-wrap items-end gap-3 mb-8 p-4 rounded-lg border transition-colors ${editingId ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100'}`}>
          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${editingId ? 'text-yellow-800' : 'text-blue-800'}`}>Day</label>
            <select 
              className="border p-2 rounded text-sm w-32"
              value={formSlot.weekday}
              onChange={e => setFormSlot({...formSlot, weekday: parseInt(e.target.value)})}
            >
              {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${editingId ? 'text-yellow-800' : 'text-blue-800'}`}>Start</label>
            <input 
              type="time" 
              className="border p-2 rounded text-sm"
              value={formSlot.start_time}
              onChange={e => setFormSlot({...formSlot, start_time: e.target.value})}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${editingId ? 'text-yellow-800' : 'text-blue-800'}`}>End</label>
            <input 
              type="time" 
              className="border p-2 rounded text-sm"
              value={formSlot.end_time}
              onChange={e => setFormSlot({...formSlot, end_time: e.target.value})}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${editingId ? 'text-yellow-800' : 'text-blue-800'}`}>Weeks</label>
            <select 
              className="border p-2 rounded text-sm w-32"
              value={formSlot.week_cycle}
              onChange={e => setFormSlot({...formSlot, week_cycle: e.target.value as any})}
            >
              <option value="ALL">Every Week</option>
              <option value="ODD">Odd Weeks</option>
              <option value="EVEN">Even Weeks</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={handleSaveSlot}
                className={`text-white px-4 py-2 rounded font-bold text-sm h-10 flex items-center gap-2 shadow-sm
                    ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}
                `}
            >
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Update Slot' : 'Add Slot'}
            </button>

            {editingId && (
                <button 
                    onClick={handleCancelEdit}
                    className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded font-bold text-sm h-10 hover:bg-gray-50 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
            )}
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="space-y-4">
          {WEEKDAYS.map(day => {
            const daySlots = slots
                .filter(s => s.weekday === day.val)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
            
            if (daySlots.length === 0) return null;

            return (
              <div key={day.val} className="flex border-b border-gray-100 pb-3 last:border-0">
                <div className="w-32 font-bold text-gray-700 pt-2">{day.label}</div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {daySlots.map(slot => (
                    <div 
                        key={slot.id} 
                        className={`border rounded px-3 py-1.5 flex items-center gap-3 text-sm shadow-sm transition-all
                            ${editingId === slot.id ? 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-200' : 'bg-white border-gray-200 hover:border-blue-300'}
                        `}
                    >
                      <div className="flex flex-col leading-none">
                          <span className="font-mono text-gray-900 font-bold">
                            {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                          </span>
                          {slot.week_cycle !== 'ALL' && (
                            <span className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold">
                              {slot.week_cycle === 'ODD' ? 'Odd Weeks' : 'Even Weeks'}
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-1 border-l pl-2 border-gray-200">
                        <button 
                            onClick={() => handleEditClick(slot)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="Edit"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => handleDeleteSlot(slot.id!)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {slots.length === 0 && <p className="text-center text-gray-400 italic py-8">No opening hours defined yet.</p>}
        </div>
      </div>

      {/* Error Modal */}
      {errorModal.isVisible && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setErrorModal({ isVisible: false, message: '' })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Time Slot Error</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {errorModal.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setErrorModal({ isVisible: false, message: '' })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
