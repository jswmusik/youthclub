'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Save, Loader2, Mail, FileText, CheckCircle, Eye, ExternalLink,
  MessageSquare, Clock, AlertCircle, ArrowLeft, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '../../../../../hooks/useToast';
import api from '@/lib/api';
import Link from 'next/link';
import Skeleton from '@/app/components/ui/Skeleton';
import { AdminLanguageSelector, LanguageBadge } from '../../../components/LanguageSelector';
import { locales } from '../../../../../i18n/config';

interface ContactContent {
  id?: number;
  hero_title: string;
  hero_subtitle: string;
  contact_email: string;
  response_time_text: string;
  form_title: string;
  form_description: string;
  success_title: string;
  success_message: string;
  info_title: string;
  info_content: string;
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const defaultContent: ContactContent = {
  hero_title: 'Kontakta oss',
  hero_subtitle: 'Vi hjälper dig gärna med frågor om Ungdomsappen',
  contact_email: 'support@ungdomsappen.se',
  response_time_text: 'Vi svarar vanligtvis inom 24 timmar',
  form_title: 'Skicka ett meddelande',
  form_description: 'Fyll i formuläret nedan så återkommer vi så snart som möjligt',
  success_title: 'Tack för ditt meddelande!',
  success_message: 'Vi har tagit emot ditt meddelande och återkommer så snart som möjligt.',
  info_title: '',
  info_content: '',
  meta_title: 'Kontakt - Ungdomsappen',
  meta_description: 'Kontakta Ungdomsappen för frågor om vår plattform för ungdomsverksamhet.',
};

export default function ContactCMSPage() {
  const t = useTranslations('cmsAdmin.contact');
  const { success, error } = useToast();
  const [currentLanguage, setCurrentLanguage] = useState<string>('sv');
  const [content, setContent] = useState<ContactContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const inputClasses = `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 border-[var(--dark-500)]
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    // Reset content to empty defaults when switching language to avoid showing stale data
    setContent({
      hero_title: '',
      hero_subtitle: '',
      contact_email: '',
      response_time_text: '',
      form_title: '',
      form_description: '',
      success_title: '',
      success_message: '',
      info_title: '',
      info_content: '',
      meta_title: '',
      meta_description: '',
    });
  };

  useEffect(() => {
    fetchContent();
  }, [currentLanguage]);

  const fetchContent = async () => {
    try {
      const response = await api.get(`/cms/contact-content/?lang=${currentLanguage}`);
      if (response.data) {
        setContent({ ...defaultContent, ...response.data });
      }
    } catch (err) {
      console.error('Failed to fetch contact content:', err);
      error(t('toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Don't send the id - let the backend handle finding/creating the right instance by language
      const { id, updated_at, ...contentWithoutId } = content;
      await api.patch('/cms/contact-content/update_content/', {
        ...contentWithoutId,
        language: currentLanguage
      });
      success(t('toast.saveSuccess'));
      // Refresh data to get the correct id for this language
      fetchContent();
    } catch (err) {
      console.error('Failed to save contact content:', err);
      error(t('toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-64" />
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
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/super/cms"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {t('heroSection.title')}
              </h1>
              <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                {t('heroSection.description')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminLanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              languages={locales as unknown as string[]}
              variant="dropdown"
            />
            <Link href="/contact" target="_blank">
              <Button variant="outline" className="gap-2 bg-[var(--dark-800)] border-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]">
                <Eye className="w-4 h-4" />
                {t('previewButton')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('heroSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('heroSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('heroSection.titleLabel')}</label>
              <Input
                value={content.hero_title}
                onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
                placeholder={t('heroSection.titlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('heroSection.subtitleLabel')}</label>
              <Textarea
                value={content.hero_subtitle}
                onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
                placeholder={t('heroSection.subtitlePlaceholder')}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                <Mail className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('contactInfo.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('contactInfo.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('contactInfo.emailLabel')}</label>
              <Input
                type="email"
                value={content.contact_email}
                onChange={(e) => setContent({ ...content, contact_email: e.target.value })}
                placeholder="support@ungdomsappen.se"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('contactInfo.responseTimeLabel')}</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                <Input
                  value={content.response_time_text}
                  onChange={(e) => setContent({ ...content, response_time_text: e.target.value })}
                  placeholder={t('contactInfo.responseTimePlaceholder')}
                  className={`${inputClasses} pl-11`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('formSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('formSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('formSection.formTitleLabel')}</label>
              <Input
                value={content.form_title}
                onChange={(e) => setContent({ ...content, form_title: e.target.value })}
                placeholder={t('formSection.formTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('formSection.formDescriptionLabel')}</label>
              <Textarea
                value={content.form_description}
                onChange={(e) => setContent({ ...content, form_description: e.target.value })}
                placeholder={t('formSection.formDescriptionPlaceholder')}
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Success Message Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('successSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('successSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('successSection.successTitleLabel')}</label>
              <Input
                value={content.success_title}
                onChange={(e) => setContent({ ...content, success_title: e.target.value })}
                placeholder={t('successSection.successTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('successSection.successMessageLabel')}</label>
              <Textarea
                value={content.success_message}
                onChange={(e) => setContent({ ...content, success_message: e.target.value })}
                placeholder={t('successSection.successMessagePlaceholder')}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('additionalInfo.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('additionalInfo.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('additionalInfo.infoTitleLabel')}</label>
              <Input
                value={content.info_title}
                onChange={(e) => setContent({ ...content, info_title: e.target.value })}
                placeholder={t('additionalInfo.infoTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('additionalInfo.infoContentLabel')}</label>
              <Textarea
                value={content.info_content}
                onChange={(e) => setContent({ ...content, info_content: e.target.value })}
                placeholder={t('additionalInfo.infoContentPlaceholder')}
                rows={4}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* SEO Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                <Search className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('seoSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('seoSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('seoSection.metaTitleLabel')}</label>
              <Input
                value={content.meta_title}
                onChange={(e) => setContent({ ...content, meta_title: e.target.value })}
                placeholder={t('seoSection.metaTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('seoSection.metaDescriptionLabel')}</label>
              <Textarea
                value={content.meta_description}
                onChange={(e) => setContent({ ...content, meta_description: e.target.value })}
                placeholder={t('seoSection.metaDescriptionPlaceholder')}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Save Button Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                  {t('savingContent')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('saveContentButton')}
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
