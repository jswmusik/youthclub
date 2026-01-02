'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateUserProfile, saveCustomFieldValues } from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import api from '@/lib/api';
import { useToast } from '../../../hooks/useToast';
import { Camera, User, X, Search, Sparkles, Globe, Check } from 'lucide-react';
import { localeOptions, type Locale } from '@/i18n/config';
import { useLocale } from '@/context/LocaleContext';

interface CustomField {
  id: number;
  name: string;
  help_text?: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options?: string[];
  required: boolean;
  value?: any;
}

interface ProfileEditFormProps {
  user: any;
  darkMode?: boolean;
}

export default function ProfileEditForm({ user, darkMode = true }: ProfileEditFormProps) {
  const router = useRouter();
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { setLocale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, any>>({});
  const { success, error, info, warning } = useToast();
  
  // Interests state
  const [interestsList, setInterestsList] = useState<any[]>([]);
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    nickname: user.nickname || '',
    phone_number: user.phone_number || '',
    mood_status: user.mood_status || '',
    preferred_language: user.preferred_language || 'sv',
    date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
    grade: user.grade || '',
    legal_gender: user.legal_gender || '',
    preferred_gender: user.preferred_gender || '',
    notification_email_enabled: user.notification_email_enabled !== undefined ? user.notification_email_enabled : true,
    interests: user.interests ? user.interests.map((i: any) => typeof i === 'object' ? i.id : i) : [],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  
  // Previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar ? getMediaUrl(user.avatar) : null);
  const [bgPreview, setBgPreview] = useState<string | null>(user.background_image ? getMediaUrl(user.background_image) : null);

  // Fetch interests list
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await api.get('/interests/');
        const interests = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        setInterestsList(interests);
      } catch (error) {
        console.error('Failed to fetch interests:', error);
      }
    };
    fetchInterests();
  }, []);

  // Fetch custom fields
  useEffect(() => {
    const fetchCustomFields = async () => {
      if (!user?.preferred_club) {
        setLoadingFields(false);
        return;
      }

      try {
        const clubId = typeof user.preferred_club === 'object' 
          ? user.preferred_club.id 
          : user.preferred_club;
        
        const response = await api.get(`/custom-fields/public/?club_id=${clubId}&target_role=YOUTH_MEMBER`, {
          skipAuth: false
        } as any);
        
        const fields = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        
        setCustomFields(fields);
        
        // Initialize custom field values from user data
        const initialValues: Record<number, any> = {};
        fields.forEach((field: CustomField) => {
          // Check if user has a value for this field
          if (user.custom_field_values) {
            const userValue = user.custom_field_values.find((cfv: any) => cfv.field === field.id);
            if (userValue) {
              initialValues[field.id] = userValue.value;
            }
          }
          // Also check if field has a value property (from CustomFieldUserViewSerializer)
          if (field.value !== undefined && field.value !== null) {
            initialValues[field.id] = field.value;
          }
        });
        setCustomFieldValues(initialValues);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      } finally {
        setLoadingFields(false);
      }
    };

    fetchCustomFields();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCustomFieldChange = (fieldId: number, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Interests handlers
  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return { 
        ...prev, 
        interests: exists ? prev.interests.filter((i: number) => i !== id) : [...prev.interests, id] 
      };
    });
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((i: number) => i !== id)
    }));
  };

  const getSelectedInterests = () => formData.interests.map((id: number) => interestsList.find(i => i.id === id)).filter(Boolean) as any[];
  
  const filteredInterests = interestsList.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setBgFile(file);
        setBgPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for API - convert empty strings to null/undefined for optional fields
      const formDataToSend = new FormData();
      
      // Add basic fields
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('nickname', formData.nickname);
      formDataToSend.append('phone_number', formData.phone_number);
      formDataToSend.append('mood_status', formData.mood_status);
      formDataToSend.append('preferred_language', formData.preferred_language);
      formDataToSend.append('notification_email_enabled', formData.notification_email_enabled.toString());
      
      // Add files
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }
      if (bgFile) {
        formDataToSend.append('background_image', bgFile);
      }
      
      // Add optional fields
      if (formData.date_of_birth) {
        formDataToSend.append('date_of_birth', formData.date_of_birth);
      }
      if (formData.grade) {
        formDataToSend.append('grade', formData.grade.toString());
      }
      if (formData.legal_gender) {
        formDataToSend.append('legal_gender', formData.legal_gender);
      }
      if (formData.preferred_gender) {
        formDataToSend.append('preferred_gender', formData.preferred_gender);
      }
      
      // Add interests array
      formData.interests.forEach((id: number) => {
        formDataToSend.append('interests', id.toString());
      });
      
      const apiData: any = formDataToSend;
      
      // Convert empty strings to null/undefined for optional fields
      if (formData.date_of_birth === '') {
        apiData.date_of_birth = undefined;
      } else {
        apiData.date_of_birth = formData.date_of_birth;
      }
      
      if (formData.grade === '') {
        apiData.grade = null;
      } else {
        apiData.grade = formData.grade;
      }
      
      if (formData.legal_gender === '') {
        apiData.legal_gender = undefined;
      } else {
        apiData.legal_gender = formData.legal_gender;
      }
      
      if (formData.preferred_gender === '') {
        apiData.preferred_gender = undefined;
      } else {
        apiData.preferred_gender = formData.preferred_gender;
      }
      
      // Update profile - use FormData directly for interests support
      await api.patch('/auth/users/me/', apiData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update custom fields if there are any
      if (Object.keys(customFieldValues).length > 0) {
        // Convert field IDs to strings for the API
        const valuesToSave: Record<string, any> = {};
        Object.entries(customFieldValues).forEach(([fieldId, value]) => {
          valuesToSave[fieldId.toString()] = value;
        });
        await saveCustomFieldValues(valuesToSave);
      }
      
      // Show success toast
      success(t('profileUpdated'));
      
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        router.push('/dashboard/youth/profile');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Update failed", error);
      error(t('updateFailed'));
      setLoading(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] ?? field.value ?? (field.field_type === 'BOOLEAN' ? false : field.field_type === 'MULTI_SELECT' ? [] : '');
    
    return (
      <div key={field.id} className="mb-6">
        <label className={`block text-sm font-bold mb-2 ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'
        }`}>
          {field.name} {field.required && <span className="text-[var(--brand-red)]">*</span>}
        </label>
        
        {field.field_type === 'TEXT' && (
          <input 
            type="text" 
            className={`mt-1 block w-full px-4 py-3 text-base rounded-xl border transition ${
              darkMode 
                ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20'
                : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
            }`}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        )}
        
        {field.field_type === 'BOOLEAN' && (
          <div className="flex items-center py-2">
            <input 
              type="checkbox" 
              className={`h-5 w-5 rounded border transition ${
                darkMode
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]'
                  : 'text-blue-600 focus:ring-blue-500 border-gray-300'
              }`}
              checked={value === true || value === 'true'}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
            />
            <span className={`ml-3 text-base font-medium ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'
            }`}>{t('yes')}</span>
          </div>
        )}
        
        {field.field_type === 'SINGLE_SELECT' && (
          <select 
            className={`mt-1 block w-full px-4 py-3 text-base rounded-xl border transition appearance-none ${
              darkMode 
                ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20'
                : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
            }`}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        
        {field.field_type === 'MULTI_SELECT' && (
          <div className="space-y-3 mt-1">
            {field.options?.map(opt => {
              const currentValues = Array.isArray(value) ? value : [];
              const isChecked = currentValues.includes(opt);
              return (
                <label key={opt} className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className={`w-5 h-5 rounded border transition ${
                      darkMode
                        ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]'
                        : 'text-blue-600 border-gray-300'
                    }`}
                    checked={isChecked}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...currentValues, opt]
                        : currentValues.filter((v: string) => v !== opt);
                      handleCustomFieldChange(field.id, updated);
                    }}
                  />
                  <span className={`text-base ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>{opt}</span>
                </label>
              );
            })}
          </div>
        )}
        
        {field.help_text && (
          <p className={`text-sm mt-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{field.help_text}</p>
        )}
      </div>
    );
  };

  // Common input classes
  const inputClasses = darkMode 
    ? 'w-full px-4 py-3 h-[50px] text-base rounded-xl border bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition'
    : 'w-full px-4 py-3 h-[50px] text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition';

  const labelClasses = darkMode 
    ? 'block text-sm font-bold text-[var(--brand-light)] mb-2'
    : 'block text-base font-semibold text-gray-700 mb-2';

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 p-6 sm:p-8 md:p-10 rounded-none sm:rounded-2xl border-y sm:border ${
      darkMode 
        ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
        : 'bg-white shadow-sm border-[#4D4DA4]/10'
    }`}>
      
      {/* IMAGES SECTION */}
      <div className="space-y-6">
        {/* Cover Image */}
        <div>
          <label className={labelClasses}>{t('coverImage')}</label>
          <div 
            className={`relative h-40 sm:h-48 rounded-xl bg-cover bg-center overflow-hidden ${
              darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'
            }`}
            style={{ backgroundImage: bgPreview ? `url(${bgPreview})` : 'none' }}
          >
            {!bgPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]">
                <User className="w-16 h-16 text-white/30" />
              </div>
            )}
            <div className={`absolute inset-0 flex items-center justify-center transition ${
              darkMode ? 'bg-black/30 hover:bg-black/40' : 'bg-black/10 hover:bg-black/20'
            }`}>
              <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                darkMode 
                  ? 'bg-[var(--dark-800)]/90 text-[var(--brand-light)] hover:bg-[var(--dark-800)]'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}>
                <Camera className="w-4 h-4" />
                {t('changeCover')}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bg')} />
              </label>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div>
          <label className={labelClasses}>{t('profilePicture')}</label>
          <div className="flex items-center gap-6">
            <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 ${
              darkMode ? 'border-[var(--dark-600)] bg-[var(--dark-700)]' : 'border-[#4D4DA4]/15 bg-[#EBEBFE]'
            }`}>
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]">
                  <User className="w-10 h-10 text-white/50" />
                </div>
              )}
            </div>
            <label className={`cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              darkMode 
                ? 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)] border border-[var(--dark-500)]'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-[#F8F7FE]'
            }`}>
              <Camera className="w-4 h-4" />
              {t('uploadNew')}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
            </label>
          </div>
        </div>
      </div>

      <hr className={darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'} />

      {/* TEXT FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClasses}>{t('firstName')}</label>
          <input 
            type="text" 
            name="first_name" 
            value={formData.first_name} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
        <div>
          <label className={labelClasses}>{t('lastName')}</label>
          <input 
            type="text" 
            name="last_name" 
            value={formData.last_name} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>{t('nickname')}</label>
          <div className={`flex rounded-xl overflow-hidden border ${
            darkMode 
              ? 'border-[var(--dark-500)] focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20'
              : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500'
          }`}>
            <span className={`inline-flex items-center px-4 py-3 text-lg font-medium ${
              darkMode 
                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-r border-[var(--dark-500)]'
                : 'bg-[#F8F7FE] text-gray-600 border-r border-gray-300'
            }`}>@</span>
            <input 
              type="text" 
              name="nickname" 
              value={formData.nickname} 
              onChange={handleChange}
              className={`flex-1 px-4 py-3 text-base border-0 focus:ring-0 ${
                darkMode 
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40'
                  : 'bg-white'
              }`}
            />
          </div>
        </div>

        <div>
          <label className={labelClasses}>{t('statusMood')}</label>
          <input 
            type="text" 
            name="mood_status" 
            placeholder={t('statusPlaceholder')}
            value={formData.mood_status} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>{t('phoneNumber')}</label>
          <input 
            type="tel" 
            name="phone_number" 
            value={formData.phone_number} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div className="md:col-span-2">
          <label className={`${labelClasses} flex items-center gap-2`}>
            <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
            {t('preferredLanguage')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, preferred_language: option.code }));
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  formData.preferred_language === option.code
                    ? darkMode
                      ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] border-[var(--brand-primary)]'
                      : 'bg-[#4D4DA4] text-white border-[#4D4DA4]'
                    : darkMode
                      ? 'bg-[var(--dark-700)] text-[var(--brand-light)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4D4DA4]/50'
                }`}
              >
                <span className="text-lg">{option.flag}</span>
                <span className="flex-1 text-left">{option.name}</span>
                {formData.preferred_language === option.code && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
          <p className={`text-xs mt-2 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
            {t('languageNote')}
          </p>
        </div>

        <div>
          <label className={labelClasses}>{t('dateOfBirth')}</label>
          <input 
            type="date" 
            name="date_of_birth" 
            value={formData.date_of_birth} 
            onChange={handleChange}
            className={`${inputClasses} appearance-none`}
            style={{ minHeight: '50px' }}
          />
        </div>

        <div>
          <label className={labelClasses}>{t('grade')}</label>
          <input 
            type="number" 
            name="grade" 
            min="1"
            max="12"
            value={formData.grade} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses}>{t('legalGender')}</label>
          <select 
            name="legal_gender" 
            value={formData.legal_gender} 
            onChange={handleChange}
            className={`${inputClasses} appearance-none`}
          >
            <option value="">{t('select')}</option>
            <option value="MALE">{t('male')}</option>
            <option value="FEMALE">{t('female')}</option>
            <option value="OTHER">{t('other')}</option>
          </select>
        </div>

        <div>
          <label className={labelClasses}>{t('preferredGender')}</label>
          <input 
            type="text" 
            name="preferred_gender" 
            placeholder={t('preferredGenderPlaceholder')}
            value={formData.preferred_gender} 
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
      </div>

      {/* Interests Section */}
      <div className="mt-8">
        <label className={`${labelClasses} flex items-center gap-2`}>
          <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
          {t('interests')}
        </label>
        
        {/* Selected Interests Display */}
        {formData.interests.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-3 p-3 rounded-xl border ${
            darkMode 
              ? 'bg-[var(--brand-purple)]/10 border-[var(--brand-purple)]/30'
              : 'bg-purple-50 border-purple-200'
          }`}>
            {getSelectedInterests().map(interest => (
              <span 
                key={interest.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-purple)] text-white text-sm rounded-full font-medium"
              >
                {interest.name}
                <button
                  type="button"
                  onClick={() => removeInterest(interest.id)}
                  className="hover:bg-[var(--brand-purple)]/80 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${interest.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Searchable Dropdown */}
        <div className="relative mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchInterests')}
              value={interestSearchTerm}
              onChange={(e) => {
                setInterestSearchTerm(e.target.value);
                setShowInterestDropdown(true);
              }}
              onFocus={() => setShowInterestDropdown(true)}
              className={`${inputClasses} pr-10`}
            />
            <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${
              darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
            }`} />
          </div>

          {/* Dropdown List */}
          {showInterestDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowInterestDropdown(false)}
              ></div>
              <div className={`absolute z-20 w-full mt-1 rounded-xl border max-h-60 overflow-y-auto ${
                darkMode 
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)]'
                  : 'bg-white border-gray-300 shadow-lg'
              }`}>
                {filteredInterests.length > 0 ? (
                  filteredInterests.map(interest => (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className={`w-full text-left px-4 py-2.5 transition-colors border-b last:border-b-0 ${
                        darkMode 
                          ? 'hover:bg-[var(--dark-600)] border-[var(--dark-600)] text-[var(--brand-light)]'
                          : 'hover:bg-purple-50 border-[#4D4DA4]/10 text-gray-900'
                      }`}
                    >
                      <div className="font-medium">{interest.name}</div>
                    </button>
                  ))
                ) : interestSearchTerm ? (
                  <div className={`px-4 py-3 text-sm text-center ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                  }`}>
                    {t('noInterestsFound')} "{interestSearchTerm}"
                  </div>
                ) : (
                  <div className={`px-4 py-3 text-sm text-center ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                  }`}>
                    {formData.interests.length === 0 
                      ? t('noInterestsAvailable')
                      : t('allInterestsSelected')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Email Notifications Toggle */}
      <div className={`flex items-center p-4 rounded-xl ${
        darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
      }`}>
        <input 
          id="notification_email" 
          type="checkbox" 
          name="notification_email_enabled" 
          checked={formData.notification_email_enabled} 
          onChange={handleChange}
          className={`h-5 w-5 rounded border transition ${
            darkMode
              ? 'bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]'
              : 'text-blue-600 focus:ring-blue-500 border-gray-300'
          }`}
        />
        <label htmlFor="notification_email" className={`ml-3 block text-base font-medium ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>
          {t('emailNotifications')}
        </label>
      </div>

      {/* CUSTOM FIELDS SECTION */}
      {loadingFields ? (
        <div className={`text-base py-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
          {t('loadingCustomFields')}
        </div>
      ) : customFields.length > 0 && (
        <>
          <hr className={darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'} />
          <div>
            <h3 className={`text-xl font-bold mb-6 ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>{t('additionalInfo')}</h3>
            <div className="space-y-6">
              {customFields.map(field => renderCustomField(field))}
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className={`flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t ${
        darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'
      }`}>
        <button 
          type="button"
          onClick={() => router.back()}
          className={`px-6 py-3 rounded-xl text-base font-bold transition ${
            darkMode 
              ? 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)] border border-[var(--dark-500)]'
              : 'border-2 border-gray-300 text-gray-700 hover:bg-[#F8F7FE]'
          }`}
        >
          {tCommon('cancel')}
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-xl text-base font-bold hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 transition active:scale-95"
        >
          {loading ? t('saving') : t('saveChanges')}
        </button>
      </div>
      
      </form>
  );
}
