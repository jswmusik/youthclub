'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Upload, X, Search, User, Mail, Phone, 
  CheckCircle2, Lightbulb, Save, Users, Shield, Lock
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';
import { fetchGuardianRelationships, verifyGuardianRelationship, rejectGuardianRelationship, resetGuardianRelationship } from '../../lib/api';
import ConfirmationModal from './ConfirmationModal';

interface YouthOption { id: number; first_name: string; last_name: string; email: string; grade?: number; }

interface GuardianFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function GuardianForm({ initialData, redirectPath, scope }: GuardianFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Dropdown Data
  const [youthList, setYouthList] = useState<YouthOption[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);

  // Search States
  const [youthSearchTerm, setYouthSearchTerm] = useState('');
  const [showYouthDropdown, setShowYouthDropdown] = useState(false);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);

  // Main Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone_number: initialData?.phone_number || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    verification_status: initialData?.verification_status || 'UNVERIFIED',
    youth_members: initialData?.youth_members 
      ? initialData.youth_members.map((item: any) => typeof item === 'object' && item !== null ? item.id : item).filter((id: any) => id != null)
      : [], 
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
      
      if (initialData.id) {
        fetchGuardianRelationships({ guardian_id: initialData.id })
          .then(res => {
            const relData = res.data.results || res.data || [];
            const uniqueRelationships = Array.isArray(relData) 
              ? relData.filter((rel: any, index: number, self: any[]) => 
                  index === self.findIndex((r: any) => r.id === rel.id)
                )
              : [];
            setRelationships(uniqueRelationships);
          })
          .catch(err => console.error('Error fetching relationships:', err));
      }
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      const res = await api.get('/users/list_youth/');
      setYouthList(Array.isArray(res.data) ? res.data : []);
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

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarRef.current) avatarRef.current.value = '';
  };

  // Youth Link Logic
  const toggleYouth = (id: number) => {
    setFormData(prev => {
      const exists = prev.youth_members.includes(id);
      if (exists) return { ...prev, youth_members: prev.youth_members.filter((i: number) => i !== id) };
      return { ...prev, youth_members: [...prev.youth_members, id] };
    });
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
  };

  const removeYouth = (id: number) => {
    setFormData(prev => ({
      ...prev,
      youth_members: prev.youth_members.filter((i: number) => i !== id)
    }));
  };

  const getSelectedYouth = () => {
    return formData.youth_members.map((id: number) => youthList.find(y => y.id === id)).filter(Boolean) as YouthOption[];
  };

  const filteredYouth = youthList.filter(y => {
    const searchLower = youthSearchTerm.toLowerCase();
    const fullName = `${y.first_name} ${y.last_name}`.toLowerCase();
    const email = y.email.toLowerCase();
    return (fullName.includes(searchLower) || email.includes(searchLower)) && 
           !formData.youth_members.includes(y.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      const guardianExcludedFields = ['grade', 'preferred_club', 'interests', 'assigned_club', 'assigned_municipality'];
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'youth_members') return;
        if (guardianExcludedFields.includes(key)) return;
        
        if (value === null || value === undefined || value === '') {
          if (key === 'phone_number') {
            data.append(key, '');
          }
          return;
        }
        
        data.append(key, value.toString());
      });

      if (formData.youth_members && formData.youth_members.length > 0) {
        formData.youth_members.forEach((item: any) => {
          const id = typeof item === 'object' && item !== null ? item.id : item;
          if (id && !isNaN(Number(id))) {
            data.append('youth_members', id.toString());
          }
        });
      }
      
      data.append('role', 'GUARDIAN');
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        setToast({ message: 'Guardian updated!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        setToast({ message: 'Guardian created!', type: 'success', isVisible: true });
      }

      if (Object.keys(customFieldValues).length > 0) {
        try {
          await api.post('/custom-fields/save_values_for_user/', {
            user_id: userId,
            values: customFieldValues,
          });
        } catch (err) {
          console.error('Failed to save custom field values:', err);
        }
      }

      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Operation failed. Please try again.';
      if (err.response?.data) {
        if (err.response.data.detail) {
          errorMsg = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          const errorKeys = Object.keys(err.response.data);
          if (errorKeys.length > 0) {
            const firstError = err.response.data[errorKeys[0]];
            if (Array.isArray(firstError)) {
              errorMsg = `${errorKeys[0]}: ${firstError[0]}`;
            }
          }
        }
      }
      setToast({ message: errorMsg, type: 'error', isVisible: true });
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
              {initialData ? 'Edit Guardian' : 'Create New Guardian'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update guardian information' : 'Configure profile and linked youth members'}
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
                  <p className="text-sm text-[var(--brand-light)]/50">Upload profile avatar image</p>
                </div>
              </div>
            </div>

            <div className="p-6">
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
                      className="px-4 py-2 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium hover:bg-[var(--dark-500)] transition-colors"
                    >
                      Choose File
                    </button>
                    {avatarPreview && (
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="px-4 py-2 rounded-lg bg-[var(--brand-red)]/10 text-[var(--brand-red)] text-sm font-medium hover:bg-[var(--brand-red)]/20 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40">Recommended: Square image, 400x400px</p>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
                  <p className="text-sm text-[var(--brand-light)]/50">Enter basic personal information</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>First Name <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    onFocus={() => setFocusedField('first_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('first_name')}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Last Name <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    onFocus={() => setFocusedField('last_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('last_name')}
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Email <span className="text-[var(--brand-red)]">*</span></label>
                  <input 
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('email')}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className={labelClasses}>
                    {initialData ? 'New Password (Optional)' : 'Password'} 
                    {!initialData && <span className="text-[var(--brand-red)]">*</span>}
                  </label>
                  <input 
                    type="password"
                    required={!initialData}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('password')}
                    placeholder={initialData ? 'Leave blank to keep current' : 'Enter password'}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Phone Number</label>
                  <input 
                    type="tel"
                    value={formData.phone_number}
                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('phone')}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Legal Gender</label>
                  <select 
                    value={formData.legal_gender}
                    onChange={e => setFormData({...formData, legal_gender: e.target.value})}
                    onFocus={() => setFocusedField('gender')}
                    onBlur={() => setFocusedField(null)}
                    className={selectClasses('gender')}
                    style={selectArrowStyle}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Verification Status</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Set the verification status for this guardian</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'UNVERIFIED', label: 'Unverified', color: 'var(--brand-red)' },
                  { value: 'PENDING', label: 'Pending', color: 'var(--brand-peach)' },
                  { value: 'VERIFIED', label: 'Verified', color: 'var(--brand-green)' }
                ].map(status => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData({...formData, verification_status: status.value})}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.verification_status === status.value
                        ? 'text-[var(--dark-900)]'
                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] border-2 border-[var(--dark-500)]'
                    }`}
                    style={formData.verification_status === status.value ? { backgroundColor: status.color } : {}}
                  >
                    {formData.verification_status === status.value && <CheckCircle2 className="w-4 h-4" />}
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Existing Relationships Card (Edit Mode Only) */}
          {initialData && relationships.length > 0 && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Existing Relationships</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">Manage relationships with youth members</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {relationships
                  .filter((rel: any) => {
                    const relGuardianId = rel.guardian || (typeof rel.guardian === 'object' ? rel.guardian?.id : null);
                    return relGuardianId === initialData.id || rel.guardian_id === initialData.id;
                  })
                  .map((rel: any) => {
                    const youthId = rel.youth || rel.youth_id;
                    const youth = youthList.find((y: any) => y.id === youthId);
                    const youthData = youth || {
                      id: youthId,
                      first_name: rel.youth_first_name || 'Unknown',
                      last_name: rel.youth_last_name || '',
                      email: rel.youth_email || '',
                      grade: rel.youth_grade || undefined,
                    };
                    
                    return (
                      <RelationshipCard
                        key={rel.id}
                        relationship={rel}
                        youth={youthData}
                        onUpdate={() => {
                          fetchGuardianRelationships({ guardian_id: initialData.id })
                            .then(res => {
                              const relData = res.data.results || res.data || [];
                              const uniqueRelationships = Array.isArray(relData) 
                                ? relData.filter((r: any, index: number, self: any[]) => 
                                    index === self.findIndex((rel: any) => rel.id === r.id)
                                  )
                                : [];
                              setRelationships(uniqueRelationships);
                            })
                            .catch(err => console.error('Error refreshing relationships:', err));
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Assign Youth Members Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Assign Youth Members</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Link this guardian to youth members</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Selected Youth Display */}
              {formData.youth_members.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)]">
                  {getSelectedYouth().map(y => (
                    <span 
                      key={y.id} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--brand-purple)] text-white text-sm font-medium"
                    >
                      {y.first_name} {y.last_name} {y.grade && `(Gr ${y.grade})`}
                      <button
                        type="button"
                        onClick={() => removeYouth(y.id)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${y.first_name} ${y.last_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Searchable Dropdown */}
              <div className="relative z-30">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                  <input
                    type="text"
                    placeholder="Search youth members by name or email..."
                    value={youthSearchTerm}
                    onChange={(e) => {
                      setYouthSearchTerm(e.target.value);
                      setShowYouthDropdown(true);
                    }}
                    onFocus={() => setShowYouthDropdown(true)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
                  />
                </div>

                {/* Dropdown List */}
                {showYouthDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowYouthDropdown(false)}
                    />
                    <div className="absolute z-50 w-full mt-2 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {filteredYouth.length > 0 ? (
                        filteredYouth.map(y => (
                          <button
                            key={y.id}
                            type="button"
                            onClick={() => toggleYouth(y.id)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                          >
                            <div className="font-medium text-[var(--brand-light)]">{y.first_name} {y.last_name}</div>
                            <div className="text-xs text-[var(--brand-light)]/50">{y.email} {y.grade && `• Grade ${y.grade}`}</div>
                          </button>
                        ))
                      ) : youthSearchTerm ? (
                        <div className="px-4 py-4 text-sm text-[var(--brand-light)]/50 text-center">
                          No youth members found matching "{youthSearchTerm}"
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-sm text-[var(--brand-light)]/50 text-center">
                          {formData.youth_members.length === 0 
                            ? 'No youth members found. Create a youth member first.'
                            : 'All youth members are already selected.'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Custom Fields Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-third)] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Custom Fields</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Additional custom field values for this guardian</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <CustomFieldsForm
                targetRole="GUARDIAN"
                context="USER_PROFILE"
                values={customFieldValues}
                onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
                userId={initialData ? initialData.id : null}
                userMunicipalityId={scope === 'MUNICIPALITY' && currentUser?.assigned_municipality ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality) : null}
                userClubId={scope === 'CLUB' && currentUser?.assigned_club ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club) : null}
              />
            </div>
          </div>

          {/* Quick Tips Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Quick Tips</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Helpful information for managing guardians</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <ul className="space-y-3 text-sm text-[var(--brand-light)]/70">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-third)] mt-0.5 flex-shrink-0" />
                  <span>Guardians can be linked to multiple youth members</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-third)] mt-0.5 flex-shrink-0" />
                  <span>Verified guardians have full access to their linked youth's information</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[var(--brand-third)] mt-0.5 flex-shrink-0" />
                  <span>Phone numbers help with emergency contact situations</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 pb-8">
            <button 
              type="button"
              onClick={() => router.push(redirectPath)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {initialData ? 'Update Guardian' : 'Create Guardian'}
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

// Relationship Card Component for Edit Form
function RelationshipCard({ relationship, youth, onUpdate }: { relationship: any; youth: YouthOption; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const [showResetModal, setShowResetModal] = useState(false);

  const status = relationship.status || 'PENDING';
  const relationshipType = relationship.relationship_type || 'GUARDIAN';
  const isPrimary = relationship.is_primary_guardian || false;

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship verified successfully!', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to verify relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this relationship?')) return;
    setLoading(true);
    try {
      await rejectGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship rejected.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reject relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    setShowResetModal(false);
    setLoading(true);
    try {
      await resetGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship reset to pending.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reset relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
    }
  };

  return (
    <>
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="font-semibold text-[var(--brand-light)] mb-1">{youth.first_name} {youth.last_name}</p>
            <p className="text-sm text-[var(--brand-light)]/50 mb-3">{youth.email} {youth.grade && `• Grade ${youth.grade}`}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                {relationshipType.toLowerCase()}
              </span>
              {isPrimary && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                  Primary
                </span>
              )}
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t border-[var(--dark-500)]">
          {status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--brand-green)] text-[var(--dark-900)] font-semibold text-sm hover:bg-[var(--brand-green)]/90 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--brand-red)] text-white font-semibold text-sm hover:bg-[var(--brand-red)]/90 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Reject'}
              </button>
            </>
          )}
          {status === 'ACTIVE' && (
            <button
              type="button"
              onClick={handleResetClick}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--brand-peach)] text-[var(--dark-900)] font-semibold text-sm hover:bg-[var(--brand-peach)]/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Reset to Pending'}
            </button>
          )}
          {status === 'REJECTED' && (
            <>
              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--brand-green)] text-[var(--dark-900)] font-semibold text-sm hover:bg-[var(--brand-green)]/90 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={handleResetClick}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)] font-semibold text-sm hover:bg-[var(--dark-500)] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Reset'}
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmationModal
        isVisible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
        title="Reset Relationship"
        message="Are you sure you want to reset this relationship back to pending status?"
        confirmButtonText="Reset to Pending"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
      />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </>
  );
}
