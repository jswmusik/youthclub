'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

interface ClubFormState {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  terms_and_conditions: string;
  club_policies: string;
  latitude: string;
  longitude: string;
  club_categories: string;
}

export default function ClubSettingsPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubData, setClubData] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const [formData, setFormData] = useState<ClubFormState>({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    terms_and_conditions: '',
    club_policies: '',
    latitude: '',
    longitude: '',
    club_categories: '',
  });

  useEffect(() => {
    if (!loading && user) {
      fetchClub();
    }
  }, [user, loading]);

  const fetchClub = async () => {
    const assigned = user?.assigned_club;
    const clubId =
      typeof assigned === 'object' && assigned !== null ? (assigned as any).id : typeof assigned === 'number' ? assigned : null;

    if (!clubId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get(`/clubs/${clubId}/`);
      const data = res.data;
      setClubData(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        terms_and_conditions: data.terms_and_conditions || '',
        club_policies: data.club_policies || '',
        latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '',
        longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '',
        club_categories: data.club_categories || '',
      });
      setAvatarPreview(data.avatar ? getMediaUrl(data.avatar) : null);
      setHeroPreview(data.hero_image ? getMediaUrl(data.hero_image) : null);
    } catch (err) {
      console.error('Failed to load club data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(reader.result as string);
      } else {
        setHeroFile(file);
        setHeroPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubData) return;
    setIsSaving(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('address', formData.address);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('club_policies', formData.club_policies);
      if (formData.latitude.trim() !== '') data.append('latitude', formData.latitude);
      if (formData.longitude.trim() !== '') data.append('longitude', formData.longitude);
      data.append('club_categories', formData.club_categories);
      data.append('municipality', clubData.municipality);

      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      await api.patch(`/clubs/${clubData.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setToast({ message: 'Club settings updated!', type: 'success', isVisible: true });
      setAvatarFile(null);
      setHeroFile(null);
      fetchClub();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update club settings.', type: 'error', isVisible: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!clubData) {
    return <div className="p-10 text-center">No club assigned. Please contact your administrator.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/70 font-semibold">Club Admin</p>
            <h1 className="text-3xl font-bold mt-1">My Club Settings</h1>
            <p className="text-white/80 mt-2 max-w-2xl">
              Update your club profile information. Changes are instantly visible to your members.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/15 rounded-xl px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Club</p>
              <p className="text-xl font-bold">{formData.name || '—'}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Municipality</p>
              <p className="text-xl font-bold">{clubData.municipality_name || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <form className="space-y-10" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
                <p className="text-sm text-slate-500">Keep your club visuals fresh and inviting.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">Logo / Avatar</label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-20 h-20 object-contain bg-white rounded-xl shadow" alt="Avatar" />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                      No Img
                    </div>
                  )}
                  <input type="file" accept="image/*" className="text-sm" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">Hero Banner</label>
                <div className="space-y-3">
                  {heroPreview ? (
                    <img src={heroPreview} className="w-full h-32 object-cover rounded-xl shadow" alt="Hero" />
                  ) : (
                    <div className="w-full h-32 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                      No Hero Image
                    </div>
                  )}
                  <input type="file" accept="image/*" className="text-sm" onChange={(e) => handleFileChange(e, 'hero')} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Basic Details</h3>
              <p className="text-sm text-slate-500">General information about your club.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Club Name</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Club Categories</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.club_categories}
                  onChange={(e) => setFormData({ ...formData, club_categories: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Description</label>
              <textarea
                rows={3}
                className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
              <p className="text-sm text-slate-500">How members can reach your club.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Email</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Phone</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Address</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Location</h3>
              <p className="text-sm text-slate-500">Map coordinates help visitors find the club.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Latitude</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g. 59.3293"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Longitude</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g. 18.0686"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Policies</h3>
              <p className="text-sm text-slate-500">Legal documents and guidelines for your club.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Terms & Conditions</label>
                <textarea
                  rows={4}
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Club Policies</label>
                <textarea
                  rows={4}
                  className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={formData.club_policies}
                  onChange={(e) => setFormData({ ...formData, club_policies: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
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

