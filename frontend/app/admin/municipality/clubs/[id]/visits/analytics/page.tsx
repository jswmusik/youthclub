'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { visits } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart3, Users, UserCheck, TrendingUp, Calendar, Activity } from 'lucide-react';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function MunicipalityClubAnalyticsPage() {
  const t = useTranslations('clubVisits.analytics');
  const params = useParams();
  const clubId = params?.id as string;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - period);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      try {
        const res = await visits.getAnalytics({ start_date: startStr, end_date: endStr });
        setStats(res.data);
      } catch (e) {
        console.error('Failed to load analytics', e);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [period]);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8 px-0">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6 space-y-6">
        {/* Back Link */}
        <div className="px-4 sm:px-0">
          <BackButton href={`/admin/municipality/clubs/${clubId}`} label={t('backToClub') || 'Back to Club'} />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title') || 'Visit Analytics'}</h1>
                <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description') || 'Analytics & Insights for this club'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-0">
          <VisitsTabs clubId={clubId} basePath="/admin/municipality/clubs" />
        </div>

        {/* Period Selector */}
        <div className="flex justify-end px-4 sm:px-0">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  period === d 
                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                    : 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]'
                }`}
              >
                {d} {t('days') || 'Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-0">
          {loading ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loading') || 'Loading analytics...'}</span>
                </div>
              </div>
            </div>
          ) : !stats ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
                <p className="text-[var(--brand-light)]/50 font-medium">{t('noData') || 'Could not load analytics data'}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Visits */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-6 hover:border-[var(--brand-primary)]/30 transition-all">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--brand-light)]/50 uppercase">{t('totalVisits') || 'Total Visits'}</h3>
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[var(--brand-light)]">{stats.summary?.total_visits || 0}</div>
                <p className="text-xs text-[var(--brand-light)]/50 mt-2">{t('totalCheckIns') || 'Total check-ins'}</p>
              </div>

              {/* Unique Youth */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-6 hover:border-[var(--brand-blue)]/30 transition-all">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--brand-light)]/50 uppercase">{t('uniqueYouth') || 'Unique Youth'}</h3>
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[var(--brand-light)]">{stats.summary?.unique_visitors || 0}</div>
                <p className="text-xs text-[var(--brand-light)]/50 mt-2">{t('uniqueMembers') || 'Unique members'}</p>
              </div>

              {/* Avg Visits per Youth */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-6 hover:border-[var(--brand-green)]/30 transition-all">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--brand-light)]/50 uppercase">{t('avgVisits') || 'Avg. Visits'}</h3>
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[var(--brand-light)]">
                  {stats.summary?.unique_visitors 
                    ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
                    : '0.0'}
                </div>
                <p className="text-xs text-[var(--brand-light)]/50 mt-2">{t('perYouth') || 'Per youth'}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {/* Graph: Visits Over Time */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                      <Activity className="w-5 h-5 text-[var(--dark-900)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                        {t('visitsTrend') || 'Visits Trend'}
                      </h3>
                      <p className="text-sm text-[var(--brand-light)]/50">
                        {t('last')} {period} {t('days') || 'days'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {stats.timeline && stats.timeline.length > 0 ? (
                    <>
                      <div className="h-64 flex items-end gap-2">
                        {stats.timeline.map((day: any) => {
                          const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                          const height = (day.count / max) * 100;
                          
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--dark-900)] text-[var(--brand-light)] text-xs p-2 rounded-lg whitespace-nowrap z-10 shadow-lg border border-[var(--dark-600)]">
                                {new Date(day.date).toLocaleDateString()}: {day.count} {day.count === 1 ? (t('visit') || 'visit') : (t('visits') || 'visits')}
                              </div>
                              <div 
                                style={{ height: `${height}%` }} 
                                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-purple)] transition-all rounded-t-sm cursor-pointer"
                                title={`${new Date(day.date).toLocaleDateString()}: ${day.count}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-[var(--brand-light)]/40 mt-4 border-t border-[var(--dark-600)] pt-3">
                        <span>{period} {t('daysAgo') || 'days ago'}</span>
                        <span>{t('today') || 'Today'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-[var(--brand-light)]/30">
                      {t('noDataForPeriod') || 'No data available for this period'}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart: Demographics (Gender) */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                        {t('genderDistribution') || 'Gender Distribution'}
                      </h3>
                      <p className="text-sm text-[var(--brand-light)]/50">
                        {t('visitorBreakdown') || 'Visitor breakdown'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {stats.demographics && stats.demographics.length > 0 ? (
                    <div className="space-y-4">
                      {stats.demographics.map((item: any) => {
                        const total = stats.summary?.unique_visitors || 1;
                        const percent = Math.round((item.count / total) * 100);
                        const genderLabel = item.user__legal_gender || (t('notSpecified') || 'Not Specified');
                        
                        return (
                          <div key={item.user__legal_gender || 'none'}>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-semibold text-[var(--brand-light)] capitalize">{genderLabel.toLowerCase()}</span>
                              <span className="text-[var(--brand-light)]/70">{item.count} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-[var(--dark-700)] rounded-full h-3 overflow-hidden">
                              <div 
                                className="bg-[var(--brand-primary)] h-3 rounded-full transition-all" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[var(--brand-light)]/30 text-center py-8">
                      {t('noDemographicData') || 'No demographic data available'}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

