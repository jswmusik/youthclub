'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cmsApi } from '@/lib/cms-api';
import { sanitizeHtml } from '@/lib/sanitize';
import { CookieConsent } from '@/types/cms';
import { Cookie, Eye, EyeOff, Clock, Shield, ArrowLeft, Plus, FileText } from 'lucide-react';
import CookieForm from './components/CookieForm';
import { format } from 'date-fns';
import Link from 'next/link';
import Skeleton from '@/app/components/ui/Skeleton';
import LanguageSelector, { LanguageBadge, type LanguageCode, LANGUAGES } from '../../../components/LanguageSelector';

export default function CookieManager() {
  const t = useTranslations('cmsAdmin.cookies');
  const [cookies, setCookies] = useState<CookieConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingCookie, setViewingCookie] = useState<CookieConsent | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('sv');
  
  const fetchCookies = async () => {
    try {
      const data = await cmsApi.getCookies();
      setCookies(data);
    } catch (error) {
      console.error("Failed to fetch cookies", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCookies();
  }, []);

  // Filter cookies by language
  const filteredCookies = cookies.filter(c => c.language === selectedLanguage);
  const activePolicy = filteredCookies.find(c => c.is_active);
  const inactiveCount = filteredCookies.filter(c => !c.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href="/admin/super/cms"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {t('pageTitle')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {t('pageDescription')}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4 mb-6">
          <LanguageSelector
            value={selectedLanguage}
            onChange={(lang) => setSelectedLanguage(lang)}
            label="Select language to manage cookie consent for"
            variant="pills"
          />
        </div>

        {/* Stats Cards */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Cookie className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('stats.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('stats.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('stats.totalPolicies')}</span>
                </div>
                <div className="text-2xl font-bold text-[var(--brand-primary)]">{filteredCookies.length}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-[var(--brand-green)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('stats.activeVersion')}</span>
                </div>
                <div className="text-2xl font-bold text-[var(--brand-green)]">{activePolicy?.version || '—'}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                <div className="flex items-center gap-2 mb-2">
                  <EyeOff className="h-4 w-4 text-[var(--brand-peach)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('stats.archived')}</span>
                </div>
                <div className="text-2xl font-bold text-[var(--brand-peach)]">{inactiveCount}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-[var(--brand-blue)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/60">{t('stats.lastUpdated')}</span>
                </div>
                <div className="text-sm font-bold text-[var(--brand-blue)]">
                  {activePolicy ? format(new Date(activePolicy.created_at), 'MMM d, yyyy') : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create New Policy Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                <Plus className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('create.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('create.subtitle')}</p>
              </div>
            </div>
          </div>
          <CookieForm onSuccess={fetchCookies} language={selectedLanguage} />
        </div>

        {/* Version History Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('history.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('history.subtitle')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {filteredCookies.length === 0 ? (
              <div className="text-center py-12">
                <Cookie className="w-12 h-12 text-[var(--brand-light)]/30 mx-auto mb-4" />
                <p className="text-[var(--brand-light)]/60">{t('emptyState')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCookies.map((cookie) => (
                  <div 
                    key={cookie.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      cookie.is_active 
                        ? 'bg-[var(--brand-green)]/5 border-[var(--brand-green)]/30' 
                        : 'bg-[var(--dark-700)] border-[var(--dark-600)]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        cookie.is_active 
                          ? 'bg-[var(--brand-green)]/20' 
                          : 'bg-[var(--dark-600)]'
                      }`}>
                        <span className={`text-lg font-bold ${
                          cookie.is_active 
                            ? 'text-[var(--brand-green)]' 
                            : 'text-[var(--brand-light)]/40'
                        }`}>
                          v{cookie.version}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[var(--brand-light)]">{cookie.title}</span>
                          {cookie.is_active && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--brand-green)]/20 text-[var(--brand-green)] font-medium">
                              {t('status.active')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('createdDate', { date: format(new Date(cookie.created_at), 'MMMM d, yyyy') })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingCookie(cookie)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        cookie.is_active 
                          ? 'bg-[var(--brand-green)]/10 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/20' 
                          : 'bg-[var(--dark-600)] text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60 hover:bg-[var(--dark-500)]'
                      }`}
                    >
                      {cookie.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* View Modal */}
      {viewingCookie && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setViewingCookie(null)}
        >
          <div 
            className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--dark-600)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--brand-light)]">
                  {t('viewModal.title', { version: viewingCookie.version })}
                </h2>
                <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                  {t('createdDate', { date: format(new Date(viewingCookie.created_at), 'MMMM d, yyyy') })}
                </p>
              </div>
              <button
                onClick={() => setViewingCookie(null)}
                className="p-2 hover:bg-[var(--dark-700)] rounded-lg transition-colors text-[var(--brand-light)]/70"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Banner Preview */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-light)]/70 mb-3">
                  {t('viewModal.bannerPreview')}
                </h3>
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                  <h4 className="font-bold text-[var(--brand-light)] mb-2">{viewingCookie.title}</h4>
                  <p className="text-sm text-[var(--brand-light)]/70">{viewingCookie.description}</p>
                </div>
              </div>

              {/* Full Policy */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-light)]/70 mb-3">
                  {t('viewModal.fullPolicy')}
                </h3>
                <div 
                  className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewingCookie.policy_text) || '<p class="text-[var(--brand-light)]/40 italic">No policy text provided</p>' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--dark-600)] flex justify-end">
              <button
                onClick={() => setViewingCookie(null)}
                className="px-6 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all"
              >
                {t('viewModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
