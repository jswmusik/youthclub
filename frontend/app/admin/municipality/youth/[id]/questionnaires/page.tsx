'use client';

import { Suspense, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import IndividualHistory from '@/app/components/questionnaires/IndividualHistory';
import { ArrowLeft, BarChart3, ChevronUp, Search, X, FileText, Gift, ClipboardList } from 'lucide-react';

function QuestionnairesPageContent() {
  const t = useTranslations('youthQuestionnaires');
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [user, setUser] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [analytics, setAnalytics] = useState({ total_questionnaires: 0, total_rewards_earned: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/users/${id}/`);
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    if (id) fetchUser();
  }, [id]);

  // Sync searchQuery with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
  }, [searchParams]);

  const updateSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    router.push(pathname);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <Link 
          href={`/admin/municipality/youth/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToProfile')}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[var(--brand-purple)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {t('title')}
              </h1>
              <p className="text-sm text-[var(--brand-light)]/50">
                {user ? `${user.first_name} ${user.last_name}` : t('loading')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <button 
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
          </div>
          <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 gap-3 sm:gap-4">
            {/* Total Questionnaires */}
            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[var(--brand-purple)]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_questionnaires}</div>
            </div>

            {/* Rewards Earned */}
            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)]/20 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-[var(--brand-peach)]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.rewards')}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{analytics.total_rewards_earned}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
          <input 
            type="text"
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
            value={searchQuery}
            onChange={e => updateSearch(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-lg transition-all"
            >
              <X className="h-4 w-4" /> {t('search.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Questionnaires List */}
      <IndividualHistory userId={id} onAnalyticsUpdate={setAnalytics} />
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('youthQuestionnaires');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <ClipboardList className="w-6 h-6 text-[var(--brand-purple)]" />
        </div>
        <p className="text-[var(--brand-light)]/60">{t('loadingQuestionnaires')}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="py-4 sm:py-6 md:py-8 px-0">
        <QuestionnairesPageContent />
      </div>
    </Suspense>
  );
}
