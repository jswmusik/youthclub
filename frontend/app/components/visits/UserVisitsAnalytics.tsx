'use client';

import { useTranslations } from 'next-intl';
import { VisitAnalytics } from '@/types/visit';
import { CheckCircle2, Calendar, Clock, Building2 } from 'lucide-react';

interface Props {
  stats: VisitAnalytics;
  loading?: boolean;
}

export default function UserVisitsAnalytics({ stats, loading }: Props) {
  const t = useTranslations('youthDetail.visits.analytics');
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-[var(--dark-700)] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Check-ins */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-[var(--brand-purple)]" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('total')}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{stats.total_checkins}</div>
      </div>

      {/* Avg Check-ins / Week */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[var(--brand-blue)]" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('weeklyAvg')}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{stats.avg_weekly_visits}</div>
      </div>

      {/* Avg Duration */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)]/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[var(--brand-green)]" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('avgTime')}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{stats.avg_duration_minutes}m</div>
      </div>

      {/* Different Clubs Visited */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)]/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[var(--brand-peach)]" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('clubs')}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{stats.clubs_visited_count}</div>
      </div>
    </div>
  );
}
