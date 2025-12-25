'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { Building2, Code, FileText, Mail, Phone, Globe, Facebook, Instagram, Settings, Camera, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  if (loading || isLoading) return (
    <div className="py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-[var(--brand-light)]/60 animate-pulse">Loading...</span>
      </div>
    </div>
  );
  
  if (!muniData) return (
    <div className="py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--dark-700)] flex items-center justify-center">
          <Building2 className="w-6 h-6 text-[var(--brand-light)]/30" />
        </div>
        <span className="text-[var(--brand-light)]/60">No Municipality Assigned. Contact Super Admin.</span>
      </div>
    </div>
  );

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0 space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 space-y-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[var(--dark-900)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Municipality Settings</h1>
        </div>
        <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Keep your municipality profile up to date. Changes are instantly reflected in the Youth App.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:px-4 md:px-6 md:px-8">
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-xl border-y md:border border-[var(--dark-600)] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--brand-light)]/50 font-semibold">Municipality</p>
              <p className="text-xl font-bold text-[var(--brand-light)]">{formData.name || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-xl border-y md:border border-[var(--dark-600)] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
              <Code className="h-5 w-5 text-[var(--brand-purple)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--brand-light)]/50 font-semibold">Code</p>
              <p className="text-xl font-bold text-[var(--brand-light)]">{formData.municipality_code || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding Section */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">Branding</h2>
                <p className="text-sm text-[var(--brand-light)]/50">Update your municipality logo and hero banner.</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[var(--brand-primary)]" />
                  Logo / Avatar
                </Label>
                <div className="relative">
                  <div className="bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] rounded-none sm:rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[var(--brand-primary)] transition-colors">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-24 h-24 object-contain bg-[var(--dark-600)] rounded-xl" alt="Avatar" />
                    ) : (
                      <div className="w-24 h-24 bg-[var(--dark-600)] rounded-xl flex items-center justify-center text-[var(--brand-light)]/30">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-purple)] transition-colors">
                        {avatarPreview ? 'Change Logo' : 'Upload Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileChange(e, 'avatar')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                  Hero Banner
                </Label>
                <div className="relative">
                  <div className="bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] rounded-none sm:rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[var(--brand-primary)] transition-colors">
                    {heroPreview ? (
                      <img src={heroPreview} className="w-full h-40 object-cover rounded-none sm:rounded-xl" alt="Hero" />
                    ) : (
                      <div className="w-full h-40 bg-[var(--dark-600)] rounded-none sm:rounded-xl flex items-center justify-center text-[var(--brand-light)]/30">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[var(--brand-primary)] font-semibold hover:text-[var(--brand-purple)] transition-colors">
                        {heroPreview ? 'Change Banner' : 'Upload Banner'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileChange(e, 'hero')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Details Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[var(--brand-purple)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">Basic Details</h2>
                <p className="text-sm text-[var(--brand-light)]/50">General information visible across the app.</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                  Municipality Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality_code" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Code className="h-4 w-4 text-[var(--brand-primary)]" />
                  Municipality Code
                </Label>
                <Input
                  id="municipality_code"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.municipality_code}
                  onChange={e => setFormData({...formData, municipality_code: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
                Description
              </Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-none sm:rounded-md border border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] focus-visible:border-[var(--brand-primary)]"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Contact & Socials Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-[var(--brand-blue)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">Contact & Socials</h2>
                <p className="text-sm text-[var(--brand-light)]/50">How users can reach your municipality.</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--brand-blue)]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--brand-third)]" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_link" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                  Website
                </Label>
                <Input
                  id="website_link"
                  type="url"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.website_link}
                  onChange={e => setFormData({...formData, website_link: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-[var(--brand-primary)]" />
                  Facebook URL
                </Label>
                <Input
                  id="facebook"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.facebook}
                  onChange={e => setFormData({...formData, facebook: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-[var(--brand-primary)]" />
                  Instagram URL
                </Label>
                <Input
                  id="instagram"
                  type="text"
                  className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  value={formData.instagram}
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)]/20 flex items-center justify-center">
                <Settings className="h-5 w-5 text-[var(--brand-green)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">Settings</h2>
                <p className="text-sm text-[var(--brand-light)]/50">Control member registration and policies.</p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-6 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-500)]">
              <input
                id="selfReg"
                type="checkbox"
                className="h-4 w-4 text-[var(--brand-primary)] border-[var(--dark-500)] rounded focus:ring-[var(--brand-primary)] bg-[var(--dark-600)]"
                checked={formData.allow_self_registration}
                onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
              />
              <label htmlFor="selfReg" className="text-sm text-[var(--brand-light)] cursor-pointer flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
                Allow youth/guardians to self-register for verification
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions" className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
                Terms & Conditions
              </Label>
              <textarea
                id="terms_and_conditions"
                rows={4}
                className="flex w-full rounded-none sm:rounded-md border border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] focus-visible:border-[var(--brand-primary)]"
                value={formData.terms_and_conditions}
                onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="bg-[var(--dark-800)] rounded-none md:rounded-2xl border-y md:border border-[var(--dark-600)] overflow-hidden">
          <div className="flex justify-end pt-4 border-t border-[var(--dark-600)] px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8">
            <Button
              type="submit"
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode
      />
    </div>
  );
}