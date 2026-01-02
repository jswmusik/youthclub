'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { cmsApi } from '@/lib/cms-api';
import { Page } from '@/types/cms';
import { Plus, Pencil, Trash2, FileText, Eye, EyeOff, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { useToast } from '../../../../../hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';

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

export default function PagesList() {
  const t = useTranslations('cmsAdmin.pages');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : enUS;
  
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const { showToast } = useToast();

  const fetchPages = async () => {
    try {
      const data = await cmsApi.getPages();
      setPages(data);
    } catch (error) {
      console.error("Failed to fetch pages", error);
      showToast(t('toast.loadFailed'), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async () => {
    if (!pageToDelete) return;
    try {
      await cmsApi.deletePage(pageToDelete.slug);
      showToast(t('toast.deleted'), "success");
      fetchPages();
    } catch (error) {
      showToast(t('toast.deleteFailed'), "error");
    } finally {
      setPageToDelete(null);
    }
  };

  // Filter pages by search
  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(searchInput.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchInput.toLowerCase())
  );

  const publishedCount = pages.filter(p => p.is_published).length;
  const draftCount = pages.filter(p => !p.is_published).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <FileText className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalPages')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">{pages.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
              <Eye className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.published')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{publishedCount}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.drafts')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{draftCount}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
              <Search className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.filtered')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{filteredPages.length}</div>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
        <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
          <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
          <input 
            type="text"
            placeholder={t('searchPlaceholder')} 
            className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button 
              onClick={() => setSearchInput('')}
              className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Link href="/admin/super/cms/pages/create">
          <button className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            {t('createNewPage')}
          </button>
        </Link>
      </div>

      {/* Stats Bar */}
      {!loading && pages.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{filteredPages.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{pages.length}</span> {t('statsBar.pages')}
          </p>
        </div>
      )}

      {/* Pages List */}
      {loading ? (
        <div className="space-y-3 px-4 sm:px-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
          <FileText className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
          <p className="text-[var(--brand-light)]/50 mb-2">
            {searchInput ? t('emptyState.noMatch') : t('emptyState.noPages')}
          </p>
          {!searchInput && (
            <Link href="/admin/super/cms/pages/create">
              <button className="text-[var(--brand-primary)] hover:underline text-sm font-medium">
                {t('emptyState.createFirst')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-4 sm:px-0">
          {filteredPages.map((page) => (
            <div
              key={page.id}
              className={`bg-[var(--dark-800)] rounded-xl border p-4 sm:p-6 transition-all ${
                page.is_published 
                  ? 'border-[var(--dark-600)] hover:border-[var(--dark-500)]' 
                  : 'border-[var(--dark-700)] opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    page.page_type === 'creative' 
                      ? 'bg-[var(--brand-purple)]'
                      : 'bg-[var(--brand-blue)]'
                  }`}>
                    <FileText className="w-5 h-5 text-[var(--dark-900)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--brand-light)] truncate">{page.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        page.is_published 
                          ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                          : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'
                      }`}>
                        {page.is_published ? t('status.published') : t('status.draft')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        page.page_type === 'creative'
                          ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]'
                          : 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]'
                      }`}>
                        {page.page_type === 'creative' ? t('pageType.creative') : t('pageType.standard')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--brand-light)]/50 mb-2">/{page.slug}</p>
                    <p className="text-xs text-[var(--brand-light)]/40">
                      {t('updated')} {format(new Date(page.updated_at), 'd MMM yyyy', { locale: dateLocale })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/admin/super/cms/pages/edit/${page.slug}`}>
                    <button className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setPageToDelete(page)}
                    className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isVisible={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteConfirm')}
        confirmButtonText={t('deleteModal.confirm')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
    </div>
  );
}
