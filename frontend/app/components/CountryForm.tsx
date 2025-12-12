'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

// Shadcn Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CountryFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function CountryForm({ initialData, redirectPath }: CountryFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {initialData ? 'Edit Country' : 'Add New Country'}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {initialData ? 'Update country information and settings' : 'Create a new country configuration'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">General Information</CardTitle>
          <CardDescription className="text-gray-500">Enter the basic details for the country.</CardDescription>
        </CardHeader>
        <Separator />
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Image Upload Area */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Country Flag / Avatar</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div 
                  className="relative group w-32 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex items-center justify-center overflow-hidden hover:border-[#4D4DA4]/50 transition-colors cursor-pointer flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-400">Click to upload</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-gray-500">
                    Upload a high-quality flag or representative image.
                    <br />Recommended size: 400x300px (JPG, PNG).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-900"
                    >
                      Choose File
                    </Button>
                    {avatarPreview && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name"
                  required 
                  placeholder="e.g. Sweden"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_code" className="text-sm font-semibold text-gray-900">
                  Country Code (ISO) <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="country_code"
                  required 
                  placeholder="e.g. SE"
                  maxLength={5}
                  value={formData.country_code}
                  onChange={e => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-900">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea 
                id="description"
                required 
                rows={4} 
                className="resize-none"
                placeholder="Brief description of this region..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency_code" className="text-sm font-semibold text-gray-900">Currency</Label>
                <Input 
                  id="currency_code"
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
                  placeholder="e.g. sv"
                  value={formData.default_language}
                  onChange={e => setFormData({ ...formData, default_language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-semibold text-gray-900">Timezone</Label>
                <Input 
                  id="timezone"
                  placeholder="e.g. Europe/Stockholm"
                  value={formData.timezone}
                  onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => router.push(redirectPath)} 
                className="w-full sm:w-auto text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full sm:w-auto bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white min-w-[120px]"
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
