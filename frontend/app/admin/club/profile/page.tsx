'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import { User, Mail, Phone, Globe, UserCircle, Lock, ShieldCheck, Clock, Camera, Shield, Eye, EyeOff } from 'lucide-react';

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  preferred_language: string;
  profession: string;
  nickname: string;
  hide_contact_info: boolean;
  password: string;
}

interface LoginHistoryItem {
  id: number;
  timestamp: string;
  ip_address: string | null;
  user_agent: string;
}

const formatRole = (role?: string) => {
  if (!role) return 'Unknown';
  return role
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRoleBadgeStyle = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
    case 'MUNICIPALITY_ADMIN':
      return 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border-[var(--brand-purple)]/30';
    case 'CLUB_ADMIN':
      return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
    default:
      return 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30';
  }
};

function ClubProfileContent() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    preferred_language: 'sv',
    profession: '',
    nickname: '',
    hide_contact_info: false,
    password: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/users/me/');
        const data = res.data;
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          preferred_language: data.preferred_language || 'sv',
          profession: data.profession || '',
          nickname: data.nickname || '',
          hide_contact_info: data.hide_contact_info ?? false,
          password: '',
        });
        setAvatarPreview(data.avatar ? getMediaUrl(data.avatar) : null);
        setLastLogin(data.last_login || null);
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };

    const loadLoginHistory = async () => {
      try {
        const res = await api.get('/users/login_history/');
        setLoginHistory(res.data || []);
      } catch (err) {
        console.error('Failed to load login history', err);
      }
    };

    loadProfile();
    loadLoginHistory();
  }, [user?.id]);

  const handleChange = (field: keyof ProfileForm, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        formData.append(key, typeof value === 'boolean' ? String(value) : value);
      });
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      formData.append('role', 'CLUB_ADMIN');

      await api.patch('/auth/users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({ message: 'Profile updated successfully!', type: 'success', isVisible: true });
      setProfile((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      console.error('Failed to update profile', err);
      setToast({ message: 'Failed to update profile.', type: 'error', isVisible: true });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = (field: string) => `
    w-full h-12 px-4 rounded-xl
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
            <User className="w-8 h-8 text-[var(--dark-900)]" />
          </div>
          <span className="text-[var(--brand-light)]/60">Loading profile...</span>
        </div>
      </div>
    );
  }

  const latestLoginTimestamp = loginHistory.length > 0 ? loginHistory[0].timestamp : lastLogin;

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="px-0 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="px-4 sm:px-0 space-y-2">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${getRoleBadgeStyle(user.role)}`}>
              {formatRole(user.role)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">My Profile</h1>
          <p className="text-sm sm:text-base text-[var(--brand-light)]/50">
            Update your personal information and review your recent login activity.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Profile Form */}
          <div className="xl:col-span-2 space-y-6">
            {/* Profile Details Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <User className="w-5 h-5 text-[var(--dark-900)]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">Profile Details</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">Your personal information</p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-4 sm:px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pb-6 border-b border-[var(--dark-600)]">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-[var(--dark-600)] border-4 border-[var(--dark-500)] overflow-hidden flex items-center justify-center">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl font-bold text-[var(--brand-primary)]">
                            {profile.first_name?.[0] || profile.email?.[0] || 'U'}
                          </span>
                        )}
                      </div>
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute -bottom-1 -right-1 w-9 h-9 bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-xl flex items-center justify-center cursor-pointer hover:bg-[var(--brand-primary)]/80 transition-colors shadow-lg"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                        {profile.first_name} {profile.last_name}
                      </h3>
                      <p className="text-sm text-[var(--brand-light)]/50">{profile.email}</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* First Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <User className="h-4 w-4 text-[var(--brand-primary)]" />
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profile.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        onFocus={() => setFocusedField('first_name')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('first_name')}
                        required
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <User className="h-4 w-4 text-[var(--brand-primary)]" />
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profile.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        onFocus={() => setFocusedField('last_name')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('last_name')}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('email')}
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <Phone className="h-4 w-4 text-[var(--brand-primary)]" />
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={profile.phone_number}
                        onChange={(e) => handleChange('phone_number', e.target.value)}
                        onFocus={() => setFocusedField('phone_number')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('phone_number')}
                      />
                    </div>

                    {/* Preferred Language */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                        Preferred Language
                      </label>
                      <select
                        value={profile.preferred_language}
                        onChange={(e) => handleChange('preferred_language', e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all appearance-none cursor-pointer hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
                        style={selectArrowStyle}
                      >
                        <option value="sv">Swedish</option>
                        <option value="en">English</option>
                        <option value="fi">Finnish</option>
                      </select>
                    </div>

                    {/* Profession */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <UserCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                        Profession / Job Title
                      </label>
                      <input
                        type="text"
                        value={profile.profession}
                        onChange={(e) => handleChange('profession', e.target.value)}
                        onFocus={() => setFocusedField('profession')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('profession')}
                        placeholder="Optional"
                      />
                    </div>

                    {/* Nickname */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <UserCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={profile.nickname}
                        onChange={(e) => handleChange('nickname', e.target.value)}
                        onFocus={() => setFocusedField('nickname')}
                        onBlur={() => setFocusedField(null)}
                        className={inputClasses('nickname')}
                        placeholder="Optional"
                      />
                    </div>

                    {/* New Password */}
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        <Lock className="h-4 w-4 text-[var(--brand-primary)]" />
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={profile.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          className={`${inputClasses('password')} pr-12`}
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Checkbox */}
                  <div 
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      profile.hide_contact_info 
                        ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                        : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                    }`}
                    onClick={() => handleChange('hide_contact_info', !profile.hide_contact_info)}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      profile.hide_contact_info 
                        ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' 
                        : 'border-[var(--dark-400)] bg-transparent'
                    }`}>
                      {profile.hide_contact_info && (
                        <svg className="w-4 h-4 text-[var(--dark-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                        <span className="font-semibold text-[var(--brand-light)]">Privacy Mode</span>
                      </div>
                      <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                        Hide my contact info from public listings
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--dark-600)]">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Summary Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-semibold text-[var(--brand-light)]">Account Summary</h2>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-4 sm:px-6 py-4 space-y-3">
                <div className="flex justify-between items-center p-3 bg-[var(--dark-700)] rounded-xl">
                  <span className="text-sm text-[var(--brand-light)]/60">Role</span>
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${getRoleBadgeStyle(user.role)}`}>
                    {formatRole(user.role)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[var(--dark-700)] rounded-xl">
                  <span className="text-sm text-[var(--brand-light)]/60 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                    Last Login
                  </span>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">
                    {formatDateTime(latestLoginTimestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Logins Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-semibold text-[var(--brand-light)]">Recent Logins</h2>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-4 sm:px-6 py-4">
                {loginHistory.length === 0 ? (
                  <p className="text-sm text-[var(--brand-light)]/50 text-center py-4">
                    No login history recorded yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {loginHistory.slice(0, 5).map((entry) => (
                      <li 
                        key={entry.id} 
                        className="flex items-center gap-3 p-3 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)]"
                      >
                        <div className="w-2 h-2 rounded-full bg-[var(--brand-green)]"></div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-[var(--brand-light)] block">
                            {formatDateTime(entry.timestamp)}
                          </span>
                          {entry.ip_address && (
                            <span className="text-xs text-[var(--brand-light)]/40 truncate block">
                              {entry.ip_address}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode={true}
      />
    </div>
  );
}

export default function ClubProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
            <User className="w-8 h-8 text-[var(--dark-900)]" />
          </div>
          <span className="text-[var(--brand-light)]/60">Loading profile...</span>
        </div>
      </div>
    }>
      <ClubProfileContent />
    </Suspense>
  );
}
