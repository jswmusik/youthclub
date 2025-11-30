'use client';

import { useRouter } from 'next/navigation';
import { getMediaUrl } from '@/app/utils';

interface Club {
  id: number;
  name: string;
  avatar: string | null;
  hero_image: string | null;
  municipality_name: string;
}

interface GroupMembership {
  id: number;
  group_id: number;
  group_name: string;
  group_avatar: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  role: string;
}

interface ClubsAndGroupsProps {
  user: any; 
}

export default function ClubsAndGroups({ user }: ClubsAndGroupsProps) {
  const router = useRouter();
  const homeClub = user.preferred_club as Club;
  // Ensure we have an array even if backend returns null/undefined
  const followedClubs = (user.followed_clubs || []).filter((c: Club) => c.id !== homeClub?.id);
  const memberships: GroupMembership[] = user.my_memberships || [];
  
  const activeGroups = memberships.filter(m => m.status === 'APPROVED');
  const pendingGroups = memberships.filter(m => m.status === 'PENDING');

  const goToClub = (id: number) => router.push(`/dashboard/youth/club/${id}`);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. CLUBS SECTION */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          My Clubs
        </h3>

        <div className="grid grid-cols-1 gap-6">
          {/* HOME CLUB CARD (Prominent) */}
          {homeClub ? (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                HOME CLUB
              </div>
              <div className="h-32 bg-gray-200 relative">
                {homeClub.hero_image ? (
                  <img src={getMediaUrl(homeClub.hero_image)} className="w-full h-full object-cover" alt={homeClub.name} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-600 to-blue-400" />
                )}
              </div>
              <div className="p-5 pt-12 relative">
                <div className="absolute -top-10 left-5 w-20 h-20 rounded-xl border-4 border-white bg-white shadow-md overflow-hidden">
                  {homeClub.avatar ? (
                    <img src={getMediaUrl(homeClub.avatar)} className="w-full h-full object-cover" alt={homeClub.name} />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl">🏠</div>
                  )}
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{homeClub.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <span className="text-blue-500">📍</span> {homeClub.municipality_name}
                    </p>
                  </div>
                  <button 
                    onClick={() => goToClub(homeClub.id)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
                  >
                    Visit Page
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">No Home Club selected.</div>
          )}

          {/* FOLLOWED CLUBS (Smaller Cards) */}
          {followedClubs.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Following</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {followedClubs.map((club: Club) => (
                  <div 
                    key={club.id} 
                    onClick={() => goToClub(club.id)}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                      {club.avatar ? (
                        <img src={getMediaUrl(club.avatar)} className="w-full h-full object-cover" alt={club.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                          {club.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-gray-900 truncate">{club.name}</h5>
                      <p className="text-xs text-gray-500 truncate">{club.municipality_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* 2. GROUPS SECTION */}
      <section>
        <div className="flex justify-between items-end mb-4">
           <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
             <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             My Groups
           </h3>
           {activeGroups.length > 0 && (
             <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
               {activeGroups.length} Active
             </span>
           )}
        </div>

        {activeGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGroups.map((membership) => (
              <div key={membership.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-purple-300 transition cursor-pointer group">
                 <div className="w-12 h-12 bg-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {membership.group_avatar ? (
                      <img src={getMediaUrl(membership.group_avatar)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-purple-600 font-bold text-lg">{membership.group_name.charAt(0)}</span>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-gray-900 truncate group-hover:text-purple-700 transition">{membership.group_name}</h5>
                    <p className="text-xs text-gray-500">{membership.role === 'ADMIN' ? 'Group Admin' : 'Member'}</p>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
             <p className="text-gray-500 mb-2">You haven't joined any groups yet.</p>
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

