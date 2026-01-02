'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { analyticsApi, AnalyticsResponse, AnalyticsPreferences } from '@/lib/analytics-api';
import MetricsGrid from '@/app/components/analytics/MetricsGrid';
import HeatmapChart from '@/app/components/analytics/HeatmapChart';
import InventoryChart from '@/app/components/analytics/InventoryChart';
import ClubComparisonTable from '@/app/components/analytics/ClubComparisonTable';
import GroupComparisonTable from '@/app/components/analytics/GroupComparisonTable';
import DemographicCharts from '@/app/components/analytics/DemographicCharts';
import EventMetricsCard from '@/app/components/analytics/EventMetricsCard';
import AnalyticsFilters from '@/app/components/analytics/AnalyticsFilters';
import AIReportGenerator from '@/app/components/analytics/AIReportGenerator';
import QuestionnaireAnalyticsCard from '@/app/components/analytics/QuestionnaireAnalyticsCard';
import BookingAnalyticsCard from '@/app/components/analytics/BookingAnalyticsCard';
import AnalyticsSettingsCard from '@/app/components/analytics/AnalyticsSettingsCard';
import AnalyticsCardWrapper from '@/app/components/analytics/AnalyticsCardWrapper';
import { useAnalyticsPreferences } from '@/hooks/useAnalyticsPreferences';
import { Loader2, AlertCircle, BarChart3, TrendingUp, Sparkles } from 'lucide-react';

