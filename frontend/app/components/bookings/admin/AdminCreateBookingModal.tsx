'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { X, Search, User, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import Toast from '../../Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getMediaUrl, getInitials } from '../../../utils';
import { cn } from '@/lib/utils';

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
        
        setToast({ 
          message: errorMessage, 
          type: 'error', 
          isVisible: true 
        });
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
      <Card 
        className="bg-white w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-200"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-gray-100 bg-gradient-to-r from-[#EBEBFE]/30 to-white">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold text-[#121213] mb-1">Create Booking</CardTitle>
            <p className="text-sm text-gray-500">Book a resource for a youth member</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 1: Select User */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-semibold text-[#121213]">1. Select Youth Member</Label>
              {selectedUser ? (
                <Card className="bg-[#EBEBFE]/30 border-[#EBEBFE]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 rounded-full border-2 border-[#EBEBFE] bg-gray-50">
                          <AvatarImage src={selectedUser.avatar ? getMediaUrl(selectedUser.avatar) : undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full font-bold text-sm bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(selectedUser.first_name, selectedUser.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[#121213] truncate">
                            {selectedUser.first_name} {selectedUser.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{selectedUser.email}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedUser(null)} 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    type="text" 
                    placeholder="Search by name or email..." 
                    className="pl-9 h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                  />
                  {users.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 mt-2 shadow-lg z-10 max-h-48 overflow-y-auto">
                      <CardContent className="p-0">
                        {users.map(u => (
                          <button 
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setUsers([]); setUserSearch(''); }}
                            className="w-full text-left p-3 hover:bg-gray-50 text-sm border-b last:border-0 transition-colors"
                          >
                            <div className="font-semibold text-[#121213]">{u.first_name} {u.last_name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Resource (only show if not pre-selected) */}
          {!preSelectedSlot && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">2. Select Resource</Label>
                <select 
                  className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
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
              </CardContent>
            </Card>
          )}

          {/* Step 2b: Show Resource Info if pre-selected */}
          {preSelectedSlot && selectedResource && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">2. Resource</Label>
                <Card className="bg-[#EBEBFE]/30 border-[#EBEBFE]">
                  <CardContent className="p-4">
                    <div className="font-semibold text-[#121213]">{selectedResource.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{selectedResource.club_name}</div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Select Date (only show if not pre-selected) */}
          {!preSelectedSlot && selectedResource && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">3. Select Date</Label>
                <Input 
                  type="date" 
                  className="h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                  value={date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => {
                    setDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3b: Show Date Info if pre-selected */}
          {preSelectedSlot && date && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">3. Date</Label>
                <Card className="bg-[#EBEBFE]/30 border-[#EBEBFE]">
                  <CardContent className="p-4">
                    <div className="font-semibold text-[#121213]">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Time Slot */}
          {preSelectedSlot && selectedSlot ? (
            // Show locked pre-selected slot - cannot be changed
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">4. Time Slot</Label>
                <Card className="bg-[#EBEBFE]/30 border-2 border-[#4D4DA4]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-full bg-[#4D4DA4] flex items-center justify-center flex-shrink-0">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#121213] text-base">
                            {format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}
                          </div>
                          <div className="text-xs text-[#4D4DA4] mt-0.5">Pre-selected from calendar</div>
                        </div>
                      </div>
                      <Badge className="bg-[#4D4DA4] text-white border-[#4D4DA4]">Locked</Badge>
                    </div>
                    <Separator className="my-3" />
                    <p className="text-xs text-gray-600">
                      To select a different time slot, close this modal and click on another available slot in the calendar.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ) : !preSelectedSlot && selectedResource && date && (
            // Show slot picker only if not pre-selected
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-semibold text-[#121213]">4. Select Available Time Slot</Label>
                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading available slots...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-yellow-800 font-medium">No available slots for this date</p>
                      <p className="text-xs text-yellow-600 mt-1">Please check the schedule or select a different date</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border-2 border-gray-200 rounded-xl bg-gray-50">
                    {availableSlots.map((slot, idx) => {
                      const slotStart = new Date(slot.start);
                      const slotEnd = new Date(slot.end);
                      const isSelected = selectedSlot?.start === slot.start;
                      
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "h-auto py-3 px-3 rounded-lg border-2 transition-all text-left justify-start",
                            isSelected
                              ? 'bg-[#4D4DA4] text-white border-[#4D4DA4] hover:bg-[#FF5485] hover:border-[#FF5485] ring-2 ring-[#EBEBFE]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/30'
                          )}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Clock className={cn("h-4 w-4 flex-shrink-0", isSelected ? 'text-white' : 'text-gray-400')} />
                            <span className="text-xs font-semibold">
                              {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
                            </span>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Recurring Booking Options */}
          {selectedSlot && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center space-x-2">
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
                    className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300"
                  />
                  <Label htmlFor="isRecurring" className="text-sm font-semibold text-[#121213] cursor-pointer">
                    Make this a recurring booking
                  </Label>
                </div>
                
                {isRecurring && (
                  <Card className="bg-[#EBEBFE]/30 border-[#EBEBFE]">
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#121213]">Recurrence Type</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recurringType"
                              value="WEEKS"
                              checked={recurringType === 'WEEKS'}
                              onChange={(e) => setRecurringType(e.target.value as 'WEEKS')}
                              className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                            />
                            <span className="text-sm text-gray-700">For a specific number of weeks</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recurringType"
                              value="FOREVER"
                              checked={recurringType === 'FOREVER'}
                              onChange={(e) => setRecurringType(e.target.value as 'FOREVER')}
                              className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                            />
                            <span className="text-sm text-gray-700">Forever</span>
                          </label>
                        </div>
                      </div>
                      
                      {recurringType === 'WEEKS' && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#121213]">Number of Weeks</Label>
                          <Input
                            type="number"
                            min="1"
                            max="52"
                            value={recurringWeeks}
                            onChange={(e) => setRecurringWeeks(parseInt(e.target.value) || 1)}
                            className="h-12 bg-white border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                            placeholder="e.g., 4"
                          />
                          <p className="text-xs text-gray-500">
                            Bookings will be created for the same day and time each week, respecting even/odd week schedules.
                          </p>
                        </div>
                      )}
                      
                      {recurringType === 'FOREVER' && (
                        <Card className="bg-yellow-50 border-yellow-200">
                          <CardContent className="p-3">
                            <p className="text-xs text-yellow-800 font-medium">
                              ⚠️ Bookings will be created indefinitely (up to 1 year initially). The system will respect even/odd week schedules automatically.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

        </CardContent>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
          <Button 
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedUser || !selectedResource || !selectedSlot}
            className="w-full sm:w-auto bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        </div>
      </Card>
      
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

