'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Upload, X, Search, CheckCircle2, Lightbulb, Save,
  Gift, Target, Users, Calendar, Zap, Image, Link2, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../utils';

interface Option { id: number; name: string; }

interface RewardFormProps {
  initialData?: any;
  redirectPath: string;
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1);
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const TRIGGERS = [
  { value: 'BIRTHDAY', label: 'On Birthday', icon: '🎂', desc: 'Given automatically on member\'s birthday' },
  { value: 'WELCOME', label: 'On Signup', icon: '👋', desc: 'Given immediately after registration' },
  { value: 'VERIFIED', label: 'On Verification', icon: '✅', desc: 'Given when account is verified' },
  { value: 'MOST_ACTIVE', label: 'Most Active', icon: '🔥', desc: 'Awarded to users with most logins' },
];

export default function RewardForm({ initialData, redirectPath }: RewardFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Dropdown Data
  const [groups, setGroups] = useState<Option[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Search states
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sponsor_name: '',
    sponsor_link: '',
    
    // Targeting
    target_groups: [] as number[],
    target_interests: [] as number[],
    target_genders: [] as string[],
    target_grades: [] as number[],
    min_age: '',
    max_age: '',
    target_member_type: 'YOUTH_MEMBER',

    // Constraints
    expiration_date: '',
    usage_limit: '',

    // Triggers
    active_triggers: [] as string[],
    trigger_config: {} as any,
    
    is_active: true
  });

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    fetchDropdowns();
    if (initialData) {
      loadInitialData();
    }
  }, [initialData]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchDropdowns = async () => {
    try {
      const [grpRes, intRes] = await Promise.all([
        api.get('/groups/'),
        api.get('/interests/')
      ]);
      setGroups(Array.isArray(grpRes.data) ? grpRes.data : grpRes.data.results || []);
      setInterests(Array.isArray(intRes.data) ? intRes.data : intRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialData = () => {
    setFormData({
      name: initialData.name || '',
      description: initialData.description || '',
      sponsor_name: initialData.sponsor_name || '',
      sponsor_link: initialData.sponsor_link || '',
      target_groups: initialData.target_groups || [],
      target_interests: initialData.target_interests || [],
      target_genders: initialData.target_genders || [],
      target_grades: initialData.target_grades || [],
      min_age: initialData.min_age || '',
      max_age: initialData.max_age || '',
      target_member_type: initialData.target_member_type || 'YOUTH_MEMBER',
      expiration_date: initialData.expiration_date || '',
      usage_limit: initialData.usage_limit || '',
      active_triggers: initialData.active_triggers || [],
      trigger_config: initialData.trigger_config || {},
      is_active: initialData.is_active ?? true,
    });
    if (initialData.image) {
      setImagePreview(getMediaUrl(initialData.image));
    }
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [formData.name, formData.description];
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

  // --- Helpers ---

  const handleArrayToggle = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const currentList = prev[field] as any[];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...currentList, value] };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const toggleGroup = (id: number) => {
    setFormData(prev => {
      const exists = prev.target_groups.includes(id);
      return { 
        ...prev, 
        target_groups: exists ? prev.target_groups.filter(i => i !== id) : [...prev.target_groups, id] 
      };
    });
  };

  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.target_interests.includes(id);
      return { 
        ...prev, 
        target_interests: exists ? prev.target_interests.filter(i => i !== id) : [...prev.target_interests, id] 
      };
    });
  };

  const getSelectedGroups = () => formData.target_groups.map(id => groups.find(g => g.id === id)).filter(Boolean) as Option[];
  const getSelectedInterests = () => formData.target_interests.map(id => interests.find(i => i.id === id)).filter(Boolean) as Option[];
  
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) && !formData.target_groups.includes(g.id)
  );
  const filteredInterests = interests.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.target_interests.includes(i.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'target_groups' || key === 'target_interests' || key === 'target_genders' || key === 'target_grades' || key === 'active_triggers') return;
      if (key === 'trigger_config') {
        data.append(key, JSON.stringify(value));
        return;
      }
      if (key === 'is_active') {
        data.append(key, value ? 'true' : 'false');
        return;
      }
      if (value === null || value === '') {
        return;
      }
      data.append(key, value.toString());
    });

    formData.target_groups.forEach(id => data.append('target_groups', id.toString()));
    formData.target_interests.forEach(id => data.append('target_interests', id.toString()));
    
    data.append('target_genders', JSON.stringify(formData.target_genders || []));
    data.append('target_grades', JSON.stringify(formData.target_grades || []));
    data.append('active_triggers', JSON.stringify(formData.active_triggers || []));

    if (imageFile) data.append('image', imageFile);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (initialData) {
        await api.patch(`/rewards/${initialData.id}/`, data, config);
        setToast({ message: 'Reward updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/rewards/', data, config);
        setToast({ message: 'Reward created!', type: 'success', isVisible: true });
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
      console.error('Reward save error:', err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : null) ||
                          err?.message || 
                          'Operation failed.';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
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
              {initialData ? 'Edit Reward' : 'Create New Reward'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              Define rewards that can be targeted or triggered automatically
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
          
          {/* Reward Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Reward Details</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Enter the basic information about this reward</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    Reward Title <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Free Coffee"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('name')}
                  />
                </div>
                <div>
                  <label htmlFor="sponsor_name" className={labelClasses}>
                    Sponsor Name
                  </label>
                  <input 
                    id="sponsor_name"
                    type="text"
                    placeholder="e.g. Local Cafe"
                    value={formData.sponsor_name}
                    onChange={e => setFormData({...formData, sponsor_name: e.target.value})}
                    onFocus={() => setFocusedField('sponsor_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('sponsor_name')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sponsor_link" className={labelClasses}>
                  <Link2 className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                  Sponsor Link (Optional)
                </label>
                <input 
                  id="sponsor_link"
                  type="url"
                  placeholder="https://..."
                  value={formData.sponsor_link}
                  onChange={e => setFormData({...formData, sponsor_link: e.target.value})}
                  onFocus={() => setFocusedField('sponsor_link')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('sponsor_link')}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClasses}>
                  Description & Redemption Instructions <span className="text-[var(--brand-primary)]">*</span>
                </label>
                <textarea 
                  id="description"
                  rows={4}
                  required
                  placeholder="Explain what the reward is and how to use it..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('description')} h-auto min-h-[100px] py-3`}
                />
              </div>
            </div>
          </div>

          {/* Reward Image Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Reward Image</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Upload an image for this reward</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div 
                  className="relative group w-24 h-24 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                  onClick={() => imageRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Reward preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Gift className="h-8 w-8 text-[var(--brand-light)]/40 mx-auto mb-1" />
                      <span className="text-[10px] text-[var(--brand-light)]/40">Upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => imageRef.current?.click()}
                      className="px-3 py-2 bg-[var(--dark-600)] text-[var(--brand-light)] text-xs font-medium rounded-lg hover:bg-[var(--dark-500)] transition-all"
                    >
                      Choose File
                    </button>
                    {imagePreview && (
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40">Recommended: Square image, 400x400px</p>
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>

          {/* Target Audience Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Who Gets This Reward?</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Define the target audience for this reward</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Target Audience Type */}
              <div>
                <label className={labelClasses}>Target Audience</label>
                <div className="flex gap-3">
                  {[
                    { value: 'YOUTH_MEMBER', label: 'Youth Members', icon: Users },
                    { value: 'GUARDIAN', label: 'Guardians', icon: Users },
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

              {/* Target Groups */}
              <div>
                <label className={labelClasses}>
                  <Users className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                  Target Groups (Optional)
                </label>
                
                {/* Selected Groups Display */}
                {formData.target_groups.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedGroups().map(group => (
                      <span key={group.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-blue)] text-white text-sm font-medium">
                        {group.name}
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
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
                      placeholder="Search groups by name..."
                      value={groupSearchTerm}
                      onChange={(e) => {
                        setGroupSearchTerm(e.target.value);
                        setShowGroupDropdown(true);
                      }}
                      onFocus={() => setShowGroupDropdown(true)}
                      className={`${inputClasses('group_search')} pl-10`}
                    />
                  </div>

                  {showGroupDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowGroupDropdown(false)}
                      ></div>
                      <div className="absolute z-20 w-full mt-2 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredGroups.length > 0 ? (
                          filteredGroups.map(group => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                toggleGroup(group.id);
                                setGroupSearchTerm('');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                            >
                              <div className="font-medium text-[var(--brand-light)]">{group.name}</div>
                            </button>
                          ))
                        ) : groupSearchTerm ? (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            No groups found matching "{groupSearchTerm}"
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.target_groups.length === 0 
                              ? 'No groups available'
                              : 'All groups are already selected'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Target Interests */}
              <div>
                <label className={labelClasses}>
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                  Target Interests (Optional)
                </label>
                
                {/* Selected Interests Display */}
                {formData.target_interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedInterests().map(interest => (
                      <span key={interest.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-purple)] text-white text-sm font-medium">
                        {interest.name}
                        <button
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
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
                      placeholder="Search interests by name..."
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
                              onClick={() => {
                                toggleInterest(interest.id);
                                setInterestSearchTerm('');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                            >
                              <div className="font-medium text-[var(--brand-light)]">{interest.name}</div>
                            </button>
                          ))
                        ) : interestSearchTerm ? (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            No interests found matching "{interestSearchTerm}"
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.target_interests.length === 0 
                              ? 'No interests available'
                              : 'All interests are already selected'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Demographics (Only for Youth) */}
              {formData.target_member_type === 'YOUTH_MEMBER' && (
                <>
                  {/* Divider */}
                  <div className="h-px bg-[var(--dark-600)]" />

                  {/* Age Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="min_age" className={labelClasses}>
                        Min Age
                      </label>
                      <input 
                        id="min_age"
                        type="number" 
                        min="0" 
                        max="100"
                        placeholder="Any"
                        value={formData.min_age}
                        onChange={e => setFormData({...formData, min_age: e.target.value})}
                        onFocus={() => setFocusedField('min_age')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('min_age')}
                      />
                    </div>
                    <div>
                      <label htmlFor="max_age" className={labelClasses}>
                        Max Age
                      </label>
                      <input 
                        id="max_age"
                        type="number" 
                        min="0" 
                        max="100"
                        placeholder="Any"
                        value={formData.max_age}
                        onChange={e => setFormData({...formData, max_age: e.target.value})}
                        onFocus={() => setFocusedField('max_age')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('max_age')}
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[var(--dark-600)]" />

                  {/* Gender */}
                  <div>
                    <label className={labelClasses}>Gender</label>
                    <div className="flex flex-wrap gap-3">
                      {GENDERS.map(g => {
                        const isSelected = formData.target_genders.includes(g.value);
                        return (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => handleArrayToggle('target_genders', g.value)}
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
                    {formData.target_genders.length === 0 && (
                      <p className="text-xs text-[var(--brand-light)]/40 mt-2">Leave empty to allow all genders</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[var(--dark-600)]" />

                  {/* Grades */}
                  <div>
                    <label className={labelClasses}>Grades</label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map(grade => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => handleArrayToggle('target_grades', grade)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                            formData.target_grades.includes(grade) 
                              ? 'bg-[var(--brand-primary)] text-white shadow-lg' 
                              : 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                    {formData.target_grades.length === 0 && (
                      <p className="text-xs text-[var(--brand-light)]/40 mt-2">Leave empty to allow all grades</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Limits & Expiration Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Limits & Expiration</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Set expiration date and usage limits</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="expiration_date" className={labelClasses}>
                    Expiration Date
                  </label>
                  <input 
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={e => setFormData({...formData, expiration_date: e.target.value})}
                    onFocus={() => setFocusedField('expiration_date')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('expiration_date')}
                  />
                </div>
                <div>
                  <label htmlFor="usage_limit" className={labelClasses}>
                    Total Usage Limit
                  </label>
                  <input 
                    id="usage_limit"
                    type="number"
                    min="0"
                    placeholder="Leave empty for unlimited"
                    value={formData.usage_limit}
                    onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                    onFocus={() => setFocusedField('usage_limit')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('usage_limit')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Triggers Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Automatic Triggers</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Select when this reward should be automatically given</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TRIGGERS.map(t => {
                  const isSelected = formData.active_triggers.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        const current = [...formData.active_triggers];
                        if (current.includes(t.value)) {
                          setFormData({...formData, active_triggers: current.filter(x => x !== t.value)});
                        } else {
                          setFormData({...formData, active_triggers: [...current, t.value]});
                        }
                      }}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                          : 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--brand-primary)]/50'
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <div className="flex-1">
                        <div className={`font-semibold ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                          {t.label}
                        </div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-[var(--brand-light)]/60' : 'text-[var(--brand-light)]/40'}`}>
                          {t.desc}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                          : 'border-[var(--dark-400)]'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  formData.is_active 
                    ? 'bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)]'
                    : 'bg-[var(--dark-600)]'
                }`}>
                  <CheckCircle2 className={`w-5 h-5 ${formData.is_active ? 'text-[var(--dark-900)]' : 'text-[var(--brand-light)]/40'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Status</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Set whether this reward is active or inactive</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-3">
                {[
                  { value: true, label: 'Active', desc: 'Reward is available' },
                  { value: false, label: 'Inactive', desc: 'Reward is hidden' },
                ].map(status => {
                  const isSelected = formData.is_active === status.value;
                  return (
                    <button
                      key={String(status.value)}
                      type="button"
                      onClick={() => setFormData({...formData, is_active: status.value})}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        isSelected 
                          ? status.value 
                            ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/20 text-[var(--brand-green)]'
                            : 'border-[var(--brand-light)]/30 bg-[var(--dark-600)] text-[var(--brand-light)]/70'
                          : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                      }`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
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
                  <h3 className="text-sm font-semibold text-[var(--brand-light)] mb-2">Quick Tips</h3>
                  <ul className="text-sm text-[var(--brand-light)]/60 space-y-1.5">
                    <li>• Fill in all required fields marked with <span className="text-[var(--brand-primary)]">*</span></li>
                    <li>• Rewards can be targeted to specific groups or demographics</li>
                    <li>• Use triggers to automatically award rewards on special occasions</li>
                    <li>• Leave targeting fields empty to make reward available to everyone</li>
                    <li>• Set usage limits to control how many times a reward can be claimed</li>
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
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {initialData ? 'Update Reward' : 'Create Reward'}
                </>
              )}
            </button>
          </div>
        </form>

        <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
      </div>
    </div>
  );
}
