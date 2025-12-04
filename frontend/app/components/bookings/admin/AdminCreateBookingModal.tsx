'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { X, Search, User, Calendar, Clock } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import Toast from '../../Toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedTime?: Date; // Optional: If clicked from calendar
  preSelectedSlot?: { slot: any; resource: any; date: Date } | null; // Pre-selected slot from calendar
  scope?: string;
}

export default function AdminCreateBookingModal({ onClose, onSuccess, preSelectedTime, preSelectedSlot, scope }: Props) {
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
  
  // Available Slots State
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Search State
  const [userSearch, setUserSearch] = useState('');
  
  // Toast State
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning', isVisible: false });

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
    if (term.length < 2) return;
    
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
      setToast({ 
        message: 'Please specify the number of weeks for recurring booking.', 
        type: 'error', 
        isVisible: true 
      });
      return;
    }
    
    setLoading(true);
    try {
        const payload: any = {
            resource: selectedResource.id,
            target_user_id: selectedUser.id, // Using our new backend field
            start_time: selectedSlot.start,
            end_time: selectedSlot.end,
            participants: [] // Admins usually just book the main slot
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
          ? ` (${recurringType === 'FOREVER' ? 'recurring forever' : `recurring for ${recurringWeeks} weeks`})`
          : '';
        setToast({ 
          message: `Booking${recurringMessage} created successfully for ${selectedUser.first_name} ${selectedUser.last_name}!`, 
          type: 'success', 
          isVisible: true 
        });
        // Wait a moment to show toast, then close and refresh
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
    } catch (err: any) {
        console.error('Error creating booking:', err);
        console.error('Error response:', err.response);
        console.error('Error response data:', err.response?.data);
        console.error('Error response status:', err.response?.status);
        
        // Extract error message from response
        let errorMessage = 'Failed to create booking.';
        
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
        
        alert(errorMessage);
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-200"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Create Booking</h2>
          <button 
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
            {/* Step 1: Select User */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">1. Select Youth Member</label>
                {selectedUser ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                {selectedUser.first_name[0]}
                            </div>
                            <div>
                                <div className="font-bold text-sm">{selectedUser.first_name} {selectedUser.last_name}</div>
                                <div className="text-xs text-gray-500">{selectedUser.email}</div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedUser(null)} className="text-xs text-red-600 font-bold hover:underline">Change</button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                            value={userSearch}
                            onChange={(e) => handleUserSearch(e.target.value)}
                        />
                        {users.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg mt-1 rounded-lg z-10 max-h-48 overflow-y-auto">
                                {users.map(u => (
                                    <button 
                                        key={u.id}
                                        onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(''); }}
                                        className="w-full text-left p-3 hover:bg-gray-50 text-sm border-b last:border-0"
                                    >
                                        <div className="font-bold">{u.first_name} {u.last_name}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Step 2: Select Resource (only show if not pre-selected) */}
            {!preSelectedSlot && (
              <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">2. Select Resource</label>
                  <select 
                      className="w-full border p-2 rounded-lg text-sm"
                      value={selectedResource?.id || ''}
                      onChange={e => {
                        const resource = resources.find(r => r.id === parseInt(e.target.value));
                        setSelectedResource(resource);
                        setDate(''); // Reset date when resource changes
                        setSelectedSlot(null);
                      }}
                  >
                      <option value="">-- Choose Room or Equipment --</option>
                      {resources.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.club_name})</option>
                      ))}
                  </select>
              </div>
            )}

            {/* Step 2b: Show Resource Info if pre-selected */}
            {preSelectedSlot && selectedResource && (
              <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">2. Resource</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-semibold text-gray-900">{selectedResource.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{selectedResource.club_name}</div>
                  </div>
              </div>
            )}

            {/* Step 3: Select Date (only show if not pre-selected) */}
            {!preSelectedSlot && selectedResource && (
              <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">3. Select Date</label>
                  <input 
                      type="date" 
                      className="w-full border p-2 rounded-lg text-sm"
                      value={date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => {
                        setDate(e.target.value);
                        setSelectedSlot(null);
                      }}
                  />
              </div>
            )}

            {/* Step 3b: Show Date Info if pre-selected */}
            {preSelectedSlot && date && (
              <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">3. Date</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-semibold text-gray-900">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</div>
                  </div>
              </div>
            )}

            {/* Step 4: Time Slot */}
            {preSelectedSlot && selectedSlot ? (
              // Show locked pre-selected slot - cannot be changed
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">4. Time Slot</label>
                <div className="p-4 bg-blue-50 border-2 border-blue-500 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-900 text-base">
                          {format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}
                        </div>
                        <div className="text-xs text-blue-600 mt-0.5">Pre-selected from calendar</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">
                      Locked
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-200">
                    To select a different time slot, close this modal and click on another available slot in the calendar.
                  </p>
                </div>
              </div>
            ) : !preSelectedSlot && selectedResource && date && (
              // Show slot picker only if not pre-selected
              <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">4. Select Available Time Slot</label>
                  {loadingSlots ? (
                    <div className="text-center py-4 text-gray-400 text-sm">Loading available slots...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-800 font-medium">No available slots for this date</p>
                      <p className="text-xs text-yellow-600 mt-1">Please check the schedule or select a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-gray-50">
                      {availableSlots.map((slot, idx) => {
                        const slotStart = new Date(slot.start);
                        const slotEnd = new Date(slot.end);
                        const isSelected = selectedSlot?.start === slot.start;
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all text-left ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                              <span>
                                {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* Step 5: Recurring Booking Options */}
            {selectedSlot && (
              <div className="space-y-3 border-t pt-4 mt-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => {
                      setIsRecurring(e.target.checked);
                      if (!e.target.checked) {
                        setRecurringType('WEEKS');
                        setRecurringWeeks(4);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-bold text-gray-700 cursor-pointer">
                    Make this a recurring booking
                  </label>
                </div>
                
                {isRecurring && (
                  <div className="ml-7 space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Recurrence Type</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurringType"
                            value="WEEKS"
                            checked={recurringType === 'WEEKS'}
                            onChange={(e) => setRecurringType(e.target.value as 'WEEKS')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">For a specific number of weeks</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="recurringType"
                            value="FOREVER"
                            checked={recurringType === 'FOREVER'}
                            onChange={(e) => setRecurringType(e.target.value as 'FOREVER')}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Forever</span>
                        </label>
                      </div>
                    </div>
                    
                    {recurringType === 'WEEKS' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Number of Weeks</label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={recurringWeeks}
                          onChange={(e) => setRecurringWeeks(parseInt(e.target.value) || 1)}
                          className="w-full border p-2 rounded-lg text-sm"
                          placeholder="e.g., 4"
                        />
                        <p className="text-xs text-gray-500">
                          Bookings will be created for the same day and time each week, respecting even/odd week schedules.
                        </p>
                      </div>
                    )}
                    
                    {recurringType === 'FOREVER' && (
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-xs text-blue-800 font-medium">
                          ⚠️ Bookings will be created indefinitely (up to 1 year initially). The system will respect even/odd week schedules automatically.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={loading || !selectedUser || !selectedResource || !selectedSlot}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create Booking'
                )}
            </button>
        </div>
      </div>
      
      {/* Toast Notification */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

