'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { ArrowLeft, Upload, X, Camera, Building, Mail, Phone, MapPin, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubData, setClubData] = useState<any>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
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

  const handleRemoveImage = (type: 'avatar' | 'hero') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setHeroFile(null);
      setHeroPreview(null);
      if (heroRef.current) heroRef.current.value = '';
    }
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
    return (
      <div className="p-8 text-center text-gray-400 animate-pulse">Loading...</div>
    );
  }

  if (!clubData) {
    return (
      <div className="p-8">
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No club assigned. Please contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/club/details">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-50 text-purple-600 border-purple-200 px-3 py-1 text-xs font-semibold uppercase">
              Club Admin
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Edit Club Settings</h1>
          <p className="text-gray-500 mt-1">Update your club profile information. Changes are instantly visible to your members.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213]">Basic Information</CardTitle>
            </div>
            <CardDescription>Enter the essential details for the club.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#4D4DA4]" />
                  Club Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club_categories" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#4D4DA4]" />
                  Club Categories
                </Label>
                <Input
                  id="club_categories"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.club_categories}
                  onChange={(e) => setFormData({ ...formData, club_categories: e.target.value })}
                  placeholder="e.g. Sports, Arts, Music"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                rows={3}
                required
                className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label>Logo / Avatar</Label>
                <div className="flex gap-4 items-center">
                  <div 
                    className="relative group h-20 w-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer"
                    onClick={() => avatarRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} className="h-full w-full object-cover" alt="Avatar" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-400">Click to upload</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => avatarRef.current?.click()}>
                        Choose File
                      </Button>
                      {avatarPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRemoveImage('avatar')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Recommended: Square image, 400x400px</p>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero Image</Label>
                <div className="flex gap-4 items-center">
                  <div 
                    className="relative group h-20 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer"
                    onClick={() => heroRef.current?.click()}
                  >
                    {heroPreview ? (
                      <>
                        <img src={heroPreview} className="h-full w-full object-cover" alt="Hero" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-400">Click to upload</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => heroRef.current?.click()}>
                        Choose File
                      </Button>
                      {heroPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleRemoveImage('hero')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Recommended: 1200x400px</p>
                  </div>
                  <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'hero')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Location */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#4D4DA4] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213]">Contact & Location</CardTitle>
            </div>
            <CardDescription>Provide contact information and location details.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#4D4DA4]" />
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  required
                  type="email"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#4D4DA4]" />
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#4D4DA4]" />
                Address
              </Label>
              <Input
                id="address"
                className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g. 59.3293"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g. 18.0686"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#0EA5E9] rounded-full"></div>
              <CardTitle className="text-xl font-bold text-[#121213]">Policies</CardTitle>
            </div>
            <CardDescription>Legal documents and guidelines for your club.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="terms_and_conditions" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4D4DA4]" />
                  Terms & Conditions
                </Label>
                <Textarea
                  id="terms_and_conditions"
                  rows={4}
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="club_policies" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4D4DA4]" />
                  Club Policies
                </Label>
                <Textarea
                  id="club_policies"
                  rows={4}
                  className="bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  value={formData.club_policies}
                  onChange={(e) => setFormData({ ...formData, club_policies: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
          <Link href="/admin/club/details">
            <Button type="button" variant="outline" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              Cancel
            </Button>
          </Link>
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

