'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, Upload, X, Search, CheckCircle2, Lightbulb, Save,
  Users, Layers, Image, Target, UserPlus, Heart, Settings, Globe, Lock, FileQuestion
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import MemberSelector from './MemberSelector';
import CustomRuleBuilder from './CustomRuleBuilder';
import { getMediaUrl } from '../utils';

interface Interest {
  id: number;
  name: string;
}

interface GroupFormProps {
  initialData?: any;
  redirectPath: string;
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1);

export default function GroupForm({ initialData, redirectPath }: GroupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('groupsAdmin.form');
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  
  const GENDERS = [
    { value: 'MALE', label: t('membershipRules.genders.male') },
    { value: 'FEMALE', label: t('membershipRules.genders.female') },
    { value: 'OTHER', label: t('membershipRules.genders.other') },
  ];
  
  const [loading, setLoading] = useState(false);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // File uploads
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Interest search
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_type: 'OPEN',
    target_member_type: 'YOUTH',
    min_age: '',
    max_age: '',
    grades: [] as number[],
    genders: [] as string[],
    interests: [] as number[],
    custom_field_rules: {} as Record<string, any>,
    members_to_add: [] as number[],
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Validate individual field
  const validateField = (field: string, value: any) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value || value.trim() === '') {
          error = t('validation.nameRequired');
        }
        break;
      case 'group_type':
        if (!value || value.trim() === '') {
          error = t('validation.groupTypeRequired');
        }
        break;
      case 'description':
        if (!value || value.trim() === '') {
          error = t('validation.descriptionRequired');
        }
        break;
      case 'backgroundImage':
        if (!backgroundImageFile && !backgroundPreview) {
          error = t('validation.coverImageRequired');
        }
        break;
      case 'avatar':
        if (!avatarFile && !avatarPreview) {
          error = t('validation.avatarRequired');
        }
        break;
    }
    
    return error;
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    let value: any;
    
    if (field === 'backgroundImage') {
      value = backgroundImageFile || backgroundPreview;
    } else if (field === 'avatar') {
      value = avatarFile || avatarPreview;
    } else {
      value = formData[field as keyof typeof formData];
    }
    
    const error = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ['name', 'group_type', 'description', 'backgroundImage', 'avatar'];
    
    // Mark all required fields as touched
    const touched: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      touched[field] = true;
    });
    setTouchedFields(touched);
    
    // Validate required fields
    requiredFields.forEach(field => {
      let value: any;
      
      if (field === 'backgroundImage') {
        value = backgroundImageFile || backgroundPreview;
      } else if (field === 'avatar') {
        value = avatarFile || avatarPreview;
      } else {
        value = formData[field as keyof typeof formData];
      }
      
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
    // Fetch Interests
    api.get('/interests/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setInterestsList(data || []);
    });

    // Load Initial Data (if editing)
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        group_type: initialData.group_type,
        target_member_type: initialData.target_member_type,
        min_age: initialData.min_age || '',
        max_age: initialData.max_age || '',
        grades: initialData.grades || [],
        genders: initialData.genders || [],
        interests: initialData.interests || [],
        custom_field_rules: initialData.custom_field_rules || {},
        members_to_add: [],
      });
      
      if (initialData.avatar) {
        setAvatarPreview(getMediaUrl(initialData.avatar));
      }
      if (initialData.background_image) {
        setBackgroundPreview(getMediaUrl(initialData.background_image));
      }
    }
  }, [initialData]);
  
  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
    };
  }, [avatarPreview, backgroundPreview]);

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [formData.name];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
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

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  // --- Handlers ---

  const toggleGrade = (grade: number) => {
    setFormData(prev => {
      const exists = prev.grades.includes(grade);
      if (exists) return { ...prev, grades: prev.grades.filter(g => g !== grade) };
      return { ...prev, grades: [...prev.grades, grade].sort((a, b) => a - b) };
    });
  };

  const toggleGender = (gender: string) => {
    setFormData(prev => {
      const exists = prev.genders.includes(gender);
      if (exists) return { ...prev, genders: prev.genders.filter(g => g !== gender) };
      return { ...prev, genders: [...prev.genders, gender] };
    });
  };

  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return { 
        ...prev, 
        interests: exists ? prev.interests.filter(i => i !== id) : [...prev.interests, id] 
      };
    });
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== id)
    }));
  };

  const getSelectedInterests = () => formData.interests.map(id => interestsList.find(i => i.id === id)).filter(Boolean) as Interest[];
  
  const filteredInterests = interestsList.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      // Clear validation error
      setTouchedFields(prev => ({ ...prev, avatar: true }));
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['avatar'];
        return newErrors;
      });
    }
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
      setBackgroundImageFile(file);
      setBackgroundPreview(URL.createObjectURL(file));
      // Clear validation error
      setTouchedFields(prev => ({ ...prev, backgroundImage: true }));
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['backgroundImage'];
        return newErrors;
      });
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'bg') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setBackgroundImageFile(null);
      setBackgroundPreview(null);
      if (bgRef.current) bgRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!validateForm()) {
        setLoading(false);
        return;
      }
      
      const data = new FormData();
      
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('group_type', formData.group_type);
      data.append('target_member_type', formData.target_member_type);
      
      if (formData.min_age) {
        data.append('min_age', parseInt(formData.min_age as string).toString());
      }
      if (formData.max_age) {
        data.append('max_age', parseInt(formData.max_age as string).toString());
      }
      
      data.append('grades', JSON.stringify(formData.grades));
      data.append('genders', JSON.stringify(formData.genders));
      formData.interests.forEach(id => data.append('interests', id.toString()));
      data.append('custom_field_rules', JSON.stringify(formData.custom_field_rules || {}));
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }
      if (backgroundImageFile) {
        data.append('background_image', backgroundImageFile);
      }
      
      formData.members_to_add.forEach(id => data.append('members_to_add', id.toString()));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/groups/${initialData.id}/`, data, config);
        success(t('toast.groupUpdated'));
      } else {
        await api.post('/groups/', data, config);
        success(t('toast.groupCreated'));
      }
      
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => {
        router.push(finalRedirectPath);
      }, 1000);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OPEN': return <Globe className="w-4 h-4" />;
      case 'APPLICATION': return <FileQuestion className="w-4 h-4" />;
      case 'CLOSED': return <Lock className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
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
              {initialData ? t('editTitle') : t('createTitle')}
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
                <span className="text-sm font-medium">{t('progress.allRequiredCompleted')}</span>
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
                  <span className="text-sm font-medium">{t('progress.allRequiredCompleted')}</span>
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
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('basicInfo.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('basicInfo.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    {t('basicInfo.groupName')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <input 
                    id="name"
                    name="name"
                    type="text"
                    placeholder={t('basicInfo.namePlaceholder')}
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
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('name');
                    }}
                    className={`${inputClasses('name')} ${touchedFields['name'] && validationErrors['name'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                  />
                  {touchedFields['name'] && validationErrors['name'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['name']}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="group_type" className={labelClasses}>
                    {t('basicInfo.groupType')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <select 
                    id="group_type"
                    name="group_type"
                    value={formData.group_type}
                    onChange={e => {
                      setFormData({...formData, group_type: e.target.value});
                      if (validationErrors['group_type']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['group_type'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('group_type')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('group_type');
                    }}
                    className={`${selectClasses('group_type')} ${touchedFields['group_type'] && validationErrors['group_type'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    style={selectArrowStyle}
                  >
                    <option value="OPEN">{t('basicInfo.types.open')}</option>
                    <option value="APPLICATION">{t('basicInfo.types.application')}</option>
                    <option value="CLOSED">{t('basicInfo.types.closed')}</option>
                  </select>
                  {touchedFields['group_type'] && validationErrors['group_type'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['group_type']}</p>
                  )}
                </div>
              </div>

              {/* Group Type Visual Selector */}
              <div>
                <label className={labelClasses}>{t('basicInfo.accessType')}</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 'OPEN', label: t('basicInfo.accessTypes.open.label'), desc: t('basicInfo.accessTypes.open.desc'), icon: Globe, color: 'green' },
                    { value: 'APPLICATION', label: t('basicInfo.accessTypes.application.label'), desc: t('basicInfo.accessTypes.application.desc'), icon: FileQuestion, color: 'blue' },
                    { value: 'CLOSED', label: t('basicInfo.accessTypes.closed.label'), desc: t('basicInfo.accessTypes.closed.desc'), icon: Lock, color: 'gray' },
                  ].map(type => {
                    const isSelected = formData.group_type === type.value;
                    const Icon = type.icon;
                    const colorClasses = {
                      green: isSelected ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : '',
                      blue: isSelected ? 'border-[var(--brand-blue)] bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' : '',
                      gray: isSelected ? 'border-[var(--brand-light)]/50 bg-[var(--dark-600)] text-[var(--brand-light)]' : '',
                    };
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({...formData, group_type: type.value})}
                        className={`flex-1 min-w-[120px] p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? colorClasses[type.color as keyof typeof colorClasses]
                            : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? '' : 'text-[var(--brand-light)]/40'}`} />
                        <div className={`text-sm font-semibold ${isSelected ? '' : 'text-[var(--brand-light)]'}`}>{type.label}</div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-[var(--brand-light)]/40'}`}>{type.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="description" className={labelClasses}>
                  {t('basicInfo.descriptionLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <textarea 
                  id="description"
                  name="description"
                  rows={3}
                  placeholder={t('basicInfo.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={e => {
                    setFormData({...formData, description: e.target.value});
                    if (validationErrors['description']) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors['description'];
                        return newErrors;
                      });
                    }
                  }}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => {
                    setFocusedField(null);
                    handleBlur('description');
                  }}
                  className={`${inputClasses('description')} h-auto min-h-[100px] py-3 ${touchedFields['description'] && validationErrors['description'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                />
                {touchedFields['description'] && validationErrors['description'] && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['description']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Visuals Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('profileVisuals.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('profileVisuals.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Cover Image */}
                <div>
                  <label className={labelClasses}>{t('profileVisuals.coverImage')} <span className="text-[var(--brand-red)]">*</span></label>
                  <div className="flex items-start gap-4">
                    <div 
                      id="backgroundImage"
                      className={`relative group w-24 h-16 border-2 border-dashed ${touchedFields['backgroundImage'] && validationErrors['backgroundImage'] ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0`}
                      onClick={() => {
                        setTouchedFields(prev => ({ ...prev, backgroundImage: true }));
                        bgRef.current?.click();
                      }}
                    >
                      {backgroundPreview ? (
                        <>
                          <img src={backgroundPreview} alt="Cover preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <Upload className="h-5 w-5 text-[var(--brand-light)]/40 mx-auto mb-1" />
                          <span className="text-[10px] text-[var(--brand-light)]/40">{t('profileVisuals.upload')}</span>
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
                        {backgroundPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('bg')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {t('profileVisuals.remove')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">{t('profileVisuals.coverImageHint')}</p>
                    </div>
                    <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundChange} />
                  </div>
                  {touchedFields['backgroundImage'] && validationErrors['backgroundImage'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-2">{validationErrors['backgroundImage']}</p>
                  )}
                </div>

                {/* Avatar */}
                <div>
                  <label className={labelClasses}>{t('profileVisuals.avatar')} <span className="text-[var(--brand-red)]">*</span></label>
                  <div className="flex items-start gap-4">
                    <div 
                      id="avatar"
                      className={`relative group w-16 h-16 border-2 border-dashed ${touchedFields['avatar'] && validationErrors['avatar'] ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} rounded-full bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0`}
                      onClick={() => {
                        setTouchedFields(prev => ({ ...prev, avatar: true }));
                        avatarRef.current?.click();
                      }}
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
                          <Upload className="h-4 w-4 text-[var(--brand-light)]/40 mx-auto mb-0.5" />
                          <span className="text-[9px] text-[var(--brand-light)]/40">{t('profileVisuals.upload')}</span>
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
                  {touchedFields['avatar'] && validationErrors['avatar'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-2">{validationErrors['avatar']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Membership Rules Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('membershipRules.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('membershipRules.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Target Audience */}
              <div>
                <label className={labelClasses}>{t('membershipRules.targetAudience')}</label>
                <div className="flex gap-3">
                  {[
                    { value: 'YOUTH', label: t('membershipRules.targetTypes.youth'), icon: Users },
                    { value: 'GUARDIAN', label: t('membershipRules.targetTypes.guardian'), icon: Users },
                  ].map(type => {
                    const isSelected = formData.target_member_type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({...formData, target_member_type: type.value})}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                          isSelected 
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                            : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                        }`}
                      >
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Age Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="min_age" className={labelClasses}>
                    {t('membershipRules.minAge')}
                  </label>
                  <input 
                    id="min_age"
                    type="number" 
                    min="0" 
                    max="100"
                    placeholder={t('membershipRules.agePlaceholder')}
                    value={formData.min_age}
                    onChange={e => setFormData({...formData, min_age: e.target.value})}
                    onFocus={() => setFocusedField('min_age')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('min_age')}
                  />
                </div>
                <div>
                  <label htmlFor="max_age" className={labelClasses}>
                    {t('membershipRules.maxAge')}
                  </label>
                  <input 
                    id="max_age"
                    type="number" 
                    min="0" 
                    max="100"
                    placeholder={t('membershipRules.agePlaceholder')}
                    value={formData.max_age}
                    onChange={e => setFormData({...formData, max_age: e.target.value})}
                    onFocus={() => setFocusedField('max_age')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('max_age')}
                  />
                </div>
              </div>

              {/* Grades (Only if Youth) */}
              {formData.target_member_type === 'YOUTH' && (
                <>
                  <div className="h-px bg-[var(--dark-600)]" />
                  <div>
                    <label className={labelClasses}>{t('membershipRules.allowedGrades')}</label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map(grade => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => toggleGrade(grade)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                            formData.grades.includes(grade) 
                              ? 'bg-[var(--brand-primary)] text-white shadow-lg' 
                              : 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                    {formData.grades.length === 0 && (
                      <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('membershipRules.gradesHint')}</p>
                    )}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Gender */}
              <div>
                <label className={labelClasses}>{t('membershipRules.allowedGenders')}</label>
                <div className="flex flex-wrap gap-3">
                  {GENDERS.map(g => {
                    const isSelected = formData.genders.includes(g.value);
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => toggleGender(g.value)}
                        className={`px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                          isSelected 
                            ? 'border-[var(--brand-purple)] bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]'
                            : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
                {formData.genders.length === 0 && (
                  <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('membershipRules.gendersHint')}</p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Interests */}
              <div>
                <label className={labelClasses}>
                  <Heart className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                  {t('membershipRules.requiredInterests')}
                </label>
                
                {/* Selected Interests Display */}
                {formData.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedInterests().map(interest => (
                      <span key={interest.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-purple)] text-white text-sm font-medium">
                        {interest.name}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest.id)}
                          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
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
                      placeholder={t('membershipRules.searchInterests')}
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
                            {t('membershipRules.noInterestsFound', { term: interestSearchTerm })}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.interests.length === 0 
                              ? t('membershipRules.noInterestsAvailable')
                              : t('membershipRules.allInterestsSelected')}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('membershipRules.interestsHint')}</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Custom Field Rules */}
              <div>
                <label className={labelClasses}>
                  <Settings className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                  {t('membershipRules.customFieldRules')}
                </label>
                <p className="text-xs text-[var(--brand-light)]/40 mb-3">{t('membershipRules.customFieldRulesHint')}</p>
                <CustomRuleBuilder 
                  currentRules={formData.custom_field_rules}
                  onChange={(newRules) => setFormData(prev => ({...prev, custom_field_rules: newRules}))}
                  darkMode={true}
                />
              </div>
            </div>
          </div>

          {/* Add Members Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('addMembers.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('addMembers.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <MemberSelector
                criteria={{
                  target_member_type: formData.target_member_type,
                  min_age: formData.min_age,
                  max_age: formData.max_age,
                  grades: formData.grades,
                  genders: formData.genders,
                  interests: formData.interests,
                  custom_field_rules: formData.custom_field_rules
                }}
                selectedIds={formData.members_to_add}
                onChange={(ids) => setFormData(prev => ({ ...prev, members_to_add: ids }))}
                excludeGroupId={initialData?.id}
                darkMode={true}
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
                    <li>• {t('quickTips.tip1')} <span className="text-[var(--brand-primary)]">*</span></li>
                    <li>• {t('quickTips.tip2')}</li>
                    <li>• {t('quickTips.tip3')}</li>
                    <li>• {t('quickTips.tip4')}</li>
                    <li>• {t('quickTips.tip5')}</li>
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
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('actions.save')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {initialData ? t('actions.update') : t('actions.create')}
                </>
              )}
            </button>
          </div>
        </form>

        </div>
    </div>
  );
}
