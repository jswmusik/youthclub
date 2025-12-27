'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Group } from '@/types/organization';

interface ClubGroupsProps {
  clubId: number;
  darkMode?: boolean;
}

// Helper Component: Badges (same as groups search page)
const StatusBadge = ({ status, darkMode = false }: { status: string; darkMode?: boolean }) => {
    const t = useTranslations('club.groups');
    const styles = darkMode ? {
        APPROVED: "bg-[var(--brand-third)]/20 text-[var(--brand-third)] border-[var(--brand-third)]/30",
        PENDING: "bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30",
        REJECTED: "bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30"
    } : {
        APPROVED: "bg-green-100 text-green-700 border-green-200",
        PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
        REJECTED: "bg-red-100 text-red-700 border-red-200"
    };
    return (
        <span className={`text-xs px-2 py-1 rounded border font-medium ${styles[status as keyof typeof styles] || (darkMode ? "bg-[var(--dark-700)]" : "bg-gray-100")}`}>
            {status === 'APPROVED' ? t('member') : status === 'PENDING' ? t('pending') : status === 'REJECTED' ? t('rejected') : status}
        </span>
    );
};

const IneligibleTooltip = ({ reasons, darkMode = false }: { reasons: string[]; darkMode?: boolean }) => {
    const t = useTranslations('club.groups');
    return (
        <div className="absolute top-2 right-2 group z-10">
            <div className={`text-xs px-2 py-1 rounded border cursor-help shadow-sm flex items-center gap-1 ${
              darkMode 
                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]' 
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span>{t('restricted')}</span>
            </div>
            <div className={`absolute right-0 mt-1 w-48 p-3 text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
              darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-800 text-white'
            }`}>
                <p className="font-bold mb-1">{t('requirementsNotMet')}</p>
                <ul className="list-disc pl-3 space-y-1">
                    {reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
};

export default function ClubGroups({ clubId, darkMode = false }: ClubGroupsProps) {
  const router = useRouter();
  const t = useTranslations('club.groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Fetches groups for this specific club.
      // The backend serializer includes eligibility and membership_status
      const response = await api.get(`/groups/?club=${clubId}`);
      const groupsData = response.data.results || response.data;
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      console.error("Failed to load groups", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) fetchGroups();
  }, [clubId]);

  const handleJoin = async (groupId: number) => {
    try {
      const res = await api.post(`/groups/${groupId}/join/`);
      alert(res.data.message || t('successfullyJoined'));
      // Refresh groups to update membership status
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedToJoin'));
    }
  };

  if (loading) return (
    <div className={`py-12 text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
      <div className={`rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto animate-spin ${
        darkMode ? 'border-[var(--brand-primary)]' : 'border-blue-500'
      }`}></div>
      <p className="mt-4">{t('loadingGroups')}</p>
    </div>
  );

  if (groups.length === 0) {
    return (
      <div className={`text-center py-20 rounded-xl border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white border-gray-200'
      }`}>
        <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 ${
          darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'
        }`}>
          <svg className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2h5m2-16a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2V4z" />
          </svg>
        </div>
        <h3 className={`text-lg font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('noGroupsFound')}</h3>
        <p className={`mt-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('noGroupsMessage')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h2 className={`text-xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('title')}</h2>
        <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('description')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {groups.map(group => {
            // Use membership_status if available, otherwise fall back to user_status
            // membership_status can be a string OR an object with {status, rejection_count}
            let membershipStatus: string | null = null;
            if (group.membership_status) {
                // Handle both string and object formats
                if (typeof group.membership_status === 'string') {
                    membershipStatus = group.membership_status;
                } else if (typeof group.membership_status === 'object' && group.membership_status.status) {
                    membershipStatus = group.membership_status.status;
                }
            } else if (group.user_status === 'APPROVED') {
                membershipStatus = 'APPROVED';
            } else if (group.user_status === 'PENDING') {
                membershipStatus = 'PENDING';
            }
            const isEligible = group.eligibility?.is_eligible ?? true;
            const isMember = !!membershipStatus;
            
            // Visual Style: Gray out if ineligible AND not already a member
            const cardStyle = (!isEligible && !isMember) ? 'opacity-70 grayscale-[0.3]' : 'opacity-100';

            return (
                <div key={group.id} className={`rounded-xl overflow-hidden flex flex-col transition-all border ${cardStyle} ${
                  darkMode 
                    ? 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' 
                    : 'bg-white shadow-sm border-gray-200 hover:shadow-md'
                }`}>
                    {/* Header Image */}
                    <div className={`h-32 relative ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-200'}`}>
                        {group.background_image ? (
                            <img src={group.background_image} alt={group.name} className="w-full h-full object-cover" />
                        ) : group.avatar ? (
                            <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              darkMode 
                                ? 'bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]' 
                                : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                            }`}>
                                 <span className="text-4xl">👥</span>
                            </div>
                        )}
                        
                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex gap-1">
                            {group.group_type !== 'OPEN' && (
                                <span className={`backdrop-blur-sm text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                  darkMode 
                                    ? 'bg-[var(--dark-900)]/70 text-[var(--brand-light)]' 
                                    : 'bg-black/50 text-white'
                                }`}>
                                    {group.group_type === 'CLOSED' ? t('private') : t('application')}
                                </span>
                            )}
                        </div>

                        {/* Ineligibility Tooltip */}
                        {!isEligible && !isMember && group.eligibility?.reasons && (
                            <IneligibleTooltip reasons={group.eligibility.reasons} darkMode={darkMode} />
                        )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-3">
                            <h3 className={`font-bold text-lg leading-tight font-heading ${
                              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                            }`}>{group.name}</h3>
                            {group.club_name && (
                                <p className={`text-xs font-medium mt-1 ${
                                  darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-600'
                                }`}>
                                    {t('club')} {group.club_name}
                                </p>
                            )}
                        </div>
                        
                        <p className={`text-sm mb-4 line-clamp-2 flex-1 ${
                          darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                        }`}>
                            {group.description || <span className={`italic ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('noDescriptionAvailable')}</span>}
                        </p>

                        {/* Footer Action */}
                        <div className={`mt-auto pt-4 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-100'}`}>
                            {membershipStatus ? (
                                <div className="flex justify-between items-center">
                                    <StatusBadge status={membershipStatus} darkMode={darkMode} />
                                    <button 
                                        onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                                        className={`text-xs hover:underline ${
                                          darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-600'
                                        }`}
                                    >
                                        {t('visitGroup')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleJoin(group.id)}
                                    disabled={!isEligible}
                                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                                        isEligible 
                                        ? darkMode
                                          ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                                        : darkMode
                                          ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-600)]' 
                                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    }`}
                                >
                                    {isEligible 
                                        ? (group.group_type === 'OPEN' ? t('joinGroup') : t('applyToJoin')) 
                                        : t('unavailable')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}
