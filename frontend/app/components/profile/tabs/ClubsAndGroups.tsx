'use client';

import { useRouter } from 'next/navigation';
import { getMediaUrl } from '@/app/utils';

interface GroupMembership {
  id: number;
  group_id: number;
  group_name: string;
  group_avatar: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  role: string;
}

interface ClubsAndGroupsProps {
  user: any; // Using any to match your current pattern, ideally strictly typed later
}

export default function ClubsAndGroups({ user }: ClubsAndGroupsProps) {
  const router = useRouter();
  const primaryClub = user.preferred_club;
  const memberships: GroupMembership[] = user.my_memberships || [];
  
  const activeGroups = memberships.filter(m => m.status === 'APPROVED');
  const pendingGroups = memberships.filter(m => m.status === 'PENDING');
  
  const handleClubClick = () => {
    if (primaryClub?.id) {
      router.push(`/dashboard/youth/club/${primaryClub.id}`);
    }
  };
  
  const handleContactClick = () => {
    if (primaryClub?.id) {
      router.push(`/dashboard/youth/club/${primaryClub.id}?tab=contact`);
    }
  };
  
  const handleHoursClick = () => {
    if (primaryClub?.id) {
      router.push(`/dashboard/youth/club/${primaryClub.id}?tab=hours`);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. PRIMARY CLUB SECTION */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          My Youth Club
        </h3>
        
        {primaryClub ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
            {/* Hero Image */}
            <div className="h-32 md:h-40 bg-gray-200 relative">
               {primaryClub?.hero_image ? (
                 <img 
                   src={getMediaUrl(primaryClub.hero_image)} 
                   alt={primaryClub?.name || 'Club'}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600" />
               )}
               <div className="absolute inset-0 bg-black/10" />
            </div>
            
            <div className="p-6 relative">
               {/* Club Avatar (Floating) */}
               <button
                 onClick={handleClubClick}
                 className="absolute -top-10 left-6 cursor-pointer hover:scale-105 transition-transform"
               >
                 <div className="w-20 h-20 bg-white rounded-xl shadow-md p-1">
                   {primaryClub.avatar ? (
                     <img 
                       src={getMediaUrl(primaryClub.avatar)} 
                       className="w-full h-full object-cover rounded-lg"
                       alt={primaryClub?.name || 'Club'}
                     />
                   ) : (
                     <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-2xl">
                       {primaryClub?.name?.charAt(0) || 'C'}
                     </div>
                   )}
                 </div>
               </button>

               <div className="ml-24 pt-1">
                 <button
                   onClick={handleClubClick}
                   className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left"
                 >
                   {primaryClub?.name || 'Club'}
                 </button>
                 <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   {primaryClub?.municipality_name || 'Municipality'}
                 </p>
               </div>
               
               <div className="mt-6 flex gap-3">
                 <button 
                   onClick={handleHoursClick}
                   className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium transition border border-gray-200"
                 >
                    Opening Hours
                 </button>
                 <button 
                   onClick={handleContactClick}
                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200"
                 >
                    Contact Club
                 </button>
               </div>
            </div>
          </div>
        ) : (
           <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
              You haven't joined a club yet.
           </div>
        )}
      </section>

      {/* 2. GROUPS SECTION */}
      <section>
        <div className="flex justify-between items-end mb-4">
           <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
             <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             My Groups
           </h3>
           <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
             {activeGroups.length} Active
           </span>
        </div>

        {activeGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGroups.map((membership) => (
              <div key={membership.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-blue-300 transition cursor-pointer group">
                 <div className="w-12 h-12 bg-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {membership.group_avatar ? (
                      <img src={getMediaUrl(membership.group_avatar)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-purple-600 font-bold text-lg">{membership.group_name.charAt(0)}</span>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition">{membership.group_name}</h5>
                    <p className="text-xs text-gray-500">{membership.role === 'ADMIN' ? 'Group Admin' : 'Member'}</p>
                 </div>
                 <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
             <p className="text-gray-500 mb-2">You haven't joined any groups yet.</p>
             <button className="text-sm text-blue-600 font-medium hover:underline">Browse Public Groups</button>
          </div>
        )}
        
        {/* Pending Section (Only shows if there are pending groups) */}
        {pendingGroups.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Pending Approvals</h4>
            <div className="space-y-3">
               {pendingGroups.map(membership => (
                 <div key={membership.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                          {membership.group_avatar ? (
                            <img src={getMediaUrl(membership.group_avatar)} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <span className="text-gray-500 font-bold text-xs">{membership.group_name.charAt(0)}</span>
                          )}
                       </div>
                       <span className="text-sm font-medium text-gray-700">{membership.group_name}</span>
                    </div>
                    <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                       Pending
                    </span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

