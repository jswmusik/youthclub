'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import { User, Mail, Phone, Globe, UserCircle, Lock, ShieldCheck, Clock, Camera, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
}

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

  if (loading || !user) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  const latestLoginTimestamp = loginHistory.length > 0 ? loginHistory[0].timestamp : lastLogin;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-50 text-purple-600 border-purple-200 px-3 py-1 text-xs font-semibold uppercase">
            Club Admin
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#121213]">My Profile</h1>
        <p className="text-gray-500 mt-1">Update your personal information and review your recent login activity.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Profile Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile Details Card */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
                <CardTitle className="text-xl font-bold text-[#121213]">Profile Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                      <AvatarImage src={avatarPreview || undefined} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] text-white text-2xl font-bold">
                        {profile.first_name?.[0] || profile.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-[#4D4DA4] text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-[#FF5485] transition-colors">
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
                  <div>
                    <h3 className="text-lg font-semibold text-[#121213]">
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-[#4D4DA4]" />
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      type="text"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-[#4D4DA4]" />
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      type="text"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#4D4DA4]" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#4D4DA4]" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone_number"
                      type="text"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.phone_number}
                      onChange={(e) => handleChange('phone_number', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_language" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#4D4DA4]" />
                      Preferred Language
                    </Label>
                    <select
                      id="preferred_language"
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                      value={profile.preferred_language}
                      onChange={(e) => handleChange('preferred_language', e.target.value)}
                    >
                      <option value="sv">Swedish</option>
                      <option value="en">English</option>
                      <option value="fi">Finnish</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[#4D4DA4]" />
                      Profession / Job Title
                    </Label>
                    <Input
                      id="profession"
                      type="text"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.profession}
                      onChange={(e) => handleChange('profession', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-[#4D4DA4]" />
                      Nickname
                    </Label>
                    <Input
                      id="nickname"
                      type="text"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      value={profile.nickname}
                      onChange={(e) => handleChange('nickname', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#4D4DA4]" />
                      New Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                      placeholder="Leave blank to keep current password"
                      value={profile.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                    />
                  </div>
                </div>

                {/* Privacy Checkbox */}
                <div className="flex items-center gap-3 p-4 bg-[#EBEBFE]/30 rounded-xl border border-[#4D4DA4]/20">
                  <input
                    id="hide_contact"
                    type="checkbox"
                    className="h-4 w-4 text-[#4D4DA4] border-gray-300 rounded focus:ring-[#4D4DA4]"
                    checked={profile.hide_contact_info}
                    onChange={(e) => handleChange('hide_contact_info', e.target.checked)}
                  />
                  <label htmlFor="hide_contact" className="text-sm text-gray-700 cursor-pointer">
                    Hide my contact info from public listings
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                  <Button
                    type="submit"
                    className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white px-8 py-2 rounded-full transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Summary Card */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#4D4DA4] rounded-full"></div>
                <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#4D4DA4]" />
                  Account Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[#EBEBFE]/30 rounded-lg">
                  <span className="text-sm text-gray-600">Role</span>
                  <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                    Club Admin
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#EBEBFE]/30 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#4D4DA4]" />
                    Last Login
                  </span>
                  <span className="text-sm font-semibold text-[#121213]">
                    {formatDateTime(latestLoginTimestamp)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Logins Card */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#0EA5E9] rounded-full"></div>
                <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#0EA5E9]" />
                  Recent Logins
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loginHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No login history recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {loginHistory.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-[#0EA5E9]"></div>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-[#121213] block">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function ClubProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading profile...</div>}>
      <ClubProfileContent />
    </Suspense>
  );
}

