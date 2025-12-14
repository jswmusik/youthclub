'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { Building2, Code, FileText, Mail, Phone, Globe, Facebook, Instagram, Settings, Camera, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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

  if (loading || isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!muniData) return <div className="p-8 text-center text-gray-500">No Municipality Assigned. Contact Super Admin.</div>;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-50 text-purple-600 border-purple-200 px-3 py-1 text-xs font-semibold uppercase">
            Municipality Admin
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Municipality Settings</h1>
        <p className="text-gray-500 mt-1">Keep your municipality profile up to date. Changes are instantly reflected in the Youth App.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#4D4DA4]/10 rounded-lg">
                <Building2 className="h-6 w-6 text-[#4D4DA4]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Municipality</p>
                <p className="text-xl font-bold text-[#121213]">{formData.name || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#4D4DA4]/10 rounded-lg">
                <Code className="h-6 w-6 text-[#4D4DA4]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Code</p>
                <p className="text-xl font-bold text-[#121213]">{formData.municipality_code || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding Section */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[#4D4DA4]" />
                Branding
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">Update your municipality logo and hero banner.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#4D4DA4]" />
                  Logo / Avatar
                </Label>
                <div className="relative">
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[#4D4DA4] transition-colors">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-24 h-24 object-contain bg-white rounded-xl shadow-lg" alt="Avatar" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[#4D4DA4] font-semibold hover:text-[#FF5485] transition-colors">
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
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#4D4DA4]" />
                  Hero Banner
                </Label>
                <div className="relative">
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[#4D4DA4] transition-colors">
                    {heroPreview ? (
                      <img src={heroPreview} className="w-full h-40 object-cover rounded-xl shadow-lg" alt="Hero" />
                    ) : (
                      <div className="w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-sm text-[#4D4DA4] font-semibold hover:text-[#FF5485] transition-colors">
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
          </CardContent>
        </Card>

        {/* Basic Details Section */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#4D4DA4] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#4D4DA4]" />
                Basic Details
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">General information visible across the app.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#4D4DA4]" />
                  Municipality Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality_code" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Code className="h-4 w-4 text-[#4D4DA4]" />
                  Municipality Code
                </Label>
                <Input
                  id="municipality_code"
                  type="text"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.municipality_code}
                  onChange={e => setFormData({...formData, municipality_code: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4D4DA4]" />
                Description
              </Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact & Socials Section */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#0EA5E9] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#0EA5E9]" />
                Contact & Socials
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">How users can reach your municipality.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#4D4DA4]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#4D4DA4]" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="text"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_link" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#4D4DA4]" />
                  Website
                </Label>
                <Input
                  id="website_link"
                  type="url"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.website_link}
                  onChange={e => setFormData({...formData, website_link: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-[#4D4DA4]" />
                  Facebook URL
                </Label>
                <Input
                  id="facebook"
                  type="text"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.facebook}
                  onChange={e => setFormData({...formData, facebook: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-[#4D4DA4]" />
                  Instagram URL
                </Label>
                <Input
                  id="instagram"
                  type="text"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.instagram}
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#10B981] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#10B981]" />
                Settings
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">Control member registration and policies.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-[#EBEBFE]/30 rounded-xl border border-[#4D4DA4]/20">
              <input
                id="selfReg"
                type="checkbox"
                className="h-4 w-4 text-[#4D4DA4] border-gray-300 rounded focus:ring-[#4D4DA4]"
                checked={formData.allow_self_registration}
                onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
              />
              <label htmlFor="selfReg" className="text-sm text-gray-700 cursor-pointer flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#4D4DA4]" />
                Allow youth/guardians to self-register for verification
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4D4DA4]" />
                Terms & Conditions
              </Label>
              <textarea
                id="terms_and_conditions"
                rows={4}
                className="flex w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={formData.terms_and_conditions}
                onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button
            type="submit"
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white px-8 py-2 rounded-full transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}