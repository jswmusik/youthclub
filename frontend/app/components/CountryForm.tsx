'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Globe, Flag, MapPin, Clock, Languages, Coins, Save, CheckCircle2, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import { queueToastForNavigation } from './ToastProvider';

interface CountryFormProps {
  initialData?: any;
  redirectPath: string;
}

interface FormData {
  name: string;
  country_code: string;
  description: string;
  currency_code: string;
  default_language: string;
  timezone: string;
}

export default function CountryForm({ initialData, redirectPath }: CountryFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error'|'info'|'warning', isVisible: false, title: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Form State
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    country_code: initialData?.country_code || '',
    description: initialData?.description || '',
    currency_code: initialData?.currency_code || '',
    default_language: initialData?.default_language || '',
    timezone: initialData?.timezone || ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('country_code', formData.country_code);
      data.append('description', formData.description);
      data.append('currency_code', formData.currency_code);
      data.append('default_language', formData.default_language);
      data.append('timezone', formData.timezone);
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/countries/${initialData.id}/`, data, config);
        // Queue toast to show after navigation
        queueToastForNavigation(
          `${formData.name} has been updated with your changes.`,
          'success',
          'Country Updated!',
          2500
        );
      } else {
        await api.post('/countries/', data, config);
        // Queue toast to show after navigation
        queueToastForNavigation(
          `${formData.name} has been added to your platform.`,
          'success',
          'Country Created!',
          2500
        );
      }

      router.push(redirectPath);

    } catch (err: any) {
      console.error(err);
      setToast({ 
        message: 'Something went wrong. Please check your input and try again.', 
        type: 'error', 
        isVisible: true,
        title: 'Operation Failed'
      });
      setLoading(false);
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

  // Calculate form completion percentage
  const requiredFields = ['name', 'country_code', 'description'];
  const filledRequired = requiredFields.filter(field => formData[field as keyof FormData]?.trim()).length;
  const completionPercent = Math.round((filledRequired / requiredFields.length) * 100);

  // Handle scroll for sticky progress bar
  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    // If the top of the placeholder is above 80px (below mobile header), show fixed version
    setIsProgressFixed(rect.top < 80);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    
    // Initial check
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
            href={redirectPath}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? 'Edit Country' : 'Add New Country'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update country information and settings' : 'Set up a new country configuration for your platform'}
            </p>
          </div>
        </div>

        {/* Progress Indicator - with placeholder for fixed positioning */}
        <div 
          ref={progressPlaceholderRef}
          className="mb-6 sm:mb-8"
          style={{ minHeight: isProgressFixed ? 72 : 'auto' }}
        >
          {/* Static version - shown when not scrolled */}
          <div 
            className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}
            role="region"
            aria-label="Form completion progress"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">Form completion</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div 
              className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Form ${completionPercent}% complete`}
            >
              <div 
                className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">All required fields completed!</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress Indicator - rendered via portal to ensure full width on mobile */}
        {isMounted && createPortal(
          <div 
            className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
            role="region"
            aria-label="Form completion progress"
            aria-hidden={!isProgressFixed}
          >
            {/* Mobile: full width, Desktop: centered with max-width matching form */}
            <div className="w-full md:max-w-3xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">Form completion</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div 
                className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Form ${completionPercent}% complete`}
              >
                <div 
                  className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              {completionPercent === 100 && (
                <div className="flex items-center gap-2 mt-2 text-[var(--brand-third)]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">All required fields completed!</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Main Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Country Details</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">
                    {initialData ? 'Update the information for this country' : 'Enter the basic information for this country'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              
              {/* Flag/Avatar Upload */}
              <div>
                <label className={labelClasses}>
                  <Flag className="w-4 h-4 inline mr-2 text-[var(--brand-primary)]" />
                  Country Flag / Avatar
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
                        <span className="text-[10px] text-[var(--brand-light)]/40">Upload</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-[var(--brand-light)]/50">
                      Upload a flag or representative image (400x300px recommended)
                    </p>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium rounded-xl hover:bg-[var(--dark-500)] transition-all"
                      >
                        Choose File
                      </button>
                      {avatarPreview && (
                        <button 
                          type="button" 
                          onClick={handleRemoveImage}
                          className="px-4 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-sm font-medium rounded-xl hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                        >
                          <X className="h-4 w-4" /> Remove
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
                    Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    required 
                    placeholder="e.g. Sweden"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('name')}
                  />
                </div>
                <div>
                  <label htmlFor="country_code" className={labelClasses}>
                    Country Code (ISO) <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="country_code"
                    type="text"
                    required 
                    placeholder="e.g. SE"
                    maxLength={5}
                    value={formData.country_code}
                    onChange={e => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                    onFocus={() => setFocusedField('country_code')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('country_code')} uppercase font-mono tracking-wider`}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClasses}>
                  Description <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <textarea 
                  id="description"
                  required 
                  rows={4} 
                  placeholder="Brief description of this country/region..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('description')} resize-none`}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Regional Settings Header */}
              <div className="flex items-center gap-2 text-[var(--brand-light)]/70">
                <MapPin className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="text-sm font-medium">Regional Settings</span>
                <span className="text-xs text-[var(--brand-light)]/40">(Optional)</span>
              </div>

              {/* Currency, Language, Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="currency_code" className={labelClasses}>
                    <Coins className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                    Currency
                  </label>
                  <input 
                    id="currency_code"
                    type="text"
                    placeholder="e.g. SEK"
                    value={formData.currency_code}
                    onChange={e => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
                    onFocus={() => setFocusedField('currency_code')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('currency_code')} uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor="default_language" className={labelClasses}>
                    <Languages className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    Language
                  </label>
                  <input 
                    id="default_language"
                    type="text"
                    placeholder="e.g. sv"
                    value={formData.default_language}
                    onChange={e => setFormData({ ...formData, default_language: e.target.value })}
                    onFocus={() => setFocusedField('default_language')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('default_language')}
                  />
                </div>
                <div>
                  <label htmlFor="timezone" className={labelClasses}>
                    <Clock className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    Timezone
                  </label>
                  <input 
                    id="timezone"
                    type="text"
                    placeholder="e.g. Europe/Stockholm"
                    value={formData.timezone}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                    onFocus={() => setFocusedField('timezone')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('timezone')}
                  />
                </div>
              </div>
            </div>

            {/* Card Footer / Actions */}
            <div className="px-6 py-5 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.push(redirectPath)} 
                className="px-6 py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-600)] transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading || completionPercent < 100}
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? 'Save Changes' : 'Create Country'}
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
            Quick Tips
          </h3>
          <ul className="text-sm text-[var(--brand-light)]/50 space-y-1.5">
            <li>• Use the official ISO 3166-1 alpha-2 country code (e.g., SE for Sweden)</li>
            <li>• Currency codes follow ISO 4217 standard (e.g., SEK, EUR, USD)</li>
            <li>• Timezones use IANA format (e.g., Europe/Stockholm)</li>
          </ul>
        </div>
      </div>
      
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        title={toast.title}
        onClose={() => setToast({...toast, isVisible: false})} 
        darkMode 
      />
    </div>
  );
}
