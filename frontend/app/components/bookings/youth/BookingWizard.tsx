'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';

import api from '../../../../lib/api';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
  ar: enUS, // Arabic not available in date-fns, fallback to English
  so: enUS, // Somali not available in date-fns, fallback to English
  prs: enUS, // Dari not available in date-fns, fallback to English
};

interface Props {
  resource: any;
  darkMode?: boolean;
}

interface TimeSlot {
  start: string;
  end: string;
  title?: string;
}

export default function BookingWizard({ resource, darkMode = false }: Props) {
  const router = useRouter();
  const t = useTranslations('bookings.bookingWizard');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Slot, 2=Participants, 3=Review
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [participants, setParticipants] = useState<string[]>([]);
  const [friendName, setFriendName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error, info, warning } = useToast();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitError, setLimitError] = useState('');

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
      error(t('maxParticipantsReached'));
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
      
      success(t('bookingRequestSent'));
      setTimeout(() => router.push('/dashboard/youth/bookings'), 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      
      // Parse error response
      const errorMessage = err.response?.data?.non_field_errors?.[0] || 
                          err.response?.data?.error || 
                          err.response?.data?.detail || 
                          t('failedToBook');
      
      // Check if it's a weekly limit error
      if (errorMessage.toLowerCase().includes('weekly booking limit') || 
          errorMessage.toLowerCase().includes('weekly limit') ||
          errorMessage.toLowerCase().includes('reached the weekly')) {
        setLimitError(errorMessage);
        setShowLimitModal(true);
      } else {
        // Show toast for other errors
        error(errorMessage);
      }
    }
  };

  // --- STEP 1: PICK TIME ---
  if (step === 1) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Step Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            darkMode 
              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
              : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md'
          }`}>
            1
          </div>
          <h3 className={`text-xl sm:text-2xl font-heading font-bold ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            {t('step1Title')}
          </h3>
        </div>

        <div className={`p-4 sm:p-6 rounded-2xl border ${
          darkMode 
            ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
            : 'bg-gradient-to-br from-[#EBEBFE]/30 to-white border-2 border-[#4D4DA4]/10 shadow-md'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => handleDateChange(-1)} 
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all group ${
                darkMode 
                  ? 'bg-[var(--dark-600)] hover:bg-[var(--brand-primary)] hover:text-[var(--dark-900)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]' 
                  : 'bg-white hover:bg-[#4D4DA4] hover:text-white shadow-sm border border-[#4D4DA4]/15 hover:border-[#4D4DA4]'
              }`}
            >
              <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <div className="text-center">
              <div className={`text-xs sm:text-sm uppercase font-bold tracking-wide ${
                darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
              }`}>{format(selectedDate, 'EEEE', { locale: dateLocale })}</div>
              <div className={`text-lg sm:text-xl font-bold font-heading ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
              }`}>{format(selectedDate, 'MMM d, yyyy', { locale: dateLocale })}</div>
            </div>
            <button 
              onClick={() => handleDateChange(1)} 
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all group ${
                darkMode 
                  ? 'bg-[var(--dark-600)] hover:bg-[var(--brand-primary)] hover:text-[var(--dark-900)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]' 
                  : 'bg-white hover:bg-[#4D4DA4] hover:text-white shadow-sm border border-[#4D4DA4]/15 hover:border-[#4D4DA4]'
              }`}
            >
              <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {loadingSlots ? (
            <div className="text-center py-12">
              <div className={`w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-3 ${
                darkMode 
                  ? 'border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]' 
                  : 'border-[#4D4DA4]/20 border-t-[#4D4DA4]'
              }`} />
              <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('checkingSchedule')}</p>
            </div>
          ) : slots.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
              darkMode 
                ? 'bg-[var(--dark-600)] border-[var(--dark-500)]' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
            }`}>
              <CalendarIcon className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[var(--brand-light)]/20' : 'text-gray-300'}`} />
              <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('noSlotsAvailable')}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('tryDifferentDate')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    className={`group p-3 sm:p-4 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                      isSelected 
                        ? darkMode
                          ? 'bg-[var(--brand-third)] text-[var(--dark-900)] border-[var(--brand-third)] scale-105' 
                          : 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-[#10B981] shadow-lg shadow-[#10B981]/30 scale-105'
                        : darkMode
                          ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/80 border-[var(--dark-500)] hover:border-[var(--brand-primary)]' 
                          : 'bg-white text-gray-700 border-[#4D4DA4]/15 hover:border-[#4D4DA4] hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${
                        isSelected 
                          ? darkMode ? 'text-[var(--dark-900)]' : 'text-white' 
                          : darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                      }`} />
                      <div className="text-xs sm:text-sm">
                        {format(new Date(slot.start), 'HH:mm')}
                      </div>
                      <div className={`text-[10px] ${
                        isSelected 
                          ? darkMode ? 'text-[var(--dark-900)]/60' : 'text-white/80' 
                          : darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                      }`}>{t('timeTo')}</div>
                      <div className="text-xs sm:text-sm">
                        {format(new Date(slot.end), 'HH:mm')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button 
          disabled={!selectedSlot}
          onClick={() => setStep(2)}
          className={`w-full py-3.5 sm:py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 ${
            darkMode 
              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
              : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-lg hover:from-[#3D3D94] hover:to-[#5D5DC4]'
          }`}
        >
          {t('nextAddFriends')}
        </button>
      </div>
    );
  }

  // --- STEP 2: PARTICIPANTS ---
  if (step === 2) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Step Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            darkMode 
              ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
              : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-md'
          }`}>
            2
          </div>
          <h3 className={`text-xl sm:text-2xl font-heading font-bold ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            {t('step2Title')}
          </h3>
        </div>

        <div className={`p-4 sm:p-6 rounded-2xl border space-y-4 ${
          darkMode 
            ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
            : 'bg-gradient-to-br from-gray-50 to-white border-2 border-[#4D4DA4]/15 shadow-md'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Users className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`} />
            <span className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
              {t('youAndFriends', { count: participants.length, max: resource.max_participants })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder={t('friendNamePlaceholder')} 
              className={`flex-1 p-3 rounded-xl outline-none transition-all font-medium ${
                darkMode 
                  ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20' 
                  : 'border-2 border-[#4D4DA4]/15 focus:border-[#4D4DA4] focus:ring-2 focus:ring-[#4D4DA4]/20'
              }`}
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
            />
            <button 
              onClick={addParticipant}
              className={`px-5 py-3 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap ${
                darkMode 
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                  : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md hover:shadow-lg'
              }`}
            >
              {t('add')}
            </button>
          </div>

          <div className="space-y-2">
            {/* List self first */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              darkMode 
                ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
                : 'bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 border-[#10B981]/20'
            }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                  darkMode 
                    ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                    : 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-sm'
                }`}>
                  {t('me')}
                </div>
                <span className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{t('youHost')}</span>
            </div>
            
            {participants.map((name, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border group transition-all ${
                darkMode 
                  ? 'bg-[var(--dark-600)] border-[var(--dark-500)] hover:border-[var(--dark-400)]' 
                  : 'bg-gradient-to-r from-gray-50 to-white border-[#4D4DA4]/15 hover:border-gray-300'
              }`}>
                 <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      darkMode 
                        ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
                        : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] text-white shadow-sm'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{name}</span>
                 </div>
                 <button 
                   onClick={() => removeParticipant(idx)} 
                   className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all font-bold text-lg ${
                     darkMode 
                       ? 'text-[var(--brand-red)] hover:text-[var(--brand-light)] hover:bg-[var(--brand-red)]' 
                       : 'text-red-400 hover:text-white hover:bg-red-500'
                   }`}
                 >
                   ×
                 </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setStep(1)} 
            className={`flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
              darkMode 
                ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:border-[var(--brand-primary)] hover:text-[var(--brand-light)]' 
                : 'bg-white border-2 border-[#4D4DA4]/15 text-gray-700 hover:border-[#4D4DA4] hover:text-[#4D4DA4]'
            }`}
          >
            {t('back')}
          </button>
          <button 
            onClick={() => setStep(3)} 
            className={`flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
              darkMode 
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-lg hover:from-[#3D3D94] hover:to-[#5D5DC4]'
            }`}
          >
            {t('review')}
          </button>
        </div>
        </div>
    );
  }

  // --- STEP 3: CONFIRM ---
  if (step === 3 && selectedSlot) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Step Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            darkMode 
              ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
              : 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-md'
          }`}>
            3
          </div>
          <h3 className={`text-xl sm:text-2xl font-heading font-bold ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            {t('step3Title')}
          </h3>
        </div>

        <div className={`p-6 rounded-2xl border text-center space-y-5 ${
          darkMode 
            ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
            : 'bg-gradient-to-br from-[#10B981]/10 to-white border-2 border-[#10B981]/20 shadow-md'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            darkMode 
              ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
              : 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/30'
          }`}>
            <CheckCircle className="w-9 h-9" />
          </div>
          
          <h3 className={`text-2xl font-bold font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            {t('reviewBooking')}
          </h3>
          
          <div className={`p-5 rounded-xl text-left space-y-3 text-sm border ${
            darkMode 
              ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
              : 'bg-white border-2 border-[#4D4DA4]/10 shadow-sm'
          }`}>
            <div className={`flex justify-between items-center pb-3 border-b ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'
            }`}>
              <span className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('resource')}</span>
              <span className={`font-bold ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}>{resource.name}</span>
            </div>
            <div className={`flex justify-between items-center pb-3 border-b ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'
            }`}>
              <span className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('date')}</span>
              <span className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{format(new Date(selectedSlot.start), 'MMM d, yyyy', { locale: dateLocale })}</span>
            </div>
            <div className={`flex justify-between items-center pb-3 border-b ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'
            }`}>
              <span className={`font-semibold flex items-center gap-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                <Clock className="w-4 h-4" />
                {t('time')}
              </span>
              <span className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className={`font-semibold flex items-center gap-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                <Users className="w-4 h-4" />
                {t('participants')}
              </span>
              <span className={`font-bold ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`}>{t('people', { count: participants.length + 1 })}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setStep(2)} 
            className={`flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
              darkMode 
                ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:border-[var(--brand-primary)] hover:text-[var(--brand-light)]' 
                : 'bg-white border-2 border-[#4D4DA4]/15 text-gray-700 hover:border-[#4D4DA4] hover:text-[#4D4DA4]'
            }`}
          >
            {t('back')}
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={`flex-1 py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 ${
              darkMode 
                ? 'bg-[var(--brand-third)] text-[var(--dark-900)] hover:bg-[var(--brand-third)]/90' 
                : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg hover:from-[#0EA572] hover:to-[#047857]'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                  darkMode ? 'border-[var(--dark-900)]/30 border-t-[var(--dark-900)]' : 'border-white/30 border-t-white'
                }`} />
                {t('booking')}
              </span>
            ) : (
              t('confirmBooking')
            )}
          </button>
        </div>
        {/* Weekly Limit Error Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-200 animate-in zoom-in ${
              darkMode ? 'bg-[var(--dark-800)] border border-[var(--dark-600)]' : 'bg-white'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    darkMode 
                      ? 'bg-[var(--brand-peach)]/20' 
                      : 'bg-gradient-to-br from-amber-100 to-amber-200 shadow-md'
                  }`}>
                    <AlertCircle className={`w-7 h-7 ${darkMode ? 'text-[var(--brand-peach)]' : 'text-amber-600'}`} />
                  </div>
                  <h3 className={`text-xl font-bold font-heading ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                  }`}>
                    {t('weeklyLimitReached')}
                  </h3>
                </div>
                
                <div className={`mb-6 p-4 rounded-xl border ${
                  darkMode 
                    ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <p className={`font-semibold mb-3 ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>
                    {limitError || t('weeklyLimitMessage')}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                    {t('weeklyLimitHelp')}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setLimitError('');
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
                    darkMode 
                      ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                      : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-lg'
                  }`}
                >
                  {t('understood')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
