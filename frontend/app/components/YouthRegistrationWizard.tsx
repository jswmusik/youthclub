'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { Check, ChevronLeft, ChevronRight, MapPin, Lock, User, Users, FileCheck, Eye, EyeOff, AlertCircle, Sparkles, Building2, X } from 'lucide-react';
import { getMediaUrl } from '../utils';

// --- Interfaces ---
interface Option { id: number; name: string; }

interface Club extends Option {
  municipality: number;
  effective_registration_allowed: boolean;
  effective_require_guardian: boolean;
  terms_and_conditions: string;
  club_policies: string;
  avatar?: string | null;
  hero_image?: string | null;
  description?: string | null;
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

interface ConsentDocument {
    id: number;
    code: string;
    name: string;
    description: string;
    consent_text: string;
    version: string;
    is_required: boolean;
    legal_basis: string;
    document_url?: string;
    translations: Array<{
        language: string;
        name: string;
        description: string;
        consent_text: string;
    }>;
}

export default function YouthRegistrationWizard() {
  const t = useTranslations('registrationWizard');
  const locale = useLocale();
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
  const [consentDocuments, setConsentDocuments] = useState<ConsentDocument[]>([]);
  
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
  
  // --- Validation Errors State ---
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // --- Terms Modal State ---
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalType, setTermsModalType] = useState<'terms' | 'policies' | 'privacy' | 'data'>('terms');
  const [mounted, setMounted] = useState(false);
  
  // --- Club Hover Preview State ---
  const [hoveredClub, setHoveredClub] = useState<Club | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
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
    guardian_legal_gender: '',
    guardian_custom_field_values: {} as Record<string, any>,
    // GDPR Consents (all required)
    consent_terms_of_service: false,
    consent_privacy_policy: false,
    consent_data_processing: false,
    consent_age_verification: false,
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

