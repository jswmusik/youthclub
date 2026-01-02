'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Plus, X, Settings2, FileText, List, CheckSquare, 
  ToggleLeft, Users, Lightbulb, Building, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';

interface CustomFieldFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

interface ClubOption { id: number; name: string; }

export default function CustomFieldForm({ initialData, redirectPath, scope }: CustomFieldFormProps) {
  const t = useTranslations('customFields.form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const { success, error, info, warning } = useToast();
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Build URL preserving pagination params
  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    help_text: initialData?.help_text || '',
    field_type: initialData?.field_type || 'TEXT',
    options: initialData?.options || [],
    currentOptionInput: '',
    required: initialData?.required || false,
    is_published: initialData?.is_published ?? true,
    target_roles: initialData?.target_roles || ['YOUTH_MEMBER'],
    specific_clubs: initialData?.specific_clubs || [],
    context: initialData?.context || 'USER_PROFILE',
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Validate individual field
  const validateField = (field: string, value: any) => {
    let error = '';
    
    if (field === 'name') {
      if (!value || value.toString().trim() === '') {
        error = t('validation.nameRequired');
      }
    }
    
    return error;
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const value = formData[field as keyof typeof formData];
    const error = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ['name'];
    
    // Mark all required fields as touched
    const touched: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      touched[field] = true;
    });
    setTouchedFields(touched);
    
    // Validate required fields
    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      const error = validateField(field, value);
      if (error) {
        errors[field] = error;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (scope === 'MUNICIPALITY') {
      api.get('/clubs/').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
  }, [scope]);

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [
      formData.name,
      formData.field_type,
      formData.target_roles.length > 0,
    ];
    
    // Add options requirement for select types
    if (formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') {
      requiredFields.push(formData.options.length > 0);
    }
    
    const filled = requiredFields.filter(f => f).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

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

  // --- Handlers ---
  const addOption = () => {
    if (!formData.currentOptionInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, prev.currentOptionInput.trim()],
      currentOptionInput: ''
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_: string, i: number) => i !== index)
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const roles = prev.target_roles.includes(role)
        ? prev.target_roles.filter((r: string) => r !== role)
        : [...prev.target_roles, role];
      return { ...prev, target_roles: roles };
    });
  };

  const toggleClub = (clubId: number) => {
    setFormData(prev => {
      const list = prev.specific_clubs.includes(clubId)
        ? prev.specific_clubs.filter((id: number) => id !== clubId)
        : [...prev.specific_clubs, clubId];
      return { ...prev, specific_clubs: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }
    
    if ((formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && formData.options.length === 0) {
      error(t('validation.needOption'));
      return;
    }
    if (formData.target_roles.length === 0) {
      error(t('validation.needRole'));
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name,
      help_text: formData.help_text,
      field_type: formData.field_type,
      options: formData.options,
      required: formData.required,
      is_published: formData.is_published,
      target_roles: formData.target_roles,
      specific_clubs: formData.specific_clubs,
      context: formData.context,
    };

    try {
      if (initialData) {
        await api.patch(`/custom-fields/${initialData.id}/`, payload);
        success(t('toasts.updateSuccess'));
      } else {
        await api.post('/custom-fields/', payload);
        success(t('toasts.createSuccess'));
      }
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
      console.error(err);
      error('Operation failed. Please try again.');
      setLoading(false);
    }
  };

  // Field type config
  const fieldTypeConfig = {
    TEXT: { icon: FileText, label: t('fieldType.text'), description: t('fieldType.textDesc'), color: 'blue' },
    SINGLE_SELECT: { icon: List, label: t('fieldType.singleSelect'), description: t('fieldType.singleSelectDesc'), color: 'green' },
    MULTI_SELECT: { icon: CheckSquare, label: t('fieldType.multiSelect'), description: t('fieldType.multiSelectDesc'), color: 'pink' },
    BOOLEAN: { icon: ToggleLeft, label: t('fieldType.boolean'), description: t('fieldType.booleanDesc'), color: 'purple' },
  };

  // Styling helpers
  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/80 mb-2";
  const inputClasses = "w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all";
  const selectClasses = "w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all";

  // Progress bar component for portal
  const ProgressBar = () => (
    <div className="bg-[var(--dark-800)] border-b border-[var(--dark-700)] px-4 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[var(--brand-light)]/60">{t('formCompletion')}</span>
          <span className={`font-bold ${completionPercent === 100 ? 'text-green-400' : 'text-[var(--brand-primary)]'}`}>
            {completionPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-[var(--dark-600)] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-green-500' : 'bg-[var(--brand-primary)]'}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Progress placeholder for scroll detection */}
      <div ref={progressPlaceholderRef} className="h-0" />
      
      {/* Fixed progress bar when scrolled */}
      {isMounted && isProgressFixed && createPortal(
        <div className="fixed top-0 left-0 right-0 z-50">
          <ProgressBar />
        </div>,
        document.body
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={redirectPath}>
            <button className="w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? t('editTitle') : t('createTitle')}
            </h1>
            <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('subtitle')}</p>
          </div>
        </div>

        {/* Progress Bar (in-flow) */}
        {!isProgressFixed && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] px-4 sm:px-6 py-4 mb-6 -mx-4 sm:mx-0">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--brand-light)]/60">{t('formCompletion')}</span>
              <span className={`font-bold ${completionPercent === 100 ? 'text-green-400' : 'text-[var(--brand-primary)]'}`}>
                {completionPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-green-500' : 'bg-[var(--brand-primary)]'}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Basic Information */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('basicInfo.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/60">{t('basicInfo.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className={labelClasses}>
                  {t('basicInfo.fieldLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder={t('basicInfo.fieldLabelPlaceholder')}
                  value={formData.name}
                  onChange={e => {
                    setFormData({...formData, name: e.target.value});
                    if (validationErrors['name']) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors['name'];
                        return newErrors;
                      });
                    }
                  }}
                  onBlur={() => handleBlur('name')}
                  className={`${inputClasses} ${touchedFields['name'] && validationErrors['name'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                />
                {touchedFields['name'] && validationErrors['name'] && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['name']}</p>
                )}
              </div>
              <div>
                <label className={labelClasses}>{t('basicInfo.helpText')}</label>
                <input
                  type="text"
                  placeholder={t('basicInfo.helpTextPlaceholder')}
                  value={formData.help_text}
                  onChange={e => setFormData({...formData, help_text: e.target.value})}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          {/* 2. Field Type Visual Selector */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('fieldType.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/60">{t('fieldType.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(fieldTypeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  const isSelected = formData.field_type === type;
                  const colorClasses = {
                    blue: isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--dark-600)] hover:border-blue-500/50',
                    green: isSelected ? 'border-green-500 bg-green-500/10' : 'border-[var(--dark-600)] hover:border-green-500/50',
                    pink: isSelected ? 'border-pink-500 bg-pink-500/10' : 'border-[var(--dark-600)] hover:border-pink-500/50',
                    purple: isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--dark-600)] hover:border-purple-500/50',
                  };
                  const iconColorClasses = {
                    blue: 'text-blue-400',
                    green: 'text-green-400',
                    pink: 'text-pink-400',
                    purple: 'text-purple-400',
                  };
                  
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, field_type: type})}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${colorClasses[config.color as keyof typeof colorClasses]}`}
                    >
                      <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${isSelected ? `bg-${config.color}-500/20` : 'bg-[var(--dark-700)]'}`}>
                        <Icon className={`w-5 h-5 ${iconColorClasses[config.color as keyof typeof iconColorClasses]}`} />
                      </div>
                      <div className="font-medium text-[var(--brand-light)] text-sm">{config.label}</div>
                      <div className="text-xs text-[var(--brand-light)]/50 mt-1 hidden sm:block">{config.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Options Builder (for select types) */}
          {(formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <List className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">{t('options.title')}</h2>
                    <p className="text-sm text-[var(--brand-light)]/60">{t('options.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('options.placeholder')}
                    value={formData.currentOptionInput}
                    onChange={e => setFormData({...formData, currentOptionInput: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    className={`${inputClasses} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 h-11 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-medium transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('options.add')}</span>
                  </button>
                </div>
                
                {formData.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)]">
                    {formData.options.map((opt: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm font-medium flex items-center gap-2"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="hover:bg-[var(--brand-primary)]/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-[var(--dark-600)] rounded-xl text-center">
                    <AlertCircle className="w-8 h-8 text-[var(--brand-light)]/30 mx-auto mb-2" />
                    <p className="text-[var(--brand-light)]/50 text-sm">{t('options.empty')}</p>
                    <p className="text-[var(--brand-light)]/30 text-xs mt-1">{t('validation.addOption')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Usage Context */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('usageContext.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/60">{t('usageContext.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, context: 'USER_PROFILE'})}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.context === 'USER_PROFILE'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      : 'border-[var(--dark-600)] hover:border-[var(--brand-primary)]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.context === 'USER_PROFILE' ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' : 'border-[var(--dark-500)]'
                    }`}>
                      {formData.context === 'USER_PROFILE' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--brand-light)]">{t('usageContext.userProfile')}</div>
                      <div className="text-sm text-[var(--brand-light)]/60">{t('usageContext.userProfileDesc')}</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, context: 'EVENT'})}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.context === 'EVENT'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      : 'border-[var(--dark-600)] hover:border-[var(--brand-primary)]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.context === 'EVENT' ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' : 'border-[var(--dark-500)]'
                    }`}>
                      {formData.context === 'EVENT' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--brand-light)]">{t('usageContext.eventBooking')}</div>
                      <div className="text-sm text-[var(--brand-light)]/60">{t('usageContext.eventBookingDesc')}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Target Roles */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('targetRoles.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/60">{t('targetRoles.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleRole('YOUTH_MEMBER')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.target_roles.includes('YOUTH_MEMBER')
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-[var(--dark-600)] hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                      formData.target_roles.includes('YOUTH_MEMBER') ? 'border-green-500 bg-green-500' : 'border-[var(--dark-500)]'
                    }`}>
                      {formData.target_roles.includes('YOUTH_MEMBER') && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="font-medium text-[var(--brand-light)]">{t('targetRoles.youthMembers')}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleRole('GUARDIAN')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.target_roles.includes('GUARDIAN')
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-[var(--dark-600)] hover:border-green-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                      formData.target_roles.includes('GUARDIAN') ? 'border-green-500 bg-green-500' : 'border-[var(--dark-500)]'
                    }`}>
                      {formData.target_roles.includes('GUARDIAN') && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="font-medium text-[var(--brand-light)]">{t('targetRoles.guardians')}</div>
                  </div>
                </button>
              </div>
              {formData.target_roles.length === 0 && (
                <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {t('validation.selectRole')}
                </p>
              )}
            </div>
          </div>

          {/* 6. Field Settings */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <ToggleLeft className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('fieldSettings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/60">{t('fieldSettings.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {/* Active Toggle */}
              <button
                type="button"
                onClick={() => setFormData({...formData, is_published: !formData.is_published})}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  formData.is_published
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-[var(--dark-600)] bg-[var(--dark-700)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      formData.is_published ? 'bg-green-500' : 'bg-[var(--dark-600)]'
                    }`}>
                      {formData.is_published ? (
                        <Eye className="w-4 h-4 text-white" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-[var(--brand-light)]/60" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--brand-light)]">
                        {formData.is_published ? t('fieldSettings.active') : t('fieldSettings.inactive', { defaultValue: 'Inactive' })}
                      </div>
                      <div className="text-sm text-[var(--brand-light)]/60">
                        {formData.is_published ? t('fieldSettings.activeDesc') : t('fieldSettings.inactiveDesc', { defaultValue: 'Field is hidden from users' })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    formData.is_published ? 'bg-green-500/20 text-green-400' : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60'
                  }`}>
                    {formData.is_published ? t('fieldSettings.active') : t('fieldSettings.draft', { defaultValue: 'Draft' })}
                  </span>
                </div>
              </button>

              {/* Required Toggle */}
              <button
                type="button"
                onClick={() => setFormData({...formData, required: !formData.required})}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  formData.required
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-[var(--dark-600)] bg-[var(--dark-700)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    formData.required ? 'border-red-500 bg-red-500' : 'border-[var(--dark-500)]'
                  }`}>
                    {formData.required && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">{t('fieldSettings.required')}</div>
                    <div className="text-sm text-[var(--brand-light)]/60">{t('fieldSettings.requiredDesc')}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 7. Municipality: Limit Clubs */}
          {scope === 'MUNICIPALITY' && clubs.length > 0 && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Building className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">{t('clubSelection.title')}</h2>
                    <p className="text-sm text-[var(--brand-light)]/60">{t('clubSelection.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)]">
                  {clubs.map(club => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => toggleClub(club.id)}
                      className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                        formData.specific_clubs.includes(club.id)
                          ? 'bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30'
                          : 'hover:bg-[var(--dark-600)]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.specific_clubs.includes(club.id) ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' : 'border-[var(--dark-500)]'
                      }`}>
                        {formData.specific_clubs.includes(club.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[var(--brand-light)]">{club.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[var(--brand-light)]/50 text-xs mt-3">
                  {t('clubSelection.allClubsNote')}
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
            <div className="px-4 sm:px-6 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand-light)] mb-1">{t('tips.title')}</h3>
                <ul className="text-sm text-[var(--brand-light)]/60 space-y-1">
                  <li>{t('tips.tip1')}</li>
                  <li>{t('tips.tip2')}</li>
                  <li>{t('tips.tip3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pb-10 -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => router.push(buildUrlWithParams(redirectPath))}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium hover:bg-[var(--dark-600)] transition-all"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t('buttons.saving') : initialData ? t('buttons.update') : t('buttons.create')}
            </button>
          </div>
        </form>
      </div>

      </div>
  );
}
