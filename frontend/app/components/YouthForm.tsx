'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, Upload, X, Search, User, Mail, Phone, 
  CheckCircle2, Lightbulb, Save, Users, Shield, Calendar,
  Heart, Building, Lock, UserCheck, Check, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import { useToast } from '../../hooks/useToast';
import CustomFieldsForm, { CustomFieldsFormRef } from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';
import { createYouthSchema, type YouthFormData } from '@/lib/validations/youth';

interface Option { id: number; name: string; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }

interface YouthFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function YouthForm({ initialData, redirectPath, scope }: YouthFormProps) {
  const t = useTranslations('youthForm');
  const tStatuses = useTranslations('youthManager.statuses');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const interestInputRef = useRef<HTMLInputElement>(null);
  const customFieldsRef = useRef<CustomFieldsFormRef>(null);
  const [interestDropdownPosition, setInterestDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Dropdown Data
  const [clubs, setClubs] = useState<Option[]>([]);
  const [interestsList, setInterestsList] = useState<Option[]>([]);
  const [guardiansList, setGuardiansList] = useState<GuardianOption[]>([]);

  // Search States
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [showGuardianDropdown, setShowGuardianDropdown] = useState(false);
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  // Visuals State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(initialData?.background_image ? getMediaUrl(initialData.background_image) : null);
  const [mood, setMood] = useState(initialData?.mood_status || '');
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Create the schema with translations
  const youthSchema = createYouthSchema(t, !!initialData);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<YouthFormData>({
    resolver: zodResolver(youthSchema),
    defaultValues: {
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      email: initialData?.email || '',
      password: '',
      phone_number: initialData?.phone_number || '',
      date_of_birth: initialData?.date_of_birth || '',
      grade: initialData?.grade || '',
      legal_gender: initialData?.legal_gender || 'MALE',
      preferred_club: initialData?.preferred_club ? (typeof initialData.preferred_club === 'object' ? initialData.preferred_club.id.toString() : initialData.preferred_club.toString()) : '',
      nickname: initialData?.nickname || '',
      preferred_gender: initialData?.preferred_gender || '',
      verification_status: initialData?.verification_status || 'UNVERIFIED',
      interests: initialData?.interests ? initialData.interests.map((i: any) => typeof i === 'object' ? i.id : i) : [],
      guardians: initialData?.guardians ? initialData.guardians.map((g: any) => typeof g === 'object' ? g.id : g) : [],
    },
    mode: 'onBlur',
  });

  // Watch form values
  const formData = watch();
  const passwordValue = watch('password') || '';
  
  // Password validation helper
  const getPasswordValidation = () => {
    const pw = passwordValue;
    return {
      length: pw.length >= 8,
      number: /\d/.test(pw),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    };
  };
  const pwValid = getPasswordValidation();

  // Custom Fields State
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, any>>({});

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
    fetchDropdowns();
    if (initialData) {
      api.get(`/users/${initialData.id}/`).then(res => {
        const values: Record<number, any> = {};
        (res.data.custom_field_values || []).forEach((cfv: any) => {
          values[cfv.field] = cfv.value;
        });
        setCustomFieldValues(values);
      }).catch(console.error);
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      const [clubRes, intRes, guardRes] = await Promise.all([
        api.get('/clubs/?page_size=1000'),
        api.get('/interests/'),
        api.get('/users/list_guardians/')
      ]);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
      const interests = Array.isArray(intRes.data) ? intRes.data : intRes.data.results || [];
      setInterestsList(interests);
      setGuardiansList(guardRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdowns:', err);
    }
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [
      formData.first_name,
      formData.last_name,
      formData.email,
      formData.phone_number,
      formData.date_of_birth,
      formData.grade,
      formData.legal_gender,
      formData.preferred_club,
      ...(initialData ? [] : [formData.password]),
    ];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData, initialData]);

  const completionPercent = calculateCompletion();