    // Fetch GDPR consent documents
    api.get('/gdpr/consent-types/?is_required=true').then(res => {
      const documents = Array.isArray(res.data) ? res.data : res.data.results || [];
      setConsentDocuments(documents);
    }).catch(err => console.error('Failed to fetch consent documents:', err));

    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    setCaptchaParams({
        num1: Math.floor(Math.random() * 10) + 1,
        num2: Math.floor(Math.random() * 10) + 1
    });
    setCaptchaAnswer('');
  };

  // Helper to get translated consent document content
  const getConsentTranslation = (doc: ConsentDocument, locale: string) => {
    const translation = doc.translations.find(t => t.language === locale);
    if (translation) {
      return {
        name: translation.name,
        description: translation.description,
        consent_text: translation.consent_text
      };
    }
    // Fallback to default
    return {
      name: doc.name,
      description: doc.description,
      consent_text: doc.consent_text
    };
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
  
  const isStep3Valid = () => {
    const gradeNum = parseInt(formData.grade);
    const gradeValid = formData.grade && !isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 13;
    
    return formData.first_name.trim() !== '' && 
           formData.last_name.trim() !== '' && 
           formData.date_of_birth !== '' &&
           gradeValid &&
           formData.legal_gender !== '';
  };
  
  const isStep4Valid = () => {
    // If guardian is required, check that guardian email is provided
    if (selectedClub?.effective_require_guardian) {
      if (!formData.guardian_email.trim()) return false;
    }
    
    // If guardian email is provided and guardian doesn't exist, validate all guardian fields
    if (formData.guardian_email && !guardianExists && !checkingGuardian) {
      if (!formData.guardian_first_name.trim()) return false;
      if (!formData.guardian_last_name.trim()) return false;
      if (!formData.guardian_phone.trim()) return false;
      if (!formData.guardian_legal_gender) return false;
    }
    
    return true;
  };

  // Validate step and return errors
  const validateStep = (stepNumber: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    switch (stepNumber) {
      case 2:
        if (!formData.email.trim()) errors.email = t('validation.emailRequired');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = t('validation.invalidEmail');
        else if (emailTaken) errors.email = t('toasts.emailAlreadyRegistered');
        
        if (!formData.phone.trim()) errors.phone = t('validation.phoneRequired');
        
        if (!formData.password) errors.password = t('validation.passwordRequired');
        else {
          if (formData.password.length < 8) errors.password = t('validation.passwordTooShort');
          else if (!/\d/.test(formData.password)) errors.password = t('validation.passwordNeedsNumber');
          else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) errors.password = t('validation.passwordNeedsSpecial');
        }
        
        if (formData.password !== formData.confirm_password) errors.confirm_password = t('validation.passwordsMustMatch');
        
        if (!isCaptchaValid()) errors.captcha = t('validation.captchaRequired');
        break;
        
      case 3:
        if (!formData.first_name.trim()) errors.first_name = t('validation.firstNameRequired');
        if (!formData.last_name.trim()) errors.last_name = t('validation.lastNameRequired');
        if (!formData.date_of_birth) errors.date_of_birth = t('validation.dateOfBirthRequired');
        
        // Validate grade (required, must be 1-13)
        if (!formData.grade) {
          errors.grade = t('validation.gradeRequired');
        } else {
          const gradeNum = parseInt(formData.grade);
          if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 13) {
            errors.grade = t('validation.gradeInvalid');
          }
        }
        
        if (!formData.legal_gender) errors.legal_gender = t('validation.genderRequired');
        
        // Validate required custom fields for youth
        const invalidYouthField = validateCustomFields(youthCustomFields, formData.custom_field_values);
        if (invalidYouthField) {
          errors.custom_fields = t('toasts.fillRequiredField', { fieldName: invalidYouthField });
        }
        break;
        
      case 4:
        if (selectedClub?.effective_require_guardian && !formData.guardian_email.trim()) {
          errors.guardian_email = t('validation.guardianRequired');
        }
        
        // If guardian email is entered and guardian doesn't exist, validate all guardian fields
        if (formData.guardian_email && !guardianExists && !checkingGuardian) {
          if (!formData.guardian_first_name.trim()) errors.guardian_first_name = t('validation.firstNameRequired');
          if (!formData.guardian_last_name.trim()) errors.guardian_last_name = t('validation.lastNameRequired');
          if (!formData.guardian_phone.trim()) errors.guardian_phone = t('validation.phoneRequired');
          if (!formData.guardian_legal_gender) errors.guardian_legal_gender = t('validation.genderRequired');
          
          // Validate required custom fields for guardian
          const invalidGuardianField = validateCustomFields(guardianCustomFields, formData.guardian_custom_field_values);
          if (invalidGuardianField) {
            errors.guardian_custom_fields = t('toasts.fillRequiredField', { fieldName: invalidGuardianField });
          }
        }
        break;
    }
    
    return errors;
  };

  // Handle next step with validation
  const handleNextStep = () => {
    const errors = validateStep(step);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationErrors(true);
      // Show first error as toast
      const firstError = Object.values(errors)[0];
      error(firstError);
      return;
    }
    
    // Clear errors and proceed
    setValidationErrors({});
    setShowValidationErrors(false);
    setStep(step + 1);
  };

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
  
  const openTermsModal = (type: 'terms' | 'policies' | 'privacy' | 'data') => {
    setTermsModalType(type);
    setTermsModalOpen(true);
  };
  
  // --- Club Hover Handlers ---
  const handleClubMouseEnter = (club: Club, event: React.MouseEvent<HTMLButtonElement>) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Capture the rect immediately before the timeout
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top
    };
    
    // Set a small delay before showing the preview
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPosition(position);
      setHoveredClub(club);
    }, 300);
  };
  
  const handleClubMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredClub(null);
    setHoverPosition(null);
  };
  
  // Strip HTML for description preview
  const stripHtmlForPreview = (html: string | null | undefined): string => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  const updateCF = (fieldId: number, value: any, isGuardian = false) => {
    const key = isGuardian ? 'guardian_custom_field_values' : 'custom_field_values';
    setFormData(prev => ({
        ...prev,
        [key]: { ...prev[key], [fieldId]: value }
    }));
  };

  // Validate required custom fields
  const validateCustomFields = (fields: CustomFieldDef[], values: Record<string, any>): string | null => {
    for (const field of fields) {
      if (field.required) {
        const value = values[field.id];
        
        if (field.field_type === 'MULTI_SELECT') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            return field.name;
          }
        } else if (field.field_type === 'BOOLEAN') {
          // Boolean fields: false is a valid answer, no validation needed
        } else {
          // TEXT and SINGLE_SELECT
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            return field.name;
          }
        }
      }
    }
    return null;
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
    // Validate all required consents are checked
    if (!formData.consent_terms_of_service || !formData.consent_privacy_policy || 
        !formData.consent_data_processing || !formData.consent_age_verification) {
      error(t('toasts.mustAcceptAllConsents') || 'You must accept all required consents to register');
      return;
    }
    
    if (!isCaptchaValid()) {
        error(t('toasts.incorrectCaptcha'));
        generateCaptcha();
        return;
    }

    // Validate required youth custom fields
    const invalidYouthField = validateCustomFields(youthCustomFields, formData.custom_field_values);
    if (invalidYouthField) {
      error(t('toasts.fillRequiredField', { fieldName: invalidYouthField }));
      return;
    }
    
    // Validate required guardian custom fields (only if creating new guardian)
    if (formData.guardian_email && !guardianExists) {
      const invalidGuardianField = validateCustomFields(guardianCustomFields, formData.guardian_custom_field_values);
      if (invalidGuardianField) {
        error(t('toasts.fillRequiredField', { fieldName: invalidGuardianField }));
        return;
      }
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
        // GDPR Consents
        consent_terms_of_service: formData.consent_terms_of_service,
        consent_privacy_policy: formData.consent_privacy_policy,
        consent_data_processing: formData.consent_data_processing,
        consent_age_verification: formData.consent_age_verification,
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
                        onMouseEnter={(e) => handleClubMouseEnter(club, e)}
                        onMouseLeave={handleClubMouseLeave}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedClub?.id === club.id 
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' 
                            : 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--brand-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Club Avatar */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--dark-600)] border border-[var(--dark-500)]">
                            {club.avatar ? (
                              <img 
                                src={getMediaUrl(club.avatar)} 
                                alt={club.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-[var(--brand-light)]/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[var(--brand-light)] truncate">{club.name}</div>
                            {selectedClub?.id === club.id && (
                              <div className="flex items-center gap-1 mt-1 text-[var(--brand-primary)] text-xs font-medium">
                                <Check className="w-3 h-3" /> {t('common.selected')}
                              </div>
                            )}
                          </div>
                        </div>
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
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.emailAddress')} *</label>
                <input 
                  type="email" 
                  placeholder={t('step2.emailPlaceholder')}
                  className={`${inputClasses} ${emailTaken || (showValidationErrors && validationErrors.email) ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                  value={formData.email} 
                  onChange={e => { 
                    setFormData({...formData, email: e.target.value}); 
                    setEmailTaken(false);
                    if (validationErrors.email) setValidationErrors(prev => ({...prev, email: ''}));
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
                {showValidationErrors && validationErrors.email && !emailTaken && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.email}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.phone')} *</label>
                <input 
                  type="tel" 
                  placeholder={t('step2.phonePlaceholder')}
                  className={`${inputClasses} ${showValidationErrors && validationErrors.phone ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                  value={formData.phone} 
                  onChange={e => {
                    setFormData({...formData, phone: e.target.value});
                    if (validationErrors.phone) setValidationErrors(prev => ({...prev, phone: ''}));
                  }}
                />
                {showValidationErrors && validationErrors.phone && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>
            
            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.password')} *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    className={`${inputClasses} ${showValidationErrors && validationErrors.password ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                    value={formData.password} 
                    onChange={e => {
                      setFormData({...formData, password: e.target.value});
                      if (validationErrors.password) setValidationErrors(prev => ({...prev, password: ''}));
                    }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {showValidationErrors && validationErrors.password && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step2.confirmPassword')} *</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    className={`${inputClasses} ${(formData.confirm_password && !pwValid.match) || (showValidationErrors && validationErrors.confirm_password) ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                    value={formData.confirm_password} 
                    onChange={e => {
                      setFormData({...formData, confirm_password: e.target.value});
                      if (validationErrors.confirm_password) setValidationErrors(prev => ({...prev, confirm_password: ''}));
                    }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {showValidationErrors && validationErrors.confirm_password && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.confirm_password}
                  </p>
                )}
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
                <input 
                  type="text" 
                  placeholder={t('step3.firstName')} 
                  className={`${inputClasses} ${showValidationErrors && validationErrors.first_name ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                  value={formData.first_name} 
                  onChange={e => {
                    setFormData({...formData, first_name: e.target.value});
                    if (validationErrors.first_name) setValidationErrors(prev => ({...prev, first_name: ''}));
                  }} 
                />
                {showValidationErrors && validationErrors.first_name && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.first_name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.lastName')} *</label>
                <input 
                  type="text" 
                  placeholder={t('step3.lastName')} 
                  className={`${inputClasses} ${showValidationErrors && validationErrors.last_name ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                  value={formData.last_name} 
                  onChange={e => {
                    setFormData({...formData, last_name: e.target.value});
                    if (validationErrors.last_name) setValidationErrors(prev => ({...prev, last_name: ''}));
                  }} 
                />
                {showValidationErrors && validationErrors.last_name && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.last_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.dateOfBirth')} *</label>
                <input 
                  type="date" 
                  className={`${inputClasses} appearance-none ${showValidationErrors && validationErrors.date_of_birth ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                  style={{ minHeight: '50px' }} 
                  value={formData.date_of_birth} 
                  onChange={e => {
                    setFormData({...formData, date_of_birth: e.target.value});
                    if (validationErrors.date_of_birth) setValidationErrors(prev => ({...prev, date_of_birth: ''}));
                  }} 
                />
                {showValidationErrors && validationErrors.date_of_birth && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.date_of_birth}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.grade')} * <span className="font-normal text-[var(--brand-light)]/50">(1-13)</span></label>
                <input 
                  type="number" 
                  min="1"
                  max="13"
                  placeholder={t('step3.gradePlaceholder')} 
                  className={`${inputClasses} ${showValidationErrors && validationErrors.grade ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                  value={formData.grade} 
                  onChange={e => {
                    setFormData({...formData, grade: e.target.value});
                    if (validationErrors.grade) setValidationErrors(prev => ({...prev, grade: ''}));
                  }} 
                />
                {showValidationErrors && validationErrors.grade && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.grade}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.legalGender')} *</label>
                <select 
                  className={`${inputClasses} appearance-none ${showValidationErrors && validationErrors.legal_gender ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                  value={formData.legal_gender} 
                  onChange={e => {
                    setFormData({...formData, legal_gender: e.target.value});
                    if (validationErrors.legal_gender) setValidationErrors(prev => ({...prev, legal_gender: ''}));
                  }}
                >
                  <option value="MALE">{t('gender.male')}</option>
                  <option value="FEMALE">{t('gender.female')}</option>
                  <option value="OTHER">{t('gender.other')}</option>
                </select>
                {showValidationErrors && validationErrors.legal_gender && (
                  <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.legal_gender}
                  </p>
                )}
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
                {showValidationErrors && validationErrors.custom_fields && (
                  <p className="text-xs text-[var(--brand-red)] mt-2 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.custom_fields}
                  </p>
                )}
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
              <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">
                {t('step4.guardianEmail')} {selectedClub?.effective_require_guardian && '*'}
              </label>
              <input 
                type="email" 
                placeholder={t('step4.guardianEmailPlaceholder')}
                className={`${inputClasses} ${guardianExists ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/10' : ''} ${showValidationErrors && validationErrors.guardian_email ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`}
                value={formData.guardian_email} 
                onChange={e => {
                  setFormData({...formData, guardian_email: e.target.value});
                  setGuardianExists(false);
                  if (validationErrors.guardian_email) setValidationErrors(prev => ({...prev, guardian_email: ''}));
                }}
                onBlur={checkGuardianEmail}
              />
              {checkingGuardian && <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('common.checking')}</p>}
              {showValidationErrors && validationErrors.guardian_email && (
                <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.guardian_email}
                </p>
              )}
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
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.firstName')} *</label>
                    <input 
                      type="text" 
                      placeholder={t('step4.guardianFirstNamePlaceholder')} 
                      className={`${inputClasses} ${showValidationErrors && validationErrors.guardian_first_name ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                      value={formData.guardian_first_name} 
                      onChange={e => {
                        setFormData({...formData, guardian_first_name: e.target.value});
                        if (validationErrors.guardian_first_name) setValidationErrors(prev => ({...prev, guardian_first_name: ''}));
                      }} 
                    />
                    {showValidationErrors && validationErrors.guardian_first_name && (
                      <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.guardian_first_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step3.lastName')} *</label>
                    <input 
                      type="text" 
                      placeholder={t('step4.guardianLastNamePlaceholder')} 
                      className={`${inputClasses} ${showValidationErrors && validationErrors.guardian_last_name ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                      value={formData.guardian_last_name} 
                      onChange={e => {
                        setFormData({...formData, guardian_last_name: e.target.value});
                        if (validationErrors.guardian_last_name) setValidationErrors(prev => ({...prev, guardian_last_name: ''}));
                      }} 
                    />
                    {showValidationErrors && validationErrors.guardian_last_name && (
                      <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.guardian_last_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step4.phone')} *</label>
                    <input 
                      type="tel" 
                      placeholder={t('step4.phonePlaceholder')} 
                      className={`${inputClasses} ${showValidationErrors && validationErrors.guardian_phone ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                      value={formData.guardian_phone} 
                      onChange={e => {
                        setFormData({...formData, guardian_phone: e.target.value});
                        if (validationErrors.guardian_phone) setValidationErrors(prev => ({...prev, guardian_phone: ''}));
                      }} 
                    />
                    {showValidationErrors && validationErrors.guardian_phone && (
                      <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.guardian_phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">{t('step4.gender')} *</label>
                    <select 
                      className={`${inputClasses} appearance-none ${showValidationErrors && validationErrors.guardian_legal_gender ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/10' : ''}`} 
                      value={formData.guardian_legal_gender} 
                      onChange={e => {
                        setFormData({...formData, guardian_legal_gender: e.target.value});
                        if (validationErrors.guardian_legal_gender) setValidationErrors(prev => ({...prev, guardian_legal_gender: ''}));
                      }}
                    >
                      <option value="">{t('step4.selectGender')}</option>
                      <option value="MALE">{t('gender.male')}</option>
                      <option value="FEMALE">{t('gender.female')}</option>
                      <option value="OTHER">{t('gender.other')}</option>
                    </select>
                    {showValidationErrors && validationErrors.guardian_legal_gender && (
                      <p className="text-xs text-[var(--brand-red)] mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.guardian_legal_gender}
                      </p>
                    )}
                  </div>
                </div>
                
                {guardianCustomFields.length > 0 && (
                  <div className="pt-4 border-t border-[var(--dark-600)]">
                    <h4 className="font-bold text-[var(--brand-light)] mb-4">{t('step4.guardianDetails')}</h4>
                    {renderCustomFields(guardianCustomFields, true)}
                    {showValidationErrors && validationErrors.guardian_custom_fields && (
                      <p className="text-xs text-[var(--brand-red)] mt-2 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.guardian_custom_fields}
                      </p>
                    )}
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
            
            {/* GDPR Consents Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                  {t('step5.requiredConsents') || 'Required Consents'}
                </h3>
              </div>

              {/* Terms of Service */}
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <input 
                  type="checkbox" 
                  checked={formData.consent_terms_of_service} 
                  onChange={e => setFormData({...formData, consent_terms_of_service: e.target.checked})} 
                  className="w-5 h-5 mt-0.5 rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <div className="flex-1">
                  <div className="text-[var(--brand-light)] text-sm font-medium mb-1">
                    {t('step5.termsOfService') || 'Terms of Service'}
                  </div>
                  <p className="text-[var(--brand-light)]/60 text-xs mb-2">
                    {t('step5.termsOfServiceDesc') || 'Agreement to the terms and conditions of using the service'}
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); openTermsModal('terms'); }}
                    className="text-[var(--brand-primary)] text-xs font-medium hover:underline"
                  >
                    {t('step5.readTerms') || 'Read Terms'}
                  </button>
                </div>
              </label>

              {/* Privacy Policy */}
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <input 
                  type="checkbox" 
                  checked={formData.consent_privacy_policy} 
                  onChange={e => setFormData({...formData, consent_privacy_policy: e.target.checked})} 
                  className="w-5 h-5 mt-0.5 rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <div className="flex-1">
                  <div className="text-[var(--brand-light)] text-sm font-medium mb-1">
                    {t('step5.privacyPolicy') || 'Privacy Policy'}
                  </div>
                  <p className="text-[var(--brand-light)]/60 text-xs mb-2">
                    {t('step5.privacyPolicyDesc') || 'Consent to data processing as described in privacy policy'}
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); openTermsModal('privacy'); }}
                    className="text-[var(--brand-primary)] text-xs font-medium hover:underline"
                  >
                    {t('step5.readPrivacy') || 'Read Privacy Policy'}
                  </button>
                </div>
              </label>

              {/* Data Processing */}
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <input 
                  type="checkbox" 
                  checked={formData.consent_data_processing} 
                  onChange={e => setFormData({...formData, consent_data_processing: e.target.checked})} 
                  className="w-5 h-5 mt-0.5 rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <div className="flex-1">
                  <div className="text-[var(--brand-light)] text-sm font-medium mb-1">
                    {t('step5.dataProcessing') || 'Data Processing'}
                  </div>
                  <p className="text-[var(--brand-light)]/60 text-xs mb-2">
                    {t('step5.dataProcessingDesc') || 'Consent to process personal data for service operation'}
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); openTermsModal('data'); }}
                    className="text-[var(--brand-primary)] text-xs font-medium hover:underline"
                  >
                    {t('step5.readDataProcessing') || 'Read Data Processing Terms'}
                  </button>
                </div>
              </label>

              {/* Age Verification */}
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <input 
                  type="checkbox" 
                  checked={formData.consent_age_verification} 
                  onChange={e => setFormData({...formData, consent_age_verification: e.target.checked})} 
                  className="w-5 h-5 mt-0.5 rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <div className="flex-1">
                  <div className="text-[var(--brand-light)] text-sm font-medium mb-1">
                    {t('step5.ageVerification') || 'Age Verification'}
                  </div>
                  <p className="text-[var(--brand-light)]/60 text-xs">
                    {t('step5.ageVerificationDesc') || 'I confirm that I am at least 13 years old (or have parental consent)'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="bg-[var(--dark-700)] px-4 sm:px-6 py-4 border-t border-[var(--dark-600)] flex justify-between items-center">
        {step > 1 ? (
          <button 
            type="button"
            onClick={() => {
              setValidationErrors({});
              setShowValidationErrors(false);
              setStep(step - 1);
            }} 
            className="flex items-center gap-2 text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] font-bold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('navigation.back')}
          </button>
        ) : <div />}
        
        {step < 5 ? (
          <button 
            type="button"
            onClick={step === 1 ? () => setStep(step + 1) : handleNextStep} 
            disabled={step === 1 && !selectedClub} 
            className="flex items-center gap-2 bg-[var(--brand-primary)] text-gray-900 px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-primary)]/90 transition-all active:scale-95 shadow-md"
          >
            {t('navigation.next')}
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={loading || !formData.consent_terms_of_service || !formData.consent_privacy_policy || !formData.consent_data_processing || !formData.consent_age_verification} 
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

      {/* Club Hover Preview Card - Using Portal */}
      {hoveredClub && hoverPosition && mounted && createPortal(
        <div 
          className="fixed z-[9998] pointer-events-none"
          style={{
            left: Math.min(hoverPosition.x - 160, window.innerWidth - 340),
            top: Math.max(hoverPosition.y - 220, 10),
          }}
        >
          <div className="w-[320px] bg-white dark:bg-[var(--dark-800)] rounded-2xl border border-gray-200 dark:border-[var(--dark-500)] shadow-2xl overflow-hidden animate-fade-in">
            {/* Hero Image */}
            <div className="h-24 relative bg-gradient-to-br from-[var(--brand-purple)]/20 dark:from-[var(--brand-purple)]/30 to-[var(--brand-primary)]/10 dark:to-[var(--brand-primary)]/20">
              {hoveredClub.hero_image ? (
                <img 
                  src={getMediaUrl(hoveredClub.hero_image)} 
                  alt={hoveredClub.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-gray-300 dark:text-[var(--brand-light)]/20" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[var(--dark-800)] via-transparent to-transparent" />
            </div>
            
            {/* Avatar - positioned to overlap hero */}
            <div className="relative px-4 -mt-8">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-4 border-white dark:border-[var(--dark-800)] bg-gray-100 dark:bg-[var(--dark-700)] shadow-lg">
                {hoveredClub.avatar ? (
                  <img 
                    src={getMediaUrl(hoveredClub.avatar)} 
                    alt={hoveredClub.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-300 dark:text-[var(--brand-light)]/30" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4 pt-2">
              <h4 className="font-bold text-gray-900 dark:text-[var(--brand-light)] text-lg">{hoveredClub.name}</h4>
              {hoveredClub.description && (
                <p className="text-gray-600 dark:text-[var(--brand-light)]/60 text-sm mt-2 line-clamp-3">
                  {stripHtmlForPreview(hoveredClub.description)}
                </p>
              )}
              {!hoveredClub.description && (
                <p className="text-gray-400 dark:text-[var(--brand-light)]/40 text-sm mt-2 italic">
                  {t('step1.noDescription')}
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

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
                  {termsModalType === 'terms' && (t('step5.termsOfService') || 'Terms of Service')}
                  {termsModalType === 'privacy' && (t('step5.privacyPolicy') || 'Privacy Policy')}
                  {termsModalType === 'data' && (t('step5.dataProcessing') || 'Data Processing')}
                  {termsModalType === 'policies' && (t('step5.clubPolicies') || 'Club Policies')}
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
                <div className="text-gray-700 text-sm leading-relaxed space-y-4">
                  {(() => {
                    // Map modal type to consent code
                    const codeMap: Record<string, string> = {
                      'terms': 'terms_of_service',
                      'privacy': 'privacy_policy',
                      'data': 'data_processing'
                    };
                    
                    const code = codeMap[termsModalType];
                    const doc = consentDocuments.find(d => d.code === code);
                    
                    if (doc) {
                      const translated = getConsentTranslation(doc, locale);
                      return (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <h4 className="font-bold text-lg mb-3">{translated.name}</h4>
                            <div className="whitespace-pre-line">
                              {translated.consent_text}
                            </div>
                            {doc.document_url && (
                              <div className="mt-4">
                                <a 
                                  href={doc.document_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  View full document →
                                </a>
                              </div>
                            )}
                          </div>
                          
                          {/* Municipality Policies (if viewing terms) */}
                          {termsModalType === 'terms' && selectedMuni?.terms_and_conditions && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <h4 className="font-bold text-lg mb-3">
                                {selectedMuni.name} - {t('step5.localPolicies') || 'Local Policies'}
                              </h4>
                              <div className="whitespace-pre-line">
                                {stripHtmlTags(selectedMuni.terms_and_conditions)}
                              </div>
                            </div>
                          )}
                          
                          {/* Club House Rules (if viewing terms) */}
                          {termsModalType === 'terms' && selectedClub?.club_policies && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <h4 className="font-bold text-lg mb-3">
                                {selectedClub.name} - {t('step5.houseRules') || 'House Rules'}
                              </h4>
                              <div className="whitespace-pre-line">
                                {stripHtmlTags(selectedClub.club_policies)}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    }
                    
                    // Fallback for club policies modal type
                    if (termsModalType === 'policies') {
                      return (
                        <div className="whitespace-pre-line">
                          {stripHtmlTags(selectedClub?.club_policies || '') || t('step5.noPoliciesAvailable')}
                        </div>
                      );
                    }
                    
                    // Fallback if document not found
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {t('step5.documentNotAvailable') || 'Document not available'}
                      </div>
                    );
                  })()}
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
