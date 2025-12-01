'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProfileTabs from './ProfileTabs';
import { getMediaUrl } from '@/app/utils';
import ActivityFeed from './tabs/ActivityFeed';
import ClubsAndGroups from './tabs/ClubsAndGroups';
import WalletGrid from './tabs/WalletGrid';
import YouthGuardianManager from '../youth/guardians/YouthGuardianManager';

const VALID_TABS = ['overview', 'clubs', 'guardians', 'wallet', 'timeline'];

export default function ProfileContent({ user }: { user: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial tab from URL, default to 'overview'
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without page refresh
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync with URL on mount/change (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== 'overview') {
      // If no tab in URL and we're not on overview, reset to overview
      setActiveTab('overview');
    }
  }, [searchParams]);

  // Helper to calculate age from DOB
  const getAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab user={user} getAge={getAge} onSwitchTab={handleTabChange} />;
      case 'clubs':
        return <ClubsAndGroups user={user} />;
      case 'guardians':
        return <YouthGuardianManager />;
      case 'wallet':
        return <WalletGrid user={user} />;
      case 'timeline':
        // Reuse the same feed component for the dedicated tab
        return <ActivityFeed />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* 1. The Navigation Bar */}
      <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 2. The Content Area */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {renderTabContent()}
      </div>
    </>
  );
}

// --- SUB-COMPONENTS (We can move these to separate files later) ---

function OverviewTab({ user, getAge, onSwitchTab }: { user: any, getAge: (d: string) => number | null, onSwitchTab: (t: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Intro & Stats */}
      <div className="md:col-span-1 space-y-6 md:sticky md:top-[120px] md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        
        {/* About Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">About</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span>Member of <strong>{user.preferred_club?.name || 'No Club'}</strong></span>
            </div>
            
            {user.grade && (
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span>Grade {user.grade}</span>
              </div>
            )}

            {user.date_of_birth && (
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" /></svg>
                <span>{getAge(user.date_of_birth)} years old</span>
              </div>
            )}
            
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>Joined {new Date(user.date_joined).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Interests Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Interests</h3>
              <span className="text-xs text-blue-600 cursor-pointer hover:underline">Edit</span>
           </div>
           <div className="flex flex-wrap gap-2">
              {(!user.interests || user.interests.length === 0) && (
                <p className="text-sm text-gray-400 italic">No interests added yet.</p>
              )}
              {/* Render interest chips - interests should now come as objects with name property */}
              {user.interests && user.interests.map((interest: any) => {
                // Handle both object format {id, name, icon, avatar} and legacy ID format
                const interestId = typeof interest === 'object' ? interest.id : interest;
                const interestName = typeof interest === 'object' ? interest.name : null;
                
                return (
                  <span key={interestId} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {interestName || `Interest ${interestId}`}
                  </span>
                );
              })}
           </div>
        </div>

        {/* Guardians Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">My Guardians</h3>
            {/* Manage Button */}
            <button 
                onClick={() => onSwitchTab('guardians')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
                Manage
            </button>
          </div>
          
          <div className="space-y-3">
            {/* We map guardians here. If none, show placeholder */}
            {(!user.guardians || user.guardians.length === 0) ? (
               <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 mb-2">No guardians linked.</p>
                  <button 
                    onClick={() => onSwitchTab('guardians')}
                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Add Guardian
                  </button>
               </div>
            ) : (
               user.guardians.map((guardian: any) => {
                 // Handle both object format and legacy ID format
                 const guardianId = typeof guardian === 'object' ? guardian.id : guardian;
                 const firstName = typeof guardian === 'object' ? guardian.first_name : '';
                 const lastName = typeof guardian === 'object' ? guardian.last_name : '';
                 const avatar = typeof guardian === 'object' ? guardian.avatar : null;
                 
                 // Get initials from first and last name
                 const getInitials = (first: string, last: string) => {
                   const firstInitial = first ? first.charAt(0).toUpperCase() : '';
                   const lastInitial = last ? last.charAt(0).toUpperCase() : '';
                   return firstInitial + lastInitial || 'G';
                 };
                 
                 const initials = getInitials(firstName, lastName);
                 const fullName = firstName && lastName ? `${firstName} ${lastName}` : `Guardian #${guardianId}`;
                 
                 return (
                   <div key={guardianId} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition">
                     {avatar ? (
                       <img src={getMediaUrl(avatar) || ''} alt={fullName} className="w-10 h-10 rounded-full object-cover" />
                     ) : (
                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                         {initials}
                       </div>
                     )}
                     <div>
                       <p className="text-sm font-medium text-gray-900">{fullName}</p>
                       <p className="text-xs text-gray-500">Parent/Guardian</p>
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Activity Feed */}
      <div className="md:col-span-2">
        {/* Added the dynamic Feed */}
        <ActivityFeed showTimeFilter={false} />
      </div>
    </div>
  );
}

