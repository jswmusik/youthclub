'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Upload, X, MapPin, Building2, Globe, Mail, Phone, 
  Link as LinkIcon, CheckCircle2, Lightbulb, Save, Users, Shield,
  Facebook, Instagram, FileText, Crown, Package
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import { queueToastForNavigation } from './ToastProvider';
import { useAuth } from '../../context/AuthContext';

interface MunicipalityFormProps {
  initialData?: any;
  redirectPath: string;
}

interface Plan {
  id: number;
  name: string;
  monthly_price_sek: number;
}

interface FormData {
  name: string;
  country: string;
  municipality_code: string;
  description: string;
  terms_and_conditions: string;
  email: string;
  phone: string;
  website_link: string;
  allow_self_registration: boolean;
  require_guardian_at_registration: boolean;
  facebook: string;
  instagram: string;
  // License fields
  plan_id: string;
  max_clubs: number;
  license_end_date: string;
  license_is_active: boolean;
}

export default function MunicipalityForm({ initialData, redirectPath }: MunicipalityFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
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
    country: String(initialData?.country?.id ?? initialData?.country ?? ''),
    municipality_code: initialData?.municipality_code || '',
    description: initialData?.description || '',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website_link: initialData?.website_link || '',
    allow_self_registration: initialData?.allow_self_registration ?? true,
    require_guardian_at_registration: initialData?.require_guardian_at_registration ?? false,
    facebook: '',
    instagram: '',
    // License fields - pre-fill from existing license_status
    plan_id: String(initialData?.license_status?.plan_id ?? ''),
    max_clubs: initialData?.license_status?.max_clubs ?? 3,
    license_end_date: initialData?.license_status?.expires_at ?? getDefaultEndDate(),
    license_is_active: initialData?.license_status?.is_active ?? true,
  });

  // Helper function to get default end date (1 year from now)
  function getDefaultEndDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  // Images state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);
  const [heroPreview, setHeroPreview] = useState<string | null>(initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  useEffect(() => {
    // Fetch countries
    api.get('/countries/').then(res => {
      setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
    
    // Fetch plans for Super Admin
    if (isSuperAdmin) {
      api.get('/licensing/plans/').then(res => {
        setPlans(res.data.results || res.data || []);
      }).catch(err => console.error('Failed to load plans:', err));
    }
    
    // Parse socials
    if (initialData?.social_media) {
      try {
        const social = typeof initialData.social_media === 'string' 
            ? JSON.parse(initialData.social_media) 
            : initialData.social_media;
        setFormData(prev => ({ ...prev, facebook: social.facebook || '', instagram: social.instagram || '' }));
      } catch (e) { console.error(e); }
    }
  }, [initialData, isSuperAdmin]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(preview);
      } else {
        setHeroFile(file);
        setHeroPreview(preview);
      }
    }
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
    setLoading(true);
    try {
      const data = new FormData();
      const licenseFields = ['plan_id', 'max_clubs', 'license_end_date', 'license_is_active'];
      
      Object.entries(formData).forEach(([key, value]) => {
        // Skip social media fields (handled separately)
        if (key === 'facebook' || key === 'instagram') return;
        // Skip license fields for non-super admins
        if (licenseFields.includes(key) && !isSuperAdmin) return;
        // Skip empty plan_id
        if (key === 'plan_id' && !value) return;
        data.append(key, value.toString());
      });
      
      data.append('social_media', JSON.stringify({ facebook: formData.facebook, instagram: formData.instagram }));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      if (initialData) {
        await api.patch(`/municipalities/${initialData.id}/`, data, config);
        queueToastForNavigation(
          `${formData.name} has been updated with your changes.`,
          'success',
          'Municipality Updated!',
          2500
        );
      } else {
        await api.post('/municipalities/', data, config);
        queueToastForNavigation(
          `${formData.name} has been added to your platform.`,
          'success',
          'Municipality Created!',
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
  const requiredFields = ['name', 'country'];
  const filledRequired = requiredFields.filter(field => {
    const value = formData[field as keyof FormData];
    return typeof value === 'string' ? value.trim() : value;
  }).length;
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
            href={redirectPath}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? 'Edit Municipality' : 'Add New Municipality'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update municipality information and settings' : 'Configure details and settings for this region'}
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
              <span className="text-sm text-[var(--brand-light)]/60">Form completion</span>
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
                <span className="text-sm font-medium">All required fields completed!</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress Indicator - rendered via portal */}
        {isMounted && createPortal(
          <div 
            className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
            role="region"
            aria-label="Form completion progress"
            aria-hidden={!isProgressFixed}
          >
            <div className="w-full md:max-w-3xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">Form completion</span>
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
                  <span className="text-sm font-medium">All required fields completed!</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          
          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Basic Information</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Enter the core details for this municipality</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              {/* Name and Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    required 
                    placeholder="e.g. Stockholm City"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('name')}
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClasses}>
                    Country <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <select 
                    id="country"
                    required
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    onFocus={() => setFocusedField('country')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('country')} appearance-none cursor-pointer`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Municipality Code */}
              <div>
                <label htmlFor="municipality_code" className={labelClasses}>
                  <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-purple)]" />
                  Municipality Code
                </label>
                <input 
                  id="municipality_code"
                  type="text"
                  placeholder="e.g. STHM"
                  maxLength={10}
                  value={formData.municipality_code}
                  onChange={e => setFormData({ ...formData, municipality_code: e.target.value.toUpperCase() })}
                  onFocus={() => setFocusedField('municipality_code')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('municipality_code')} uppercase font-mono tracking-wider`}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClasses}>
                  Description
                </label>
                <textarea 
                  id="description"
                  rows={4} 
                  placeholder="Describe this municipality..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('description')} resize-none`}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Logo / Avatar */}
                <div>
                  <label className={labelClasses}>Logo / Avatar</label>
                  <div className="flex items-start gap-4">
                    <div 
                      className="relative group w-24 h-18 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
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
                          <span className="text-[10px] text-[var(--brand-light)]/40">Upload</span>
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
                          Choose File
                        </button>
                        {avatarPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('avatar')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">400x300px (JPG, PNG)</p>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
                  </div>
                </div>

                {/* Hero Image */}
                <div>
                  <label className={labelClasses}>Hero Image</label>
                  <div className="flex items-start gap-4">
                    <div 
                      className="relative group w-24 h-18 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
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
                          <span className="text-[10px] text-[var(--brand-light)]/40">Upload</span>
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
                          Choose File
                        </button>
                        {heroPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('hero')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">1200x400px (JPG, PNG)</p>
                    </div>
                    <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'hero')} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Socials Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Contact & Socials</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Contact information and social media links</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    Email
                  </label>
                  <input 
                    id="email"
                    type="email"
                    placeholder="contact@city.se"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('email')}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    Phone
                  </label>
                  <input 
                    id="phone"
                    type="tel"
                    placeholder="+46..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('phone')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website_link" className={labelClasses}>
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-primary)]" />
                  Website
                </label>
                <input 
                  id="website_link"
                  type="url"
                  placeholder="https://..."
                  value={formData.website_link}
                  onChange={e => setFormData({ ...formData, website_link: e.target.value })}
                  onFocus={() => setFocusedField('website_link')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('website_link')}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Social Media Header */}
              <div className="flex items-center gap-2 text-[var(--brand-light)]/70">
                <Globe className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="text-sm font-medium">Social Media</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="facebook" className={labelClasses}>
                    <Facebook className="w-3.5 h-3.5 inline mr-1.5 text-[#1877F2]" />
                    Facebook URL
                  </label>
                  <input 
                    id="facebook"
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={formData.facebook}
                    onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                    onFocus={() => setFocusedField('facebook')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('facebook')}
                  />
                </div>
                <div>
                  <label htmlFor="instagram" className={labelClasses}>
                    <Instagram className="w-3.5 h-3.5 inline mr-1.5 text-[#E4405F]" />
                    Instagram URL
                  </label>
                  <input 
                    id="instagram"
                    type="url"
                    placeholder="https://instagram.com/..."
                    value={formData.instagram}
                    onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                    onFocus={() => setFocusedField('instagram')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('instagram')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Settings</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Registration rules and legal requirements</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-4">
              {/* Self Registration Toggle */}
              <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">Self Registration</div>
                    <div className="text-sm text-[var(--brand-light)]/50">Allow users to register freely via the app</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.allow_self_registration}
                    onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-[var(--dark-500)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-third)]"></div>
                </label>
              </div>

              {/* Require Guardian Toggle */}
              <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">Require Guardian</div>
                    <div className="text-sm text-[var(--brand-light)]/50">Youths must link a guardian upon registration</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.require_guardian_at_registration}
                    onChange={e => setFormData({...formData, require_guardian_at_registration: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-[var(--dark-500)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-peach)]"></div>
                </label>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)] my-2" />

              {/* Terms & Conditions */}
              <div>
                <label htmlFor="terms_and_conditions" className={labelClasses}>
                  <FileText className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-light)]/50" />
                  Terms & Conditions
                </label>
                <textarea 
                  id="terms_and_conditions"
                  rows={6} 
                  placeholder="Legal text shown to users during registration..."
                  value={formData.terms_and_conditions}
                  onChange={e => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  onFocus={() => setFocusedField('terms_and_conditions')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('terms_and_conditions')} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* License & Limits Card - Super Admin Only */}
          {isSuperAdmin && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
              {/* Card Header */}
              <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-third)] flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[var(--dark-900)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">License & Limits</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">Configure subscription plan and club limits</p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Subscription Plan */}
                  <div>
                    <label htmlFor="plan_id" className={labelClasses}>
                      <Package className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-primary)]" />
                      Subscription Plan
                    </label>
                    <select 
                      id="plan_id"
                      value={formData.plan_id}
                      onChange={e => setFormData({ ...formData, plan_id: e.target.value })}
                      onFocus={() => setFocusedField('plan_id')}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputClasses('plan_id')} appearance-none cursor-pointer`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1rem'
                      }}
                    >
                      <option value="">Select a Plan</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({plan.monthly_price_sek} SEK/mo)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1.5">Determines which features are active for this municipality.</p>
                  </div>

                  {/* Max Clubs */}
                  <div>
                    <label htmlFor="max_clubs" className={labelClasses}>
                      <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-sky)]" />
                      Max Allowed Clubs
                    </label>
                    <input 
                      id="max_clubs"
                      type="number"
                      min={1}
                      placeholder="3"
                      value={formData.max_clubs}
                      onChange={e => setFormData({ ...formData, max_clubs: parseInt(e.target.value) || 1 })}
                      onFocus={() => setFocusedField('max_clubs')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses('max_clubs')}
                    />
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1.5">
                      Limit on how many clubs they can create.
                      {initialData?.license_status && (
                        <span className="ml-1 text-[var(--brand-primary)]">
                          Currently using {initialData.license_status.clubs_used} of {initialData.license_status.max_clubs}.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* License Expiry Date and Active Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* License End Date */}
                  <div>
                    <label htmlFor="license_end_date" className={labelClasses}>
                      <Crown className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                      License Expiry Date
                    </label>
                    <input 
                      id="license_end_date"
                      type="date"
                      value={formData.license_end_date}
                      onChange={e => setFormData({ ...formData, license_end_date: e.target.value })}
                      onFocus={() => setFocusedField('license_end_date')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses('license_end_date')}
                    />
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1.5">When the license expires. Default is 1 year from today.</p>
                  </div>

                  {/* License Active Status */}
                  <div>
                    <label className={labelClasses}>
                      <Shield className="w-3.5 h-3.5 inline mr-1.5 text-green-500" />
                      License Status
                    </label>
                    <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${formData.license_is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[var(--brand-light)]">
                          {formData.license_is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={formData.license_is_active}
                          onChange={e => setFormData({...formData, license_is_active: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-[var(--dark-500)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1.5">Toggle to activate or deactivate the license.</p>
                  </div>
                </div>

                {/* Current License Info (if editing) */}
                {initialData?.license_status && (
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${initialData.license_status.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium text-[var(--brand-light)]">
                        Current Plan: <span className="text-[var(--brand-primary)]">{initialData.license_status.plan_name}</span>
                      </span>
                      <span className="text-xs text-[var(--brand-light)]/50 ml-auto">
                        Expires: {initialData.license_status.expires_at}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
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
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? 'Save Changes' : 'Create Municipality'}
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
            <li>• Municipality codes should be unique and easy to remember (e.g., STHM for Stockholm)</li>
            <li>• Enable self-registration to allow users to sign up without admin approval</li>
            <li>• Guardian requirements help ensure youth safety and parental involvement</li>
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
