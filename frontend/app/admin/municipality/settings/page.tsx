'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import { useToast } from '../../../../hooks/useToast';
import { Building2, Code, FileText, Mail, Phone, Globe, Facebook, Instagram, Settings, Camera, Image as ImageIcon, CheckCircle, Trash2, Clock, AlertTriangle, UserCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dynamically import rich text editors to avoid SSR issues
const LegalRichTextEditor = dynamic(
  () => import('@/app/components/LegalRichTextEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-48 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border-2 border-[var(--dark-500)]">
        <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
          <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          <span>Laddar editor...</span>
        </div>
      </div>
    )
  }
);

const DarkRichTextEditor = dynamic(
  () => import('@/app/components/DarkRichTextEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-48 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border-2 border-[var(--dark-500)]">
        <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
          <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          <span>Laddar editor...</span>
        </div>
      </div>
    )
  }
);

export default function MyMunicipalityPage() {
  const t = useTranslations('municipalitySettings');
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error, info, warning } = useToast();
  
  // Data State
  const [muniData, setMuniData] = useState<any>(null);
  
  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    municipality_code: '',
    description: '',
    terms_and_conditions: '',
    email: '',
    phone: '',
    website_link: '',
    allow_self_registration: true,
    facebook: '',
    instagram: '',
    data_retention_months: null as number | null,
    trial_period_days: 0,
  });
  
  // Data retention info from API
  const [dataRetentionInfo, setDataRetentionInfo] = useState<{
    effective_months: number;
    global_default_months: number;
    min_allowed_months: number;
    max_allowed_months: number;
    is_using_global_default: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && user) {
      fetchMunicipality();
    }
  }, [user, loading]);

  const fetchMunicipality = async () => {
    if (!user?.assigned_municipality) return; // Safety check

    try {
      // Since we filtered the QuerySet in Backend to only show assigned_muni,
      // we can technically fetch /municipalities/ and take the first result,
      // OR fetch by ID directly. ID is safer.
      
      // Note: user.assigned_municipality might be an Object or ID depending on serializer.
      // If it's an object, use .id. If it's a number, use it directly.
      const muniId = typeof user.assigned_municipality === 'object' 
        ? (user.assigned_municipality as any).id 
        : user.assigned_municipality;

      const res = await api.get(`/municipalities/${muniId}/`);
      const item = res.data;
      setMuniData(item);

      // Parse social media
      let social = { facebook: '', instagram: '' };
      try {
        if (item.social_media) {
          if (typeof item.social_media === 'string') social = { ...social, ...JSON.parse(item.social_media) };
          else if (typeof item.social_media === 'object') social = { ...social, ...item.social_media };
        }
      } catch (e) {}

      setFormData({
        name: item.name,
        municipality_code: item.municipality_code || '',
        description: item.description || '',
        terms_and_conditions: item.terms_and_conditions || '',
        email: item.email || '',
        phone: item.phone || '',
        website_link: item.website_link || '',
        allow_self_registration: item.allow_self_registration ?? true,
        facebook: social.facebook || '',
        instagram: social.instagram || '',
        data_retention_months: item.data_retention_months,
        trial_period_days: item.trial_period_days ?? 0,
      });
      
      // Set data retention info
      if (item.data_retention_info) {
        setDataRetentionInfo(item.data_retention_info);
      }

      setAvatarPreview(item.avatar ? getMediaUrl(item.avatar) : null);
      setHeroPreview(item.hero_image ? getMediaUrl(item.hero_image) : null);

    } catch (err) {
      console.error("Failed to load municipality", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setAvatarFile(file);
          setAvatarPreview(reader.result as string);
        } else {
          setHeroFile(file);
          setHeroPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const data = new FormData();
      const socialMediaJson = JSON.stringify({
        facebook: formData.facebook,
        instagram: formData.instagram
      });

      // We only append editable fields
      data.append('name', formData.name);
      data.append('municipality_code', formData.municipality_code);
      data.append('description', formData.description);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('website_link', formData.website_link);
      data.append('allow_self_registration', formData.allow_self_registration.toString());
      data.append('social_media', socialMediaJson);
      
      // Data retention - send empty string if null (to use global default)
      if (formData.data_retention_months !== null) {
        data.append('data_retention_months', formData.data_retention_months.toString());
      }
      
      // Trial period days
      data.append('trial_period_days', formData.trial_period_days.toString());
      
      // Note: We do NOT send 'country' here, as it shouldn't change.

      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      await api.patch(`/municipalities/${muniData.id}/`, data, config);
      
      // Re-fetch to clean up state
      fetchMunicipality();
      setAvatarFile(null);
      setHeroFile(null);
      
      success(t('toast.saveSuccess'));

    } catch (err) {
      console.error(err);
      error(t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) return (
    <div className="py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</span>
      </div>
    </div>
  );
  
  if (!muniData) return (
    <div className="py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--dark-700)] flex items-center justify-center">
          <Building2 className="w-6 h-6 text-[var(--brand-light)]/30" />
        </div>
        <span className="text-[var(--brand-light)]/60">{t('noMunicipalityAssigned')}</span>
      </div>
    </div>
  );

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0 space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 space-y-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[var(--dark-900)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
        </div>
        <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:px-4 md:px-6 md:px-8">
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-xl border-y md:border border-[var(--dark-600)] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--brand-light)]/50 font-semibold">{t('summaryCards.municipality')}</p>
              <p className="text-xl font-bold text-[var(--brand-light)]">{formData.name || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-xl border-y md:border border-[var(--dark-600)] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
              <Code className="h-5 w-5 text-[var(--brand-purple)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--brand-light)]/50 font-semibold">{t('summaryCards.code')}</p>
              <p className="text-xl font-bold text-[var(--brand-light)]">{formData.municipality_code || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding Section */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('branding.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('branding.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('branding.logoAvatar')}
                </Label>
                <div className="relative">
                  <div className="bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] rounded-none sm:rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[var(--brand-primary)] transition-colors">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-24 h-24 object-contain bg-[var(--dark-600)] rounded-xl" alt="Avatar" />
                    ) : (
                      <div className="w-24 h-24 bg-[var(--dark-600)] rounded-xl flex items-center justify-center text-[var(--brand-light)]/30">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-purple)] transition-colors">
                        {avatarPreview ? t('branding.changeLogo') : t('branding.uploadLogo')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileChange(e, 'avatar')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('branding.heroBanner')}
                </Label>
                <div className="relative">
                  <div className="bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] rounded-none sm:rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[var(--brand-primary)] transition-colors">
                    {heroPreview ? (
                      <img src={heroPreview} className="w-full h-40 object-cover rounded-none sm:rounded-xl" alt="Hero" />
                    ) : (
                      <div className="w-full h-40 bg-[var(--dark-600)] rounded-none sm:rounded-xl flex items-center justify-center text-[var(--brand-light)]/30">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-purple)] transition-colors">
                        {heroPreview ? t('branding.changeBanner') : t('branding.uploadBanner')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileChange(e, 'hero')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Details Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[var(--brand-purple)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('basicDetails.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('basicDetails.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('basicDetails.municipalityName')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality_code" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Code className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('basicDetails.municipalityCode')}
                </Label>
                <Input
                  id="municipality_code"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.municipality_code}
                  onChange={e => setFormData({...formData, municipality_code: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
                {t('basicDetails.description')}
              </Label>
              <DarkRichTextEditor
                value={formData.description}
                onChange={(content) => setFormData(prev => ({...prev, description: content}))}
                placeholder={t('basicDetails.descriptionPlaceholder')}
                minHeight="150px"
              />
            </div>
          </div>
        </div>

        {/* Contact & Socials Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-[var(--brand-blue)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('contactSocials.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('contactSocials.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--brand-blue)]" />
                  {t('contactSocials.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--brand-third)]" />
                  {t('contactSocials.phone')}
                </Label>
                <Input
                  id="phone"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_link" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('contactSocials.website')}
                </Label>
                <Input
                  id="website_link"
                  type="url"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.website_link}
                  onChange={e => setFormData({...formData, website_link: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('contactSocials.facebookUrl')}
                </Label>
                <Input
                  id="facebook"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.facebook}
                  onChange={e => setFormData({...formData, facebook: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-[var(--brand-primary)]" />
                  {t('contactSocials.instagramUrl')}
                </Label>
                <Input
                  id="instagram"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.instagram}
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)]/20 flex items-center justify-center">
                <Settings className="h-5 w-5 text-[var(--brand-green)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('settings.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('settings.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-500)]">
              <input
                id="selfReg"
                type="checkbox"
                className="h-4 w-4 text-[var(--brand-primary)] border-[var(--dark-500)] rounded focus:ring-[var(--brand-primary)] bg-[var(--dark-600)]"
                checked={formData.allow_self_registration}
                onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
              />
              <label htmlFor="selfReg" className="text-sm text-[var(--brand-light)] cursor-pointer flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                {t('settings.allowSelfRegistration')}
              </label>
            </div>
            <div className="space-y-2">
              <LegalRichTextEditor
                value={formData.terms_and_conditions}
                onChange={(content) => setFormData(prev => ({...prev, terms_and_conditions: content}))}
                placeholder={t('settings.termsPlaceholder')}
                usage="general"
                label={t('settings.termsAndConditions')}
                insertTemplateLabel={t('settings.insertTemplate')}
                minHeight="200px"
              />
            </div>
          </div>
        </div>

        {/* Trial Period Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('trialPeriod.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('trialPeriod.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
              <Info className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-[var(--brand-light)]">
                  {t('trialPeriod.infoText')}
                </p>
                <p className="text-xs text-[var(--brand-light)]/50">
                  {t('trialPeriod.infoSubtext')}
                </p>
              </div>
            </div>

            {/* Trial Days Input */}
            <div className="space-y-3">
              <Label htmlFor="trial_period_days" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                {t('trialPeriod.daysLabel')}
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="trial_period_days"
                  type="number"
                  min={0}
                  max={90}
                  className="w-32 bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.trial_period_days}
                  onChange={e => setFormData({...formData, trial_period_days: parseInt(e.target.value) || 0})}
                />
                <span className="text-sm text-[var(--brand-light)]/50">{t('trialPeriod.days')}</span>
              </div>
              <p className="text-xs text-[var(--brand-light)]/40">
                {formData.trial_period_days === 0 
                  ? t('trialPeriod.disabledHint')
                  : t('trialPeriod.enabledHint', { days: formData.trial_period_days })}
              </p>
            </div>

            {/* Current Status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              formData.trial_period_days > 0 
                ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                : 'bg-[var(--dark-700)] border-[var(--dark-500)]'
            }`}>
              {formData.trial_period_days > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                  <span className="text-sm text-[var(--brand-light)]">
                    {t('trialPeriod.statusEnabled', { days: formData.trial_period_days })}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-[var(--brand-yellow)]" />
                  <span className="text-sm text-[var(--brand-light)]">
                    {t('trialPeriod.statusDisabled')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Data Retention Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">{t('dataRetention.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('dataRetention.description')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
              <Clock className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-[var(--brand-light)]">
                  <span className="font-semibold">{t('dataRetention.currentEffectivePeriod')}</span>{' '}
                  <span className="text-[var(--brand-primary)] font-bold">
                    {dataRetentionInfo?.effective_months || 12} {t('dataRetention.months')}
                  </span>
                </p>
                <p className="text-xs text-[var(--brand-light)]/50">
                  {dataRetentionInfo?.is_using_global_default 
                    ? t('dataRetention.usingGlobalDefault')
                    : t('dataRetention.usingCustomValue')}
                </p>
              </div>
            </div>

            {/* Custom Retention Setting */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="useCustomRetention"
                  type="checkbox"
                  className="h-4 w-4 text-[var(--brand-primary)] border-[var(--dark-500)] rounded focus:ring-[var(--brand-primary)] bg-[var(--dark-600)]"
                  checked={formData.data_retention_months !== null}
                  onChange={e => {
                    if (e.target.checked) {
                      setFormData({...formData, data_retention_months: dataRetentionInfo?.global_default_months || 12});
                    } else {
                      setFormData({...formData, data_retention_months: null});
                    }
                  }}
                />
                <label htmlFor="useCustomRetention" className="text-sm text-[var(--brand-light)] cursor-pointer">
                  {t('dataRetention.setCustomRetention')}
                </label>
              </div>

              {formData.data_retention_months !== null && (
                <div className="pl-7 space-y-3">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="retention_months" className="text-sm text-[var(--brand-light)]/70 whitespace-nowrap">
                      {t('dataRetention.retentionPeriod')}
                    </Label>
                    <Input
                      id="retention_months"
                      type="number"
                      min={dataRetentionInfo?.min_allowed_months || 6}
                      max={dataRetentionInfo?.max_allowed_months || 36}
                      className="w-24 bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
                      value={formData.data_retention_months || ''}
                      onChange={e => setFormData({...formData, data_retention_months: parseInt(e.target.value) || null})}
                    />
                    <span className="text-sm text-[var(--brand-light)]/50">{t('dataRetention.months')}</span>
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40">
                    {t('dataRetention.allowedRange')} {dataRetentionInfo?.min_allowed_months || 6} - {dataRetentionInfo?.max_allowed_months || 36} {t('dataRetention.months')}
                  </p>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-400 font-semibold">{t('dataRetention.warningTitle')}</p>
                <p className="text-xs text-[var(--brand-light)]/60 mt-1">
                  {t('dataRetention.warningDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="flex justify-end pt-4 border-t border-[var(--dark-600)] px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8">
            <Button
              type="submit"
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? t('actions.saving') : t('actions.saveChanges')}
            </Button>
          </div>
        </div>
      </form>

    </div>
  );
}