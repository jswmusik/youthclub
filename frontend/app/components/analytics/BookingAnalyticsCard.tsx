'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarCheck, Users, DoorOpen, Gamepad2, Trophy } from 'lucide-react';
import { BookingMetrics } from '@/lib/analytics-api';

interface Props {
  data: BookingMetrics;
}

export default function BookingAnalyticsCard({ data }: Props) {
  const t = useTranslations('analyticsAdmin.booking');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Medal colors for top 3 resources
  const getMedalColor = (index: number) => {
    if (index === 0) return 'from-[#FBBF24] to-[#F59E0B]'; // Gold
    if (index === 1) return 'from-[var(--brand-light)]/60 to-[var(--brand-light)]/40'; // Silver
    if (index === 2) return 'from-[#FB923C] to-[#F97316]'; // Bronze
    return 'from-[var(--brand-purple)] to-[#A78BFA]'; // Purple for rest
  };

  const getMedalTextColor = (index: number) => {
    if (index === 0) return 'text-[#78350F]';
    if (index === 1) return 'text-[var(--dark-900)]';
    if (index === 2) return 'text-[#7C2D12]';
    return 'text-white';
  };

  // Gender colors
  const genderColors = {
    male: '#3B82F6',     // Blue
    female: '#EC4899',   // Pink
    other: '#A78BFA',    // Purple
  };

  const maxCount = Math.max(...data.top_resources.map(r => r.count), 1);

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
            <CalendarCheck className="w-5 h-5 text-[var(--dark-900)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
            <p className="text-xs text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--brand-light)]">{data.total_bookings}</p>
          <p className="text-xs text-[var(--brand-light)]/50">{t('totalBookings')}</p>
        </div>
      </div>

      {data.total_bookings === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-[var(--brand-light)]/40">
          <CalendarCheck className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">{t('noBookings')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-[var(--brand-light)]/70 mb-4">{t('whosBooking')}</h4>
            
            {/* Gender Donut */}
            <div className="flex items-center gap-6">
              <div className="relative w-[100px] h-[100px] flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background */}
                  <circle cx="50" cy="50" r="35" fill="none" stroke="var(--dark-600)" strokeWidth="14" />
                  
                  {/* Male segment */}
                  {data.gender_breakdown.male_pct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke={genderColors.male}
                      strokeWidth="14"
                      strokeDasharray={`${(data.gender_breakdown.male_pct / 100) * 220} 220`}
                      className="transition-all duration-700"
                      style={{ opacity: isVisible ? 1 : 0 }}
                    />
                  )}
                  
                  {/* Female segment */}
                  {data.gender_breakdown.female_pct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke={genderColors.female}
                      strokeWidth="14"
                      strokeDasharray={`${(data.gender_breakdown.female_pct / 100) * 220} 220`}
                      strokeDashoffset={`${-(data.gender_breakdown.male_pct / 100) * 220}`}
                      className="transition-all duration-700"
                      style={{ opacity: isVisible ? 1 : 0, transitionDelay: '100ms' }}
                    />
                  )}
                  
                  {/* Other segment */}
                  {data.gender_breakdown.other_pct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke={genderColors.other}
                      strokeWidth="14"
                      strokeDasharray={`${(data.gender_breakdown.other_pct / 100) * 220} 220`}
                      strokeDashoffset={`${-((data.gender_breakdown.male_pct + data.gender_breakdown.female_pct) / 100) * 220}`}
                      className="transition-all duration-700"
                      style={{ opacity: isVisible ? 1 : 0, transitionDelay: '200ms' }}
                    />
                  )}
                </svg>
                
                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--brand-light)]/50" />
                  <span className="text-xs text-[var(--brand-light)]/50">{data.unique_bookers}</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: genderColors.male }} />
                  <span className="text-xs text-[var(--brand-light)]/70">{t('male')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.gender_breakdown.male_pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: genderColors.female }} />
                  <span className="text-xs text-[var(--brand-light)]/70">{t('female')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.gender_breakdown.female_pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: genderColors.other }} />
                  <span className="text-xs text-[var(--brand-light)]/70">{t('other')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.gender_breakdown.other_pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-[var(--dark-600)] grid grid-cols-2 gap-3">
              <div className="bg-[var(--dark-700)] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[var(--brand-light)]">{data.unique_bookers}</p>
                <p className="text-[10px] text-[var(--brand-light)]/50">{t('uniqueBookers')}</p>
              </div>
              <div className="bg-[var(--dark-700)] rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[var(--brand-light)]">
                  {data.unique_bookers > 0 ? (data.total_bookings / data.unique_bookers).toFixed(1) : 0}
                </p>
                <p className="text-[10px] text-[var(--brand-light)]/50">{t('bookingsPerPerson')}</p>
              </div>
            </div>
          </div>

          {/* Top Resources Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#FBBF24]" />
              <h4 className="text-sm font-medium text-[var(--brand-light)]/70">{t('topMostBooked')}</h4>
            </div>
            
            {data.top_resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-[var(--brand-light)]/40">
                <DoorOpen className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">{t('noResourcesBooked')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {data.top_resources.map((resource, index) => {
                  const percentage = (resource.count / maxCount) * 100;
                  
                  return (
                    <div
                      key={resource.resource_id}
                      className="group"
                      style={{
                        animationDelay: `${index * 60}ms`,
                        animation: isVisible ? 'fadeInUp 0.4s ease-out forwards' : 'none',
                        opacity: isVisible ? 1 : 0,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {/* Rank badge */}
                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold bg-gradient-to-br ${getMedalColor(index)} ${getMedalTextColor(index)}`}>
                          {index + 1}
                        </span>
                        
                        {/* Resource type icon */}
                        {resource.resource_type === 'ROOM' ? (
                          <DoorOpen className="w-3 h-3 text-[var(--brand-light)]/50" />
                        ) : (
                          <Gamepad2 className="w-3 h-3 text-[var(--brand-light)]/50" />
                        )}
                        
                        {/* Name */}
                        <span className="text-xs text-[var(--brand-light)]/80 truncate flex-1 group-hover:text-[var(--brand-light)] transition-colors">
                          {resource.resource_name}
                        </span>
                        
                        {/* Count */}
                        <span className="text-xs font-bold text-[var(--brand-light)]">
                          {resource.count}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 bg-[var(--dark-600)] rounded-full overflow-hidden ml-7">
                        <div
                          className={`h-full bg-gradient-to-r ${getMedalColor(index)} rounded-full transition-all duration-700 group-hover:brightness-110`}
                          style={{
                            width: isVisible ? `${percentage}%` : '0%',
                            transitionDelay: `${index * 60}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

