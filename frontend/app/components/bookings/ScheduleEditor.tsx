'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';

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

  // New Slot State
  const [newSlot, setNewSlot] = useState<ScheduleSlot>({
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

  const handleAddSlot = async () => {
    try {
      const res = await api.post('/bookings/schedules/', {
        ...newSlot,
        resource: resourceId
      });
      setSlots([...slots, res.data]);
    } catch (err) {
      alert('Failed to add slot. Check format (HH:MM:SS) or overlap.');
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      await api.delete(`/bookings/schedules/${id}/`);
      setSlots(slots.filter(s => s.id !== id));
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
        {/* Add New Slot Form */}
        <div className="flex flex-wrap items-end gap-3 mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Day</label>
            <select 
              className="border p-2 rounded text-sm w-32"
              value={newSlot.weekday}
              onChange={e => setNewSlot({...newSlot, weekday: parseInt(e.target.value)})}
            >
              {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Start</label>
            <input 
              type="time" 
              className="border p-2 rounded text-sm"
              value={newSlot.start_time}
              onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">End</label>
            <input 
              type="time" 
              className="border p-2 rounded text-sm"
              value={newSlot.end_time}
              onChange={e => setNewSlot({...newSlot, end_time: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Weeks</label>
            <select 
              className="border p-2 rounded text-sm w-32"
              value={newSlot.week_cycle}
              onChange={e => setNewSlot({...newSlot, week_cycle: e.target.value as any})}
            >
              <option value="ALL">Every Week</option>
              <option value="ODD">Odd Weeks</option>
              <option value="EVEN">Even Weeks</option>
            </select>
          </div>
          <button 
            onClick={handleAddSlot}
            className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-700 h-10"
          >
            Add Slot
          </button>
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
                <div className="w-32 font-bold text-gray-700 pt-1">{day.label}</div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="bg-gray-100 border border-gray-200 rounded px-3 py-1 flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-800">
                        {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                      </span>
                      {slot.week_cycle !== 'ALL' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded font-bold">
                          {slot.week_cycle}
                        </span>
                      )}
                      <button 
                        onClick={() => handleDeleteSlot(slot.id!)}
                        className="text-red-400 hover:text-red-600 ml-2 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {slots.length === 0 && <p className="text-center text-gray-400 italic">No opening hours defined yet.</p>}
        </div>
      </div>
    </div>
  );
}