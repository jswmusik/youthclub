'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, History, Gift, Clock, Calendar, TrendingUp, 
  Users, Target, Zap, ChevronUp, ChevronDown, User, Mail,
  ExternalLink, Sparkles, Building2, CheckCircle2
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';

interface RewardDetailProps {
  rewardId: string;
  basePath: string;
}

export default function RewardDetailView({ rewardId, basePath }: RewardDetailProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('rewardsAdmin.detail');
  const [reward, setReward] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    if (rewardId) {
      fetchData();
    }
  }, [rewardId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardRes, statsRes] = await Promise.all([
        api.get(`/rewards/${rewardId}/`),
        api.get(`/rewards/${rewardId}/analytics_detail/`)
      ]);
      setReward(rewardRes.data);
      setAnalytics(statsRes.data);
      
      const historyRes = await api.get(`/rewards/${rewardId}/history/?page_size=10`);
      const historyData = historyRes.data.results || historyRes.data;
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">{t('loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (!reward) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">{t('rewardNotFound')}</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            {t('returnToList')}
          </Link>
        </div>
      </div>
    );
  }

  const getTriggerInfo = (trigger: string) => {
    const triggers: Record<string, { icon: string; label: string }> = {
      'BIRTHDAY': { icon: '🎂', label: t('triggers.onBirthday') },
      'WELCOME': { icon: '👋', label: t('triggers.onSignup') },
      'VERIFIED': { icon: '✅', label: t('triggers.onVerification') },
      'MOST_ACTIVE': { icon: '🔥', label: t('triggers.mostActive') },
    };
    return triggers[trigger] || { icon: '⚡', label: trigger };
  };

  return (
    <div className="space-y-0 sm:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToList')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link 
            href={buildUrlWithParams(`${basePath}/${reward.id}/history`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('claimHistory')}</span>
          </Link>
          <Link 
            href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Edit className="h-4 w-4" /> {t('edit')}
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-32 sm:h-40 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
          
          {/* Status Badge - Top Right */}
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${
            reward.is_active 
              ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
              : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]'
          }`}>
            {reward.is_active && <CheckCircle2 className="w-4 h-4" />}
            <span className="text-sm font-semibold">{reward.is_active ? t('active') : t('inactive')}</span>
          </div>

          {/* Owner Badge - Top Left */}
          <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--dark-800)]/80 border border-[var(--dark-500)]">
            <span className="text-sm text-[var(--brand-light)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
              {reward.municipality_name || reward.club_name || t('superAdmin')}
            </span>
          </div>
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Image */}
            <div className="relative z-20 w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {reward.image ? (
                <img 
                  src={getMediaUrl(reward.image) || ''} 
                  alt={reward.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <Gift className="w-10 h-10 text-[var(--dark-900)]" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {reward.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {reward.sponsor_name && (
                  <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                    <Sparkles className="h-4 w-4 text-[var(--brand-peach)]" />
                    <span>{t('sponsoredBy')} <span className="text-[var(--brand-light)]">{reward.sponsor_name}</span></span>
                  </div>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                  <Users className="w-3 h-3" /> {reward.target_member_type === 'YOUTH_MEMBER' ? t('youthMembers') : t('guardians')}
                </span>
                {reward.expiration_date && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]">
                    <Calendar className="w-3 h-3" /> {t('expires')} {new Date(reward.expiration_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h2>
            </div>
            {analyticsExpanded ? (
              <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/50" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/50" />
            )}
          </button>
          
          {analyticsExpanded && (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Total Claims */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center">
                      <Gift className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('totalClaims')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_uses}</div>
                </div>

                {/* Last 24h */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-blue)]/30 hover:border-[var(--brand-blue)]/50 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('last24h')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.uses_last_24h}</div>
                </div>

                {/* Last 7 Days */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-green)]/30 hover:border-[var(--brand-green)]/50 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-green)] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('last7Days')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.uses_last_7d}</div>
                </div>

                {/* Last 30 Days */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-peach)]/30 hover:border-[var(--brand-peach)]/50 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)] flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('last30Days')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.uses_last_30d}</div>
                </div>

                {/* Days Left */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-third)]/30 hover:border-[var(--brand-third)]/50 transition-all col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('daysLeft')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                    {analytics.days_remaining !== null ? analytics.days_remaining : '∞'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-0 sm:space-y-6">
          
          {/* About Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('about')}</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm sm:text-base text-[var(--brand-light)]/80 whitespace-pre-wrap leading-relaxed">
                {reward.description}
              </p>
              
              {(reward.sponsor_name || reward.sponsor_link) && (
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">{t('sponsor')}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--brand-light)]">
                        {reward.sponsor_name || t('anonymous')}
                      </span>
                      {reward.sponsor_link && (
                        <a 
                          href={reward.sponsor_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/30 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> {t('visitWebsite')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Latest Claims Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('latestClaims')}</h2>
              {history.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                  {history.length} {history.length === 1 ? t('claim') : t('claims')}
                </span>
              )}
            </div>
            <div className="p-0">
              {history.length === 0 ? (
                <div className="p-8 sm:p-12 text-center">
                  <Gift className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-3" />
                  <p className="text-sm text-[var(--brand-light)]/50">{t('noClaimsYet')}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--dark-600)]">
                  {history.map((usage) => (
                    <div key={usage.id} className="p-4 sm:p-5 hover:bg-[var(--dark-700)]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[var(--brand-light)] truncate">
                            {usage.user_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--brand-light)]/50 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{usage.user_email}</span>
                          </div>
                        </div>
                        
                        {/* Date */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-[var(--brand-light)]/50">
                            {(() => {
                              const date = usage.redeemed_at ? new Date(usage.redeemed_at) : (usage.created_at ? new Date(usage.created_at) : null);
                              if (!date) return 'N/A';
                              return date.toLocaleDateString();
                            })()}
                          </div>
                          <div className="text-xs text-[var(--brand-light)]/30">
                            {(() => {
                              const date = usage.redeemed_at ? new Date(usage.redeemed_at) : (usage.created_at ? new Date(usage.created_at) : null);
                              if (!date) return '';
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Targeting Rules Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--brand-peach)]" />
                {t('targetingRules')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Target Audience */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('targetAudience')}</div>
                <div className="text-sm text-[var(--brand-light)] font-medium">
                  {reward.target_member_type === 'YOUTH_MEMBER' ? t('youthMembers') : t('guardians')}
                </div>
              </div>
              
              {/* Age Range */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('ageRange')}</div>
                <div className="text-sm text-[var(--brand-light)] font-medium">
                  {reward.min_age || 0} - {reward.max_age || t('availability.noExpiration')} {t('years')}
                </div>
              </div>

              {/* Grades */}
              {reward.target_grades && reward.target_grades.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">{t('grades')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {reward.target_grades.map((g: number) => (
                      <span key={g} className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] flex items-center justify-center text-sm font-bold">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Genders */}
              {reward.target_genders && reward.target_genders.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">{t('genders')}</div>
                  <div className="flex flex-wrap gap-2">
                    {reward.target_genders.map((g: string) => (
                      <span key={g} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] capitalize">
                        {g.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Groups */}
              {reward.target_groups_details && reward.target_groups_details.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">{t('specificGroups')}</div>
                  <div className="flex flex-wrap gap-2">
                    {reward.target_groups_details.map((g: any) => (
                      <span key={g.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                        <Users className="w-3 h-3" />
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Triggers Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Zap className="h-5 w-5 text-[var(--brand-third)]" />
                {t('activeTriggers')}
              </h2>
            </div>
            <div className="p-6">
              {reward.active_triggers && reward.active_triggers.length > 0 ? (
                <div className="space-y-2">
                  {reward.active_triggers.map((t: string) => {
                    const triggerInfo = getTriggerInfo(t);
                    return (
                      <div key={t} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/30">
                        <span className="text-xl">{triggerInfo.icon}</span>
                        <span className="font-semibold text-sm text-[var(--brand-green)]">{triggerInfo.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">{t('noAutomaticTriggers')}</p>
                  <p className="text-xs mt-1">{t('manualClaimOnly')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Availability Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[var(--brand-blue)]" />
                {t('availability.title')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Expiration */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('availability.expiresOn')}</div>
                <div className={`text-sm font-medium ${reward.expiration_date ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/40 italic'}`}>
                  {reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString() : t('availability.noExpiration')}
                </div>
              </div>

              {/* Usage Limit */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('availability.usageLimit')}</div>
                <div className="text-sm text-[var(--brand-light)] font-medium">
                  {reward.usage_limit ? `${reward.usage_limit} ${t('availability.totalClaims')}` : t('availability.unlimited')}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
