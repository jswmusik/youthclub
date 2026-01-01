'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Globe, Flag, MapPin, Clock, Languages, Coins, Plus, CheckCircle2, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '../../../../../hooks/useToast';
import { queueToastForNavigation } from '@/app/components/ToastProvider';
import { createCountrySchema, type CountryFormData } from '@/lib/validations/country';

export default function CreateCountryPage() {
  const t = useTranslations('countriesAdmin.create');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const { error } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Create the schema with translations
  const countrySchema = createCountrySchema(t);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CountryFormData>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      name: '',
      country_code: '',
      description: '',
      currency_code: '',
      default_language: '',
      timezone: ''
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  // Watch form values for progress calculation
  const formData = watch();

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submission - data is already validated by Zod!
  const onSubmit = async (data: CountryFormData) => {
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', data.name);
      formDataToSend.append('country_code', data.country_code);
      formDataToSend.append('description', data.description);
      formDataToSend.append('currency_code', data.currency_code);
      formDataToSend.append('default_language', data.default_language);
      formDataToSend.append('timezone', data.timezone);
      
      if (avatarFile) formDataToSend.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      await api.post('/countries/', formDataToSend, config);
      
      queueToastForNavigation(
        t('toast.successMessage', { name: data.name }),
        'success',
        t('toast.successTitle'),
        2500
      );
      
      router.push('/admin/super/countries');

    } catch (err: any) {
      console.error(err);
      error(t('toast.errorMessage'), t('toast.errorTitle'));
      setLoading(false);
    }
  };

  const inputClasses = (fieldName: string, hasError: boolean = false) => `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 ${hasError ? 'border-[var(--brand-red)]' : focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  // Calculate form completion percentage - now all 6 fields are required
  const requiredFields = ['name', 'country_code', 'description', 'currency_code', 'default_language', 'timezone'] as const;
  const filledRequired = requiredFields.filter(field => formData[field]?.trim()).length;
  const completionPercent = Math.round((filledRequired / requiredFields.length) * 100);

  // Handle scroll for sticky progress bar
  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    setIsProgressFixed(rect.top < 80);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();

    return () => {
      mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href="/admin/super/countries"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {t('title')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div 
          ref={progressPlaceholderRef}
          className="mb-6 sm:mb-8"
          style={{ minHeight: isProgressFixed ? 72 : 'auto' }}
        >
          <div 
            className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}
            role="region"
            aria-label="Form completion progress"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">{t('formCompletion')}</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('allFieldsCompleted')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress Indicator */}
        {isMounted && createPortal(
          <div 
            className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
          >
            <div className="w-full md:max-w-3xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">{t('formCompletion')}</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              {completionPercent === 100 && (
                <div className="flex items-center gap-2 mt-2 text-[var(--brand-third)]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('allFieldsCompleted')}</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Main Form Card */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('countryDetails')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('countryDetailsDescription')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              
              {/* Flag/Avatar Upload */}
              <div>
                <label className={labelClasses}>
                  <Flag className="w-4 h-4 inline mr-2 text-[var(--brand-primary)]" />
                  {t('flagAvatar')}
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div 
                    className="relative group w-28 h-20 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Upload className="h-5 w-5 text-[var(--brand-light)]/40 mx-auto mb-1" />
                        <span className="text-[10px] text-[var(--brand-light)]/40">{t('upload')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-[var(--brand-light)]/50">{t('uploadFlag')}</p>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium rounded-xl hover:bg-[var(--dark-500)] transition-all"
                      >
                        {t('chooseFile')}
                      </button>
                      {avatarPreview && (
                        <button 
                          type="button" 
                          onClick={handleRemoveImage}
                          className="px-4 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-sm font-medium rounded-xl hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                        >
                          <X className="h-4 w-4" /> {t('remove')}
                        </button>
                      )}
                    </div>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Name and Country Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    {t('name')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    placeholder={t('namePlaceholder')}
                    {...register('name')}
                    onFocus={() => setFocusedField('name')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('name').onBlur(e);
                    }}
                    className={inputClasses('name', !!errors.name)}
                  />
                  {errors.name && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="country_code" className={labelClasses}>
                    {t('countryCode')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="country_code"
                    type="text"
                    placeholder={t('countryCodePlaceholder')}
                    maxLength={5}
                    {...register('country_code', {
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }
                    })}
                    onFocus={() => setFocusedField('country_code')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('country_code').onBlur(e);
                    }}
                    className={`${inputClasses('country_code', !!errors.country_code)} uppercase font-mono tracking-wider`}
                  />
                  {errors.country_code && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.country_code.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClasses}>
                  {t('description')} <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <textarea 
                  id="description"
                  rows={4} 
                  placeholder={t('descriptionPlaceholder')}
                  {...register('description')}
                  onFocus={() => setFocusedField('description')}
                  onBlur={(e) => {
                    setFocusedField(null);
                    register('description').onBlur(e);
                  }}
                  className={`${inputClasses('description', !!errors.description)} resize-none`}
                />
                {errors.description && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Regional Settings Header */}
              <div className="flex items-center gap-2 text-[var(--brand-light)]/70">
                <MapPin className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="text-sm font-medium">{t('regionalSettings')}</span>
              </div>

              {/* Currency, Language, Timezone - All required now */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="currency_code" className={labelClasses}>
                    <Coins className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                    {t('currency')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="currency_code"
                    type="text"
                    placeholder={t('currencyPlaceholder')}
                    {...register('currency_code', {
                      onChange: (e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }
                    })}
                    onFocus={() => setFocusedField('currency_code')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('currency_code').onBlur(e);
                    }}
                    className={`${inputClasses('currency_code', !!errors.currency_code)} uppercase`}
                  />
                  {errors.currency_code && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.currency_code.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="default_language" className={labelClasses}>
                    <Languages className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    {t('language')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="default_language"
                    type="text"
                    placeholder={t('languagePlaceholder')}
                    {...register('default_language')}
                    onFocus={() => setFocusedField('default_language')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('default_language').onBlur(e);
                    }}
                    className={inputClasses('default_language', !!errors.default_language)}
                  />
                  {errors.default_language && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.default_language.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="timezone" className={labelClasses}>
                    <Clock className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    {t('timezone')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="timezone"
                    type="text"
                    placeholder={t('timezonePlaceholder')}
                    {...register('timezone')}
                    onFocus={() => setFocusedField('timezone')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('timezone').onBlur(e);
                    }}
                    className={inputClasses('timezone', !!errors.timezone)}
                  />
                  {errors.timezone && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.timezone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer / Actions */}
            <div className="px-6 py-5 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.push('/admin/super/countries')} 
                className="px-6 py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-600)] transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit" 
                disabled={loading || completionPercent < 100}
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t('createCountry')}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Helper Tips */}
        <div className="mt-6 p-4 bg-[var(--dark-800)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
          <h3 className="text-sm font-semibold text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[var(--brand-third)]" />
            {t('quickTips')}
          </h3>
          <ul className="text-sm text-[var(--brand-light)]/50 space-y-1.5">
            <li>• {t('tip1')}</li>
            <li>• {t('tip2')}</li>
            <li>• {t('tip3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
