import React from 'react';
import { Club, OpeningHour } from '@/types/organization';

interface ClubHoursProps {
  club: Club;
}

export default function ClubHours({ club }: ClubHoursProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get current day index (0=Sunday in JS, but API uses 1=Monday...7=Sunday)
  // Let's normalize to 1-7 for comparison
  const todayDate = new Date();
  const currentDayIso = todayDate.getDay() === 0 ? 7 : todayDate.getDay();

  // Helper to format restrictions
  const getRestrictionLabel = (hour: OpeningHour) => {
    const parts = [];
    if (hour.gender_restriction && hour.gender_restriction !== 'ALL') {
      parts.push(
        hour.gender_restriction === 'GIRLS' ? 'Girls Only' : 
        hour.gender_restriction === 'BOYS' ? 'Boys Only' : 'Other Gender'
      );
    }
    
    if (hour.restriction_mode === 'AGE' && hour.min_value && hour.max_value) {
      parts.push(`Age ${hour.min_value}-${hour.max_value}`);
    } else if (hour.restriction_mode === 'GRADE' && hour.min_value && hour.max_value) {
      parts.push(`Grades ${hour.min_value}-${hour.max_value}`);
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden max-w-3xl mx-auto">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Opening Hours</h2>
        <p className="text-sm text-gray-500">Regular weekly schedule</p>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {days.map((dayName, index) => {
          const dayNum = index + 1; // 1 = Monday
          const isToday = dayNum === currentDayIso;
          const dayHours = hoursByDay[dayNum] || [];

          return (
            <div 
              key={dayName} 
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors
                ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
              `}
            >
              <div className="flex items-center mb-2 sm:mb-0 w-32">
                <span className={`font-medium ${isToday ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-gray-200'}`}>
                  {dayName}
                </span>
                {isToday && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold uppercase tracking-wide">
                    Today
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1">
                {dayHours.length > 0 ? (
                  dayHours.map((slot) => {
                    const restriction = getRestrictionLabel(slot);
                    return (
                      <div key={slot.id} className="flex items-center justify-between sm:justify-start sm:space-x-4 flex-wrap gap-2">
                        <span className="text-gray-800 dark:text-gray-300 font-mono text-sm">
                          {slot.open_time.slice(0, 5)} - {slot.close_time.slice(0, 5)}
                        </span>
                        {restriction && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                            {restriction}
                          </span>
                        )}
                        {slot.title && (
                          <span className="text-xs text-gray-500 italic">
                            ({slot.title})
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-400 text-sm italic">Closed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

