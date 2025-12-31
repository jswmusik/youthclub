'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cmsApi } from '@/lib/cms-api';
import { sanitizeHtml } from '@/lib/sanitize';
import { CookieConsent } from '@/types/cms';
import { Cookie, Eye, EyeOff, Clock, Shield, Loader2 } from 'lucide-react';
import CookieForm from './components/CookieForm';
import { format } from 'date-fns';

// Skeleton Component
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

export default function CookieManager() {
  const t = useTranslations('cmsAdmin.cookies');
  const [cookies, setCookies] = useState<CookieConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingCookie, setViewingCookie] = useState<CookieConsent | null>(null);
  
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

  const activePolicy = cookies.find(c => c.is_active);
  const inactiveCount = cookies.filter(c => !c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Cookie className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalPolicies')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">{cookies.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
              <Shield className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.activeVersion')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{activePolicy?.version || '—'}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.archived')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{inactiveCount}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.lastUpdated')}</span>
          </div>
          <div className="text-sm font-bold text-[var(--brand-blue)]">
            {activePolicy ? format(new Date(activePolicy.created_at), 'MMM d, yyyy') : '—'}
          </div>
        </div>
      </div>

      {/* Create Form */}
      <div className="px-4 sm:px-0">
        <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('create.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('create.subtitle')}
            </p>
          </div>
          <CookieForm onSuccess={fetchCookies} />
        </div>
      </div>

      {/* Version History */}
      <div className="px-4 sm:px-0">
        <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('history.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('history.subtitle')}
            </p>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : cookies.length === 0 ? (
              <div className="text-center py-8 text-[var(--brand-light)]/40">
                <Cookie className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('emptyState')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cookies.map((cookie) => (
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
                      className={`p-2 rounded-lg transition-all ${
                        cookie.is_active 
                          ? 'text-[var(--brand-green)] hover:bg-[var(--brand-green)]/10' 
                          : 'text-[var(--brand-light)]/30 hover:bg-[var(--dark-600)]'
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
