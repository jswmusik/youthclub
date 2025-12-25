'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Upload, X, Search, User, Mail, Phone, 
  CheckCircle2, Lightbulb, Save, Users, Shield, Calendar,
  Heart, Building, Lock, UserCheck
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';

interface Option { id: number; name: string; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }

interface YouthFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function YouthForm({ initialData, redirectPath, scope }: YouthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
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

  // Main Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    preferred_gender: initialData?.preferred_gender || '',
    phone_number: initialData?.phone_number || '',
    date_of_birth: initialData?.date_of_birth || '',
    grade: initialData?.grade || '',
    preferred_club: initialData?.preferred_club ? (typeof initialData.preferred_club === 'object' ? initialData.preferred_club.id : initialData.preferred_club) : '',
    verification_status: initialData?.verification_status || 'UNVERIFIED',
    interests: initialData?.interests ? initialData.interests.map((i: any) => typeof i === 'object' ? i.id : i) : [],
    guardians: initialData?.guardians ? initialData.guardians.map((g: any) => typeof g === 'object' ? g.id : g) : [],
  });

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
      setInterestsList(Array.isArray(intRes.data) ? intRes.data : intRes.data.results || []);
      setGuardiansList(guardRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [
      formData.first_name,
      formData.last_name,
      formData.email,
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
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return { 
        ...prev, 
        interests: exists ? prev.interests.filter((i: number) => i !== id) : [...prev.interests, id] 
      };
    });
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((i: number) => i !== id)
    }));
  };

  const getSelectedInterests = () => formData.interests.map((id: number) => interestsList.find(i => i.id === id)).filter(Boolean) as Option[];
  
  const filteredInterests = interestsList.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
  );

  // Guardian Logic
  const toggleGuardian = (id: number) => {
    setFormData(prev => {
      const exists = prev.guardians.includes(id);
      return { 
        ...prev, 
        guardians: exists ? prev.guardians.filter((g: number) => g !== id) : [...prev.guardians, id] 
      };
    });
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
  };

  const removeGuardian = (id: number) => {
    setFormData(prev => ({
      ...prev,
      guardians: prev.guardians.filter((g: number) => g !== id)
    }));
  };

  const getSelectedGuardians = () => formData.guardians.map((id: number) => guardiansList.find(g => g.id === id)).filter(Boolean) as GuardianOption[];

  const filteredGuardians = guardiansList.filter(g => {
    const term = guardianSearchTerm.toLowerCase();
    const match = g.email.toLowerCase().includes(term) || g.first_name.toLowerCase().includes(term) || g.last_name.toLowerCase().includes(term);
    return match && !formData.guardians.includes(g.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'interests' || key === 'guardians') return;
        data.append(key, value.toString());
      });

      formData.interests.forEach((id: number) => data.append('interests', id.toString()));
      formData.guardians.forEach((id: number) => data.append('guardians', id.toString()));
      
      data.append('role', 'YOUTH_MEMBER');
      
      if (avatarFile) data.append('avatar', avatarFile);
      if (bgFile) data.append('background_image', bgFile);
      if (mood !== undefined) data.append('mood_status', mood);

      if (scope === 'CLUB' && currentUser?.assigned_club && !formData.preferred_club) {
        const clubId = typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club;
        data.append('preferred_club', clubId.toString());
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        setToast({ message: 'Youth member updated!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        setToast({ message: 'Youth member created!', type: 'success', isVisible: true });
      }

      if (Object.keys(customFieldValues).length > 0) {
        await api.post('/custom-fields/save_values_for_user/', {
          user_id: userId,
          values: customFieldValues
        });
      }

      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed.', type: 'error', isVisible: true });
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
              {initialData ? 'Edit Youth Member' : 'Create New Youth Member'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update youth member information' : 'Configure profile, demographics, and relationships'}
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
          
          {/* Profile Visuals Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Profile Visuals</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Upload profile images and set mood status</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Avatar */}
                <div>
                  <label className={labelClasses}>Avatar</label>
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
                          Choose File
                        </button>
                        {avatarPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('avatar')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">Square image, 400x400px</p>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className={labelClasses}>Cover Image</label>
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
                          Choose File
                        </button>
                        {bgPreview && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveImage('bg')}
                            className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40">1200x400px (JPG, PNG)</p>
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
                  Mood Status
                </label>
                <input 
                  id="mood"
                  type="text"
                  placeholder="e.g. Playing FIFA..."
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Identity</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Basic personal information and account details</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="first_name" className={labelClasses}>
                    First Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="first_name"
                    type="text"
                    required
                    placeholder="John"
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    onFocus={() => setFocusedField('first_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('first_name')}
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className={labelClasses}>
                    Last Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="last_name"
                    type="text"
                    required
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    onFocus={() => setFocusedField('last_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('last_name')}
                  />
                </div>
                <div>
                  <label htmlFor="nickname" className={labelClasses}>
                    Nickname
                  </label>
                  <input 
                    id="nickname"
                    type="text"
                    placeholder="JD"
                    value={formData.nickname}
                    onChange={e => setFormData({...formData, nickname: e.target.value})}
                    onFocus={() => setFocusedField('nickname')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('nickname')}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    Email <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="email"
                    type="email"
                    required
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('email')}
                  />
                </div>
                <div>
                  <label htmlFor="password" className={labelClasses}>
                    <Lock className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                    {initialData ? 'New Password (Optional)' : 'Password'} {!initialData && <span className="text-[var(--brand-primary)]">*</span>}
                  </label>
                  <input 
                    id="password"
                    type="password"
                    required={!initialData}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('password')}
                  />
                </div>
                <div>
                  <label htmlFor="phone_number" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    Phone
                  </label>
                  <input 
                    id="phone_number"
                    type="tel"
                    placeholder="+46..."
                    value={formData.phone_number}
                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                    onFocus={() => setFocusedField('phone_number')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('phone_number')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Verification Status</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Set the verification status for this youth member</p>
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
                      onClick={() => setFormData({...formData, verification_status: status})}
                      className={`px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                        isSelected 
                          ? colors[status as keyof typeof colors]
                          : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:border-[var(--brand-primary)]/50'
                      }`}
                    >
                      {status}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Demographics</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Demographic information for the youth member</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="date_of_birth" className={labelClasses}>
                    Date of Birth
                  </label>
                  <input 
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                    onFocus={() => setFocusedField('date_of_birth')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('date_of_birth')}
                  />
                </div>
                <div>
                  <label htmlFor="grade" className={labelClasses}>
                    Grade
                  </label>
                  <input 
                    id="grade"
                    type="number"
                    placeholder="e.g. 7"
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value})}
                    onFocus={() => setFocusedField('grade')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('grade')}
                  />
                </div>
                <div>
                  <label htmlFor="legal_gender" className={labelClasses}>
                    Legal Gender
                  </label>
                  <select 
                    id="legal_gender"
                    value={formData.legal_gender}
                    onChange={e => setFormData({...formData, legal_gender: e.target.value})}
                    onFocus={() => setFocusedField('legal_gender')}
                    onBlur={() => setFocusedField(null)}
                    className={selectClasses('legal_gender')}
                    style={selectArrowStyle}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="preferred_gender" className={labelClasses}>
                    Preferred Gender
                  </label>
                  <input 
                    id="preferred_gender"
                    type="text"
                    placeholder="Optional"
                    value={formData.preferred_gender}
                    onChange={e => setFormData({...formData, preferred_gender: e.target.value})}
                    onFocus={() => setFocusedField('preferred_gender')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('preferred_gender')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Club, Guardians & Interests Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Club, Guardians & Interests</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Assign club, guardians, and interests</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Preferred Club */}
              <div>
                <label htmlFor="preferred_club" className={labelClasses}>
                  <Building className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-purple)]" />
                  Preferred Club
                </label>
                <select 
                  id="preferred_club"
                  value={formData.preferred_club}
                  onChange={e => setFormData({...formData, preferred_club: e.target.value})}
                  onFocus={() => setFocusedField('preferred_club')}
                  onBlur={() => setFocusedField(null)}
                  className={selectClasses('preferred_club')}
                  style={selectArrowStyle}
                >
                  <option value="">Select Club...</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Guardians */}
              <div>
                <label className={labelClasses}>
                  <UserCheck className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                  Assign Guardians
                </label>
                
                {/* Selected Guardians Display */}
                {formData.guardians.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] mb-3">
                    {getSelectedGuardians().map(g => (
                      <span key={g.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium">
                        {g.first_name} {g.last_name}
                        <button
                          type="button"
                          onClick={() => removeGuardian(g.id)}
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
                      placeholder="Search guardians by name or email..."
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
                            No guardians found matching "{guardianSearchTerm}"
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[var(--brand-light)]/50 text-center">
                            {formData.guardians.length === 0 
                              ? 'No guardians available. Create a guardian first.'
                              : 'All guardians are already selected.'}
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
                  Interests
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
                              onClick={() => toggleInterest(interest.id)}
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
                            {formData.interests.length === 0 
                              ? 'No interests available. Create interests first.'
                              : 'All interests are already selected.'}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Custom Fields</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Additional custom field values</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <CustomFieldsForm
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
                  <h3 className="text-sm font-semibold text-[var(--brand-light)] mb-2">Quick Tips</h3>
                  <ul className="text-sm text-[var(--brand-light)]/60 space-y-1.5">
                    <li>• Fill in all required fields marked with <span className="text-[var(--brand-primary)]">*</span></li>
                    <li>• Assign guardians to enable parental oversight</li>
                    <li>• Select interests to help match activities</li>
                    <li>• Set verification status based on identity confirmation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pb-10 px-4 sm:px-0">
            <button 
              type="button" 
              onClick={() => router.push(redirectPath)}
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
                  {initialData ? 'Update Youth' : 'Create Youth'}
                </>
              )}
            </button>
          </div>
        </form>

        <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
      </div>
    </div>
  );
}
