'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  ArrowLeft, Upload, X, Tag as TagIcon, Package, Settings, Image, 
  CheckCircle2, Lightbulb, Clock, Layers, Building2
} from 'lucide-react';
import { inventoryApi, ItemCategory, InventoryTag, ClubOption } from '@/lib/inventory-api';
import { useAuth } from '@/context/AuthContext';
import { getMediaUrl } from '@/app/utils';
import { useToast } from '../../../hooks/useToast';

interface ItemFormProps {
  initialData?: any;
  clubId?: number;
}

export default function ItemForm({ initialData, clubId }: ItemFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('inventoryAdmin.form');
  const tFilters = useTranslations('inventoryAdmin.filters');
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [tags, setTags] = useState<InventoryTag[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    quantity: 1,
    max_borrow_duration: initialData?.max_borrow_duration || 60,
    category: initialData?.category ? (typeof initialData.category === 'object' ? initialData.category.id : initialData.category) : '',
    tags: initialData?.tags ? initialData.tags.map((t: any) => typeof t === 'object' ? t.id : t) : [],
    internal_note: initialData?.internal_note || '',
    status: initialData?.status || 'AVAILABLE',
    club: initialData?.club ? (typeof initialData.club === 'object' ? initialData.club.id : initialData.club) : '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image ? getMediaUrl(initialData.image) : null
  );

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Validate individual field
  const validateField = (field: string, value: any) => {
    let error = '';
    
    switch (field) {
      case 'title':
        if (!value || value.toString().trim() === '') {
          error = t('validation.titleRequired');
        }
        break;
      case 'club':
        const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
        if (isSuperOrMuniAdmin && !clubId && (!value || value.toString().trim() === '')) {
          error = t('validation.clubRequired');
        }
        break;
      case 'category':
        if (!value || value.toString().trim() === '') {
          error = t('validation.categoryRequired');
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
      case 'status':
        if (!value || value.toString().trim() === '') {
          error = t('validation.statusRequired');
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
    const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
    const requiredFields = ['title', 'category', 'description', 'image', 'status'];
    if (isSuperOrMuniAdmin && !clubId) {
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

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    Promise.all([inventoryApi.getCategories(), inventoryApi.getTags()])
      .then(([cats, tgs]) => {
        setCategories(Array.isArray(cats) ? cats : (cats.results || []));
        setTags(Array.isArray(tgs) ? tgs : (tgs.results || []));
      })
      .catch(err => {
        console.error("Failed to load categories/tags", err);
        setCategories([]);
        setTags([]);
      });

    const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
    if (isSuperOrMuniAdmin && !clubId) {
      inventoryApi.getSelectableClubs()
        .then(data => {
          setClubs(Array.isArray(data) ? data : (data.results || []));
        })
        .catch(err => {
          console.error("Failed to load clubs", err);
          setClubs([]);
        });
    }
  }, [user, clubId]);

  const calculateCompletion = useCallback(() => {
    const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
    const requiredFields = isSuperOrMuniAdmin && !clubId 
      ? [formData.title, formData.club] 
      : [formData.title];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData, user, clubId]);

  const completionPercent = calculateCompletion();

  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    const mainElement = document.querySelector('main');
    const headerHeight = mainElement ? 0 : 64;
    setIsProgressFixed(rect.top < headerHeight);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        image: imageFile,
        club: formData.club ? Number(formData.club) : (clubId || user?.assigned_club?.id), 
        category: formData.category ? Number(formData.category) : undefined,
      };

      if (initialData) {
        await inventoryApi.updateItem(initialData.id, payload);
        success(t('toast.itemUpdated'));
      } else {
        await inventoryApi.createItems(payload);
        success(formData.quantity > 1 ? t('toast.itemsCreated') : t('toast.itemCreated'));
      }
      
      setTimeout(() => {
        router.back();
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error details:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || t('toast.failedToSave');
      error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  const handleTagToggle = (tagId: number) => {
    const currentTags = formData.tags as number[];
    if (currentTags.includes(tagId)) {
      setFormData({...formData, tags: currentTags.filter(t => t !== tagId)});
    } else {
      setFormData({...formData, tags: [...currentTags, tagId]});
    }
  };

  const getRedirectPath = () => {
    if (clubId) return `/admin/club/inventory`;
    if (user?.role === 'CLUB_ADMIN') return '/admin/club/inventory';
    if (user?.role === 'MUNICIPALITY_ADMIN') return '/admin/municipality/inventory';
    return '/admin/super/inventory';
  };

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

  const textareaClasses = (field: string) => `
    w-full px-4 py-3 rounded-xl resize-none
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
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={getRedirectPath()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? t('pageTitle.edit') : t('pageTitle.create')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? t('pageDescription.edit') : t('pageDescription.create')}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
          <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('progress.readyToSave')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress */}
        {isMounted && createPortal(
          <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>,
          document.body
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('basicInformation.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('basicInformation.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Title */}
              <div>
                <label className={labelClasses}>{t('basicInformation.itemTitle')} <span className="text-[var(--brand-red)]">*</span></label>
                <input 
                  type="text"
                  name="title"
                  placeholder={t('basicInformation.titlePlaceholder')}
                  className={`${inputClasses('title')} ${touchedFields['title'] && validationErrors['title'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                  value={formData.title}
                  onChange={e => {
                    setFormData({...formData, title: e.target.value});
                    if (validationErrors['title']) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors['title'];
                        return newErrors;
                      });
                    }
                  }}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => {
                    setFocusedField(null);
                    handleBlur('title');
                  }}
                />
                {touchedFields['title'] && validationErrors['title'] && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['title']}</p>
                )}
              </div>

              {/* Batch Create - Only for new items */}
              {!initialData && (
                <div className="bg-[var(--brand-purple)]/10 rounded-xl p-4 border border-[var(--brand-purple)]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-4 h-4 text-[var(--brand-purple)]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-[var(--brand-light)] mb-1">{t('basicInformation.batchCreate')}</label>
                      <p className="text-xs text-[var(--brand-light)]/50 mb-3">{t('basicInformation.batchCreateDescription')}</p>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                        className="w-24 h-10 px-3 rounded-lg bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Category & Club Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>{t('basicInformation.category')} <span className="text-[var(--brand-red)]">*</span></label>
                  <select
                    name="category"
                    className={`${selectClasses('category')} ${touchedFields['category'] && validationErrors['category'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    style={selectArrowStyle}
                    value={formData.category}
                    onChange={e => {
                      setFormData({...formData, category: e.target.value});
                      if (validationErrors['category']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['category'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('category')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('category');
                    }}
                  >
                    <option value="">{t('basicInformation.selectCategory')}</option>
                    {(Array.isArray(categories) ? categories : []).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                  {touchedFields['category'] && validationErrors['category'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['category']}</p>
                  )}
                </div>

                {((user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN') && !clubId) && (
                  <div>
                    <label className={labelClasses}>{t('basicInformation.assignToClub')} <span className="text-[var(--brand-red)]">*</span></label>
                    <select
                      name="club"
                      className={`${selectClasses('club')} ${touchedFields['club'] && validationErrors['club'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
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
                      <option value="">{t('basicInformation.selectClub')}</option>
                      {(Array.isArray(clubs) ? clubs : []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {touchedFields['club'] && validationErrors['club'] && (
                      <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['club']}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={labelClasses}>{t('basicInformation.itemDescription')} <span className="text-[var(--brand-red)]">*</span></label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder={t('basicInformation.descriptionPlaceholder')}
                  className={`${textareaClasses('description')} ${touchedFields['description'] && validationErrors['description'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
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
                />
                {touchedFields['description'] && validationErrors['description'] && (
                  <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['description']}</p>
                )}
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('basicInformation.descriptionHint')}</p>
              </div>
            </div>
          </div>

          {/* Item Image Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('itemImage.title')} <span className="text-[var(--brand-red)]">*</span></h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('itemImage.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div 
                  id="image"
                  className={`relative group w-full sm:w-48 h-32 border-2 border-dashed ${touchedFields['image'] && validationErrors['image'] ? 'border-[var(--brand-red)]' : 'border-[var(--dark-500)]'} rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0`}
                  onClick={() => {
                    setTouchedFields(prev => ({ ...prev, image: true }));
                    imageRef.current?.click();
                  }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Item preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Image className="h-8 w-8 text-[var(--brand-light)]/30 mx-auto mb-2" />
                      <span className="text-sm text-[var(--brand-light)]/40">{t('itemImage.clickToUpload')}</span>
                      <p className="text-xs text-[var(--brand-light)]/30 mt-1">{t('itemImage.imageSize')}</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => imageRef.current?.click()} className="px-4 py-2.5 bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium rounded-xl hover:bg-[var(--dark-500)] transition-all">
                      {t('itemImage.chooseFile')}
                    </button>
                    {imagePreview && (
                      <button type="button" onClick={handleRemoveImage} className="px-4 py-2.5 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-sm font-medium rounded-xl hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-2">
                        <X className="h-4 w-4" /> {t('itemImage.remove')}
                      </button>
                    )}
                  </div>
                  <div className="bg-[var(--dark-700)] rounded-xl p-3 border border-[var(--dark-500)]">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--brand-light)]/50">{t('itemImage.imageHint')}</p>
                    </div>
                  </div>
                  {touchedFields['image'] && validationErrors['image'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['image']}</p>
                  )}
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('settings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('settings.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Max Borrow Duration */}
                <div>
                  <label className={labelClasses}>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--brand-light)]/50" />
                      {t('settings.maxBorrowTime')}
                    </span>
                  </label>
                  <input
                    type="number"
                    value={formData.max_borrow_duration}
                    onChange={e => setFormData({...formData, max_borrow_duration: parseInt(e.target.value) || 60})}
                    className={inputClasses('max_borrow_duration')}
                    onFocus={() => setFocusedField('max_borrow_duration')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('settings.maxBorrowTimeHint')}</p>
                </div>

                {/* Status */}
                <div>
                  <label className={labelClasses}>{t('settings.status')} <span className="text-[var(--brand-red)]">*</span></label>
                  <select
                    name="status"
                    className={`${selectClasses('status')} ${touchedFields['status'] && validationErrors['status'] ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)]' : ''}`}
                    style={selectArrowStyle}
                    value={formData.status}
                    onChange={e => {
                      setFormData({...formData, status: e.target.value});
                      if (validationErrors['status']) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors['status'];
                          return newErrors;
                        });
                      }
                    }}
                    onFocus={() => setFocusedField('status')}
                    onBlur={() => {
                      setFocusedField(null);
                      handleBlur('status');
                    }}
                  >
                    <option value="AVAILABLE">{tFilters('available')}</option>
                    <option value="BORROWED">{tFilters('borrowed')}</option>
                    <option value="MAINTENANCE">{tFilters('maintenance')}</option>
                    <option value="MISSING">{tFilters('missing')}</option>
                    <option value="HIDDEN">{tFilters('hidden')}</option>
                  </select>
                  {touchedFields['status'] && validationErrors['status'] && (
                    <p className="text-[var(--brand-red)] text-sm mt-1">{validationErrors['status']}</p>
                  )}
                </div>
              </div>

              {/* Internal Note */}
              <div>
                <label className={labelClasses}>{t('settings.internalNote')}</label>
                <input
                  type="text"
                  placeholder={t('settings.internalNotePlaceholder')}
                  className={inputClasses('internal_note')}
                  value={formData.internal_note}
                  onChange={e => setFormData({...formData, internal_note: e.target.value})}
                  onFocus={() => setFocusedField('internal_note')}
                  onBlur={() => setFocusedField(null)}
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('settings.internalNoteHint')}</p>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <TagIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('tags.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('tags.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {tags.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(tags) ? tags : []).map(tag => {
                      const isSelected = (formData.tags as number[]).includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            isSelected
                              ? 'bg-[var(--brand-purple)]/20 border-[var(--brand-purple)] text-[var(--brand-purple)]'
                              : 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:border-[var(--brand-purple)]/50 hover:text-[var(--brand-light)]'
                          }`}
                        >
                          {tag.icon} {tag.name}
                        </button>
                      );
                    })}
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--dark-600)]">
                      <span className="text-sm text-[var(--brand-light)]/50">{t('tags.selected')}</span>
                      <div className="flex flex-wrap gap-2">
                        {(formData.tags as number[]).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <span key={tagId} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                              {tag.icon} {tag.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-3">
                    <TagIcon className="w-6 h-6 text-[var(--brand-light)]/30" />
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('tags.noTagsAvailable')}</p>
                  <p className="text-xs text-[var(--brand-light)]/30 mt-1">{t('tags.createTagsMessage')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tips Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 flex items-center justify-center border border-[var(--brand-primary)]/30">
                  <Lightbulb className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('quickTips.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('quickTips.description')}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--brand-light)]/70">{t('quickTips.tip1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--brand-light)]/70">{t('quickTips.tip2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--brand-light)]/70">{t('quickTips.tip3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--brand-light)]/70">{t('quickTips.tip4')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('actions.saving') : (initialData ? t('actions.updateItem') : t('actions.createItem'))}
            </button>
          </div>

          {/* Toast Notification */}
        </form>
      </div>
    </div>
  );
}

