'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ComparisonData } from '@/lib/analytics-api';
import { Building2, TrendingUp, Users, Calendar, UserPlus, Trophy } from 'lucide-react';

interface Props {
  data: ComparisonData[];
}

export default function ClubComparisonTable({ data }: Props) {
  const t = useTranslations('analyticsAdmin.clubComparison');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  // Get max values for visual bars
  const maxVisits = Math.max(...data.map(d => d.visits), 1);

  // Medal colors for top 3
  const getMedalStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-[#78350F]';
    if (index === 1) return 'bg-gradient-to-br from-[var(--brand-light)]/60 to-[var(--brand-light)]/40 text-[var(--dark-900)]';
    if (index === 2) return 'bg-gradient-to-br from-[#FB923C] to-[#F97316] text-[#7C2D12]';
    return 'bg-[var(--dark-600)] text-[var(--brand-light)]/50';
  };

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-[var(--dark-600)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-blue)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
            <p className="text-xs text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>
        <span className="text-xs text-[var(--brand-light)]/50 bg-[var(--dark-700)] px-3 py-1.5 rounded-full border border-[var(--dark-500)] flex items-center gap-2 w-fit">
          <TrendingUp className="w-3 h-3" />
          {t('rankedByTraffic')}
        </span>
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden divide-y divide-[var(--dark-600)]">
        {data.map((club, index) => (
          <div 
            key={club.club_id} 
            className="p-4 hover:bg-[var(--dark-700)]/50 transition-colors"
            style={{
              animationDelay: `${index * 80}ms`,
              animation: isVisible ? 'fadeInUp 0.4s ease-out forwards' : 'none',
              opacity: isVisible ? 1 : 0
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${getMedalStyle(index)}`}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--brand-light)] truncate">{club.club_name}</p>
              </div>
            </div>
            
            {/* Visit Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--brand-light)]/50">{t('totalVisits')}</span>
                <span className="font-bold text-[var(--brand-light)]">{club.visits}</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-blue)] rounded-full transition-all duration-700"
                  style={{ width: `${(club.visits / maxVisits) * 100}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[var(--dark-700)] rounded-lg p-2">
                <p className="text-xs text-[var(--brand-light)]/50 mb-1">{t('users')}</p>
                <p className="text-sm font-bold text-[var(--brand-light)]">{club.unique_users}</p>
              </div>
              <div className="bg-[var(--dark-700)] rounded-lg p-2">
                <p className="text-xs text-[var(--brand-light)]/50 mb-1">V/U</p>
                <p className="text-sm font-bold text-[var(--brand-light)]">{club.utilization}</p>
              </div>
              <div className="bg-[var(--dark-700)] rounded-lg p-2">
                <p className="text-xs text-[var(--brand-light)]/50 mb-1">{t('events')}</p>
                <p className="text-sm font-bold text-[var(--brand-purple)]">{club.events_count}</p>
              </div>
              <div className="bg-[var(--dark-700)] rounded-lg p-2">
                <p className="text-xs text-[var(--brand-light)]/50 mb-1">{t('new')}</p>
                <p className="text-sm font-bold text-[var(--brand-green)]">
                  {club.new_members > 0 ? `+${club.new_members}` : '-'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--dark-700)] text-[var(--brand-light)]/50 font-medium text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {t('clubName')}
                </div>
              </th>
              <th className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('totalVisits')}
                </div>
              </th>
              <th className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Users className="w-4 h-4" />
                  {t('uniqueYouths')}
                </div>
              </th>
              <th className="px-4 py-4 text-right">{t('visitsPerUser')}</th>
              <th className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('events')}
                </div>
              </th>
              <th className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t('newMembers')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dark-600)]">
            {data.map((club, index) => (
              <tr 
                key={club.club_id} 
                className="hover:bg-[var(--dark-700)]/50 transition-colors group"
                style={{
                  animationDelay: `${index * 60}ms`,
                  animation: isVisible ? 'fadeInUp 0.4s ease-out forwards' : 'none',
                  opacity: isVisible ? 1 : 0
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${getMedalStyle(index)} group-hover:scale-110 transition-transform`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                      {club.club_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-20 h-2 bg-[var(--dark-600)] rounded-full overflow-hidden hidden lg:block">
                      <div 
                        className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-blue)] rounded-full transition-all duration-700"
                        style={{ width: `${(club.visits / maxVisits) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-[var(--brand-light)]">{club.visits}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-[var(--brand-light)]/70">{club.unique_users}</td>
                <td className="px-4 py-4 text-right text-[var(--brand-light)]/70">{club.utilization}</td>
                <td className="px-4 py-4 text-right">
                  <span className="text-[var(--brand-purple)] font-semibold">{club.events_count}</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className={`font-semibold ${club.new_members > 0 ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/40'}`}>
                    {club.new_members > 0 ? `+${club.new_members}` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--brand-light)]/40">
          <span>{t('showingClubs', { count: data.length })}</span>
          <span>
            {t('totalVisitsSum', { count: '' })} <span className="text-[var(--brand-primary)] font-semibold">{data.reduce((a, b) => a + b.visits, 0)}</span>
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
