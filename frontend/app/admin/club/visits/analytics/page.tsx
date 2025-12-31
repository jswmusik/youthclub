'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import Link from 'next/link';
import { BarChart3, Users, UserCheck, TrendingUp } from 'lucide-react';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import { useTranslations } from 'next-intl';
import BackButton from '@/app/components/BackButton';

export default function AnalyticsPage() {
  const t = useTranslations('clubVisits.analytics');
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // Days

  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? String((assignedClub as any).id)
    : typeof assignedClub === 'number' 
    ? String(assignedClub)
    : null;

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      // Calculate start date based on period
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
    if (clubId) {
      loadStats();
    }
  }, [period, clubId]);

  if (!clubId) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-[var(--brand-light)]/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
      <div className="max-w-7xl mx-auto space-y-6 px-0 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div>
          <BackButton href="/admin/club/details" translationKey="backToClub" />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
        </div>

        {/* Tabs */}
        <VisitsTabs 
          clubId={clubId} 
          basePath="/admin/club"
          liveHref="/admin/club/visits"
          historyHref="/admin/club/visits/history"
          analyticsHref="/admin/club/visits/analytics"
        />

        {/* Period Selector */}
        <div className="flex justify-end">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  period === d 
                    ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]' 
                    : 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30'
                }`}
              >
                {t('periodSelector.days', { count: d })}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-20 flex justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
                <p className="text-[var(--brand-light)]/50 text-sm">{t('loadingAnalytics')}</p>
              </div>
            </div>
          </div>
        ) : !stats ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8 sm:p-12">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
              <p className="text-[var(--brand-light)]/50 font-medium">{t('emptyState.failedToLoad')}</p>
              <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('emptyState.noDataOrError')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics Dashboard */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
                  <h2 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h2>
                </div>
                <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('dataForLastDays', { count: period })}</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Card 1: Total Visits */}
                  <div className="bg-[var(--dark-700)] rounded-xl border-2 border-[var(--dark-500)] p-4 hover:border-[var(--brand-primary)]/50 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalVisits')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{stats.summary?.total_visits || 0}</div>
                    </div>
                  </div>

                  {/* Card 2: Unique Youth */}
                  <div className="bg-[var(--dark-700)] rounded-xl border-2 border-[var(--dark-500)] p-4 hover:border-[var(--brand-blue)]/50 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue)]/80 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.uniqueYouth')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{stats.summary?.unique_visitors || 0}</div>
                    </div>
                  </div>

                  {/* Card 3: Avg Visits per Youth */}
                  <div className="bg-[var(--dark-700)] rounded-xl border-2 border-[var(--dark-500)] p-4 hover:border-[var(--brand-third)]/50 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.avgVisitsPerYouth')}</div>
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                        {stats.summary?.unique_visitors 
                          ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
                          : '0.0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graph: Visits Over Time */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-[var(--brand-primary)] rounded-full"></div>
                      <h2 className="text-lg font-bold text-[var(--brand-light)] flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[var(--brand-primary)]" />
                      {t('charts.visitsTrend.title')}
                    </h2>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {stats.timeline && stats.timeline.length > 0 ? (
                    <>
                      <div className="h-64 flex items-end gap-2">
                        {stats.timeline.map((day: any) => {
                          const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                          const height = (day.count / max) * 100;
                          
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                                {new Date(day.date).toLocaleDateString()}: {day.count} {day.count === 1 ? t('charts.visitsTrend.visit') : t('charts.visitsTrend.visits')}
                              </div>
                              <div 
                                style={{ height: `${height}%` }} 
                                className="w-full bg-gradient-to-t from-[var(--brand-primary)] to-[var(--brand-purple)] hover:from-[var(--brand-purple)] hover:to-[var(--brand-primary)] transition-all rounded-t-sm cursor-pointer shadow-sm"
                                title={`${new Date(day.date).toLocaleDateString()}: ${day.count}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-[var(--brand-light)]/40 mt-2 border-t border-[var(--dark-600)] pt-2">
                        <span>{t('charts.visitsTrend.daysAgo', { count: period })}</span>
                        <span>{t('charts.visitsTrend.today')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-[var(--brand-light)]/50">
                      {t('charts.visitsTrend.noDataAvailable')}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart: Demographics (Gender) */}
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-[var(--brand-purple)] rounded-full"></div>
                      <h2 className="text-lg font-bold text-[var(--brand-light)] flex items-center gap-2">
                      <Users className="h-5 w-5 text-[var(--brand-purple)]" />
                      {t('charts.genderDistribution.title')}
                    </h2>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {stats.demographics && stats.demographics.length > 0 ? (
                    <div className="space-y-4">
                      {stats.demographics.map((item: any) => {
                        const total = stats.summary?.unique_visitors || 1;
                        const percent = Math.round((item.count / total) * 100);
                        const genderLabel = item.user__legal_gender || t('charts.genderDistribution.notSpecified');
                        
                        return (
                          <div key={item.user__legal_gender || 'none'}>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-semibold text-[var(--brand-light)] capitalize">{genderLabel.toLowerCase()}</span>
                              <span className="text-[var(--brand-light)]/70">{item.count} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-[var(--dark-600)] rounded-full h-3 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] h-3 rounded-full transition-all shadow-sm" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[var(--brand-light)]/50 text-center py-8">
                      {t('charts.genderDistribution.noDataAvailable')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
