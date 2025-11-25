'use client';

import { Suspense, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  preferred_language: string;
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
    <div className="space-y-8">
      <div>
        <p className="text-sm text-purple-500 uppercase font-semibold">Club Admin</p>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Keep your profile up to date and review your recent login activity.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Details</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={profile.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={profile.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg p-2"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={profile.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Language</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={profile.preferred_language}
                  onChange={(e) => handleChange('preferred_language', e.target.value)}
                >
                  <option value="sv">Swedish</option>
                  <option value="en">English</option>
                  <option value="fi">Finnish</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nickname</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={profile.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full border rounded-lg p-2"
                  placeholder="Leave blank to keep current"
                  value={profile.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="hide_contact"
                type="checkbox"
                className="h-4 w-4 text-purple-600"
                checked={profile.hide_contact_info}
                onChange={(e) => handleChange('hide_contact_info', e.target.checked)}
              />
              <label htmlFor="hide_contact" className="text-sm text-gray-700">
                Hide my contact info from public listings
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Avatar</label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
              {avatarPreview && (
                <img src={avatarPreview} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover mt-3" />
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Account Summary</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-semibold">Club Admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Login</span>
                <span className="font-semibold">{formatDateTime(latestLoginTimestamp)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Logins</h3>
            {loginHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No login history recorded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {loginHistory.map((entry) => (
                  <li key={entry.id} className="border-b pb-2 last:border-b-0">
                    <span className="font-semibold text-gray-900">{formatDateTime(entry.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

