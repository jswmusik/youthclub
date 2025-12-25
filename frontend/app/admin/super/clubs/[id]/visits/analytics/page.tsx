'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Users, UserCheck, TrendingUp, Building2 } from 'lucide-react';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import VisitsTabs from '@/app/components/visits/VisitsTabs';

export default function SuperClubAnalyticsPage() {
  const params = useParams();
  const clubId = params?.id as string;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [clubName, setClubName] = useState<string>('');

  useEffect(() => {
    if (clubId) {
      api.get(`/clubs/${clubId}/`).then(res => {
        setClubName(res.data.name || 'Club');
      }).catch(() => {});
    }
  }, [clubId]);

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
    <div className="py-4 sm:py-8 px-0 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
        <Link 
          href={`/admin/super/clubs/${clubId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Club
        </Link>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[var(--brand-primary)]/30 via-[var(--dark-700)] to-[var(--brand-peach)]/20">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-peach)]/20 blur-2xl" />
          </div>
        </div>
        
        {/* Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-peach)] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex-1 space-y-1 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Analytics</h1>
              <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                <Building2 className="h-4 w-4" />
                <span>Insights & trends for {clubName || 'this club'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-0 sm:px-0">
        <VisitsTabs clubId={clubId} basePath="/admin/super/clubs" />
      </div>

      {/* Period Selector */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--brand-light)]">Time Period</h3>
            <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">Select the date range for analytics</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  period === d 
                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] shadow-lg shadow-[var(--brand-primary)]/20' 
                    : 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
          <div className="py-12 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-peach)] flex items-center justify-center animate-pulse">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[var(--brand-light)]/60 animate-pulse">Loading analytics...</span>
            </div>
          </div>
        </div>
      ) : !stats ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <p className="text-[var(--brand-light)]/50 font-medium">No analytics data available</p>
            <p className="text-sm text-[var(--brand-light)]/30 mt-1">Data will appear once visits are recorded</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-6">
            {/* Card 1: Total Visits */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden group hover:border-[var(--brand-primary)]/30 transition-all">
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--brand-primary)]/20 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-[var(--brand-light)] mb-1">
                  {stats.summary?.total_visits || 0}
                </div>
                <div className="text-sm text-[var(--brand-light)]/50 font-medium">Total Visits</div>
              </div>
            </div>

            {/* Card 2: Unique Youth */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden group hover:border-[var(--brand-blue)]/30 transition-all">
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--brand-blue)]/20 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-7 h-7 text-white" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-[var(--brand-light)] mb-1">
                  {stats.summary?.unique_visitors || 0}
                </div>
                <div className="text-sm text-[var(--brand-light)]/50 font-medium">Unique Youth</div>
              </div>
            </div>

            {/* Card 3: Avg Visits per Youth */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden group hover:border-[var(--brand-third)]/30 transition-all">
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--brand-third)]/20 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-[var(--dark-900)]" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-[var(--brand-light)] mb-1">
                  {stats.summary?.unique_visitors 
                    ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
                    : '0.0'}
                </div>
                <div className="text-sm text-[var(--brand-light)]/50 font-medium">Avg. Visits / Youth</div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 sm:gap-6">
            {/* Graph: Visits Over Time */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Visits Trend</h2>
                </div>
              </div>
              <div className="p-6">
                {stats.timeline && stats.timeline.length > 0 ? (
                  <>
                    <div className="h-64 flex items-end gap-1">
                      {stats.timeline.map((day: any, index: number) => {
                        const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                        const height = (day.count / max) * 100;
                        
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[var(--dark-600)] text-[var(--brand-light)] text-xs p-2 rounded-lg whitespace-nowrap z-10 shadow-lg border border-[var(--dark-500)]">
                              <div className="font-semibold">{new Date(day.date).toLocaleDateString()}</div>
                              <div className="text-[var(--brand-primary)]">{day.count} {day.count === 1 ? 'visit' : 'visits'}</div>
                            </div>
                            <div 
                              style={{ height: `${Math.max(height, 4)}%` }} 
                              className="w-full bg-gradient-to-t from-[var(--brand-primary)] to-[var(--brand-purple)] hover:from-[var(--brand-purple)] hover:to-[var(--brand-primary)] transition-all rounded-t cursor-pointer"
                              title={`${new Date(day.date).toLocaleDateString()}: ${day.count}`}
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-[var(--brand-light)]/40 mt-4 pt-4 border-t border-[var(--dark-600)]">
                      <span>{period} days ago</span>
                      <span>Today</span>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-[var(--brand-light)]/40">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No data available for this period</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart: Demographics (Gender) */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Gender Distribution</h2>
                </div>
              </div>
              <div className="p-6">
                {stats.demographics && stats.demographics.length > 0 ? (
                  <div className="space-y-5">
                    {stats.demographics.map((item: any) => {
                      const total = stats.summary?.unique_visitors || 1;
                      const percent = Math.round((item.count / total) * 100);
                      const genderLabel = item.user__legal_gender || 'Not Specified';
                      
                      // Color based on gender
                      const getGenderColor = (gender: string) => {
                        switch(gender?.toUpperCase()) {
                          case 'MALE': return 'from-[var(--brand-blue)] to-[var(--brand-purple)]';
                          case 'FEMALE': return 'from-[var(--brand-peach)] to-[var(--brand-red)]';
                          default: return 'from-[var(--brand-primary)] to-[var(--brand-purple)]';
                        }
                      };
                      
                      return (
                        <div key={item.user__legal_gender || 'none'}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-[var(--brand-light)] capitalize">{genderLabel.toLowerCase()}</span>
                            <span className="text-[var(--brand-light)]/60">{item.count} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-[var(--dark-600)] rounded-full h-3 overflow-hidden">
                            <div 
                              className={`bg-gradient-to-r ${getGenderColor(genderLabel)} h-3 rounded-full transition-all`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-[var(--brand-light)]/40">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No demographic data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
