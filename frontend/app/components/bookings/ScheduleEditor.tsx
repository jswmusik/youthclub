'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Pencil, Trash2, X, Plus, Save, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      setToast({ message: 'End time must be after start time.', type: 'error', isVisible: true });
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
        ? `This time slot overlaps with an existing slot: ${overlappingSlot.start_time.slice(0, 5)} - ${overlappingSlot.end_time.slice(0, 5)} (${weekCycleLabel}). Please choose a different time or adjust the existing slot.`
        : 'This time slot overlaps with an existing slot on the same day. Please choose a different time.';
      
      setToast({ message, type: 'error', isVisible: true });
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
        setToast({ message: 'Schedule slot updated successfully!', type: 'success', isVisible: true });
      } else {
        // CREATE New
        const res = await api.post('/bookings/schedules/', {
          ...formSlot,
          resource: resourceId
        });
        setSlots([...slots, res.data]);
        setToast({ message: 'Schedule slot added successfully!', type: 'success', isVisible: true });
      }
      
      // Reset Form to defaults
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
      setToast({ message: errorMessage, type: 'error', isVisible: true });
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
      setToast({ message: 'Schedule slot deleted successfully!', type: 'success', isVisible: true });
    } catch (err) {
      setToast({ message: 'Failed to delete slot.', type: 'error', isVisible: true });
    }
  };

  if (loading) {
    return (
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Define when this resource is available for booking.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          {/* Editor Form (Used for both Create and Edit) */}
          <Card className={`border-2 transition-colors ${editingId ? 'bg-yellow-50/30 border-yellow-200' : 'bg-[#EBEBFE]/30 border-[#EBEBFE]'}`}>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3 space-y-1.5">
                  <Label className={`text-xs ${editingId ? 'text-yellow-800' : 'text-[#4D4DA4]'}`}>Day</Label>
                  <select 
                    className="flex h-10 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                    value={formSlot.weekday}
                    onChange={e => setFormSlot({...formSlot, weekday: parseInt(e.target.value)})}
                  >
                    {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className={`text-xs ${editingId ? 'text-yellow-800' : 'text-[#4D4DA4]'}`}>Start Time</Label>
                  <Input 
                    type="time" 
                    className="h-10 bg-white border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-lg"
                    value={formSlot.start_time}
                    onChange={e => setFormSlot({...formSlot, start_time: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <Label className={`text-xs ${editingId ? 'text-yellow-800' : 'text-[#4D4DA4]'}`}>End Time</Label>
                  <Input 
                    type="time" 
                    className="h-10 bg-white border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-lg"
                    value={formSlot.end_time}
                    onChange={e => setFormSlot({...formSlot, end_time: e.target.value})}
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <Label className={`text-xs ${editingId ? 'text-yellow-800' : 'text-[#4D4DA4]'}`}>Week Cycle</Label>
                  <select 
                    className="flex h-10 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                    value={formSlot.week_cycle}
                    onChange={e => setFormSlot({...formSlot, week_cycle: e.target.value as any})}
                  >
                    <option value="ALL">Every Week</option>
                    <option value="ODD">Odd Weeks</option>
                    <option value="EVEN">Even Weeks</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 flex gap-2">
                  <Button 
                    onClick={handleSaveSlot}
                    className={`flex-1 h-10 rounded-full transition-colors text-sm ${
                      editingId 
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                        : 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white'
                    }`}
                  >
                    {editingId ? <Save className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    {editingId ? 'Update' : 'Add Slot'}
                  </Button>

                  {editingId && (
                    <Button 
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 rounded-full p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Grid */}
          <div className="space-y-3">
            {WEEKDAYS.map(day => {
              const daySlots = slots
                  .filter(s => s.weekday === day.val)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
              
              if (daySlots.length === 0) return null;

              return (
                <div key={day.val} className="flex flex-col sm:flex-row gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="w-full sm:w-28 font-semibold text-sm text-[#121213] pt-1">{day.label}</div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {daySlots.map(slot => (
                      <div 
                          key={slot.id} 
                          className={`border-2 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm transition-all
                              ${editingId === slot.id ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-white border-gray-200 hover:border-[#4D4DA4]'}
                          `}
                      >
                        <Clock className={`h-3.5 w-3.5 flex-shrink-0 ${editingId === slot.id ? 'text-yellow-700' : 'text-[#4D4DA4]'}`} />
                        <div className="flex flex-col leading-tight">
                            <span className="font-mono text-[#121213] font-semibold text-xs">
                              {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                            </span>
                            {slot.week_cycle !== 'ALL' && (
                              <Badge variant="outline" className="mt-0.5 w-fit text-[10px] px-1.5 py-0 bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE]">
                                {slot.week_cycle === 'ODD' ? 'Odd' : 'Even'}
                              </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-0.5 border-l pl-2 ml-auto border-gray-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(slot)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-[#4D4DA4] hover:bg-[#EBEBFE]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSlot(slot.id!)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {slots.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 italic">No opening hours defined yet. Add a schedule slot above.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}
