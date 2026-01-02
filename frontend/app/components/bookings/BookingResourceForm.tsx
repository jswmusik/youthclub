'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, Package, Calendar, Users, Settings, Image as ImageIcon } from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import { useToast } from '../../../hooks/useToast';

interface Props {
  initialData?: any;
  redirectPath: string;
  clubId?: number; // Optional now
}

export default function BookingResourceForm({ initialData, redirectPath, clubId }: Props) {
  const t = useTranslations('bookingsAdmin.resources.form');
  const tResources = useTranslations('bookingsAdmin.resources');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [clubs, setClubs] = useState<any[]>([]); // To store available clubs
  const [groups, setGroups] = useState<any[]>([]); // To store available groups
  const [qualificationGroups, setQualificationGroups] = useState<any[]>([]); // To store CLOSED groups for qualification
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Build URL preserving pagination params
  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };
  
  const imageRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    resource_type: initialData?.resource_type || 'ROOM',
    requires_training: initialData?.requires_training || false,
    qualification_group: (initialData?.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData?.qualification_group || ''),
    max_participants: initialData?.max_participants || 1,
    allowed_user_scope: initialData?.allowed_user_scope || 'CLUB',
    allowed_group: (initialData?.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData?.allowed_group || ''),
    auto_approve: initialData?.auto_approve ?? false,
    booking_window_weeks: initialData?.booking_window_weeks || 4,
    max_bookings_per_user_per_week: initialData?.max_bookings_per_user_per_week || 3,
    is_active: initialData?.is_active ?? true,
    club: (initialData?.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData?.club || clubId || '') // Handle object or ID
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image ? getMediaUrl(initialData.image) : null);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Validate individual field
  const validateField = (field: string, value: any) => {
    let error = '';
    
    switch (field) {
      case 'club':
        if (!clubId && (!value || value.toString().trim() === '')) {
          error = t('validation.clubRequired');
        }
        break;
      case 'name':
        if (!value || value.toString().trim() === '') {
          error = t('validation.nameRequired');
        }
        break;
      case 'resource_type':
        if (!value || value.toString().trim() === '') {
          error = t('validation.typeRequired');
        }
        break;
      case 'description':
        if (!value || value.toString().trim() === '') {
          error = t('validation.descriptionRequired');
        }
        break;
      case 'image':
        if (!imageFile && !imagePreview) {
          error = t('validation.imageRequired');
        }
        break;
      case 'max_participants':
        if (!value || value.toString().trim() === '' || parseInt(value.toString()) < 1) {
          error = t('validation.maxParticipantsRequired');
        }
        break;
      case 'booking_window_weeks':
        if (!value || value.toString().trim() === '' || parseInt(value.toString()) < 1) {
          error = t('validation.bookingWindowRequired');
        }
        break;
      case 'max_bookings_per_user_per_week':
        if (!value || value.toString().trim() === '' || parseInt(value.toString()) < 1) {
          error = t('validation.maxBookingsRequired');
        }
        break;
    }
    
    return error;
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    let value: any;
    
    if (field === 'image') {
      value = imageFile || imagePreview;
    } else {
      value = formData[field as keyof typeof formData];
    }
    
    const error = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ['name', 'resource_type', 'description', 'image', 'max_participants', 'booking_window_weeks', 'max_bookings_per_user_per_week'];
    if (!clubId) {
      requiredFields.push('club');
    }
    
    // Mark all required fields as touched
    const touched: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      touched[field] = true;
    });
    setTouchedFields(touched);
    
    // Validate required fields
    requiredFields.forEach(field => {
      let value: any;
      
      if (field === 'image') {
        value = imageFile || imagePreview;
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

  useEffect(() => {
    // Fetch clubs list if not forced via prop (needed for both create and edit modes)
    if (!clubId) {
        api.get('/clubs/?page_size=100').then(res => {
            setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
        }).catch(err => {
            console.error('Failed to load clubs', err);
        });
    }
  }, [clubId]);

  // Update formData when initialData changes (for async loading in edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        resource_type: initialData.resource_type || 'ROOM',
        requires_training: initialData.requires_training || false,
        qualification_group: (initialData.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData.qualification_group || ''),
        max_participants: initialData.max_participants || 1,
        allowed_user_scope: initialData.allowed_user_scope || 'CLUB',
        allowed_group: (initialData.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData.allowed_group || ''),
        auto_approve: initialData.auto_approve ?? false,
        booking_window_weeks: initialData.booking_window_weeks || 4,
        max_bookings_per_user_per_week: initialData.max_bookings_per_user_per_week || 3,
        is_active: initialData.is_active ?? true,
        club: (initialData.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData.club || clubId || '')
      });
      
      // Update image preview if image exists
      if (initialData.image) {
        setImagePreview(getMediaUrl(initialData.image));
      }
    }
  }, [initialData, clubId]);

  useEffect(() => {
    // Fetch groups when club is selected or available
    const targetClubId = clubId || formData.club || initialData?.club;
    if (targetClubId) {
      api.get(`/groups/?club=${targetClubId}&page_size=100`).then(res => {
        const allGroups = Array.isArray(res.data) ? res.data : res.data.results || [];
        setGroups(allGroups);
        
        // Filter CLOSED groups for qualification (hidden groups)
        const closedGroups = allGroups.filter((g: any) => g.group_type === 'CLOSED');
        setQualificationGroups(closedGroups);
      }).catch(err => {
        console.error('Failed to load groups', err);
        setGroups([]);
        setQualificationGroups([]);
      });
    } else {
      setGroups([]);
      setQualificationGroups([]);
    }
  }, [clubId, formData.club, initialData?.club]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
      // Clear validation error
      setTouchedFields(prev => ({ ...prev, image: true }));
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['image'];
        return newErrors;
      });
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (!formData.club) {
        error(t('toast.selectClub'));
        return;
    }
    if (formData.allowed_user_scope === 'GROUP' && !formData.allowed_group) {
        error(t('toast.selectGroup'));
        return;
    }
    if (formData.requires_training && !formData.qualification_group) {
        error(t('toast.selectQualificationGroup'));
        return;
    }
    setLoading(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Handle empty string for allowed_group and qualification_group - send empty string to clear it
        if (key === 'allowed_group' || key === 'qualification_group') {
          data.append(key, value || '');
        } else {
          data.append(key, value.toString());
        }
      });
      if (imageFile) data.append('image', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        // EDIT MODE: Stay here or go back to list
        await api.patch(`/bookings/resources/${initialData.id}/`, data, config);
        success(t('toast.resourceUpdated'));
        setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
      } else {
        // CREATE MODE: Capture response to get ID
        const res = await api.post('/bookings/resources/', data, config);
        const newResourceId = res.data.id;
        success(t('toast.resourceCreated'));
        
        // Redirect to the SCHEDULE page for this new resource
        setTimeout(() => router.push(buildUrlWithParams(`${redirectPath}/${newResourceId}/schedule`)), 1000);
      }
      
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || t('toast.errorSaving');
      error(errorMsg);
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

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

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
              {initialData ? t('pageTitle.edit') : t('pageTitle.create')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {t('pageDescription')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Basic Information */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                  <Package className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.basicInformation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('sections.basicInformation.description')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Club Selector (Only if not fixed) */}
              {!clubId && (
                <div>
                  <label className={labelClasses}>
                    {t('sections.basicInformation.assignToClub')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <select 
                    name="club"
                    className={`${inputClasses('club')} appearance-none cursor-pointer ${touchedFields['club'] && validationErrors['club'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    style={selectArrowStyle}
                    value={formData.club}
                    onChange={e => {
                      setFormData({...formData, club: e.target.value});
                      if (validationErrors['club']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['club'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('club')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('club');
                    }}
                  >
                    <option value="">{t('sections.basicInformation.selectClub')}</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {touchedFields['club'] && validationErrors['club'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['club']}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>
                    {t('sections.basicInformation.name')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <input 
                    type="text"
                    name="name"
                    className={`${inputClasses('name')} ${touchedFields['name'] && validationErrors['name'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
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
                    placeholder={t('sections.basicInformation.namePlaceholder')}
                  />
                  {touchedFields['name'] && validationErrors['name'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['name']}</p>
                  )}
                </div>
                <div>
                  <label className={labelClasses}>
                    {t('sections.basicInformation.type')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <select 
                    name="resource_type"
                    className={`${inputClasses('resource_type')} appearance-none cursor-pointer ${touchedFields['resource_type'] && validationErrors['resource_type'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    style={selectArrowStyle}
                    value={formData.resource_type}
                    onChange={e => {
                      setFormData({...formData, resource_type: e.target.value});
                      if (validationErrors['resource_type']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['resource_type'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('resource_type')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('resource_type');
                    }}
                  >
                    <option value="ROOM">{tResources('resourceTypes.ROOM')}</option>
                    <option value="EQUIPMENT">{tResources('resourceTypes.EQUIPMENT')}</option>
                  </select>
                  {touchedFields['resource_type'] && validationErrors['resource_type'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['resource_type']}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClasses}>{t('sections.basicInformation.description')} <span className="text-[var(--brand-red)]">*</span></label>
                <textarea 
                  name="description"
                  className={`${inputClasses('description')} min-h-[100px] resize-none ${touchedFields['description'] && validationErrors['description'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
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
                  placeholder={t('sections.basicInformation.descriptionPlaceholder')}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => {
                    setFocusedField(null);
                    handleBlur('description');
                  }}
                />
                {touchedFields['description'] && validationErrors['description'] && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['description']}</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Resource Image */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.resourceImage.title')} <span className="text-[var(--brand-red)]">*</span></h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('sections.resourceImage.description')}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div 
                  id="image"
                  className={`relative group h-32 w-32 rounded-xl border-2 border-dashed ${touchedFields['image'] && validationErrors['image'] ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} bg-[var(--dark-700)] flex items-center justify-center overflow-hidden shrink-0 hover:border-[var(--brand-primary)]/50 transition-colors cursor-pointer`}
                  onClick={() => {
                    setTouchedFields(prev => ({ ...prev, image: true }));
                    imageRef.current?.click();
                  }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="h-full w-full object-cover" alt="Resource preview" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Package className="h-8 w-8 text-[var(--brand-light)]/40 mx-auto mb-1" />
                      <span className="text-xs text-[var(--brand-light)]/50">{t('sections.resourceImage.clickToUpload')}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => imageRef.current?.click()}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                      {t('sections.resourceImage.chooseFile')}
                    </button>
                    {imagePreview && (
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 transition-all flex items-center gap-2"
                      >
                        <X className="h-4 w-4" /> {t('sections.resourceImage.remove')}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/50">{t('sections.resourceImage.recommended')}</p>
                  {touchedFields['image'] && validationErrors['image'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['image']}</p>
                  )}
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>
          </div>

          {/* 3. Rules & Limits */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.rulesAndLimits.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('sections.rulesAndLimits.description')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>{t('sections.rulesAndLimits.maxParticipants')} <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="number" 
                    name="max_participants"
                    min="1"
                    className={`${inputClasses('max_participants')} ${touchedFields['max_participants'] && validationErrors['max_participants'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    value={formData.max_participants}
                    onChange={e => {
                      setFormData({...formData, max_participants: parseInt(e.target.value)});
                      if (validationErrors['max_participants']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['max_participants'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('max_participants')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('max_participants');
                    }}
                  />
                  {touchedFields['max_participants'] && validationErrors['max_participants'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['max_participants']}</p>
                  )}
                </div>

                <div>
                  <label className={labelClasses}>{t('sections.rulesAndLimits.whoCanBook')}</label>
                  <select 
                    className={`${inputClasses('allowed_user_scope')} appearance-none cursor-pointer`}
                    style={selectArrowStyle}
                    value={formData.allowed_user_scope}
                    onChange={e => {
                      const newScope = e.target.value;
                      setFormData({
                        ...formData, 
                        allowed_user_scope: newScope,
                        // Clear group selection if not GROUP scope
                        allowed_group: newScope === 'GROUP' ? formData.allowed_group : ''
                      });
                    }}
                    onFocus={() => setFocusedField('allowed_user_scope')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="CLUB">{t('sections.rulesAndLimits.thisClubOnly')}</option>
                    <option value="MUNICIPALITY">{t('sections.rulesAndLimits.municipalityMembers')}</option>
                    <option value="GLOBAL">{t('sections.rulesAndLimits.everyone')}</option>
                    <option value="GROUP">{t('sections.rulesAndLimits.specificGroupOnly')}</option>
                  </select>
                </div>

                {formData.allowed_user_scope === 'GROUP' && (
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>
                      {t('sections.rulesAndLimits.selectGroup')} <span className="text-[var(--brand-primary)]">*</span>
                    </label>
                    <select 
                      className={`${inputClasses('allowed_group')} appearance-none cursor-pointer`}
                      style={selectArrowStyle}
                      value={formData.allowed_group}
                      onChange={e => setFormData({...formData, allowed_group: e.target.value})}
                      required
                      onFocus={() => setFocusedField('allowed_group')}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="">{t('sections.rulesAndLimits.selectGroupPlaceholder')}</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {groups.length === 0 && (
                      <p className="text-xs text-[var(--brand-peach)] mt-1">{t('sections.rulesAndLimits.noGroupsAvailable')}</p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className={labelClasses}>{t('sections.rulesAndLimits.bookingWindowWeeks')} <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="number" 
                    name="booking_window_weeks"
                    min="1"
                    className={`${inputClasses('booking_window_weeks')} ${touchedFields['booking_window_weeks'] && validationErrors['booking_window_weeks'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    value={formData.booking_window_weeks}
                    onChange={e => {
                      setFormData({...formData, booking_window_weeks: parseInt(e.target.value)});
                      if (validationErrors['booking_window_weeks']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['booking_window_weeks'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('booking_window_weeks')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('booking_window_weeks');
                    }}
                  />
                  {touchedFields['booking_window_weeks'] && validationErrors['booking_window_weeks'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['booking_window_weeks']}</p>
                  )}
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('sections.rulesAndLimits.bookingWindowHint')}</p>
                </div>
                
                <div>
                  <label className={labelClasses}>{t('sections.rulesAndLimits.maxBookingsPerUserPerWeek')} <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="number" 
                    name="max_bookings_per_user_per_week"
                    min="0"
                    className={`${inputClasses('max_bookings_per_user_per_week')} ${touchedFields['max_bookings_per_user_per_week'] && validationErrors['max_bookings_per_user_per_week'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    value={formData.max_bookings_per_user_per_week}
                    onChange={e => {
                      setFormData({...formData, max_bookings_per_user_per_week: parseInt(e.target.value) || 0});
                      if (validationErrors['max_bookings_per_user_per_week']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['max_bookings_per_user_per_week'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('max_bookings_per_user_per_week')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('max_bookings_per_user_per_week');
                    }}
                  />
                  {touchedFields['max_bookings_per_user_per_week'] && validationErrors['max_bookings_per_user_per_week'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['max_bookings_per_user_per_week']}</p>
                  )}
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('sections.rulesAndLimits.maxBookingsHint')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Settings */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.settings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('sections.settings.description')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="training"
                    checked={formData.requires_training}
                    onChange={e => {
                      setFormData({
                        ...formData, 
                        requires_training: e.target.checked,
                        qualification_group: e.target.checked ? formData.qualification_group : ''
                      });
                    }}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] cursor-pointer"
                  />
                  <label htmlFor="training" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer">
                    {t('sections.settings.requiresQualification')}
                  </label>
                </div>
                
                {/* Qualification Group Selection - Only show when requires_training is checked */}
                {formData.requires_training && (
                  <div className="ml-8 space-y-2">
                    <label className={labelClasses}>
                      {t('sections.settings.qualificationGroup')} <span className="text-[var(--brand-primary)]">*</span>
                    </label>
                    <select 
                      className={`${inputClasses('qualification_group')} appearance-none cursor-pointer`}
                      style={selectArrowStyle}
                      value={formData.qualification_group}
                      onChange={e => setFormData({...formData, qualification_group: e.target.value})}
                      required
                      onFocus={() => setFocusedField('qualification_group')}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="">{t('sections.settings.selectHiddenGroup')}</option>
                      {qualificationGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--brand-light)]/50">{t('sections.settings.qualificationHint')}</p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-[var(--dark-600)] pt-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="active"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] cursor-pointer"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer">
                    {t('sections.settings.isActive')}
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id="auto_approve"
                    checked={formData.auto_approve}
                    onChange={e => setFormData({...formData, auto_approve: e.target.checked})}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] cursor-pointer mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="auto_approve" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer block mb-1">
                      {t('sections.settings.autoApproveBookings')}
                    </label>
                    <p className="text-xs text-[var(--brand-light)]/50">{t('sections.settings.autoApproveHint')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--dark-600)] px-4 sm:px-0">
            <button 
              type="button" 
              onClick={() => router.back()} 
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('actions.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('actions.saving') : initialData ? t('actions.updateResource') : t('actions.createResource')}
            </button>
          </div>
        </form>

        </div>
    </div>
  );
}
