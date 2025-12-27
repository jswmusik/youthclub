import React from 'react';
import { useTranslations } from 'next-intl';
import { Club, OpeningHour } from '@/types/organization';

interface ClubHoursProps {
  club: Club;
  darkMode?: boolean;
}

export default function ClubHours({ club, darkMode = false }: ClubHoursProps) {
  const t = useTranslations('club.hours');
  const tDays = useTranslations('club.daysOfWeek');
  
  const days = [
    tDays('monday'),
    tDays('tuesday'),
    tDays('wednesday'),
    tDays('thursday'),
    tDays('friday'),
    tDays('saturday'),
    tDays('sunday')
  ];
  
  // Get current day index (0=Sunday in JS, but API uses 1=Monday...7=Sunday)
  // Let's normalize to 1-7 for comparison
  const todayDate = new Date();
  const currentDayIso = todayDate.getDay() === 0 ? 7 : todayDate.getDay();

  // Helper to format restrictions
  const getRestrictionLabel = (hour: OpeningHour) => {
    const parts = [];
    if (hour.gender_restriction && hour.gender_restriction !== 'ALL') {
      parts.push(
        hour.gender_restriction === 'GIRLS' ? t('girlsOnly') : 
        hour.gender_restriction === 'BOYS' ? t('boysOnly') : t('otherGender')
      );
    }
    
    if (hour.restriction_mode === 'AGE' && hour.min_value && hour.max_value) {
      parts.push(`${t('age')} ${hour.min_value}-${hour.max_value}`);
    } else if (hour.restriction_mode === 'GRADE' && hour.min_value && hour.max_value) {
      parts.push(`${t('grades')} ${hour.min_value}-${hour.max_value}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  // Group hours by weekday to handle multiple slots per day
  const hoursByDay: Record<number, OpeningHour[]> = {};
  club.regular_hours?.forEach(h => {
    if (!hoursByDay[h.weekday]) hoursByDay[h.weekday] = [];
    hoursByDay[h.weekday].push(h);
  });

  return (
    <div className={`rounded-xl sm:rounded-xl overflow-hidden max-w-3xl mx-auto border ${
      darkMode 
        ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
        : 'bg-white shadow-sm border-gray-100'
    }`}>
      <div className={`p-6 border-b ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-100'}`}>
        <h2 className={`text-xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('title')}</h2>
        <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('subtitle')}</p>
      </div>
      
      <div className={`divide-y ${darkMode ? 'divide-[var(--dark-600)]' : 'divide-gray-100'}`}>
        {days.map((dayName, index) => {
          const dayNum = index + 1; // 1 = Monday
          const isToday = dayNum === currentDayIso;
          const dayHours = hoursByDay[dayNum] || [];

          return (
            <div 
              key={dayName} 
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors
                ${isToday 
                  ? darkMode 
                    ? 'bg-[var(--brand-primary)]/10' 
                    : 'bg-blue-50/50' 
                  : darkMode 
                    ? 'hover:bg-[var(--dark-700)]' 
                    : 'hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center mb-2 sm:mb-0 w-32">
                <span className={`font-medium ${
                  isToday 
                    ? darkMode 
                      ? 'text-[var(--brand-primary)] font-bold' 
                      : 'text-blue-700 font-bold' 
                    : darkMode 
                      ? 'text-[var(--brand-light)]' 
                      : 'text-gray-900'
                }`}>
                  {dayName}
                </span>
                {isToday && (
                  <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wide ${
                    darkMode 
                      ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {t('today')}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1">
                {dayHours.length > 0 ? (
                  dayHours.map((slot) => {
                    const restriction = getRestrictionLabel(slot);
                    return (
                      <div key={slot.id} className="flex items-center justify-between sm:justify-start sm:space-x-4 flex-wrap gap-2">
                        <span className={`font-mono text-sm ${
                          darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-800'
                        }`}>
                          {slot.open_time.slice(0, 5)} - {slot.close_time.slice(0, 5)}
                        </span>
                        {restriction && (
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            darkMode 
                              ? 'bg-[var(--brand-peach)]/10 text-[var(--brand-peach)] border-[var(--brand-peach)]/30' 
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                            {restriction}
                          </span>
                        )}
                        {slot.title && (
                          <span className={`text-xs italic ${
                            darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                          }`}>
                            ({slot.title})
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className={`text-sm italic ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('closed')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
