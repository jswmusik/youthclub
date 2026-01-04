'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { Check, ChevronLeft, ChevronRight, MapPin, Lock, User, Users, FileCheck, Eye, EyeOff, AlertCircle, Sparkles, Building2, X } from 'lucide-react';

// --- Interfaces ---
interface Option { id: number; name: string; }

interface Club extends Option {
  municipality: number;
  effective_registration_allowed: boolean;
  effective_require_guardian: boolean;
  terms_and_conditions: string;
  club_policies: string;
}

interface Municipality extends Option {
  terms_and_conditions: string;
  allow_self_registration: boolean;
}

interface Interest extends Option {
  icon: string;
}

interface CustomFieldDef {
    id: number;
    name: string;
    field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
    options: string[];
    required: boolean;
    help_text?: string;
}

export default function YouthRegistrationWizard() {
  const t = useTranslations('registrationWizard');
  const router = useRouter();
  
  const STEPS = [
    { id: 1, title: t('steps.location'), icon: MapPin },
    { id: 2, title: t('steps.account'), icon: Lock },
    { id: 3, title: t('steps.profile'), icon: User },
    { id: 4, title: t('steps.guardian'), icon: Users },
    { id: 5, title: t('steps.confirm'), icon: FileCheck },
  ];
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();

  // --- Data Sources ---
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  
  // Custom Fields Schema
  const [youthCustomFields, setYouthCustomFields] = useState<CustomFieldDef[]>([]);
  const [guardianCustomFields, setGuardianCustomFields] = useState<CustomFieldDef[]>([]);

  // --- Selection State ---
  const [selectedMuni, setSelectedMuni] = useState<Municipality | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Guardian Lookup State
  const [guardianExists, setGuardianExists] = useState(false);
  const [checkingGuardian, setCheckingGuardian] = useState(false);
  
  // Loading states for custom fields
  const [loadingYouthFields, setLoadingYouthFields] = useState(false);
  const [loadingGuardianFields, setLoadingGuardianFields] = useState(false);

  // --- CAPTCHA STATE ---
  const [captchaParams, setCaptchaParams] = useState({ num1: 0, num2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // --- Email Check State ---
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  // --- Password Visibility ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- Terms Modal State ---
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalType, setTermsModalType] = useState<'terms' | 'policies'>('terms');
  const [mounted, setMounted] = useState(false);
  
  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Form Data ---
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    nickname: '',
    date_of_birth: '',
    grade: '',
    legal_gender: 'MALE',
    preferred_gender: '',
    interests: [] as number[],
    custom_field_values: {} as Record<string, any>,
    guardian_email: '',
    guardian_first_name: '',
    guardian_last_name: '',
    guardian_phone: '',
    guardian_legal_gender: 'MALE',
    guardian_custom_field_values: {} as Record<string, any>,
    terms_accepted: false,
  });

  // --- Fetch Initial Data ---
  useEffect(() => {
    api.get('/municipalities/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setMunicipalities(data);
    }).catch(err => console.error('Failed to fetch municipalities:', err));

    api.get('/interests/').then(res => {
      const interests = Array.isArray(res.data) ? res.data : res.data.results || [];
      setInterestsList(interests);
    }).catch(err => console.error('Failed to fetch interests:', err));

    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setCaptchaParams({
        num1: Math.floor(Math.random() * 10) + 1,
        num2: Math.floor(Math.random() * 10) + 1
    });
    setCaptchaAnswer('');
  };

  // --- Fetch Clubs when Muni changes ---
  useEffect(() => {
    if (selectedMuni) {
      api.get(`/clubs/?municipality=${selectedMuni.id}`).then(res => {
        const allClubs = Array.isArray(res.data) ? res.data : res.data.results;
        const openClubs = allClubs.filter((c: Club) => c.effective_registration_allowed === true);
        setClubs(openClubs);
      });
    } else {
      setClubs([]);
    }
  }, [selectedMuni]);

  // --- Fetch Custom Fields when Club Selected ---
  useEffect(() => {
    if (selectedClub) {
        setLoadingYouthFields(true);
        setLoadingGuardianFields(true);
        
        api.get(`/custom-fields/public/?club_id=${selectedClub.id}&target_role=YOUTH_MEMBER`, { skipAuth: true } as any)
           .then(res => {
             const fields = Array.isArray(res.data) ? res.data : (res.data?.results || res.data || []);
             setYouthCustomFields(fields);
             setLoadingYouthFields(false);
           })
           .catch(() => {
             setYouthCustomFields([]);
             setLoadingYouthFields(false);
           });

        api.get(`/custom-fields/public/?club_id=${selectedClub.id}&target_role=GUARDIAN`, { skipAuth: true } as any)
           .then(res => {
             const fields = Array.isArray(res.data) ? res.data : (res.data?.results || res.data || []);
             setGuardianCustomFields(fields);
             setLoadingGuardianFields(false);
           })
           .catch(() => {
             setGuardianCustomFields([]);
             setLoadingGuardianFields(false);
           });
    } else {
      setYouthCustomFields([]);
      setGuardianCustomFields([]);
      setLoadingYouthFields(false);
      setLoadingGuardianFields(false);
    }
  }, [selectedClub]);

  // --- Check User Email ---
  const checkEmailAvailability = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    setCheckingEmail(true);
    try {
        const res = await api.post('/register/check-email/', { email: formData.email }, { skipAuth: true } as any);
        if (res.data.exists) {
            setEmailTaken(true);
            error(t('toasts.emailAlreadyRegistered'));
        } else {
            setEmailTaken(false);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setCheckingEmail(false);
    }
  };

  // --- Guardian Check Logic ---
  const checkGuardianEmail = async () => {
    if (!formData.guardian_email || !formData.guardian_email.includes('@')) return;
    setCheckingGuardian(true);
    try {
        const res = await api.post('/register/check-guardian/', { email: formData.guardian_email }, { skipAuth: true } as any);
        setGuardianExists(res.data.exists);
        if (res.data.exists) {
            success(t('toasts.guardianFound'));
        }
    } catch (e) {
        console.error(e);
    } finally {
        setCheckingGuardian(false);
    }
  };

  // --- Password Validation ---
  const getPasswordValidation = () => {
    const pw = formData.password;
    return {
        length: pw.length >= 8,
        number: /\d/.test(pw),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
        match: pw && pw === formData.confirm_password
    };
  };
  const pwValid = getPasswordValidation();
  const isPasswordValid = pwValid.length && pwValid.number && pwValid.special && pwValid.match;

  // --- Captcha Validation ---
  const isCaptchaValid = () => {
      if (!captchaAnswer) return false;
      const answer = parseInt(captchaAnswer);
      return answer === captchaParams.num1 + captchaParams.num2;
  };

  // --- Step Validation ---
  const isStep2Valid = () => formData.email && formData.phone && !emailTaken && !checkingEmail && isPasswordValid && isCaptchaValid();

  // --- Helpers ---
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Replace block elements with newlines to preserve paragraph structure
    let text = html
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n');
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // Clean up excessive whitespace while preserving paragraph breaks
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  };
  
  const openTermsModal = (type: 'terms' | 'policies') => {
    setTermsModalType(type);
    setTermsModalOpen(true);
  };

  const updateCF = (fieldId: number, value: any, isGuardian = false) => {
    const key = isGuardian ? 'guardian_custom_field_values' : 'custom_field_values';
    setFormData(prev => ({
        ...prev,
        [key]: { ...prev[key], [fieldId]: value }
    }));
  };
  
  const handleInterestToggle = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(id) 
        ? prev.interests.filter(i => i !== id) 
        : [...prev.interests, id]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.terms_accepted) {
      error(t('toasts.mustAcceptTerms'));
      return;
    }
    
    if (!isCaptchaValid()) {
        error(t('toasts.incorrectCaptcha'));
        generateCaptcha();
        return;
    }

    setLoading(true);

    try {
      const payload: any = {
        email: formData.email,
        phone_number: formData.phone,
        password: formData.password,
        password_confirm: formData.confirm_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        preferred_club_id: selectedClub?.id,
        legal_gender: formData.legal_gender,
        custom_fields: formData.custom_field_values,
      };
      
      if (formData.nickname) payload.nickname = formData.nickname;
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.grade && !isNaN(parseInt(formData.grade))) {
        payload.grade = parseInt(formData.grade);
      }
      if (formData.preferred_gender) payload.preferred_gender = formData.preferred_gender;
      if (formData.interests && formData.interests.length > 0) {
        payload.interests = formData.interests;
      }
      
      if (formData.guardian_email) {
        payload.guardian_email = formData.guardian_email;
        if (!guardianExists) {
            payload.guardian_first_name = formData.guardian_first_name;
            payload.guardian_last_name = formData.guardian_last_name;
            payload.guardian_phone = formData.guardian_phone;
            payload.guardian_legal_gender = formData.guardian_legal_gender;
            payload.guardian_custom_fields = formData.guardian_custom_field_values;
        }
      }

      await api.post('/register/youth/', payload, { skipAuth: true } as any);
      
      success(t('toasts.registrationSuccess'));
      setTimeout(() => router.push('/login'), 2000);

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : t('toasts.registrationFailed');
      error(msg);
      setLoading(false);
    }
  };

  // --- Custom Field Renderer ---
  const renderCustomFields = (fields: CustomFieldDef[], isGuardian = false) => {
    return fields.map(field => (
        <div key={field.id} className="mb-4">
            <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">
                {field.name} {field.required && <span className="text-[var(--brand-red)]">*</span>}
            </label>
            {field.field_type === 'TEXT' && (
                <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition outline-none"
                    value={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || ''}
                    onChange={e => updateCF(field.id, e.target.value, isGuardian)}
                />
            )}
            {field.field_type === 'BOOLEAN' && (
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                        checked={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || false}
                        onChange={e => updateCF(field.id, e.target.checked, isGuardian)}
                    />
                    <span className="text-[var(--brand-light)]/80">{t('common.yes')}</span>
                </label>
            )}
            {field.field_type === 'SINGLE_SELECT' && (
                <select 
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition outline-none appearance-none"
                    value={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || ''}
                    onChange={e => updateCF(field.id, e.target.value, isGuardian)}
                >
                    <option value="">{t('common.select')}</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            )}
            {field.field_type === 'MULTI_SELECT' && (
                <div className="space-y-2">
                    {field.options.map(opt => {
                        const currentValues = (isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || [];
                        const isChecked = Array.isArray(currentValues) && currentValues.includes(opt);
                        return (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    className="w-4 h-4 rounded border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                    onChange={e => {
                                        const current = (isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || [];
                                        const updated = e.target.checked 
                                            ? [...(Array.isArray(current) ? current : []), opt]
                                            : (Array.isArray(current) ? current.filter((v: string) => v !== opt) : []);
                                        updateCF(field.id, updated, isGuardian);
                                    }}
                                />
                                <span className="text-[var(--brand-light)]/80 text-sm">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            )}
            {field.help_text && <p className="text-xs text-[var(--brand-light)]/50 mt-1">{field.help_text}</p>}
        </div>
    ));
  };

  // Common input classes
  const inputClasses = "w-full px-4 py-3 h-[50px] bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition outline-none";

  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
      
      {/* Progress Header */}
      <div className="bg-[var(--dark-700)] px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]' 
                    : isCompleted 
                      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]'
                      : 'bg-[var(--dark-600)] text-[var(--brand-light)]/40'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold hidden sm:inline">{s.title}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 ${
                    step > s.id ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-6 md:p-8 min-h-[400px]">
        
        {/* STEP 1: LOCATION */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[var(--brand-primary)]" />
                {t('step1.title')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('step1.subtitle')}</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step1.municipality')}</label>
              <select 
                className={`${inputClasses} appearance-none`}
                onChange={(e) => {
                  const m = municipalities.find(m => m.id === parseInt(e.target.value));
                  setSelectedMuni(m || null); 
                  setSelectedClub(null);
                }}
              >
                <option value="">-- {t('step1.chooseMunicipality')} --</option>
                {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            
            {selectedMuni && (
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-3">{t('step1.selectClub')}</label>
                {clubs.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--dark-700)] rounded-xl border border-dashed border-[var(--dark-500)]">
                    <Building2 className="w-10 h-10 text-[var(--brand-light)]/30 mx-auto mb-2" />
                    <p className="text-[var(--brand-light)]/60 text-sm">{t('step1.noClubsAvailable')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clubs.map(club => (
                      <button 
                        key={club.id} 
                        type="button"
                        onClick={() => setSelectedClub(club)} 
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedClub?.id === club.id 
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' 
                            : 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--brand-primary)]/50'
                        }`}
                      >
                        <div className="font-bold text-[var(--brand-light)]">{club.name}</div>
                        {selectedClub?.id === club.id && (
                          <div className="flex items-center gap-1 mt-2 text-[var(--brand-primary)] text-xs font-medium">
                            <Check className="w-3 h-3" /> {t('common.selected')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ACCOUNT & SECURITY */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading flex items-center gap-2">
                <Lock className="w-6 h-6 text-[var(--brand-primary)]" />
                {t('step2.title')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('step2.subtitle')}</p>
            </div>
            
            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.emailAddress')}</label>
                <input 
                  type="email" 
                  placeholder={t('step2.emailPlaceholder')}
                  className={`${inputClasses} ${emailTaken ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                  value={formData.email} 
                  onChange={e => { 
                    setFormData({...formData, email: e.target.value}); 
                    setEmailTaken(false);
                  }}
                  onBlur={checkEmailAvailability} 
                />
                {checkingEmail && <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('step2.checkingAvailability')}</p>}
                {emailTaken && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('step2.emailAlreadyRegistered')} <a href="/login" className="underline hover:text-[var(--brand-red)]/80">{t('step2.loginInstead')}</a>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.phone')}</label>
                <input 
                  type="tel" 
                  placeholder={t('step2.phonePlaceholder')}
                  className={inputClasses}
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            
            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.password')}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    className={inputClasses}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.confirmPassword')}</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    className={`${inputClasses} ${formData.confirm_password && !pwValid.match ? 'border-[var(--brand-red)]' : ''}`}
                    value={formData.confirm_password} 
                    onChange={e => setFormData({...formData, confirm_password: e.target.value})} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)]">
              <p className="font-bold text-[var(--brand-light)] text-sm mb-2">{t('step2.passwordRequirements')}:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <RequirementItem met={pwValid.length} text={t('step2.req8chars')} />
                <RequirementItem met={pwValid.number} text={t('step2.req1number')} />
                <RequirementItem met={pwValid.special} text={t('step2.req1special')} />
                <RequirementItem met={pwValid.match && !!formData.confirm_password} text={t('step2.reqMatch')} />
              </div>
            </div>

            {/* Captcha */}
            <div className="bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/30 p-4 rounded-xl">
              <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">
                {t('step2.humanCheck')}: {t('step2.whatIs')} {captchaParams.num1} + {captchaParams.num2}?
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  placeholder="?" 
                  className={`w-24 px-4 py-2 bg-[var(--dark-700)] border rounded-xl text-[var(--brand-light)] text-center font-bold outline-none ${
                    captchaAnswer && !isCaptchaValid() 
                      ? 'border-[var(--brand-red)]' 
                      : captchaAnswer && isCaptchaValid() 
                        ? 'border-[var(--brand-green)]' 
                        : 'border-[var(--dark-500)]'
                  }`}
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
                />
                {captchaAnswer && isCaptchaValid() && (
                  <span className="text-[var(--brand-green)] font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> {t('step2.correct')}
                  </span>
                )}
                {captchaAnswer && !isCaptchaValid() && (
                  <span className="text-[var(--brand-red)] text-sm">{t('step2.tryAgain')}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PROFILE */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading flex items-center gap-2">
                <User className="w-6 h-6 text-[var(--brand-primary)]" />
                {t('step3.title')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('step3.subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.firstName')} *</label>
                <input type="text" placeholder={t('step3.firstName')} className={inputClasses} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.lastName')} *</label>
                <input type="text" placeholder={t('step3.lastName')} className={inputClasses} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.dateOfBirth')}</label>
                <input type="date" className={`${inputClasses} appearance-none`} style={{ minHeight: '50px' }} value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.grade')}</label>
                <input type="number" placeholder={t('step3.gradePlaceholder')} className={inputClasses} value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.legalGender')} *</label>
                <select className={`${inputClasses} appearance-none`} value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                  <option value="MALE">{t('gender.male')}</option>
                  <option value="FEMALE">{t('gender.female')}</option>
                  <option value="OTHER">{t('gender.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.preferredGender')}</label>
                <input type="text" placeholder={t('step3.preferredGenderPlaceholder')} className={inputClasses} value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.nickname')}</label>
              <input type="text" placeholder={t('step3.nicknamePlaceholder')} className={inputClasses} value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
            </div>

            {/* Interests */}
            {interestsList.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                  {t('step3.interests')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map(i => (
                    <button 
                      key={i.id}
                      type="button"
                      onClick={() => handleInterestToggle(i.id)} 
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.interests.includes(i.id) 
                          ? 'bg-[var(--brand-purple)] text-white' 
                          : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
                      }`}
                    >
                      {i.icon} {i.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Youth Custom Fields */}
            {loadingYouthFields ? (
              <div className="pt-4 border-t border-[var(--dark-600)]">
                <p className="text-sm text-[var(--brand-light)]/50">{t('common.loadingQuestions')}</p>
              </div>
            ) : youthCustomFields.length > 0 && (
              <div className="pt-4 border-t border-[var(--dark-600)]">
                <h4 className="font-bold text-[var(--brand-light)] mb-4">{t('common.additionalQuestions')}</h4>
                {renderCustomFields(youthCustomFields, false)}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: GUARDIAN */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading flex items-center gap-2">
                <Users className="w-6 h-6 text-[var(--brand-primary)]" />
                {t('step4.title')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">
                {selectedClub?.effective_require_guardian 
                  ? t('step4.guardianRequired') 
                  : t('step4.guardianOptional')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step4.guardianEmail')}</label>
              <input 
                type="email" 
                placeholder={t('step4.guardianEmailPlaceholder')}
                className={`${inputClasses} ${guardianExists ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/10' : ''}`}
                value={formData.guardian_email} 
                onChange={e => {
                  setFormData({...formData, guardian_email: e.target.value});
                  setGuardianExists(false);
                }}
                onBlur={checkGuardianEmail}
              />
              {checkingGuardian && <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('common.checking')}</p>}
            </div>
            
            {guardianExists && (
              <div className="p-4 bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/30 rounded-xl">
                <p className="text-[var(--brand-green)] text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('step4.guardianFoundMessage')}
                </p>
              </div>
            )}
            
            {formData.guardian_email && !guardianExists && !checkingGuardian && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.firstName')}</label>
                    <input type="text" placeholder={t('step4.guardianFirstNamePlaceholder')} className={inputClasses} value={formData.guardian_first_name} onChange={e => setFormData({...formData, guardian_first_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.lastName')}</label>
                    <input type="text" placeholder={t('step4.guardianLastNamePlaceholder')} className={inputClasses} value={formData.guardian_last_name} onChange={e => setFormData({...formData, guardian_last_name: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step4.phone')}</label>
                    <input type="tel" placeholder={t('step4.phonePlaceholder')} className={inputClasses} value={formData.guardian_phone} onChange={e => setFormData({...formData, guardian_phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step4.gender')}</label>
                    <select className={`${inputClasses} appearance-none`} value={formData.guardian_legal_gender} onChange={e => setFormData({...formData, guardian_legal_gender: e.target.value})}>
                      <option value="MALE">{t('gender.male')}</option>
                      <option value="FEMALE">{t('gender.female')}</option>
                      <option value="OTHER">{t('gender.other')}</option>
                    </select>
                  </div>
                </div>
                
                {guardianCustomFields.length > 0 && (
                  <div className="pt-4 border-t border-[var(--dark-600)]">
                    <h4 className="font-bold text-[var(--brand-light)] mb-4">{t('step4.guardianDetails')}</h4>
                    {renderCustomFields(guardianCustomFields, true)}
                  </div>
                )}
              </div>
            )}
            
            {!formData.guardian_email && !selectedClub?.effective_require_guardian && (
              <div className="p-4 bg-[var(--dark-700)] rounded-xl border border-dashed border-[var(--dark-500)] text-center">
                <p className="text-[var(--brand-light)]/60 text-sm">
                  {t('step4.skipMessage')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-[var(--brand-primary)]" />
                {t('step5.title')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('step5.subtitle')}</p>
            </div>
            
            {/* Summary */}
            <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('step5.club')}</span>
                <span className="text-[var(--brand-light)] font-medium">{selectedClub?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('step5.email')}</span>
                <span className="text-[var(--brand-light)] font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('step5.name')}</span>
                <span className="text-[var(--brand-light)] font-medium">{formData.first_name} {formData.last_name}</span>
              </div>
              {formData.guardian_email && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-light)]/60">{t('step5.guardian')}</span>
                  <span className="text-[var(--brand-light)] font-medium">{formData.guardian_email}</span>
                </div>
              )}
            </div>
            
            {/* Terms Preview */}
            <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] text-sm text-[var(--brand-light)]/70">
              <strong className="text-[var(--brand-light)]">{t('step5.termsAndConditions')}:</strong>
              <p className="mt-2 whitespace-pre-line line-clamp-3">
                {stripHtmlTags(selectedMuni?.terms_and_conditions || '') || t('step5.noTermsAvailable')}
              </p>
              {selectedMuni?.terms_and_conditions && (
                <button 
                  type="button"
                  onClick={() => openTermsModal('terms')}
                  className="text-[var(--brand-primary)] text-xs font-medium mt-2 hover:underline"
                >
                  {t('step5.readMore')}
                </button>
              )}
              
              {selectedClub?.club_policies && (
                <>
                  <strong className="text-[var(--brand-light)] block mt-4">{t('step5.clubPolicies')}:</strong>
                  <p className="mt-2 whitespace-pre-line line-clamp-3">
                    {stripHtmlTags(selectedClub.club_policies)}
                  </p>
                  <button 
                    type="button"
                    onClick={() => openTermsModal('policies')}
                    className="text-[var(--brand-primary)] text-xs font-medium mt-2 hover:underline"
                  >
                    {t('step5.readMore')}
                  </button>
                </>
              )}
            </div>
            
            {/* Accept Terms */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
              <input 
                type="checkbox" 
                checked={formData.terms_accepted} 
                onChange={e => setFormData({...formData, terms_accepted: e.target.checked})} 
                className="w-5 h-5 mt-0.5 rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              />
              <span className="text-[var(--brand-light)] text-sm">
                {t('step5.acceptTermsText')}{' '}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); openTermsModal('terms'); }}
                  className="text-[var(--brand-primary)] font-medium hover:underline"
                >
                  {t('step5.termsAndConditions')}
                </button>
                {' '}{t('step5.and')}{' '}
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); openTermsModal('policies'); }}
                  className="text-[var(--brand-primary)] font-medium hover:underline"
                >
                  {t('step5.clubPolicies')}
                </button>
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="bg-[var(--dark-700)] px-4 sm:px-6 py-4 border-t border-[var(--dark-600)] flex justify-between items-center">
        {step > 1 ? (
          <button 
            type="button"
            onClick={() => setStep(step - 1)} 
            className="flex items-center gap-2 text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] font-bold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('navigation.back')}
          </button>
        ) : <div />}
        
        {step < 5 ? (
          <button 
            type="button"
            onClick={() => setStep(step + 1)} 
            disabled={(step === 1 && !selectedClub) || (step === 2 && !isStep2Valid())} 
            className="flex items-center gap-2 bg-[var(--brand-primary)] text-gray-900 px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-primary)]/90 transition-all active:scale-95 shadow-md"
          >
            {t('navigation.next')}
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={loading || !formData.terms_accepted} 
            className="flex items-center gap-2 bg-[var(--brand-green)] text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-green)]/90 transition-all active:scale-95 shadow-md"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('navigation.creating')}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t('navigation.completeRegistration')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Terms Modal - Using Portal to render outside component hierarchy */}
      {termsModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999]">
          {/* Full-screen backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/80"
            onClick={() => setTermsModalOpen(false)}
          />
          
          {/* Modal Container - centered */}
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            {/* Modal Content */}
            <div 
              className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 font-heading">
                  {termsModalType === 'terms' ? t('step5.termsAndConditions') : t('step5.clubPolicies')}
                </h3>
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
                <div className="text-gray-700 text-sm leading-relaxed">
                  {termsModalType === 'terms' ? (
                    <div className="whitespace-pre-line">
                      {stripHtmlTags(selectedMuni?.terms_and_conditions || '') || t('step5.noTermsAvailable')}
                    </div>
                  ) : (
                    <div className="whitespace-pre-line">
                      {stripHtmlTags(selectedClub?.club_policies || '') || t('step5.noPoliciesAvailable')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-light)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-md"
                >
                  {t('step5.close')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      </div>
  );
}

// Requirement Item Component
function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 ${met ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/50'}`}>
      {met ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current" />}
      <span className="text-xs">{text}</span>
    </div>
  );
}
