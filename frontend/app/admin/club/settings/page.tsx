'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import { useToast } from '../../../../hooks/useToast';
import { Upload, X, Building, Mail, Phone, MapPin, FileText, Globe, UserCheck, Info, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import BackButton from '@/app/components/BackButton';

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

interface ClubFormState {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  terms_and_conditions: string;
  club_policies: string;
  latitude: string;
  longitude: string;
  club_categories: string;
  trial_period_days_override: number | null;
  // Inventory settings
  max_active_loans_per_user: number;
  borrowing_requires_checkin: boolean;
}

export default function ClubSettingsPage() {
  const t = useTranslations('clubSettings');
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubData, setClubData] = useState<any>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { success, error, info, warning } = useToast();

  const [formData, setFormData] = useState<ClubFormState>({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    terms_and_conditions: '',
    club_policies: '',
    latitude: '',
    longitude: '',
    club_categories: '',
    trial_period_days_override: null,
    // Inventory settings
    max_active_loans_per_user: 3,
    borrowing_requires_checkin: false,
  });
  
  // Municipality trial period (for showing default)
  const [municipalityTrialDays, setMunicipalityTrialDays] = useState<number>(0);

  useEffect(() => {
    if (!loading && user) {
      fetchClub();
    }
  }, [user, loading]);

  const fetchClub = async () => {
    const assigned = user?.assigned_club;
    const clubId =
      typeof assigned === 'object' && assigned !== null ? (assigned as any).id : typeof assigned === 'number' ? assigned : null;

    if (!clubId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get(`/clubs/${clubId}/`);
      const data = res.data;
      setClubData(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        terms_and_conditions: data.terms_and_conditions || '',
        club_policies: data.club_policies || '',
        latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '',
        longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '',
        club_categories: data.club_categories || '',
        trial_period_days_override: data.trial_period_days_override,
        // Inventory settings
        max_active_loans_per_user: data.max_active_loans_per_user ?? 3,
        borrowing_requires_checkin: data.borrowing_requires_checkin ?? false,
      });
      
      // Get municipality trial days for showing default
      if (data.municipality_details?.trial_period_days !== undefined) {
        setMunicipalityTrialDays(data.municipality_details.trial_period_days);
      } else if (data.municipality) {
        // Fetch municipality details if not included
        try {
          const muniRes = await api.get(`/municipalities/${data.municipality}/`);
          setMunicipalityTrialDays(muniRes.data.trial_period_days || 0);
        } catch (e) {
          console.error('Failed to fetch municipality details', e);
        }
      }
      setAvatarPreview(data.avatar ? getMediaUrl(data.avatar) : null);
      setHeroPreview(data.hero_image ? getMediaUrl(data.hero_image) : null);
    } catch (err) {
      console.error('Failed to load club data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const handleRemoveImage = (type: 'avatar' | 'hero') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setHeroFile(null);
      setHeroPreview(null);
      if (heroRef.current) heroRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubData) return;
    setIsSaving(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('address', formData.address);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('club_policies', formData.club_policies);
      if (formData.latitude.trim() !== '') data.append('latitude', formData.latitude);
      if (formData.longitude.trim() !== '') data.append('longitude', formData.longitude);
      data.append('club_categories', formData.club_categories);
      data.append('municipality', clubData.municipality);
      
      // Trial period override - send the value or empty string to clear it
      if (formData.trial_period_days_override !== null) {
        data.append('trial_period_days_override', formData.trial_period_days_override.toString());
      } else {
        // Send empty string to explicitly clear the override (use municipality default)
        data.append('trial_period_days_override', '');
      }

      // Inventory settings
      data.append('max_active_loans_per_user', formData.max_active_loans_per_user.toString());
      data.append('borrowing_requires_checkin', formData.borrowing_requires_checkin.toString());

      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      await api.patch(`/clubs/${clubData.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      success(t('toast.updateSuccess'));
      setAvatarFile(null);
      setHeroFile(null);
      fetchClub();
    } catch (err) {
      console.error(err);
      error(t('toast.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = (fieldName: string) => `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 ${focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-[var(--brand-light)]/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
            <Building className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center p-4">
        <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <p className="text-[var(--brand-light)]/70">{t('noClubAssigned')}</p>
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
          <BackButton href="/admin/club/details" label={t('backToDetails')} />
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {t('title')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('basicInformation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('basicInformation.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Name and Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    {t('basicInformation.clubName')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('name')}
                  />
                </div>
                <div>
                  <label htmlFor="club_categories" className={labelClasses}>
                    <Globe className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-primary)]" />
                    {t('basicInformation.clubCategories')}
                  </label>
                  <input 
                    id="club_categories"
                    type="text"
                    placeholder={t('basicInformation.categoriesPlaceholder')}
                    value={formData.club_categories}
                    onChange={(e) => setFormData({ ...formData, club_categories: e.target.value })}
                    onFocus={() => setFocusedField('club_categories')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('club_categories')}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClasses}>
                  {t('basicInformation.description')} <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <DarkRichTextEditor
                  value={formData.description}
                  onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                  placeholder={t('basicInformation.descriptionPlaceholder')}
                  minHeight="150px"
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>{t('basicInformation.logoAvatar')}</label>
                  <div className="flex items-start gap-4">
                    <div 
                      className="relative group w-20 h-20 border-2 border-dashed border-[var(--dark-500)] rounded-full bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                      onClick={() => avatarRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <>
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <Upload className="h-5 w-5 text-[var(--brand-light)]/40 mx-auto mb-1" />
                          <span className="text-[10px] text-[var(--brand-light)]/40">{t('basicInformation.clickToUpload')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => avatarRef.current?.click()}
                          className="px-3 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-xs font-medium rounded-lg hover:bg-[var(--dark-500)] transition-all"
                        >
                          {t('basicInformation.chooseFile')}
                        </button>
                        {avatarPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('avatar')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('basicInformation.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('basicInformation.avatarTip')}</p>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>{t('basicInformation.heroImage')}</label>
                  <div className="flex items-start gap-4">
                    <div 
                      className="relative group w-20 h-32 border-2 border-dashed border-[var(--dark-500)] rounded-lg bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                      onClick={() => heroRef.current?.click()}
                    >
                      {heroPreview ? (
                        <>
                          <img src={heroPreview} alt="Hero preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <Upload className="h-5 w-5 text-[var(--brand-light)]/40 mx-auto mb-1" />
                          <span className="text-[10px] text-[var(--brand-light)]/40">{t('basicInformation.clickToUpload')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => heroRef.current?.click()}
                          className="px-3 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-xs font-medium rounded-lg hover:bg-[var(--dark-500)] transition-all"
                        >
                          {t('basicInformation.chooseFile')}
                        </button>
                        {heroPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('hero')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('basicInformation.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('basicInformation.heroTip')}</p>
                    </div>
                    <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'hero')} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Location Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-third)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('contactLocation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('contactLocation.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    {t('contactLocation.email')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('email')}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    {t('contactLocation.phone')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('phone')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="address" className={labelClasses}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-primary)]" />
                  {t('contactLocation.address')}
                </label>
                <input 
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('address')}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label htmlFor="latitude" className={labelClasses}>{t('contactLocation.latitude')}</label>
                  <input 
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder={t('contactLocation.latitudePlaceholder')}
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    onFocus={() => setFocusedField('latitude')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('latitude')}
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className={labelClasses}>{t('contactLocation.longitude')}</label>
                  <input 
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder={t('contactLocation.longitudePlaceholder')}
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    onFocus={() => setFocusedField('longitude')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('longitude')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Policies Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-peach)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('policies.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('policies.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Terms & Conditions */}
              <div>
                <LegalRichTextEditor
                  value={formData.terms_and_conditions}
                  onChange={(content) => setFormData(prev => ({ ...prev, terms_and_conditions: content }))}
                  placeholder={t('policies.termsPlaceholder')}
                  usage="terms_and_conditions"
                  label={t('policies.termsConditions')}
                  insertTemplateLabel={t('policies.insertTemplate')}
                  minHeight="180px"
                />
              </div>

              {/* Club Policies */}
              <div>
                <LegalRichTextEditor
                  value={formData.club_policies}
                  onChange={(content) => setFormData(prev => ({ ...prev, club_policies: content }))}
                  placeholder={t('policies.policiesPlaceholder')}
                  usage="club_policies"
                  label={t('policies.clubPolicies')}
                  insertTemplateLabel={t('policies.insertTemplate')}
                  minHeight="180px"
                />
              </div>
            </div>
          </div>

          {/* Trial Period Override Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-green)] flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('trialPeriod.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('trialPeriod.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <Info className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-[var(--brand-light)]">
                    {t('trialPeriod.infoText')}
                  </p>
                  <p className="text-xs text-[var(--brand-light)]/50">
                    {t('trialPeriod.municipalityDefault', { days: municipalityTrialDays })}
                  </p>
                </div>
              </div>

              {/* Override Toggle */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="useTrialOverride"
                    type="checkbox"
                    className="h-4 w-4 text-[var(--brand-primary)] border-[var(--dark-500)] rounded focus:ring-[var(--brand-primary)] bg-[var(--dark-600)]"
                    checked={formData.trial_period_days_override !== null}
                    onChange={e => {
                      if (e.target.checked) {
                        setFormData({...formData, trial_period_days_override: municipalityTrialDays});
                      } else {
                        setFormData({...formData, trial_period_days_override: null});
                      }
                    }}
                  />
                  <label htmlFor="useTrialOverride" className="text-sm text-[var(--brand-light)] cursor-pointer">
                    {t('trialPeriod.overrideLabel')}
                  </label>
                </div>

                {formData.trial_period_days_override !== null && (
                  <div className="pl-7 space-y-3">
                    <div className="flex items-center gap-4">
                      <label htmlFor="trial_override_days" className="text-sm text-[var(--brand-light)]/70 whitespace-nowrap">
                        {t('trialPeriod.daysLabel')}
                      </label>
                      <input
                        id="trial_override_days"
                        type="number"
                        min={0}
                        max={90}
                        className={`${inputClasses('trial_override_days')} w-24`}
                        value={formData.trial_period_days_override}
                        onChange={e => setFormData({...formData, trial_period_days_override: parseInt(e.target.value) || 0})}
                        onFocus={() => setFocusedField('trial_override_days')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <span className="text-sm text-[var(--brand-light)]/50">{t('trialPeriod.days')}</span>
                    </div>
                    <p className="text-xs text-[var(--brand-light)]/40">
                      {formData.trial_period_days_override === 0 
                        ? t('trialPeriod.disabledHint')
                        : t('trialPeriod.enabledHint', { days: formData.trial_period_days_override })}
                    </p>
                  </div>
                )}
              </div>

              {/* Current Status */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                (formData.trial_period_days_override !== null ? formData.trial_period_days_override : municipalityTrialDays) > 0 
                  ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                  : 'bg-[var(--dark-700)] border-[var(--dark-500)]'
              }`}>
                {(formData.trial_period_days_override !== null ? formData.trial_period_days_override : municipalityTrialDays) > 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                    <span className="text-sm text-[var(--brand-light)]">
                      {formData.trial_period_days_override !== null 
                        ? t('trialPeriod.statusOverride', { days: formData.trial_period_days_override })
                        : t('trialPeriod.statusDefault', { days: municipalityTrialDays })}
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

          {/* Inventory Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('inventorySettings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('inventorySettings.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Max Loans Per User */}
              <div className="space-y-3">
                <label htmlFor="max_active_loans_per_user" className={labelClasses}>
                  {t('inventorySettings.maxLoansPerUser')}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="max_active_loans_per_user"
                    type="number"
                    min={1}
                    max={10}
                    className={`${inputClasses('max_active_loans_per_user')} w-24`}
                    value={formData.max_active_loans_per_user}
                    onChange={e => setFormData({...formData, max_active_loans_per_user: parseInt(e.target.value) || 1})}
                    onFocus={() => setFocusedField('max_active_loans_per_user')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <span className="text-sm text-[var(--brand-light)]/50">{t('inventorySettings.itemsPerClub')}</span>
                </div>
                <p className="text-xs text-[var(--brand-light)]/40">
                  {t('inventorySettings.maxLoansDescription')}
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Require Check-in Toggle */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    id="borrowing_requires_checkin"
                    type="checkbox"
                    className="h-5 w-5 text-[var(--brand-primary)] border-[var(--dark-500)] rounded focus:ring-[var(--brand-primary)] bg-[var(--dark-600)] mt-0.5"
                    checked={formData.borrowing_requires_checkin}
                    onChange={e => setFormData({...formData, borrowing_requires_checkin: e.target.checked})}
                  />
                  <div>
                    <label htmlFor="borrowing_requires_checkin" className="text-sm font-semibold text-[var(--brand-light)] cursor-pointer">
                      {t('inventorySettings.requireCheckIn')}
                    </label>
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                      {t('inventorySettings.requireCheckInDescription')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                formData.borrowing_requires_checkin 
                  ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                  : 'bg-[var(--dark-700)] border-[var(--dark-500)]'
              }`}>
                {formData.borrowing_requires_checkin ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                    <span className="text-sm text-[var(--brand-light)]">
                      {t('inventorySettings.statusCheckInRequired')}
                    </span>
                  </>
                ) : (
                  <>
                    <Info className="h-5 w-5 text-[var(--brand-light)]/50" />
                    <span className="text-sm text-[var(--brand-light)]">
                      {t('inventorySettings.statusCheckInNotRequired')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.push('/admin/club/details')} 
                className="px-6 py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-600)] transition-all"
              >
                {t('buttons.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    {t('buttons.saving')}
                  </>
                ) : (
                  t('buttons.saveChanges')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      
    </div>
  );
}
