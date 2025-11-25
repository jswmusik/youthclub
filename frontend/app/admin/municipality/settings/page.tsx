'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

export default function MyMunicipalityPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  
  // Data State
  const [muniData, setMuniData] = useState<any>(null);
  
  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    municipality_code: '',
    description: '',
    terms_and_conditions: '',
    email: '',
    phone: '',
    website_link: '',
    allow_self_registration: true,
    facebook: '',
    instagram: ''
  });

  useEffect(() => {
    if (!loading && user) {
      fetchMunicipality();
    }
  }, [user, loading]);

  const fetchMunicipality = async () => {
    if (!user?.assigned_municipality) return; // Safety check

    try {
      // Since we filtered the QuerySet in Backend to only show assigned_muni,
      // we can technically fetch /municipalities/ and take the first result,
      // OR fetch by ID directly. ID is safer.
      
      // Note: user.assigned_municipality might be an Object or ID depending on serializer.
      // If it's an object, use .id. If it's a number, use it directly.
      const muniId = typeof user.assigned_municipality === 'object' 
        ? (user.assigned_municipality as any).id 
        : user.assigned_municipality;

      const res = await api.get(`/municipalities/${muniId}/`);
      const item = res.data;
      setMuniData(item);

      // Parse social media
      let social = { facebook: '', instagram: '' };
      try {
        if (item.social_media) {
          if (typeof item.social_media === 'string') social = { ...social, ...JSON.parse(item.social_media) };
          else if (typeof item.social_media === 'object') social = { ...social, ...item.social_media };
        }
      } catch (e) {}

      setFormData({
        name: item.name,
        municipality_code: item.municipality_code || '',
        description: item.description || '',
        terms_and_conditions: item.terms_and_conditions || '',
        email: item.email || '',
        phone: item.phone || '',
        website_link: item.website_link || '',
        allow_self_registration: item.allow_self_registration ?? true,
        facebook: social.facebook || '',
        instagram: social.instagram || ''
      });

      setAvatarPreview(item.avatar ? getMediaUrl(item.avatar) : null);
      setHeroPreview(item.hero_image ? getMediaUrl(item.hero_image) : null);

    } catch (err) {
      console.error("Failed to load municipality", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const data = new FormData();
      const socialMediaJson = JSON.stringify({
        facebook: formData.facebook,
        instagram: formData.instagram
      });

      // We only append editable fields
      data.append('name', formData.name);
      data.append('municipality_code', formData.municipality_code);
      data.append('description', formData.description);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('website_link', formData.website_link);
      data.append('allow_self_registration', formData.allow_self_registration.toString());
      data.append('social_media', socialMediaJson);
      
      // Note: We do NOT send 'country' here, as it shouldn't change.

      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      await api.patch(`/municipalities/${muniData.id}/`, data, config);
      
      setToast({
        message: 'Settings saved successfully!',
        type: 'success',
        isVisible: true,
      });
      // Re-fetch to clean up state
      fetchMunicipality();
      setAvatarFile(null);
      setHeroFile(null);

    } catch (err) {
      setToast({
        message: 'Failed to save settings. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (!muniData) return <div className="p-10 text-center">No Municipality Assigned. Contact Super Admin.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/70 font-semibold">Municipality Admin</p>
            <h1 className="text-3xl font-bold mt-1">My Municipality Settings</h1>
            <p className="text-white/80 mt-2 max-w-2xl">
              Keep your municipality profile up to date. Changes are instantly reflected in the Youth App.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/15 rounded-xl px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Municipality</p>
              <p className="text-xl font-bold">{formData.name || '—'}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-6 py-4 text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Code</p>
              <p className="text-xl font-bold">{formData.municipality_code || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <form className="space-y-10" onSubmit={handleSubmit}>
          
          {/* IMAGES SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
                <p className="text-sm text-slate-500">Update your municipality logo and hero banner.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">Logo / Avatar</label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-20 h-20 object-contain bg-white rounded-xl shadow" alt="Avatar" />
                  ) : (
                    <div className="w-20 h-20 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">No Img</div>
                  )}
                  <input type="file" accept="image/*" className="text-sm" onChange={e => handleFileChange(e, 'avatar')} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">Hero Banner</label>
                <div className="space-y-3">
                  {heroPreview ? (
                    <img src={heroPreview} className="w-full h-32 object-cover rounded-xl shadow" alt="Hero" />
                  ) : (
                    <div className="w-full h-32 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">No Hero Image</div>
                  )}
                  <input type="file" accept="image/*" className="text-sm" onChange={e => handleFileChange(e, 'hero')} />
                </div>
              </div>
            </div>
          </section>

          {/* BASIC INFO */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Basic Details</h3>
              <p className="text-sm text-slate-500">General information visible across the app.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Municipality Name</label>
                <input type="text" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Municipality Code</label>
                <input type="text" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.municipality_code} onChange={e => setFormData({...formData, municipality_code: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Description</label>
              <textarea rows={3} className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </section>

          {/* CONTACT & SOCIALS */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contact & Socials</h3>
              <p className="text-sm text-slate-500">How users can reach your municipality.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Email</label>
                <input type="email" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Phone</label>
                <input type="text" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Website</label>
                <input type="url" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Facebook URL</label>
                <input type="text" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Instagram URL</label>
                <input type="text" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                  value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} />
              </div>
            </div>
          </section>

          {/* SETTINGS */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Settings</h3>
              <p className="text-sm text-slate-500">Control member registration and policies.</p>
            </div>
            <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <input 
                  type="checkbox" 
                  id="selfReg"
                  className="w-5 h-5 text-blue-600"
                  checked={formData.allow_self_registration}
                  onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
                />
                <label htmlFor="selfReg" className="font-medium text-slate-900 cursor-pointer">
                  Allow youth/guardians to self-register for verification
                </label>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Terms & Conditions</label>
              <textarea rows={4} className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500" 
                value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} />
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