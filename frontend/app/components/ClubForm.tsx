'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, Upload, X, MapPin, Building2, Mail, Phone, 
  CheckCircle2, Lightbulb, Save, Users, Shield, Clock, 
  Plus, Trash2, FileText, Map
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { useToast } from '../../hooks/useToast';
import { queueToastForNavigation } from './ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { createClubSchema, type ClubFormData } from '@/lib/validations/club';

// Dynamically import rich text editors to avoid SSR issues
const LegalRichTextEditor = dynamic(
  () => import('./LegalRichTextEditor'),
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
  () => import('./DarkRichTextEditor'),
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

interface Option { id: number; name: string; }

interface ClubFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY';
}

export default function ClubForm({ initialData, redirectPath, scope }: ClubFormProps) {
  const t = useTranslations('clubsAdmin.form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  // Translation-based constants
  const WEEKDAYS = [
    { id: 1, name: t('openingHours.weekdays.monday') }, 
    { id: 2, name: t('openingHours.weekdays.tuesday') }, 
    { id: 3, name: t('openingHours.weekdays.wednesday') },
    { id: 4, name: t('openingHours.weekdays.thursday') }, 
    { id: 5, name: t('openingHours.weekdays.friday') }, 
    { id: 6, name: t('openingHours.weekdays.saturday') }, 
    { id: 7, name: t('openingHours.weekdays.sunday') },
  ];

  const CYCLES = [
    { id: 'ALL', name: t('openingHours.cycles.all') },
    { id: 'ODD', name: t('openingHours.cycles.odd') },
    { id: 'EVEN', name: t('openingHours.cycles.even') },
  ];

  const GENDER_RESTRICTIONS = [
    { id: 'ALL', name: t('openingHours.genderRestrictions.all') },
    { id: 'BOYS', name: t('openingHours.genderRestrictions.boys') },
    { id: 'GIRLS', name: t('openingHours.genderRestrictions.girls') },
    { id: 'OTHER', name: t('openingHours.genderRestrictions.other') },
  ];

  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  // Opening Hours
  const [openingHours, setOpeningHours] = useState<any[]>(initialData?.regular_hours || []);
  const [hourError, setHourError] = useState('');
  const [newHour, setNewHour] = useState({
    weekday: 1, week_cycle: 'ALL', open_time: '14:00', close_time: '20:00',
    title: '', gender_restriction: 'ALL', restriction_mode: 'NONE', min_value: '', max_value: ''
  });

  // Create the schema with translations
  const clubSchema = createClubSchema(t, scope);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: initialData?.name || '',
      municipality: initialData?.municipality?.toString() || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      description: initialData?.description || '',
      address: initialData?.address || '',
      latitude: initialData?.latitude?.toString() || '',
      longitude: initialData?.longitude?.toString() || '',
      club_categories: initialData?.club_categories || '',
      terms_and_conditions: initialData?.terms_and_conditions || '',
      club_policies: initialData?.club_policies || '',
      allow_self_registration_override: initialData?.allow_self_registration_override == null ? '' : String(initialData?.allow_self_registration_override),
      require_guardian_override: initialData?.require_guardian_override == null ? '' : String(initialData?.require_guardian_override),
    },
    mode: 'onBlur',
  });

  // Watch form values
  const formData = watch();

  // File validation errors
  const [fileErrors, setFileErrors] = useState<{avatar?: string, hero?: string}>({});

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  useEffect(() => {
    if (scope === 'SUPER') {
      const fetchAll = async () => {
        try {
          let allMunicipalities: Option[] = [];
          let page = 1;
          let totalCount = 0;
          const pageSize = 100;
          const maxPages = 100;
          
          while (page <= maxPages) {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('page_size', pageSize.toString());
            
            const res: any = await api.get(`/municipalities/?${params.toString()}`);
            const responseData: any = res?.data;
            
            if (!responseData) break;
            
            let pageMunicipalities: Option[] = [];
            
            if (Array.isArray(responseData)) {
              pageMunicipalities = responseData;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              break;
            } else if (responseData.results && Array.isArray(responseData.results)) {
              pageMunicipalities = responseData.results;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              
              if (page === 1) totalCount = responseData.count || 0;
              
              const hasNext = responseData.next !== null && responseData.next !== undefined;
              const hasAllResults = totalCount > 0 && allMunicipalities.length >= totalCount;
              const gotEmptyPage = pageMunicipalities.length === 0;
              
              if (!hasNext || hasAllResults || gotEmptyPage) break;
              page++;
            } else {
              break;
            }
          }
          
          setMunicipalities(allMunicipalities);
        } catch (e) { 
          console.error(e); 
        }
      };
      fetchAll();
    }
  }, [scope]);

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

  // Opening Hours Logic
  const checkOverlap = (newItem: any) => {
    const toMins = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMins(newItem.open_time);
    const end = toMins(newItem.close_time);

    if (end <= start) return t('openingHours.closeTimeAfterOpen');

    for (const h of openingHours) {
      if (h.weekday !== newItem.weekday) continue;
      
      const cycleOverlap = h.week_cycle === 'ALL' || newItem.week_cycle === 'ALL' || h.week_cycle === newItem.week_cycle;
      if (!cycleOverlap) continue;

      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);

      if (start < e2 && end > s2) {
        const cycleName = CYCLES.find(c => c.id === h.week_cycle)?.name || h.week_cycle;
        return t('openingHours.overlapDetected', { time: `${h.open_time}-${h.close_time}`, cycle: cycleName });
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) {
      setHourError(error);
      return;
    }
    setOpeningHours([...openingHours, { ...newHour }]);
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' });
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  // Form submission - called after Zod validation passes
  const onSubmit = async (data: ClubFormData) => {
    // Validate files (avatar and hero are required for new clubs)
    const newFileErrors: {avatar?: string, hero?: string} = {};
    
    if (!initialData) { // Only require files for new clubs
      if (!avatarFile && !avatarPreview) {
        newFileErrors.avatar = t('validation.avatarRequired');
      }
      if (!heroFile && !heroPreview) {
        newFileErrors.hero = t('validation.heroRequired');
      }
    }
    
    if (Object.keys(newFileErrors).length > 0) {
      setFileErrors(newFileErrors);
      error(t('validation.missingFields', { fields: Object.values(newFileErrors).join(', ') }));
      return;
    }
    
    setFileErrors({});
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', data.name);
      
      if (scope === 'SUPER') {
        formDataToSend.append('municipality', data.municipality || '');
      } else if (scope === 'MUNICIPALITY') {
        const userMunicipalityId = user?.assigned_municipality 
          ? (typeof user.assigned_municipality === 'object' 
              ? user.assigned_municipality.id 
              : user.assigned_municipality)
          : null;
        if (userMunicipalityId) {
          formDataToSend.append('municipality', userMunicipalityId.toString());
        } else {
          throw new Error('Municipality admin must have an assigned municipality');
        }
      }
      
      formDataToSend.append('email', data.email);
      formDataToSend.append('phone', data.phone);
      formDataToSend.append('description', data.description);
      formDataToSend.append('address', data.address || '');
      formDataToSend.append('terms_and_conditions', data.terms_and_conditions);
      formDataToSend.append('club_policies', data.club_policies);
      
      if (data.club_categories?.trim()) formDataToSend.append('club_categories', data.club_categories.trim());
      if (data.latitude !== '' && data.latitude != null) formDataToSend.append('latitude', String(data.latitude));
      if (data.longitude !== '' && data.longitude != null) formDataToSend.append('longitude', String(data.longitude));
      
      if (data.allow_self_registration_override === '') {
        formDataToSend.append('allow_self_registration_override', '');
      } else {
        formDataToSend.append('allow_self_registration_override', data.allow_self_registration_override || '');
      }

      if (data.require_guardian_override === '') {
        formDataToSend.append('require_guardian_override', '');
      } else {
        formDataToSend.append('require_guardian_override', data.require_guardian_override || '');
      }
      
      const cleanedHours = openingHours.map(hour => {
        const cleaned: any = {
          weekday: hour.weekday,
          week_cycle: hour.week_cycle || 'ALL',
          open_time: hour.open_time,
          close_time: hour.close_time,
          title: hour.title || '',
          gender_restriction: hour.gender_restriction || 'ALL',
          restriction_mode: hour.restriction_mode || 'NONE',
        };
        
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        } else {
          cleaned.min_value = null;
          cleaned.max_value = null;
        }
        
        return cleaned;
      });
      
      formDataToSend.append('regular_hours_data', JSON.stringify(cleanedHours));
      if (avatarFile) formDataToSend.append('avatar', avatarFile);
      if (heroFile) formDataToSend.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/clubs/${initialData.id}/`, formDataToSend, config);
        queueToastForNavigation(
          t('formToast.clubUpdated', { name: data.name }),
          'success',
          t('formToast.clubUpdatedTitle'),
          2500
        );
      } else {
        await api.post('/clubs/', formDataToSend, config);
        queueToastForNavigation(
          t('formToast.clubCreated', { name: data.name }),
          'success',
          t('formToast.clubCreatedTitle'),
          2500
        );
      }

      router.push(buildUrlWithParams(redirectPath));
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || t('validation.failedToSave');
      error(errorMessage, t('validation.operationFailed') );
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

  const selectClasses = (fieldName: string, hasError: boolean = false) => `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 ${hasError ? 'border-[var(--brand-red)]' : focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    rounded-xl 
    text-[var(--brand-light)] 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
    appearance-none cursor-pointer
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  // Calculate form completion percentage - includes text fields + files
  const requiredFields = scope === 'SUPER' 
    ? ['name', 'municipality', 'email', 'phone', 'address', 'description', 'terms_and_conditions', 'club_policies']
    : ['name', 'email', 'phone', 'address', 'description', 'terms_and_conditions', 'club_policies'];
  
  const filledTextFields = requiredFields.filter(field => {
    const value = formData[field as keyof ClubFormData];
    return typeof value === 'string' ? value.trim() : value;
  }).length;
  
  // Add files to calculation (only for new clubs)
  const totalRequired = initialData ? requiredFields.length : requiredFields.length + 2; // +2 for avatar and hero
  const filledFiles = initialData ? 0 : (avatarFile || avatarPreview ? 1 : 0) + (heroFile || heroPreview ? 1 : 0);
  const completionPercent = Math.round(((filledTextFields + filledFiles) / totalRequired) * 100);

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

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={buildUrlWithParams(redirectPath)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? t('edit.title') : t('create.title')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? t('edit.description') : t('create.description')}
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
              <span className="text-sm text-[var(--brand-light)]/60">{t('progress.label')}</span>
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
                <span className="text-sm font-medium">{t('progress.completed')}</span>
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
                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.label')}</span>
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
                  <span className="text-sm font-medium">{t('progress.completed')}</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Main Form */}
        <form onSubmit={handleFormSubmit(onSubmit)}>
          
          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('basicInfo.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('basicInfo.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              {/* Name and Municipality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    {t('basicInfo.clubName')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    placeholder="e.g. Youth Center Downtown"
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
                {scope === 'SUPER' && (
                  <div>
                    <label htmlFor="municipality" className={labelClasses}>
                      {t('basicInfo.municipality')} <span className="text-[var(--brand-primary)]">*</span>
                    </label>
                    <select 
                      id="municipality"
                      {...register('municipality')}
                      onFocus={() => setFocusedField('municipality')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        register('municipality').onBlur(e);
                      }}
                      className={selectClasses('municipality', !!errors.municipality)}
                      style={selectArrowStyle}
                    >
                      <option value="">{t('basicInfo.selectMunicipality')}</option>
                      {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {errors.municipality && (
                      <p className="text-[var(--brand-red)] text-sm mt-1">{errors.municipality.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClasses}>
                  {t('basicInfo.descriptionLabel')} <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <DarkRichTextEditor
                  value={formData.description || ''}
                  onChange={(content) => setValue('description', content)}
                  placeholder={t('basicInfo.descriptionPlaceholder')}
                  minHeight="150px"
                />
                {errors.description && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Logo / Avatar */}
                <div>
                  <label className={labelClasses}>
                    {t('basicInfo.logoAvatar')} {!initialData && <span className="text-[var(--brand-primary)]">*</span>}
                  </label>
                  <div className="flex items-start gap-4">
                    <div 
                      className={`relative group w-20 h-20 border-2 border-dashed ${fileErrors.avatar ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} rounded-full bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0`}
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
                          <span className="text-[10px] text-[var(--brand-light)]/40">{t('basicInfo.upload')}</span>
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
                          {t('basicInfo.chooseFile')}
                        </button>
                        {avatarPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('avatar')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('basicInfo.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('basicInfo.avatarHint')}</p>
                      {fileErrors.avatar && (
                        <p className="text-[var(--brand-red)] text-xs mt-1">{fileErrors.avatar}</p>
                      )}
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      handleFileChange(e, 'avatar');
                      setFileErrors({...fileErrors, avatar: undefined});
                    }} />
                  </div>
                </div>

                {/* Hero Image */}
                <div>
                  <label className={labelClasses}>
                    {t('basicInfo.heroImage')} {!initialData && <span className="text-[var(--brand-primary)]">*</span>}
                  </label>
                  <div className="flex items-start gap-4">
                    <div 
                      className={`relative group w-24 h-16 border-2 border-dashed ${fileErrors.hero ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0`}
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
                          <span className="text-[10px] text-[var(--brand-light)]/40">{t('basicInfo.upload')}</span>
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
                          {t('basicInfo.chooseFile')}
                        </button>
                        {heroPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('hero')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('basicInfo.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('basicInfo.heroHint')}</p>
                      {fileErrors.hero && (
                        <p className="text-[var(--brand-red)] text-xs mt-1">{fileErrors.hero}</p>
                      )}
                    </div>
                    <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      handleFileChange(e, 'hero');
                      setFileErrors({...fileErrors, hero: undefined});
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Location Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('contactLocation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('contactLocation.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
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
                    placeholder={t('contactLocation.emailPlaceholder')}
                    {...register('email')}
                    onFocus={() => setFocusedField('email')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('email').onBlur(e);
                    }}
                    className={inputClasses('email', !!errors.email)}
                  />
                  {errors.email && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    {t('contactLocation.phone')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="phone"
                    type="tel"
                    placeholder={t('contactLocation.phonePlaceholder')}
                    {...register('phone')}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('phone').onBlur(e);
                    }}
                    className={inputClasses('phone', !!errors.phone)}
                  />
                  {errors.phone && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Location Header */}
              <div className="flex items-center gap-2 text-[var(--brand-light)]/70">
                <Map className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="text-sm font-medium">{t('contactLocation.location')}</span>
              </div>

              <div>
                <label htmlFor="address" className={labelClasses}>
                  {t('contactLocation.streetAddress')} <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <input 
                  id="address"
                  type="text"
                  placeholder={t('contactLocation.addressPlaceholder')}
                  {...register('address')}
                  onFocus={() => setFocusedField('address')}
                  onBlur={(e) => {
                    setFocusedField(null);
                    register('address').onBlur(e);
                  }}
                  className={inputClasses('address', !!errors.address)}
                />
                {errors.address && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label htmlFor="latitude" className={labelClasses}>
                    {t('contactLocation.latitude')}
                  </label>
                  <input 
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder={t('contactLocation.latitudePlaceholder')}
                    {...register('latitude')}
                    onFocus={() => setFocusedField('latitude')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('latitude').onBlur(e);
                    }}
                    className={`${inputClasses('latitude')} font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className={labelClasses}>
                    {t('contactLocation.longitude')}
                  </label>
                  <input 
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder={t('contactLocation.longitudePlaceholder')}
                    {...register('longitude')}
                    onFocus={() => setFocusedField('longitude')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('longitude').onBlur(e);
                    }}
                    className={`${inputClasses('longitude')} font-mono`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('openingHours.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('openingHours.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              
              {/* Hour Builder */}
              <div className="bg-[var(--dark-700)]/50 p-5 rounded-xl border border-[var(--dark-500)] space-y-4">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/70 mb-2">
                  <Plus className="w-4 h-4 text-[var(--brand-third)]" />
                  <span className="text-sm font-medium">{t('openingHours.addNewTimeSlot')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <select 
                    className={`${selectClasses('weekday')} py-2.5`}
                    style={selectArrowStyle}
                    value={newHour.weekday} 
                    onChange={e => setNewHour({...newHour, weekday: parseInt(e.target.value)})}
                  >
                    {WEEKDAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select 
                    className={`${selectClasses('week_cycle')} py-2.5`}
                    style={selectArrowStyle}
                    value={newHour.week_cycle} 
                    onChange={e => setNewHour({...newHour, week_cycle: e.target.value})}
                  >
                    {CYCLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2 items-center col-span-1 sm:col-span-2">
                    <input 
                      type="time" 
                      className={`${inputClasses('open_time')} py-2.5`}
                      value={newHour.open_time} 
                      onChange={e => setNewHour({...newHour, open_time: e.target.value})} 
                    />
                    <span className="text-[var(--brand-light)]/40">-</span>
                    <input 
                      type="time" 
                      className={`${inputClasses('close_time')} py-2.5`}
                      value={newHour.close_time} 
                      onChange={e => setNewHour({...newHour, close_time: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('openingHours.optionalTitle')}</label>
                    <input 
                      type="text"
                      placeholder={t('openingHours.titlePlaceholder')}
                      className={`${inputClasses('title')} py-2.5`}
                      value={newHour.title} 
                      onChange={e => setNewHour({...newHour, title: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('openingHours.genderRestriction')}</label>
                    <select 
                      className={`${selectClasses('gender_restriction')} py-2.5`}
                      style={selectArrowStyle}
                      value={newHour.gender_restriction} 
                      onChange={e => setNewHour({...newHour, gender_restriction: e.target.value})}
                    >
                      {GENDER_RESTRICTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('openingHours.restrictionMode')}</label>
                    <select 
                      className={`${selectClasses('restriction_mode')} py-2.5`}
                      style={selectArrowStyle}
                      value={newHour.restriction_mode} 
                      onChange={e => setNewHour({...newHour, restriction_mode: e.target.value})}
                    >
                      <option value="NONE">{t('openingHours.noRestriction')}</option>
                      <option value="AGE">{t('openingHours.ageRange')}</option>
                      <option value="GRADE">{t('openingHours.gradeRange')}</option>
                    </select>
                  </div>
                  {newHour.restriction_mode !== 'NONE' && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('openingHours.from')}</label>
                        <input 
                          type="number" 
                          placeholder={t('openingHours.min')} 
                          className={`${inputClasses('min_value')} py-2.5`}
                          value={newHour.min_value} 
                          onChange={e => setNewHour({...newHour, min_value: e.target.value})} 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('openingHours.to')}</label>
                        <input 
                          type="number" 
                          placeholder={t('openingHours.max')} 
                          className={`${inputClasses('max_value')} py-2.5`}
                          value={newHour.max_value} 
                          onChange={e => setNewHour({...newHour, max_value: e.target.value})} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={addHour}
                    className="px-5 py-2.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> {t('openingHours.addTimeSlot')}
                  </button>
                </div>
                
                {hourError && (
                  <div className="p-3 bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30 rounded-lg text-[var(--brand-red)] text-sm">
                    {hourError}
                  </div>
                )}
              </div>

              {/* Hours List */}
              <div className="space-y-3">
                {openingHours.map((hour, i) => {
                  const dayName = WEEKDAYS.find(d => d.id === hour.weekday)?.name;
                  const cycleName = CYCLES.find(c => c.id === hour.week_cycle)?.name;
                  const genderName = GENDER_RESTRICTIONS.find(g => g.id === hour.gender_restriction)?.name || 'All Genders';
                  return (
                    <div key={i} className="flex justify-between items-center bg-[var(--dark-700)] border border-[var(--dark-500)] p-4 rounded-xl">
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex gap-4 items-center">
                          <span className="font-bold w-24 text-sm text-[var(--brand-light)]">{dayName}</span>
                          <div className="text-sm text-[var(--brand-light)]">
                            <span className="font-mono bg-[var(--dark-600)] px-2.5 py-1 rounded-lg text-[var(--brand-third)]">
                              {hour.open_time} - {hour.close_time}
                            </span>
                            {hour.week_cycle !== 'ALL' && (
                              <span className="ml-2 text-xs text-[var(--brand-light)]/50 uppercase">{cycleName}</span>
                            )}
                            {hour.title && (
                              <span className="ml-2 text-xs font-semibold text-[var(--brand-primary)]">{hour.title}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {hour.restriction_mode !== 'NONE' && (
                            <Badge className="bg-[var(--brand-third)]/20 text-[var(--brand-third)] border-[var(--brand-third)]/30 hover:bg-[var(--brand-third)]/30">
                              {hour.restriction_mode === 'AGE' ? t('openingHours.restrictionLabels.age') : t('openingHours.restrictionLabels.grade')} {hour.min_value}-{hour.max_value}
                            </Badge>
                          )}
                          {hour.gender_restriction !== 'ALL' && (
                            <Badge className="bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30 hover:bg-[var(--brand-peach)]/30">
                              {genderName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeHour(i)} 
                        className="p-2 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                {openingHours.length === 0 && (
                  <div className="text-center py-8 text-[var(--brand-light)]/40 italic">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('openingHours.noHoursAdded')}</p>
                    <p className="text-xs mt-1">{t('openingHours.useFormAbove')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legal Documents Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('legalDocuments.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('legalDocuments.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              <div>
                <LegalRichTextEditor
                  value={formData.terms_and_conditions || ''}
                  onChange={(content) => setValue('terms_and_conditions', content)}
                  placeholder={t('legalDocuments.termsPlaceholder')}
                  usage="terms_and_conditions"
                  label={`${t('legalDocuments.termsConditions')} *`}
                  insertTemplateLabel={t('legalDocuments.insertTemplate')}
                  minHeight="180px"
                />
                {errors.terms_and_conditions && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{errors.terms_and_conditions.message}</p>
                )}
              </div>

              <div>
                <LegalRichTextEditor
                  value={formData.club_policies || ''}
                  onChange={(content) => setValue('club_policies', content)}
                  placeholder={t('legalDocuments.policiesPlaceholder')}
                  usage="club_policies"
                  label={`${t('legalDocuments.clubPolicies')} *`}
                  insertTemplateLabel={t('legalDocuments.insertTemplate')}
                  minHeight="180px"
                />
                {errors.club_policies && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{errors.club_policies.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('registrationSettings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('registrationSettings.description')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-4">
              {/* Self Registration Override */}
              <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">{t('registrationSettings.selfRegistration')}</div>
                    <div className="text-sm text-[var(--brand-light)]/50">{t('registrationSettings.overrideMunicipalityDefault')}</div>
                  </div>
                </div>
                <select 
                  className={`${selectClasses('allow_self_registration_override')} w-auto py-2.5 px-4`}
                  style={selectArrowStyle}
                  value={formData.allow_self_registration_override} 
                  onChange={e => setValue('allow_self_registration_override', e.target.value)}
                >
                  <option value="">{t('registrationSettings.useDefault')}</option>
                  <option value="true">{t('registrationSettings.yesAllow')}</option>
                  <option value="false">{t('registrationSettings.noBlock')}</option>
                </select>
              </div>

              {/* Require Guardian Override */}
              <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">{t('registrationSettings.requireGuardian')}</div>
                    <div className="text-sm text-[var(--brand-light)]/50">{t('registrationSettings.overrideMunicipalityDefault')}</div>
                  </div>
                </div>
                <select 
                  className={`${selectClasses('require_guardian_override')} w-auto py-2.5 px-4`}
                  style={selectArrowStyle}
                  value={formData.require_guardian_override} 
                  onChange={e => setValue('require_guardian_override', e.target.value)}
                >
                  <option value="">{t('registrationSettings.useDefault')}</option>
                  <option value="true">{t('registrationSettings.yesRequire')}</option>
                  <option value="false">{t('registrationSettings.noOptional')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.push(buildUrlWithParams(redirectPath))} 
                className="px-6 py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-600)] transition-all"
              >
                {t('formActions.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={loading || completionPercent < 100}
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    {t('formActions.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? t('formActions.saveChanges') : t('formActions.createClub')}
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
            {t('quickTips.title')}
          </h3>
          <ul className="text-sm text-[var(--brand-light)]/50 space-y-1.5">
            <li>• {t('quickTips.tip1')}</li>
            <li>• {t('quickTips.tip2')}</li>
            <li>• {t('quickTips.tip3')}</li>
            <li>• {t('quickTips.tip4')}</li>
          </ul>
        </div>
      </div>
      
      </div>
  );
}
