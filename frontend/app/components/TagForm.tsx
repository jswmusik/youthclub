'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Tag, Lightbulb, Save, Hash, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface TagFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function TagForm({ initialData, redirectPath }: TagFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('tagForm');
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
  });

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const calculateCompletion = useCallback(() => {
    const requiredFields = [formData.name, formData.slug];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

  const completionPercent = calculateCompletion();

  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    const mainElement = document.querySelector('main');
    const headerHeight = mainElement ? 0 : 64;
    setIsProgressFixed(rect.top < headerHeight);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
        ...prev,
        name: val,
        // Auto-slugify if creating new
        slug: !initialData ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await api.patch(`/news_tags/${initialData.id}/`, formData);
        success(t('toast.tagUpdated'));
      } else {
        await api.post('/news_tags/', formData);
        success(t('toast.tagCreated'));
      }
      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
    } catch (err: any) {
      console.error(err);
      error(t('toast.failedToSave'));
      setLoading(false);
    }
  };

  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
  
  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={buildUrlWithParams(redirectPath)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? t('editTitle') : t('createTitle')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? t('editDescription') : t('createDescription')}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
          <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('progress.readyToSave')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress */}
        {isMounted && createPortal(
          <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="w-full md:max-w-3xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>,
          document.body
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Tag Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('tagInformation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('tagInformation.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              {/* Tag Name */}
              <div>
                <label className={labelClasses}>
                  {t('tagInformation.tagNameLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('tagInformation.tagNamePlaceholder')}
                  value={formData.name}
                  onChange={handleNameChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('name')}
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                  {t('tagInformation.tagNameHint')}
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className={labelClasses}>
                  {t('tagInformation.urlSlugLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Hash className="w-4 h-4 text-[var(--brand-light)]/30" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={t('tagInformation.urlSlugPlaceholder')}
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    onFocus={() => setFocusedField('slug')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('slug')} pl-10 font-mono text-sm`}
                  />
                </div>
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                  {t('tagInformation.urlSlugHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-pink)] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('tips.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('tips.description')}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm text-[var(--brand-light)]/60">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
                  <span>{t('tips.tip1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
                  <span>{t('tips.tip2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
                  <span>{t('tips.tip3')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => router.push(buildUrlWithParams(redirectPath))}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium
                bg-[var(--dark-700)] border border-[var(--dark-500)]
                text-[var(--brand-light)]/70 hover:text-[var(--brand-light)]
                hover:border-[var(--brand-primary)]/50 transition-all"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || completionPercent < 100}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium
                bg-[var(--brand-primary)] text-white
                hover:bg-[var(--brand-purple)] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('actions.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData ? t('actions.updateTag') : t('actions.createTag')}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      </div>
  );
}
