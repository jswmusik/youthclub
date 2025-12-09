'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

// Shadcn Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CountryFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function CountryForm({ initialData, redirectPath }: CountryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country_code: initialData?.country_code || '',
    description: initialData?.description || '',
    currency_code: initialData?.currency_code || '',
    default_language: initialData?.default_language || '',
    timezone: initialData?.timezone || ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('country_code', formData.country_code);
      data.append('description', formData.description);
      data.append('currency_code', formData.currency_code);
      data.append('default_language', formData.default_language);
      data.append('timezone', formData.timezone);
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/countries/${initialData.id}/`, data, config);
        setToast({ message: 'Country updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/countries/', data, config);
        setToast({ message: 'Country created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={redirectPath}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {initialData ? 'Edit Country' : 'Add New Country'}
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            {initialData ? 'Update country information and settings' : 'Create a new country configuration'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {initialData ? 'Country Details' : 'Country Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900">Name</Label>
                <Input 
                  id="name"
                  required 
                  type="text" 
                  placeholder="e.g. Sweden"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_code" className="text-sm font-semibold text-gray-900">Country Code (ISO)</Label>
                <Input 
                  id="country_code"
                  required 
                  type="text" 
                  placeholder="e.g. SE"
                  maxLength={5}
                  value={formData.country_code}
                  onChange={e => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-900">Description</Label>
              <Textarea 
                id="description"
                required 
                rows={3} 
                placeholder="General description of the country settings..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency_code" className="text-sm font-semibold text-gray-900">Currency</Label>
                <Input 
                  id="currency_code"
                  type="text" 
                  placeholder="e.g. SEK"
                  value={formData.currency_code}
                  onChange={e => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_language" className="text-sm font-semibold text-gray-900">Language</Label>
                <Input 
                  id="default_language"
                  type="text" 
                  placeholder="e.g. sv"
                  value={formData.default_language}
                  onChange={e => setFormData({ ...formData, default_language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-semibold text-gray-900">Timezone</Label>
                <Input 
                  id="timezone"
                  type="text" 
                  placeholder="e.g. Europe/Stockholm"
                  value={formData.timezone}
                  onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
            </div>

            {/* Avatar / Flag */}
            <div className="space-y-2">
              <Label htmlFor="avatar" className="text-sm font-semibold text-gray-900">Flag / Avatar</Label>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Input 
                    id="avatar"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {avatarPreview && (
                  <div className="w-24 h-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm flex-shrink-0">
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => router.push(redirectPath)} 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white"
              >
                {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Country')}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
      
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
