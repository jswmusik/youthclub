'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Building2, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getMediaUrl } from '@/app/utils';

interface GuardianClubsProps {
  user: any;
  childrenData: any[];
  darkMode?: boolean;
}

export default function GuardianClubs({ user, childrenData, darkMode = false }: GuardianClubsProps) {
  const t = useTranslations('profile');

  // Helper to get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get unique clubs from guardian's followed clubs and children's clubs
  const getUniqueClubs = () => {
    const clubMap = new Map();

    // Add Guardian's followed clubs
    user.followed_clubs?.forEach((club: any) => {
      if (!clubMap.has(club.id)) {
        clubMap.set(club.id, { ...club, reasons: [t('followedByYou') || 'Followed by you'] });
      }
    });

    // Add Children's preferred clubs
    childrenData.forEach(child => {
      // Add preferred club (home club)
      if (child.preferred_club) {
        if (!clubMap.has(child.preferred_club.id)) {
          clubMap.set(child.preferred_club.id, { 
            ...child.preferred_club, 
            reasons: [`${child.first_name}'s home club`] 
          });
        } else {
          const existing = clubMap.get(child.preferred_club.id);
          if (!existing.reasons.includes(`${child.first_name}'s home club`)) {
            existing.reasons.push(`${child.first_name}'s home club`);
          }
        }
      }
      
      // Add children's followed clubs
      child.followed_clubs?.forEach((club: any) => {
        if (!clubMap.has(club.id)) {
          clubMap.set(club.id, { 
            ...club, 
            reasons: [`Followed by ${child.first_name}`] 
          });
        } else {
          const existing = clubMap.get(club.id);
          const reason = `Followed by ${child.first_name}`;
          if (!existing.reasons.includes(reason)) {
            existing.reasons.push(reason);
          }
        }
      });
    });

    return Array.from(clubMap.values());
  };

  const clubs = getUniqueClubs();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Children's Clubs */}
      <div className="md:col-span-1 space-y-6 md:sticky md:top-[120px] md:self-start">
        
        {/* Home Municipality Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
          }`}>
            <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'}`}></span>
            {t('homeAssignment') || 'Home Assignment'}
          </h3>
          
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${
            darkMode 
              ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
              : 'bg-white border-[#4D4DA4]/15 shadow-sm'
          }`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              darkMode 
                ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4]'
            }`}>
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                {user.assigned_municipality?.name || t('noMunicipality') || 'No Municipality'}
              </h4>
              <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                {t('yourRegion') || 'Your administrative region'}
              </p>
            </div>
          </div>
        </div>

        {/* Children Summary Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'
          }`}>
            <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-third)]' : 'bg-[#10B981]'}`}></span>
            {t('childrenClubMembership') || "Children's Memberships"}
          </h3>
          
          <div className="space-y-3">
            {childrenData.length > 0 ? childrenData.map((child: any) => (
              <div key={child.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                darkMode 
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'bg-white border-[#4D4DA4]/15 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                  darkMode 
                    ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                    : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4]'
                }`}>
                  {getInitials(child.first_name || 'C')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {child.first_name}
                  </p>
                  <p className={`text-xs truncate ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                    {child.preferred_club?.name || t('noClubAssigned') || 'No club assigned'}
                  </p>
                </div>
              </div>
            )) : (
              <div className={`text-center py-6 rounded-xl border-2 border-dashed ${
                darkMode 
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'bg-white border-[#4D4DA4]/15'
              }`}>
                <Users className={`w-10 h-10 mx-auto mb-2 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                  {t('noChildrenLinked') || 'No children linked'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: All Clubs */}
      <div className="md:col-span-2">
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <div className="flex justify-between items-center mb-5">
            <h3 className={`text-xl font-bold flex items-center gap-3 font-heading ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
            }`}>
              <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'}`}></span>
              <Building2 className="w-5 h-5" />
              {t('followedClubs') || 'Followed Clubs'}
            </h3>
            <Link 
              href="/dashboard/guardian/clubs" 
              className={`text-xs font-bold flex items-center gap-1 ${
                darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' : 'text-[var(--brand-primary)] hover:text-[#4D4DA4]'
              }`}
            >
              {t('findMore') || 'Find More'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {clubs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clubs.map((club: any) => (
                <Link href={`/dashboard/guardian/club/${club.id}`} key={club.id}>
                  <div className={`group p-4 rounded-xl border-2 transition-all ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                      : 'bg-white border-[#4D4DA4]/20 hover:border-[#4D4DA4]/40 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-4">
                      {club.avatar ? (
                        <img 
                          src={getMediaUrl(club.avatar) || ''} 
                          alt={club.name}
                          className={`w-14 h-14 rounded-xl object-cover border-2 ${
                            darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/20'
                          }`}
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          darkMode 
                            ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                            : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4]'
                        }`}>
                          <Building2 className="w-7 h-7 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold truncate ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}>
                          {club.name}
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {club.reasons.map((reason: string, idx: number) => (
                            <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              darkMode 
                                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/70' 
                                : 'bg-[#EBEBFE] text-[#4D4DA4]'
                            }`}>
                              {reason}
                            </span>
                          ))}
                        </div>
                        {club.municipality && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                            {club.municipality.name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                        darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                      }`} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
              darkMode 
                ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                : 'bg-white border-[#4D4DA4]/15'
            }`}>
              <Building2 className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
              <p className={`mb-3 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                {t('noClubsFollowed') || 'You are not following any clubs yet.'}
              </p>
              <Link 
                href="/dashboard/guardian/clubs" 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  darkMode
                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80'
                    : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md hover:shadow-lg'
                }`}
              >
                {t('findClubs') || 'Find clubs to follow'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