  // Progress scroll tracking
  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    const mainElement = document.querySelector('main');
    const headerHeight = mainElement ? 0 : 64;
    setIsProgressFixed(rect.top < headerHeight);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', checkScroll);
    }
    window.addEventListener('scroll', checkScroll);
    checkScroll();
    
    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  // Handlers
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBgFile(e.target.files[0]);
      setBgPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'bg') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setBgFile(null);
      setBgPreview(null);
      if (bgRef.current) bgRef.current.value = '';
    }
  };

  // Interest Logic
  const toggleInterest = (id: number) => {
    const currentInterests = formData.interests || [];
    const exists = currentInterests.includes(id);
    const newInterests = exists 
      ? currentInterests.filter((i: number) => i !== id) 
      : [...currentInterests, id];
    setValue('interests', newInterests);
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    const currentInterests = formData.interests || [];
    setValue('interests', currentInterests.filter((i: number) => i !== id));
  };

  const getSelectedInterests = () => formData.interests.map((id: number) => interestsList.find(i => i.id === id)).filter(Boolean) as Option[];
  
  const filteredInterests = useMemo(() => {
    return interestsList.filter(i => 
      i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
    );
  }, [interestsList, interestSearchTerm, formData.interests]);

  // Guardian Logic
  const toggleGuardian = (id: number) => {
    const currentGuardians = formData.guardians || [];
    const exists = currentGuardians.includes(id);
    const newGuardians = exists 
      ? currentGuardians.filter((g: number) => g !== id) 
      : [...currentGuardians, id];
    setValue('guardians', newGuardians);
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
  };

  const removeGuardian = (id: number) => {
    const currentGuardians = formData.guardians || [];
    setValue('guardians', currentGuardians.filter((g: number) => g !== id));
  };

  const getSelectedGuardians = () => formData.guardians.map((id: number) => guardiansList.find(g => g.id === id)).filter(Boolean) as GuardianOption[];

  const filteredGuardians = guardiansList.filter(g => {
    const term = guardianSearchTerm.toLowerCase();
    const match = g.email.toLowerCase().includes(term) || g.first_name.toLowerCase().includes(term) || g.last_name.toLowerCase().includes(term);
    return match && !formData.guardians.includes(g.id);
  });

  const handleSubmit = async (validatedData: YouthFormData) => {
    // Validate custom fields
    if (customFieldsRef.current) {
      const validation = customFieldsRef.current.validate();
      if (!validation.valid) {
        error(t('customFields.requiredField', { fieldName: validation.invalidFieldName }));
        return;
      }
    }
    
    setLoading(true);

    try {
      const data = new FormData();
      
      Object.entries(validatedData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'interests' || key === 'guardians') return;
        if (value !== undefined && value !== null) {
          data.append(key, value.toString());
        }
      });

      if (validatedData.interests) {
        validatedData.interests.forEach((id: number) => data.append('interests', id.toString()));
      }
      if (validatedData.guardians) {
        validatedData.guardians.forEach((id: number) => data.append('guardians', id.toString()));
      }
      
      data.append('role', 'YOUTH_MEMBER');
      
      if (avatarFile) data.append('avatar', avatarFile);
      if (bgFile) data.append('background_image', bgFile);
      if (mood !== undefined) data.append('mood_status', mood);

      if (scope === 'CLUB' && currentUser?.assigned_club && !validatedData.preferred_club) {
        const clubId = typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club;
        data.append('preferred_club', clubId.toString());
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        success(t('toast.youthUpdated'));
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        success(t('toast.youthCreated'));
      }

      if (Object.keys(customFieldValues).length > 0) {
        await api.post('/custom-fields/save_values_for_user/', {
          user_id: userId,
          values: customFieldValues
        });
      }

      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
    } catch (err) {
      console.error(err);
      error(t('toast.operationFailed'));
      setLoading(false);
    }
  };

  // Styling
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

  const selectClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl appearance-none cursor-pointer
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)]
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

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
              {initialData ? t('title.edit') : t('title.create')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? t('description.edit') : t('description.create')}
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
              <span className="text-sm text-[var(--brand-light)]/60">{t('progress.formCompletion')}</span>
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
                <span className="text-sm font-medium">{t('progress.allRequiredFieldsCompleted')}</span>
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
                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.formCompletion')}</span>
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
                  <span className="text-sm font-medium">{t('progress.allRequiredFieldsCompleted')}</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Main Form */}
        <form onSubmit={handleFormSubmit(handleSubmit)}>
          
          {/* Profile Visuals Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('profileVisuals.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('profileVisuals.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Avatar */}
                <div>
                  <label className={labelClasses}>{t('profileVisuals.avatar')}</label>
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
                          {t('profileVisuals.chooseFile')}
                        </button>
                        {avatarPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('avatar')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('profileVisuals.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('profileVisuals.avatarHint')}</p>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className={labelClasses}>{t('profileVisuals.coverImage')}</label>
                  <div className="flex items-start gap-4">
                    <div 
                      className="relative group w-24 h-16 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                      onClick={() => bgRef.current?.click()}
                    >
                      {bgPreview ? (
                        <>
                          <img src={bgPreview} alt="Cover preview" className="w-full h-full object-cover" />
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
                          onClick={() => bgRef.current?.click()}
                          className="px-3 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-xs font-medium rounded-lg hover:bg-[var(--dark-500)] transition-all"
                        >
                          {t('profileVisuals.chooseFile')}
                        </button>
                        {bgPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('bg')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('profileVisuals.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('profileVisuals.coverHint')}</p>
                    </div>
                    <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgChange} />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Mood Status */}
              <div>
                <label htmlFor="mood" className={labelClasses}>
                  {t('profileVisuals.moodStatus')}
                </label>
                <input 
                  id="mood"
                  type="text"
                  placeholder={t('profileVisuals.moodPlaceholder')}
                  value={mood}
                  onChange={e => setMood(e.target.value)}
                  onFocus={() => setFocusedField('mood')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('mood')}
                />
              </div>
            </div>
          </div>

          {/* Identity Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('identity.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('identity.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="first_name" className={labelClasses}>
                    {t('identity.firstName')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="first_name"
                    type="text"
                    placeholder={t('identity.placeholders.firstName')}
                    {...register('first_name')}
                    onFocus={() => setFocusedField('first_name')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('first_name').onBlur(e);
                    }}
                    className={inputClasses('first_name')}
                  />
                  {errors.first_name && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="last_name" className={labelClasses}>
                    {t('identity.lastName')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="last_name"
                    type="text"
                    placeholder={t('identity.placeholders.lastName')}
                    {...register('last_name')}
                    onFocus={() => setFocusedField('last_name')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('last_name').onBlur(e);
                    }}
                    className={inputClasses('last_name')}
                  />
                  {errors.last_name && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.last_name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="nickname" className={labelClasses}>
                    {t('identity.nickname')}
                  </label>
                  <input 
                    id="nickname"
                    type="text"
                    placeholder={t('identity.placeholders.nickname')}
                    {...register('nickname')}
                    onFocus={() => setFocusedField('nickname')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('nickname').onBlur(e);
                    }}
                    className={inputClasses('nickname')}
                  />
                  {errors.nickname && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.nickname.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    {t('identity.email')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="email"
                    type="email"
                    placeholder={t('identity.placeholders.email')}
                    {...register('email')}
                    onFocus={() => setFocusedField('email')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('email').onBlur(e);
                    }}
                    className={inputClasses('email')}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className={labelClasses}>
                    <Lock className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                    {initialData ? t('identity.newPassword') : t('identity.password')} {!initialData && <span className="text-[var(--brand-primary)]">*</span>}
                  </label>
                  <div className="relative">
                    <input 
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('identity.placeholders.password')}
                      {...register('password')}
                      onFocus={() => setFocusedField('password')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        register('password').onBlur(e);
                      }}
                      className={inputClasses('password')}
                    />
                    {passwordValue && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.password.message}</p>
                  )}
                  
                  {/* Password Requirements - only show when creating (not editing) */}
                  {!initialData && passwordValue && (
                    <div className="mt-3 bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)]">
                      <p className="font-bold text-[var(--brand-light)] text-sm mb-2">{t('identity.passwordRequirements') || 'Password Requirements'}:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div className={`flex items-center gap-2 ${pwValid.length ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/50'}`}>
                          {pwValid.length ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          <span className="text-xs">{t('identity.req8chars') || 'At least 8 characters'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${pwValid.number ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/50'}`}>
                          {pwValid.number ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          <span className="text-xs">{t('identity.req1number') || 'At least one number'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${pwValid.special ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/50'}`}>
                          {pwValid.special ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
                          <span className="text-xs">{t('identity.req1special') || 'At least one special character'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="phone_number" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    {t('identity.phone')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="phone_number"
                    type="tel"
                    placeholder={t('identity.placeholders.phone')}
                    {...register('phone_number')}
                    onFocus={() => setFocusedField('phone_number')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('phone_number').onBlur(e);
                    }}
                    className={inputClasses('phone_number')}
                  />
                  {errors.phone_number && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.phone_number.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('verification.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('verification.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                {['UNVERIFIED', 'PENDING', 'VERIFIED'].map(status => {
                  const isSelected = formData.verification_status === status;
                  const colors = {
                    UNVERIFIED: 'border-[var(--brand-red)] bg-[var(--brand-red)]/20 text-[var(--brand-red)]',
                    PENDING: 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]',
                    VERIFIED: 'border-[var(--brand-green)] bg-[var(--brand-green)]/20 text-[var(--brand-green)]',
                  };
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setValue('verification_status', status)}
                      className={`px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                        isSelected 
                          ? colors[status as keyof typeof colors]
                          : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                      }`}
                    >
                      {tStatuses(status)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Demographics Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('demographics.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('demographics.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="date_of_birth" className={labelClasses}>
                    {t('demographics.dateOfBirth')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="date_of_birth"
                    type="date"
                    {...register('date_of_birth')}
                    onFocus={() => setFocusedField('date_of_birth')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('date_of_birth').onBlur(e);
                    }}
                    className={inputClasses('date_of_birth')}
                  />
                  {errors.date_of_birth && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.date_of_birth.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="grade" className={labelClasses}>
                    {t('demographics.grade')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="grade"
                    type="number"
                    placeholder={t('demographics.gradePlaceholder')}
                    {...register('grade', {
                      setValueAs: (v) => v === '' ? '' : String(v)
                    })}
                    onFocus={() => setFocusedField('grade')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('grade', {
                        setValueAs: (v) => v === '' ? '' : String(v)
                      }).onBlur(e);
                    }}
                    className={inputClasses('grade')}
                  />
                  {errors.grade && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.grade.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="legal_gender" className={labelClasses}>
                    {t('demographics.legalGender')} <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <select 
                    id="legal_gender"
                    {...register('legal_gender')}
                    onFocus={() => setFocusedField('legal_gender')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('legal_gender').onBlur(e);
                    }}
                    className={selectClasses('legal_gender')}
                    style={selectArrowStyle}
                  >
                    <option value="MALE">{t('genders.MALE')}</option>
                    <option value="FEMALE">{t('genders.FEMALE')}</option>
                    <option value="OTHER">{t('genders.OTHER')}</option>
                  </select>
                  {errors.legal_gender && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.legal_gender.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="preferred_gender" className={labelClasses}>
                    {t('demographics.preferredGender')}
                  </label>
                  <input 
                    id="preferred_gender"
                    type="text"
                    placeholder={t('demographics.preferredGenderPlaceholder')}
                    {...register('preferred_gender')}
                    onFocus={() => setFocusedField('preferred_gender')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      register('preferred_gender').onBlur(e);
                    }}
                    className={inputClasses('preferred_gender')}
                  />
                  {errors.preferred_gender && (
                    <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.preferred_gender.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Club, Guardians & Interests Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('clubGuardiansInterests.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('clubGuardiansInterests.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Preferred Club */}
              <div>
                <label htmlFor="preferred_club" className={labelClasses}>
                  <Building className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-purple)]" />
                  {t('clubGuardiansInterests.preferredClub')} <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <select 
                  id="preferred_club"
                  {...register('preferred_club')}
                  onFocus={() => setFocusedField('preferred_club')}
                  onBlur={(e) => {
                    setFocusedField(null);
                    register('preferred_club').onBlur(e);
                  }}
                  className={selectClasses('preferred_club')}
                  style={selectArrowStyle}
                >
                  <option value="">{t('clubGuardiansInterests.selectClub')}</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.preferred_club && (
                  <p className="mt-1.5 text-sm text-[var(--brand-red)]">{errors.preferred_club.message}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Guardians */}
              <div>
                <label className={labelClasses}>
                  <UserCheck className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                  {t('clubGuardiansInterests.assignGuardians')}
                </label>
                
                {/* Selected Guardians Display */}
                {formData.guardians.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedGuardians().map(g => (
                      <span key={g.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-[var(--dark-900)] text-sm font-medium">
                        {g.first_name} {g.last_name}
                        <button
                          type="button"
                          onClick={() => removeGuardian(g.id)}
                          className="hover:bg-[var(--dark-900)]/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Searchable Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                    <input
                      type="text"
                      placeholder={t('clubGuardiansInterests.searchGuardians')}
                      value={guardianSearchTerm}
                      onChange={(e) => {
                        setGuardianSearchTerm(e.target.value);
                        setShowGuardianDropdown(true);
                      }}
                      onFocus={() => setShowGuardianDropdown(true)}
                      className={`${inputClasses('guardian_search')} pl-10`}
                    />
                  </div>

                  {showGuardianDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowGuardianDropdown(false)}
                      ></div>
                      <div className="absolute z-20 w-full mt-2 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredGuardians.length > 0 ? (
                          filteredGuardians.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGuardian(g.id)}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                            >
                              <div className="font-medium text-[var(--brand-light)]">{g.first_name} {g.last_name}</div>
                              <div className="text-xs text-[var(--brand-light)]/50">{g.email}</div>
                            </button>
                          ))
                        ) : guardianSearchTerm ? (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {t('clubGuardiansInterests.noGuardiansFound', { searchTerm: guardianSearchTerm })}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.guardians.length === 0 
                              ? t('clubGuardiansInterests.noGuardiansAvailable')
                              : t('clubGuardiansInterests.allGuardiansSelected')}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Interests */}
              <div>
                <label className={labelClasses}>
                  <Heart className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                  {t('clubGuardiansInterests.interests')}
                </label>
                
                {/* Selected Interests Display */}
                {formData.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedInterests().map(interest => (
                      <span key={interest.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-purple)] text-[var(--dark-900)] text-sm font-medium">
                        {interest.name}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest.id)}
                          className="hover:bg-[var(--dark-900)]/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Searchable Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                    <input
                      type="text"
                      placeholder={t('clubGuardiansInterests.searchInterests')}
                      value={interestSearchTerm}
                      onChange={(e) => {
                        setInterestSearchTerm(e.target.value);
                        setShowInterestDropdown(true);
                      }}
                      onFocus={() => setShowInterestDropdown(true)}
                      className={`${inputClasses('interest_search')} pl-10`}
                    />
                  </div>

                  {showInterestDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowInterestDropdown(false)}
                      ></div>
                      <div className="absolute z-20 w-full mt-2 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredInterests.length > 0 ? (
                          filteredInterests.map(interest => (
                            <button
                              key={interest.id}
                              type="button"
                              onClick={() => toggleInterest(interest.id)}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                            >
                              <div className="font-medium text-[var(--brand-light)]">{interest.name}</div>
                            </button>
                          ))
                        ) : interestSearchTerm ? (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {t('clubGuardiansInterests.noInterestsFound', { searchTerm: interestSearchTerm })}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.interests.length === 0 
                              ? t('clubGuardiansInterests.noInterestsAvailable')
                              : t('clubGuardiansInterests.allInterestsSelected')}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-third)] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('customFields.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('customFields.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <CustomFieldsForm
                ref={customFieldsRef}
                targetRole="YOUTH_MEMBER"
                context="USER_PROFILE"
                values={customFieldValues}
                onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
                userId={initialData ? initialData.id : null}
                userMunicipalityId={null}
                userClubId={formData.preferred_club ? Number(formData.preferred_club) : null}
              />
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-[var(--brand-third)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-light)] mb-2">{t('quickTips.title')}</h3>
                  <ul className="text-sm text-[var(--brand-light)]/60 space-y-1.5">
                    <li>• {t('quickTips.fillRequired')} <span className="text-[var(--brand-primary)]">*</span></li>
                    <li>• {t('quickTips.assignGuardians')}</li>
                    <li>• {t('quickTips.selectInterests')}</li>
                    <li>• {t('quickTips.setVerification')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pb-10 px-4 sm:px-0">
            <button 
              type="button" 
              onClick={() => router.push(buildUrlWithParams(redirectPath))}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)] transition-all"
            >
              {t('actions.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                  {t('actions.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {initialData ? t('actions.updateYouth') : t('actions.createYouth')}
                </>
              )}
            </button>
          </div>
        </form>

        </div>
    </div>
  );
}
