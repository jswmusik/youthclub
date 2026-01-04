'use client';

import { useTranslations } from 'next-intl';
import { Building2, Calendar, CalendarDays, Users, Mail, Phone, MapPin, Activity } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import GuardianActivityFeed from './GuardianActivityFeed';

interface GuardianOverviewTabProps {
  user: any;
  darkMode?: boolean;
  onSwitchTab: (tab: string) => void;
}

export default function GuardianOverviewTab({ user, darkMode = false, onSwitchTab }: GuardianOverviewTabProps) {
  const t = useTranslations('profile');

  // Get initials from first and last name
  const getInitials = (first: string, last: string) => {
    const firstInitial = first ? first.charAt(0).toUpperCase() : '';
    const lastInitial = last ? last.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial || 'C';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: About & Children */}
      <div className="md:col-span-1 space-y-6 md:sticky md:top-[120px] md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        
        {/* About Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
          }`}>
            <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'}`}></span>
            {t('about') || 'About'}
          </h3>
          
          <div className="space-y-4 text-sm">
            {/* Email */}
            <div className={`flex items-center p-3 rounded-xl border ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
            }`}>
              <Mail className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
              <span className="truncate">{user.email}</span>
            </div>
            
            {/* Phone */}
            {user.phone_number && (
              <div className={`flex items-center p-3 rounded-xl border ${
                darkMode 
                  ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
              }`}>
                <Phone className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
                <span>{user.phone_number}</span>
              </div>
            )}

            {/* Municipality */}
            {user.assigned_municipality && (
              <div className={`flex items-center p-3 rounded-xl border ${
                darkMode 
                  ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
              }`}>
                <MapPin className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
                <span>{user.assigned_municipality.name}</span>
              </div>
            )}
            
            {/* Join Date */}
            <div className={`flex items-center p-3 rounded-xl border ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
            }`}>
              <CalendarDays className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
              <span>{t('joined') || 'Joined'} <strong className={darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}>{new Date(user.date_joined).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>

        {/* My Children Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <div className="flex justify-between items-center mb-5">
            <h3 className={`text-xl font-bold flex items-center gap-3 font-heading ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
            }`}>
              <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-third)]' : 'bg-[#10B981]'}`}></span>
              {t('myChildren') || 'My Children'}
            </h3>
            <span className={`text-xs font-bold ${
              darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
            }`}>
              {user.youth_members?.length || 0}
            </span>
          </div>
          
          <div className="space-y-3">
            {(!user.youth_members || user.youth_members.length === 0) ? (
              <div className={`text-center py-6 rounded-xl border-2 border-dashed ${
                darkMode 
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'bg-white border-[#4D4DA4]/30'
              }`}>
                <Users className={`w-10 h-10 mx-auto mb-2 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
                <p className={`text-sm mb-3 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                  {t('noChildrenLinked') || 'No children linked yet'}
                </p>
              </div>
            ) : (
              user.youth_members.map((child: any) => {
                const initials = getInitials(child.first_name || '', child.last_name || '');
                const fullName = child.first_name && child.last_name 
                  ? `${child.first_name} ${child.last_name}` 
                  : child.first_name || `Child #${child.id}`;
                
                return (
                  <div key={child.id} className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                      : 'bg-white border-[#4D4DA4]/20 hover:border-[#4D4DA4]/40 hover:shadow-md'
                  }`}>
                    {child.avatar ? (
                      <img 
                        src={getMediaUrl(child.avatar) || ''} 
                        alt={fullName} 
                        className={`w-12 h-12 rounded-xl object-cover border-2 ${
                          darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/20'
                        }`} 
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                        darkMode 
                          ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                          : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] shadow-md'
                      }`}>
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}>
                        {fullName}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                        {child.preferred_club?.name || t('noClubAssigned') || 'No club assigned'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      child.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-md border-2 border-[#4D4DA4]/10'
        }`}>
          <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'
          }`}>
            <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[var(--brand-primary)]'}`}></span>
            {t('quickActions') || 'Quick Actions'}
          </h3>
          
          <div className="space-y-2">
            <button 
              onClick={() => onSwitchTab('events')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 ${
                darkMode
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                  : 'bg-white text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] border border-[#4D4DA4]/15 shadow-sm'
              }`}
            >
              <Calendar className="w-5 h-5" />
              {t('viewEventApplications') || 'View Event Applications'}
            </button>
            
            <button 
              onClick={() => onSwitchTab('clubs')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 ${
                darkMode
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                  : 'bg-white text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] border border-[#4D4DA4]/15 shadow-sm'
              }`}
            >
              <Building2 className="w-5 h-5" />
              {t('viewChildrenClubs') || "View Children's Clubs"}
            </button>
            
            <button 
              onClick={() => onSwitchTab('activity')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-3 ${
                darkMode
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                  : 'bg-white text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] border border-[#4D4DA4]/15 shadow-sm'
              }`}
            >
              <Activity className="w-5 h-5" />
              {t('viewAllActivity') || 'View All Activity'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Activity Feed */}
      <div className="md:col-span-2">
        <GuardianActivityFeed showTimeFilter={false} darkMode={darkMode} />
      </div>
    </div>
  );
}








