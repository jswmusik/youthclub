'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import Toast from '../../../components/Toast';

interface Props {
  resource: any;
}

interface TimeSlot {
  start: string;
  end: string;
  title?: string;
}

export default function BookingWizard({ resource }: Props) {
  const router = useRouter();
  
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Slot, 2=Participants, 3=Review
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [participants, setParticipants] = useState<string[]>([]);
  const [friendName, setFriendName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Fetch slots when date changes
  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setSlots([]); // Clear old slots
    try {
      // Format date for API (YYYY-MM-DD)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // We only fetch for 1 day at a time here to keep UI simple
      const res = await api.get(`/bookings/resources/${resource.id}/availability/?start_date=${dateStr}&end_date=${dateStr}`);
      setSlots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
    setSelectedSlot(null); // Reset slot selection
  };

  const addParticipant = () => {
    if (!friendName.trim()) return;
    if (participants.length + 1 >= resource.max_participants) {
      setToast({ message: `Max ${resource.max_participants} people allowed.`, type: 'error', isVisible: true });
      return;
    }
    setParticipants([...participants, friendName.trim()]);
    setFriendName('');
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    try {
      await api.post('/bookings/bookings/', {
        resource: resource.id,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        participants: participants
      });
      
      setToast({ message: 'Booking request sent!', type: 'success', isVisible: true });
      setTimeout(() => router.push('/dashboard/youth/bookings'), 1500);
    } catch (err) {
      setToast({ message: 'Failed to book. Slot might be taken.', type: 'error', isVisible: true });
      setIsSubmitting(false);
    }
  };

  // --- STEP 1: PICK TIME ---
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-sm text-gray-500 uppercase font-bold">{format(selectedDate, 'EEEE')}</div>
              <div className="text-lg font-bold">{format(selectedDate, 'MMM d, yyyy')}</div>
            </div>
            <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loadingSlots ? (
            <div className="text-center py-8 text-gray-400">Checking schedule...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
              No available slots on this day.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border text-sm font-bold transition-all
                      ${isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'}
                    `}
                  >
                    {format(new Date(slot.start), 'HH:mm')} - {format(new Date(slot.end), 'HH:mm')}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button 
          disabled={!selectedSlot}
          onClick={() => setStep(2)}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          Next: Add Friends
        </button>
      </div>
    );
  }

  // --- STEP 2: PARTICIPANTS ---
  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Who is joining?
          </h3>
          
          <div className="text-sm text-gray-500">
            You + {participants.length} friends (Max {resource.max_participants})
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Friend's Name" 
              className="flex-1 border p-2 rounded-lg"
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
            />
            <button 
              onClick={addParticipant}
              className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-200"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {/* List self first */}
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">ME</div>
                <span className="font-bold text-sm text-gray-800">You (Host)</span>
            </div>
            
            {participants.map((name, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">#{idx + 1}</div>
                    <span className="font-medium text-sm text-gray-700">{name}</span>
                 </div>
                 <button onClick={() => removeParticipant(idx)} className="text-red-400 hover:text-red-600 p-1">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold">
            Back
          </button>
          <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md">
            Review
          </button>
        </div>
        <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
      </div>
    );
  }

  // --- STEP 3: CONFIRM ---
  if (step === 3 && selectedSlot) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900">Confirm Booking</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Resource</span>
              <span className="font-bold">{resource.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-bold">{format(new Date(selectedSlot.start), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-bold">{format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-500">Participants</span>
              <span className="font-bold">{participants.length + 1} people</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold">
            Back
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Booking...' : 'Confirm'}
          </button>
        </div>
        <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
      </div>
    );
  }

  return null;
}