// Skeleton components for loading states
function MetricCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)]" />
        <div className="h-4 w-16 bg-[var(--dark-600)] rounded" />
      </div>
      <div className="h-8 w-20 bg-[var(--dark-600)] rounded mb-2" />
      <div className="h-3 w-24 bg-[var(--dark-600)] rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 h-[300px] animate-pulse">
      <div className="h-5 w-32 bg-[var(--dark-600)] rounded mb-4" />
      <div className="flex items-end justify-around h-[220px] gap-2 pt-4">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div 
            key={i} 
            className="flex-1 bg-[var(--dark-600)] rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function MunicipalityAnalyticsPage() {
  const t = useTranslations('analyticsAdmin');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Analytics visibility preferences
  const {
    preferences,
    toggleSection,
    showAll,
    hideAll,
    isVisible,
  } = useAnalyticsPreferences();

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
    end_date: new Date().toISOString(),
    club_id: null as number | null,
    group_id: null as number | null,
    genders: [] as string[],
    grades: [] as number[],
    interests: [] as number[],
    age_min: null as number | null,
    age_max: null as number | null,
    custom_fields: {} as Record<number, string | null>,
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyticsApi.getDashboardMetrics(filters);
      setData(result);
    } catch (err) {
      console.error(err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[var(--brand-purple)]/20 animate-pulse-slow">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--brand-light)]">
                {t('municipalityTitle')}
              </h1>
              <p className="text-[var(--brand-light)]/50 text-xs sm:text-sm">
                {t('municipalitySubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--dark-700)] rounded-full border border-[var(--dark-500)]">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-green)] animate-pulse" />
              <span className="text-xs text-[var(--brand-light)]/60">{t('liveData')}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Settings */}
        <div className="px-0 sm:px-6">
          <AnalyticsSettingsCard
            preferences={preferences}
            onToggle={toggleSection}
            onShowAll={showAll}
            onHideAll={hideAll}
            isMunicipality={true}
          />
        </div>

        {/* Filters Section */}
        <div className="px-0 sm:px-6">
          <AnalyticsFilters 
            filters={filters} 
            setFilters={setFilters} 
            onApply={fetchData} 
            isLoading={loading}
            showClubFilter={true}
          />
        </div>

        {/* AI Report Generator */}
        <div className="px-0 sm:px-6">
          <AIReportGenerator filters={filters} visibleSections={preferences} />
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-4 sm:mx-6 bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {isInitialLoad && loading && (
          <div className="space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(5)].map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        )}

        {/* Data Visualization */}
        {data && (
          <div className="space-y-6 px-4 sm:px-6">
            
            {/* Key Metrics Cards */}
            <AnalyticsCardWrapper
              isVisible={isVisible('metrics')}
              onToggle={() => toggleSection('metrics')}
              sectionName={t('sections.keyMetrics')}
            >
              <MetricsGrid 
                totalMembers={data.total_members}
                traffic={data.traffic} 
                inventory={data.inventory} 
                network={data.network}
              />
            </AnalyticsCardWrapper>

            {/* Club Comparison Table (Municipality-specific) */}
            {!filters.club_id && data.comparison && data.comparison.length > 0 && (
              <AnalyticsCardWrapper
                isVisible={isVisible('clubComparison')}
                onToggle={() => toggleSection('clubComparison')}
                sectionName={t('sections.clubComparison')}
              >
                <ClubComparisonTable data={data.comparison} />
              </AnalyticsCardWrapper>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <AnalyticsCardWrapper
                isVisible={isVisible('heatmap')}
                onToggle={() => toggleSection('heatmap')}
                sectionName={t('sections.peakTrafficHours')}
              >
                <HeatmapChart data={data.heatmap} />
              </AnalyticsCardWrapper>
              
              <AnalyticsCardWrapper
                isVisible={isVisible('inventory')}
                onToggle={() => toggleSection('inventory')}
                sectionName={t('sections.topBorrowedItems')}
              >
                <InventoryChart data={data.inventory.top_items} />
              </AnalyticsCardWrapper>
            </div>

            {/* Demographics Section */}
            {data.demographics && (
              <AnalyticsCardWrapper
                isVisible={isVisible('demographics')}
                onToggle={() => toggleSection('demographics')}
                sectionName={t('sections.demographics')}
              >
                <DemographicCharts 
                  genderData={data.demographics.gender_split}
                  gradeData={data.demographics.grade_distribution}
                />
              </AnalyticsCardWrapper>
            )}

            {/* Top Interests */}
            {data.top_interests && data.top_interests.length > 0 && (
              <AnalyticsCardWrapper
                isVisible={isVisible('interests')}
                onToggle={() => toggleSection('interests')}
                sectionName={t('sections.topMemberInterests')}
              >
                <div className="bg-[var(--dark-800)] p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
                  <h3 className="font-semibold text-[var(--brand-light)] mb-4 flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    {t('sections.topMemberInterests')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.top_interests.map((interest, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1.5 bg-[var(--dark-700)] text-[var(--brand-light)]/80 rounded-full text-sm font-medium border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 transition-all cursor-default"
                        style={{ 
                          animationDelay: `${i * 50}ms`,
                          animation: 'fadeInUp 0.3s ease-out forwards'
                        }}
                      >
                        {interest.interests__name || 'Unspecified'} 
                        <span className="ml-2 text-[var(--brand-primary)] text-xs font-bold">
                          {interest.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </AnalyticsCardWrapper>
            )}

            {/* Insights Row */}
            <AnalyticsCardWrapper
              isVisible={isVisible('insights')}
              onToggle={() => toggleSection('insights')}
              sectionName={t('sections.insights')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Retention Insight */}
                <div className="bg-[var(--dark-800)] p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] hover:border-[var(--brand-blue)]/50 transition-all group">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4 text-[var(--brand-blue)]" />
                    </div>
                    <h3 className="font-semibold text-[var(--brand-light)]">{t('insights.retentionInsight')}</h3>
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/60 leading-relaxed">
                    <span className="font-bold text-[var(--brand-blue)] text-lg">{data.traffic.retention_rate}%</span>
                    <span className="ml-2">{t('insights.retentionText')}</span>
                  </p>
                  <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                    {data.traffic.retention_rate < 30 
                      ? `⚠️ ${t('insights.belowAverage')}` 
                      : `✨ ${t('insights.greatRetention')}`}
                  </p>
                </div>
                
                {/* Network Insight */}
                {data.network && (
                  <div className="bg-[var(--dark-800)] p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] hover:border-[var(--brand-purple)]/50 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-4 h-4 text-[var(--brand-purple)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--brand-light)]">{t('insights.networkInsight')}</h3>
                    </div>
                    <p className="text-sm text-[var(--brand-light)]/60 leading-relaxed">
                      <span className="font-bold text-[var(--brand-purple)] text-lg">{data.network.nomad_percentage}%</span>
                      <span className="ml-2">{t('insights.networkText')}</span>
                    </p>
                    <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                      🌍 {t('insights.connectedNetwork')}
                    </p>
                  </div>
                )}
              </div>
            </AnalyticsCardWrapper>

            {/* Questionnaire Analytics - Full Width */}
            {data.questionnaires && (
              <AnalyticsCardWrapper
                isVisible={isVisible('questionnaires')}
                onToggle={() => toggleSection('questionnaires')}
                sectionName={t('sections.questionnaireAnalytics')}
              >
                <QuestionnaireAnalyticsCard data={data.questionnaires} />
              </AnalyticsCardWrapper>
            )}
            
            {/* Booking Analytics - Full Width */}
            {data.bookings && (
              <AnalyticsCardWrapper
                isVisible={isVisible('bookings')}
                onToggle={() => toggleSection('bookings')}
                sectionName={t('sections.bookingAnalytics')}
              >
                <BookingAnalyticsCard data={data.bookings} />
              </AnalyticsCardWrapper>
            )}

            {/* Group Comparison */}
            {data.group_comparison && data.group_comparison.length > 0 && (
              <AnalyticsCardWrapper
                isVisible={isVisible('groupComparison')}
                onToggle={() => toggleSection('groupComparison')}
                sectionName={t('sections.groupComparison')}
              >
                <GroupComparisonTable data={data.group_comparison} />
              </AnalyticsCardWrapper>
            )}

            {/* Event Analytics */}
            {data.events && (
              <AnalyticsCardWrapper
                isVisible={isVisible('events')}
                onToggle={() => toggleSection('events')}
                sectionName={t('sections.eventAnalytics')}
              >
                <EventMetricsCard events={data.events} />
              </AnalyticsCardWrapper>
            )}

          </div>
        )}
      </div>

      {/* CSS Animations */}
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
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
