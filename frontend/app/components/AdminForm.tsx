'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Upload, X, User, ShieldCheck, Building, Building2, 
  Mail, Phone, CheckCircle2, Lightbulb, Save, Briefcase
} from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { queueToastForNavigation } from './ToastProvider';
import { getMediaUrl } from '../../app/utils';
import { useAuth } from '../../context/AuthContext';

interface Option { id: number; name: string; }

interface AdminFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function AdminForm({ initialData, redirectPath, scope }: AdminFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error'|'info'|'warning', isVisible: false, title: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);

  // Determine allowed roles based on scope
  const allowedRoles: string[] = [];
  if (scope === 'SUPER') allowedRoles.push('SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'MUNICIPALITY') allowedRoles.push('MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'CLUB') allowedRoles.push('CLUB_ADMIN');

  // Determine default role based on scope
  const getDefaultRole = () => {
    if (scope === 'CLUB') return 'CLUB_ADMIN';
    if (scope === 'MUNICIPALITY') return 'MUNICIPALITY_ADMIN';
    return 'MUNICIPALITY_ADMIN';
  };

  // Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    phone_number: initialData?.phone_number || '',
    profession: initialData?.profession || '',
    assigned_municipality: initialData?.assigned_municipality || '',
    assigned_club: initialData?.assigned_club || '',
    hide_contact_info: initialData?.hide_contact_info || false,
    role: initialData?.role || getDefaultRole()
  });

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    fetchDropdowns();
    if (scope === 'CLUB' && !initialData) {
      setFormData(prev => prev.role !== 'CLUB_ADMIN' ? {...prev, role: 'CLUB_ADMIN'} : prev);
    }
  }, [scope, initialData]);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      const clubRes = await api.get('/clubs/');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setAvatarFile(file);
      setAvatarPreview(preview);
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarRef.current) avatarRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      data.append('email', formData.email);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('role', formData.role);
      data.append('legal_gender', formData.legal_gender);
      
      if (formData.password) {
        data.append('password', formData.password);
      }
      
      if (formData.phone_number) {
        data.append('phone_number', formData.phone_number);
      }
      
      if (formData.nickname) {
        data.append('nickname', formData.nickname);
      }
      
      if (formData.profession) {
        data.append('profession', formData.profession);
      }
      
      data.append('hide_contact_info', formData.hide_contact_info.toString());

      if (scope === 'MUNICIPALITY' && currentUser?.assigned_municipality) {
         const muniId = typeof currentUser.assigned_municipality === 'object' 
            ? currentUser.assigned_municipality.id 
            : currentUser.assigned_municipality;
         data.append('assigned_municipality', muniId.toString());
      } else if (formData.assigned_municipality && formData.assigned_municipality !== '') {
        data.append('assigned_municipality', formData.assigned_municipality.toString());
      }
      
      if (scope === 'CLUB' && currentUser?.assigned_club) {
         const clubId = typeof currentUser.assigned_club === 'object' 
            ? currentUser.assigned_club.id 
            : currentUser.assigned_club;
         data.append('assigned_club', clubId.toString());
         data.append('role', 'CLUB_ADMIN');
      } else if (formData.assigned_club && formData.assigned_club !== '') {
        data.append('assigned_club', formData.assigned_club.toString());
      }

      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        queueToastForNavigation(
          `${formData.first_name} ${formData.last_name} has been updated.`,
          'success',
          'Admin Updated!',
          2500
        );
      } else {
        await api.post('/users/', data, config);
        queueToastForNavigation(
          `${formData.first_name} ${formData.last_name} has been added as an admin.`,
          'success',
          'Admin Created!',
          2500
        );
      }

      router.push(buildUrlWithParams(redirectPath));
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Operation failed. Check your inputs.';
      setToast({ message: errorMessage, type: 'error', isVisible: true, title: 'Operation Failed' });
      setLoading(false);
    }
  };

  const inputClasses = (fieldName: string) => `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 ${focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const selectClasses = (fieldName: string) => `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 ${focusedField === fieldName ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    rounded-xl 
    text-[var(--brand-light)] 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
    appearance-none cursor-pointer
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  // Calculate form completion percentage
  const getRequiredFields = () => {
    const base = ['first_name', 'last_name', 'email'];
    if (!initialData) base.push('password');
    return base;
  };
  
  const requiredFields = getRequiredFields();
  const filledRequired = requiredFields.filter(field => {
    const value = formData[field as keyof typeof formData];
    return typeof value === 'string' ? value.trim() : value;
  }).length;
  const completionPercent = Math.round((filledRequired / requiredFields.length) * 100);

  // Handle scroll for sticky progress bar
  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    setIsProgressFixed(rect.top < 80);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();

    return () => {
      mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1rem'
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return <ShieldCheck className="w-4 h-4" />;
      case 'MUNICIPALITY_ADMIN': return <Building className="w-4 h-4" />;
      case 'CLUB_ADMIN': return <Building2 className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string, isActive: boolean) => {
    if (!isActive) return 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]';
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]';
      case 'MUNICIPALITY_ADMIN': return 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]';
      case 'CLUB_ADMIN': return 'bg-[var(--brand-third)] text-[var(--dark-900)] border-[var(--brand-third)]';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)] border-[var(--dark-500)]';
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
              {initialData ? 'Edit Admin' : 'Create New Admin'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update admin details and permissions' : 'Configure admin details and role assignment'}
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
          
          {/* Role Selection Card */}
          {allowedRoles.length > 1 && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
              <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-peach)] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Admin Role</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">Select the permission level for this admin</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {allowedRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({...formData, role})}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center
                        ${getRoleColor(role, formData.role === role)}
                        ${formData.role === role ? 'ring-2 ring-offset-2 ring-offset-[var(--dark-800)]' : 'hover:bg-[var(--dark-600)]'}
                      `}
                      style={{ 
                        ringColor: formData.role === role ? (
                          role === 'SUPER_ADMIN' ? 'var(--brand-red)' :
                          role === 'MUNICIPALITY_ADMIN' ? 'var(--brand-primary)' :
                          'var(--brand-third)'
                        ) : 'transparent'
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        formData.role === role ? 'bg-white/20' : 'bg-[var(--dark-500)]'
                      }`}>
                        {getRoleIcon(role)}
                      </div>
                      <span className="font-semibold text-sm">{role.replace(/_/g, ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Basic Information</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Personal details and account credentials</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="first_name" className={labelClasses}>
                    First Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="first_name"
                    type="text"
                    required 
                    placeholder="Enter first name"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
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
                    placeholder="Enter last name"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    onFocus={() => setFocusedField('last_name')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('last_name')}
                  />
                </div>
              </div>

              {/* Nickname (for Club Admin) */}
              {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
                <div>
                  <label htmlFor="nickname" className={labelClasses}>
                    Nickname
                  </label>
                  <input 
                    id="nickname"
                    type="text"
                    placeholder="Display name (optional)"
                    value={formData.nickname}
                    onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                    onFocus={() => setFocusedField('nickname')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('nickname')}
                  />
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-[var(--dark-600)]" />

              {/* Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-blue)]" />
                    Email <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    id="email"
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('email')}
                  />
                </div>
                <div>
                  <label htmlFor="password" className={labelClasses}>
                    Password {!initialData && <span className="text-[var(--brand-primary)]">*</span>}
                  </label>
                  <input 
                    id="password"
                    type="password"
                    required={!initialData}
                    placeholder={initialData ? "Leave blank to keep current" : "Enter password"}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('password')}
                  />
                </div>
              </div>

              {/* Contact & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone_number" className={labelClasses}>
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                    Phone Number
                  </label>
                  <input 
                    id="phone_number"
                    type="tel"
                    placeholder="+46..."
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    onFocus={() => setFocusedField('phone_number')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClasses('phone_number')}
                  />
                </div>
                <div>
                  <label htmlFor="legal_gender" className={labelClasses}>
                    Gender
                  </label>
                  <select 
                    id="legal_gender"
                    value={formData.legal_gender}
                    onChange={e => setFormData({ ...formData, legal_gender: e.target.value })}
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
              </div>
            </div>
          </div>

          {/* Assignments Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Assignments</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Assign to municipality or club based on role</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Municipality Assignment */}
              {formData.role === 'MUNICIPALITY_ADMIN' && scope === 'SUPER' && (
                <div>
                  <label htmlFor="assigned_municipality" className={labelClasses}>
                    <Building className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-primary)]" />
                    Assign Municipality
                  </label>
                  <select 
                    id="assigned_municipality"
                    value={formData.assigned_municipality}
                    onChange={e => setFormData({ ...formData, assigned_municipality: e.target.value })}
                    onFocus={() => setFocusedField('assigned_municipality')}
                    onBlur={() => setFocusedField(null)}
                    className={selectClasses('assigned_municipality')}
                    style={selectArrowStyle}
                  >
                    <option value="">Select Municipality</option>
                    {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Club Assignment */}
              {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
                <>
                  <div>
                    <label htmlFor="assigned_club" className={labelClasses}>
                      <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-third)]" />
                      Assign Club
                    </label>
                    <select 
                      id="assigned_club"
                      value={formData.assigned_club}
                      onChange={e => setFormData({ ...formData, assigned_club: e.target.value })}
                      onFocus={() => setFocusedField('assigned_club')}
                      onBlur={() => setFocusedField(null)}
                      className={selectClasses('assigned_club')}
                      style={selectArrowStyle}
                    >
                      <option value="">Select Club</option>
                      {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="profession" className={labelClasses}>
                      <Briefcase className="w-3.5 h-3.5 inline mr-1.5 text-[var(--brand-peach)]" />
                      Profession / Title
                    </label>
                    <input 
                      id="profession"
                      type="text"
                      placeholder="e.g. Youth Coordinator, Program Director"
                      value={formData.profession}
                      onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      onFocus={() => setFocusedField('profession')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses('profession')}
                    />
                  </div>
                </>
              )}

              {/* Super Admin - No assignment needed */}
              {formData.role === 'SUPER_ADMIN' && (
                <div className="text-center py-6 text-[var(--brand-light)]/50">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-[var(--brand-red)]/50" />
                  <p className="text-sm">Super Admins have global access</p>
                  <p className="text-xs mt-1">No specific assignment required</p>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Profile Picture</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Upload an avatar for the admin profile</p>
                </div>
              </div>
            </div>

            <div className="p-6">
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
                        onClick={handleRemoveImage}
                        className="px-3 py-2 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium rounded-lg hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40">Square image, 400x400px (JPG, PNG)</p>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
              <button 
                type="button" 
                onClick={() => router.push(buildUrlWithParams(redirectPath))} 
                className="px-6 py-3 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-600)] transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading || completionPercent < 100}
                className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? 'Save Changes' : 'Create Admin'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Helper Tips */}
        <div className="mt-6 p-4 bg-[var(--dark-800)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
          <h3 className="text-sm font-semibold text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[var(--brand-third)]" />
            Quick Tips
          </h3>
          <ul className="text-sm text-[var(--brand-light)]/50 space-y-1.5">
            <li>• <strong>Super Admins</strong> have full access to all platform features</li>
            <li>• <strong>Municipality Admins</strong> manage clubs and users within their municipality</li>
            <li>• <strong>Club Admins</strong> manage activities and members for their assigned club</li>
            <li>• Strong passwords should include letters, numbers, and special characters</li>
          </ul>
        </div>
      </div>
      
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        title={toast.title}
        onClose={() => setToast({...toast, isVisible: false})} 
        darkMode 
      />
    </div>
  );
}
