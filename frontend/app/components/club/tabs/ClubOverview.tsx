import React from 'react';
import { Club } from '@/types/organization';
import ClubFeed from '../ClubFeed';

interface ClubOverviewProps {
  club: Club;
  onChangeTab: (tab: 'overview' | 'groups' | 'hours' | 'events' | 'policies' | 'contact') => void;
}

export default function ClubOverview({ club, onChangeTab }: ClubOverviewProps) {
  
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Info & Stats */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
        
        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Club Status
            </h3>
            
            <div className="flex items-center space-x-3 mb-6">
              <span className={`relative flex h-4 w-4`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${openStatus ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 ${openStatus ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              <span className={`font-medium ${openStatus ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {openStatus ? 'Open Now' : 'Closed'}
              </span>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {club.address && (
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{club.address}</span>
                </div>
              )}
              
              {club.phone && (
                 <div className="flex items-center">
                   <svg className="w-5 h-5 mr-2 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                   </svg>
                   <span>{club.phone}</span>
                 </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
              <button 
                onClick={() => onChangeTab('hours')}
                className="px-3 py-2 text-xs font-medium text-center text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
              >
                View Hours
              </button>
              <button 
                onClick={() => onChangeTab('contact')}
                className="px-3 py-2 text-xs font-medium text-center text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 transition-colors"
              >
                Map & Contact
              </button>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-6">
            {club.description}
          </p>
        </div>

      </div>

      {/* RIGHT COLUMN: Feed */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex items-center justify-between">
           <h2 className="text-xl font-bold text-gray-900 dark:text-white">Latest Updates</h2>
           {/* Future: Add 'Filter' dropdown here if needed */}
        </div>
        
        <ClubFeed clubId={club.id} />
      </div>

    </div>
  );
}

