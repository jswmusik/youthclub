'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cmsApi } from '@/lib/cms-api';
import { FeatureShowcase } from '@/types/cms';
import { Plus, Pencil, Trash2, Sparkles, Eye, EyeOff, Image, Video, FileJson, Loader2 } from 'lucide-react';
import { useToast } from '../../../../../hooks/useToast';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import LanguageSelector, { LanguageBadge, type LanguageCode, LANGUAGES } from '../../../components/LanguageSelector';

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

export default function FeaturesList() {
  const t = useTranslations('cmsAdmin.features');
  const [features, setFeatures] = useState<FeatureShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureToDelete, setFeatureToDelete] = useState<FeatureShowcase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'all' | LanguageCode>('all');
  const { success, error } = useToast();

  const fetchFeatures = async () => {
    try {
      const data = await cmsApi.getFeatures();
      setFeatures(data);
    } catch (err) {
      console.error("Failed to fetch features", err);
      error(t('toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!featureToDelete) return;
    setIsDeleting(true);
    try {
      await cmsApi.deleteFeature(featureToDelete.id);
      success(t('toast.deleted'));
      fetchFeatures();
    } catch (err) {
      error(t('toast.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setFeatureToDelete(null);
    }
  };

  // Filter features by language
  const filteredFeatures = languageFilter === 'all' 
    ? features 
    : features.filter(f => f.language === languageFilter);
  const activeCount = filteredFeatures.filter(f => f.is_active).length;

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'lottie': return FileJson;
      default: return Image;
    }
  };

  const getLayoutLabel = (layout: string) => {
    switch (layout) {
      case 'left': return t('layout.textLeft');
      case 'right': return t('layout.textRight');
      case 'grid': return t('layout.gridCard');
      default: return layout;
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Filter */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value as 'all' | LanguageCode)}
          className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 text-[var(--brand-light)] outline-none appearance-none cursor-pointer hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-colors min-w-[160px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1rem',
            paddingRight: '2.5rem'
          }}
        >
          <option value="all">🌐 All Languages</option>
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Link href={`/admin/super/cms/features/create${languageFilter !== 'all' ? `?lang=${languageFilter}` : ''}`}>
          <button className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            {t('addFeature')}
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalFeatures')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">{features.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
              <Eye className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.active')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{activeCount}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.inactive')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{features.length - activeCount}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
              <Image className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.mediaTypes')}</span>
          </div>
          <div className="text-lg font-bold text-[var(--brand-blue)]">
            {[...new Set(features.map(f => f.media_type))].length} {t('stats.types')}
          </div>
        </div>
      </div>

      {/* Features List */}
      {loading ? (
        <div className="space-y-3 px-4 sm:px-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
          <Sparkles className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
          <p className="text-[var(--brand-light)]/50 mb-2">{t('emptyState.noFeatures')}</p>
          <Link href="/admin/super/cms/features/create">
            <button className="text-[var(--brand-primary)] hover:underline text-sm font-medium">
              {t('emptyState.createFirst')}
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 px-4 sm:px-0">
          {filteredFeatures.sort((a, b) => a.order - b.order).map((feature) => {
            const MediaIcon = getMediaIcon(feature.media_type);
            return (
              <div
                key={feature.id}
                className={`bg-[var(--dark-800)] rounded-xl border p-4 sm:p-6 transition-all ${
                  feature.is_active 
                    ? 'border-[var(--dark-600)] hover:border-[var(--dark-500)]' 
                    : 'border-[var(--dark-700)] opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Media Preview */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-[var(--dark-700)] flex-shrink-0 relative">
                    {feature.media_type === 'video' ? (
                      <video src={feature.media} className="w-full h-full object-cover" />
                    ) : feature.media_type === 'image' ? (
                      <img src={feature.media} alt={feature.alt_text} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileJson className="w-8 h-8 text-[var(--brand-light)]/40" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="w-6 h-6 rounded-lg bg-[var(--dark-900)]/80 text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold">
                        {feature.order}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--brand-light)]">{feature.title}</h3>
                      <LanguageBadge code={feature.language || 'sv'} size="sm" />
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        feature.is_active 
                          ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                          : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'
                      }`}>
                        {feature.is_active ? t('status.active') : t('status.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--brand-light)]/60 mb-3 line-clamp-2">{feature.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-xs rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60 flex items-center gap-1">
                        <MediaIcon className="w-3 h-3" />
                        {feature.media_type}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60">
                        {getLayoutLabel(feature.layout)}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60">
                        {feature.animation_type}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/admin/super/cms/features/edit/${feature.id}`}>
                      <button className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => setFeatureToDelete(feature)}
                      className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isVisible={featureToDelete !== null}
        onClose={() => {
          if (!isDeleting) {
            setFeatureToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { title: featureToDelete?.title || '' })}
        confirmButtonText={t('deleteModal.confirm')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
