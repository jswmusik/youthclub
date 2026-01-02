'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { Building2, Home, MapPin, Users } from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';


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
  darkMode?: boolean;
}

export default function ClubsAndGroups({ user, darkMode = false }: ClubsAndGroupsProps) {
  const router = useRouter();
  const t = useTranslations('clubsAndGroups');
  const tCommon = useTranslations('common');
  const [leavingGroupId, setLeavingGroupId] = useState<number | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; membershipId: number; name: string } | null>(null);
  const homeClub = user.preferred_club as Club;
  // Ensure we have an array even if backend returns null/undefined
  const followedClubs = (user.followed_clubs || []).filter((c: Club) => c.id !== homeClub?.id);
  const memberships: GroupMembership[] = user.my_memberships || [];
  
  const activeGroups = memberships.filter(m => m.status === 'APPROVED');
  const pendingGroups = memberships.filter(m => m.status === 'PENDING');

  const goToClub = (id: number) => router.push(`/dashboard/youth/club/${id}`);
  const goToGroup = (id: number) => router.push(`/dashboard/youth/groups/${id}`);
  
  const openLeaveModal = (groupId: number, membershipId: number, groupName: string) => {
    setSelectedGroup({ id: groupId, membershipId, name: groupName });
    setShowLeaveModal(true);
  };
  
  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    
    setLeavingGroupId(selectedGroup.id);
    try {
      await api.delete(`/groups/${selectedGroup.id}/memberships/${selectedGroup.membershipId}/`);
      setShowLeaveModal(false);
      // Refresh the page to update the groups list
      router.refresh();
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert(t('failedToLeaveGroup'));
    } finally {
      setLeavingGroupId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. CLUBS SECTION */}
      <section>
        <h3 className={`text-xl font-bold mb-4 flex items-center gap-3 font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>
          <Building2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
          {t('myClubs')}
        </h3>

        <div className="grid grid-cols-1 gap-6">
          {/* HOME CLUB CARD (Prominent) */}
          {homeClub ? (
            <div className={`overflow-hidden relative ${
              darkMode 
                ? 'bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)]' 
                : 'bg-white rounded-xl shadow-sm border border-[#4D4DA4]/30'
            }`}>
              <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg z-10 ${
                darkMode 
                  ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)]' 
                  : 'bg-[#4D4DA4] text-white'
              }`}>
                {t('homeClub')}
              </div>
              <div className="h-32 relative">
                {homeClub.hero_image ? (
                  <img src={getMediaUrl(homeClub.hero_image)} className="w-full h-full object-cover" alt={homeClub.name} />
                ) : (
                  <div className={`w-full h-full ${
                    darkMode 
                      ? 'bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                      : 'bg-gradient-to-r from-[#4D4DA4] to-[#FF5485]'
                  }`} />
                )}
              </div>
              <div className="p-5 pt-12 relative">
                <div className={`absolute -top-10 left-5 w-20 h-20 rounded-xl border-4 overflow-hidden ${
                  darkMode 
                    ? 'border-[var(--dark-800)] bg-[var(--dark-700)]' 
                    : 'border-white bg-white shadow-md'
                }`}>
                  {homeClub.avatar ? (
                    <img src={getMediaUrl(homeClub.avatar)} className="w-full h-full object-cover" alt={homeClub.name} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'
                    }`}>
                      <Home className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{homeClub.name}</h4>
                    <p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                      <MapPin className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#6D6DD4]'}`} /> {homeClub.municipality_name}
                    </p>
                  </div>
                  <button 
                    onClick={() => goToClub(homeClub.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                      darkMode 
                        ? 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]/80 border border-[var(--dark-400)]' 
                        : 'bg-[#F8F7FE] hover:bg-[#EBEBFE] text-gray-700 border border-[#4D4DA4]/15'
                    }`}
                  >
                    {t('visitPage')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${
              darkMode 
                ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                : 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
            }`}>{t('noHomeClubSelected')}</div>
          )}

          {/* FOLLOWED CLUBS (Smaller Cards) */}
          {followedClubs.length > 0 && (
            <div>
              <h4 className={`text-sm font-bold uppercase tracking-wide mb-3 ${
                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
              }`}>{t('following')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {followedClubs.map((club: Club) => (
                  <div 
                    key={club.id} 
                    onClick={() => goToClub(club.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition cursor-pointer ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                        : 'bg-white border border-[#4D4DA4]/15 hover:shadow-md hover:border-[#4D4DA4]/40'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden ${
                      darkMode 
                        ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
                        : 'bg-[#F8F7FE] border border-[#4D4DA4]/15'
                    }`}>
                      {club.avatar ? (
                        <img src={getMediaUrl(club.avatar)} className="w-full h-full object-cover" alt={club.name} />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-bold ${
                          darkMode ? 'text-[var(--brand-purple)]' : 'text-gray-500'
                        }`}>
                          {club.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className={`font-bold truncate ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{club.name}</h5>
                      <p className={`text-xs truncate ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{club.municipality_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <hr className={darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'} />

      {/* 2. GROUPS SECTION */}
      <section>
        <div className="flex justify-between items-end mb-4">
           <h3 className={`text-xl font-bold flex items-center gap-3 font-heading ${
             darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
           }`}>
             <Users className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
             {t('myGroups')}
           </h3>
           {activeGroups.length > 0 && (
             <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
               darkMode 
                 ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30' 
                 : 'bg-[#FF5485]/20 text-[#FF5485] border border-[#FF5485]/30'
             }`}>
               {activeGroups.length} {t('active')}
             </span>
           )}
        </div>

        {activeGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGroups.map((membership) => (
              <div key={membership.id} className={`p-4 transition group ${
                darkMode 
                  ? 'bg-[var(--dark-700)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                  : 'bg-white rounded-xl border border-[#4D4DA4]/15 shadow-sm hover:border-[#FF5485]/40'
              }`}>
                <div 
                  onClick={() => goToGroup(membership.group_id)}
                  className="flex items-center gap-4 cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${
                    darkMode 
                      ? 'bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30' 
                      : 'bg-[#FF5485]/20'
                  }`}>
                    {membership.group_avatar ? (
                      <img src={getMediaUrl(membership.group_avatar)} className="w-full h-full object-cover" />
                    ) : (
                      <span className={`font-bold text-lg ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`}>{membership.group_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`font-bold truncate transition ${
                      darkMode 
                        ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]' 
                        : 'text-gray-800 group-hover:text-[#FF5485]'
                    }`}>{membership.group_name}</h5>
                    <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{membership.role === 'ADMIN' ? t('groupAdmin') : t('member')}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openLeaveModal(membership.group_id, membership.id, membership.group_name);
                  }}
                  disabled={leavingGroupId === membership.group_id}
                  className={`mt-3 w-full px-3 py-2 text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] bg-[var(--dark-600)] hover:bg-[var(--brand-red)]/10 border border-[var(--dark-400)] hover:border-[var(--brand-red)]/30' 
                      : 'text-gray-600 hover:text-red-600 bg-[#F8F7FE] hover:bg-red-50 border border-[#4D4DA4]/15 hover:border-red-300'
                  }`}
                >
                  {t('leaveGroup')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 rounded-xl border border-dashed ${
            darkMode 
              ? 'bg-[var(--dark-700)] border-[var(--dark-400)]' 
              : 'bg-white border-gray-300'
          }`}>
             <p className={darkMode ? 'text-[var(--brand-light)]/60 mb-2' : 'text-gray-600 mb-2'}>{t('noGroupsJoined')}</p>
          </div>
        )}
        
        {/* Pending Section (Only shows if there are pending groups) */}
        {pendingGroups.length > 0 && (
          <div className="mt-6">
            <h4 className={`text-sm font-bold uppercase tracking-wide mb-3 ${
              darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
            }`}>{t('pendingApprovals')}</h4>
            <div className="space-y-3">
               {pendingGroups.map(membership => (
                 <div key={membership.id} className={`flex items-center justify-between p-3 rounded-lg ${
                   darkMode 
                     ? 'bg-[var(--dark-700)] border border-[var(--brand-peach)]/30' 
                     : 'bg-white border border-yellow-500/30'
                 }`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                         darkMode 
                           ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
                           : 'bg-[#F8F7FE] border border-[#4D4DA4]/15'
                       }`}>
                          {membership.group_avatar ? (
                            <img src={getMediaUrl(membership.group_avatar)} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <span className={`font-bold text-xs ${darkMode ? 'text-[var(--brand-peach)]' : 'text-gray-600'}`}>{membership.group_name.charAt(0)}</span>
                          )}
                       </div>
                       <span className={`text-sm font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>{membership.group_name}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      darkMode 
                        ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                        : 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                    }`}>
                       {t('pending')}
                    </span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </section>

      {/* Leave Group Confirmation Modal */}
      <ConfirmationModal
        isVisible={showLeaveModal}
        onClose={() => {
          if (leavingGroupId !== selectedGroup?.id) {
            setShowLeaveModal(false);
            setSelectedGroup(null);
          }
        }}
        onConfirm={handleLeaveGroup}
        title={t('leaveGroupConfirm')}
        message={selectedGroup ? `${t('leaveGroupMessage')} ${selectedGroup.name}? ${t('leaveGroupWarning')}` : ''}
        confirmButtonText={leavingGroupId === selectedGroup?.id ? t('leaving') : t('leaveGroup')}
        cancelButtonText={tCommon('cancel')}
        isLoading={leavingGroupId === selectedGroup?.id}
        variant="danger"
        darkMode={darkMode}
      />
    </div>
  );
}

