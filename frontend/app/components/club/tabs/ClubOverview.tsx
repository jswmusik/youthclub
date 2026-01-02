import React from 'react';
import { useTranslations } from 'next-intl';
import { Club } from '@/types/organization';
import ClubFeed from '../ClubFeed';

interface ClubOverviewProps {
  club: Club;
  onChangeTab: (tab: 'overview' | 'groups' | 'hours' | 'events' | 'policies' | 'contact') => void;
  darkMode?: boolean;
}

export default function ClubOverview({ club, onChangeTab, darkMode = false }: ClubOverviewProps) {
  const t = useTranslations('club.overview');
  
  // --- Open Now Logic ---
  const isOpenNow = () => {
    if (!club.regular_hours || club.regular_hours.length === 0) return false;

    const now = new Date();
    // JS getDay(): 0=Sun, 1=Mon... API weekday: 1=Mon, 7=Sun.
    // Convert JS day to API day:
    const currentWeekday = now.getDay() === 0 ? 7 : now.getDay();
    
    // Find hours for today
    const todaysHours = club.regular_hours.find(h => h.weekday === currentWeekday);

    if (!todaysHours) return false;

    // Parse times (HH:MM:SS)
    const [openH, openM] = todaysHours.open_time.split(':').map(Number);
    const [closeH, closeM] = todaysHours.close_time.split(':').map(Number);

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = openH * 60 + openM;
    const endTime = closeH * 60 + closeM;

    return currentTime >= startTime && currentTime < endTime;
  };

  const openStatus = isOpenNow();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
      
      {/* LEFT COLUMN: Info & Stats */}
      <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto px-4 sm:px-0">
        
        {/* Status Card */}
        <div className={`rounded-xl sm:rounded-xl overflow-hidden border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white shadow-sm border-[#4D4DA4]/10'
        }`}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold mb-4 font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>
              {t('clubStatus')}
            </h3>
            
            <div className="flex items-center space-x-3 mb-6">
              <span className="relative flex h-4 w-4">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  openStatus 
                    ? darkMode ? 'bg-[var(--brand-third)]' : 'bg-emerald-400' 
                    : darkMode ? 'bg-[var(--brand-red)]' : 'bg-red-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 ${
                  openStatus 
                    ? darkMode ? 'bg-[var(--brand-third)]' : 'bg-emerald-500' 
                    : darkMode ? 'bg-[var(--brand-red)]' : 'bg-red-500'
                }`}></span>
              </span>
              <span className={`font-medium ${
                openStatus 
                  ? darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-600' 
                  : darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'
              }`}>
                {openStatus ? t('openNow') : t('closed')}
              </span>
            </div>

            <div className={`space-y-3 text-sm ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
              {club.address && (
                <div className="flex items-start">
                  <svg className={`w-5 h-5 mr-2 shrink-0 mt-0.5 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{club.address}</span>
                </div>
              )}
              
              {club.phone && (
                 <div className="flex items-center">
                   <svg className={`w-5 h-5 mr-2 shrink-0 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                   </svg>
                   <span>{club.phone}</span>
                 </div>
              )}
            </div>

            <div className={`mt-6 pt-6 border-t grid grid-cols-2 gap-3 ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'
            }`}>
              <button 
                onClick={() => onChangeTab('hours')}
                className={`px-3 py-2 text-xs font-medium text-center rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20' 
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                {t('viewHours')}
              </button>
              <button 
                onClick={() => onChangeTab('contact')}
                className={`px-3 py-2 text-xs font-medium text-center rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' 
                    : 'text-gray-600 bg-[#F8F7FE] hover:bg-[#EBEBFE]'
                }`}
              >
                {t('mapAndContact')}
              </button>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className={`rounded-xl sm:rounded-xl p-6 border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white shadow-sm border-[#4D4DA4]/10'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
          }`}>{t('about')}</h3>
          <p className={`text-sm leading-relaxed line-clamp-6 ${
            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
          }`}>
            {club.description}
          </p>
        </div>

      </div>

      {/* RIGHT COLUMN: Feed */}
      <div className="lg:col-span-2">
        <div className={`p-4 rounded-none sm:rounded-xl border-y sm:border mb-4 sm:mb-6 flex items-center justify-between ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white shadow-sm border-[#4D4DA4]/10'
        }`}>
           <h2 className={`text-xl font-bold font-heading ${
             darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
           }`}>{t('latestUpdates')}</h2>
           {/* Future: Add 'Filter' dropdown here if needed */}
        </div>
        
        <ClubFeed clubId={club.id} darkMode={darkMode} />
      </div>

    </div>
  );
}
