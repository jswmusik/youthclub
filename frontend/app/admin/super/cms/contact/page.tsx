'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Save, Loader2, Mail, FileText, CheckCircle, Eye, ExternalLink,
  MessageSquare, Clock, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '../../../../../hooks/useToast';
import api from '@/lib/api';
import Link from 'next/link';

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
  const { showToast } = useToast();
  const [content, setContent] = useState<ContactContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await api.get('/cms/contact-content/');
      if (response.data) {
        setContent({ ...defaultContent, ...response.data });
      }
    } catch (error) {
      console.error('Failed to fetch contact content:', error);
      showToast(t('toast.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/cms/contact-content/update_content/', content);
      showToast(t('toast.saveSuccess'), 'success');
    } catch (error) {
      console.error('Failed to save contact content:', error);
      showToast(t('toast.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Preview Button */}
      <div className="flex justify-end">
        <Link href="/contact" target="_blank">
          <Button variant="outline" className="gap-2 bg-[var(--dark-800)] border-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]">
            <Eye className="w-4 h-4" />
            {t('previewButton')}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hero Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-pink-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('heroSection.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('heroSection.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('heroSection.titleLabel')}</Label>
              <Input
                value={content.hero_title}
                onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
                placeholder={t('heroSection.titlePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('heroSection.subtitleLabel')}</Label>
              <Textarea
                value={content.hero_subtitle}
                onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
                placeholder={t('heroSection.subtitlePlaceholder')}
                rows={3}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('contactInfo.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('contactInfo.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('contactInfo.emailLabel')}</Label>
              <Input
                type="email"
                value={content.contact_email}
                onChange={(e) => setContent({ ...content, contact_email: e.target.value })}
                placeholder="support@ungdomsappen.se"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('contactInfo.responseTimeLabel')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                <Input
                  value={content.response_time_text}
                  onChange={(e) => setContent({ ...content, response_time_text: e.target.value })}
                  placeholder={t('contactInfo.responseTimePlaceholder')}
                  className="pl-10 bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('formSection.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('formSection.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('formSection.formTitleLabel')}</Label>
              <Input
                value={content.form_title}
                onChange={(e) => setContent({ ...content, form_title: e.target.value })}
                placeholder={t('formSection.formTitlePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('formSection.formDescriptionLabel')}</Label>
              <Textarea
                value={content.form_description}
                onChange={(e) => setContent({ ...content, form_description: e.target.value })}
                placeholder={t('formSection.formDescriptionPlaceholder')}
                rows={2}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('successSection.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('successSection.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('successSection.successTitleLabel')}</Label>
              <Input
                value={content.success_title}
                onChange={(e) => setContent({ ...content, success_title: e.target.value })}
                placeholder={t('successSection.successTitlePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('successSection.successMessageLabel')}</Label>
              <Textarea
                value={content.success_message}
                onChange={(e) => setContent({ ...content, success_message: e.target.value })}
                placeholder={t('successSection.successMessagePlaceholder')}
                rows={3}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('additionalInfo.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('additionalInfo.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('additionalInfo.infoTitleLabel')}</Label>
              <Input
                value={content.info_title}
                onChange={(e) => setContent({ ...content, info_title: e.target.value })}
                placeholder={t('additionalInfo.infoTitlePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('additionalInfo.infoContentLabel')}</Label>
              <Textarea
                value={content.info_content}
                onChange={(e) => setContent({ ...content, info_content: e.target.value })}
                placeholder={t('additionalInfo.infoContentPlaceholder')}
                rows={4}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">{t('seoSection.title')}</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  {t('seoSection.description')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('seoSection.metaTitleLabel')}</Label>
              <Input
                value={content.meta_title}
                onChange={(e) => setContent({ ...content, meta_title: e.target.value })}
                placeholder={t('seoSection.metaTitlePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('seoSection.metaDescriptionLabel')}</Label>
              <Textarea
                value={content.meta_description}
                onChange={(e) => setContent({ ...content, meta_description: e.target.value })}
                placeholder={t('seoSection.metaDescriptionPlaceholder')}
                rows={3}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
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
  );
}

