'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface InterestFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function InterestForm({ initialData, redirectPath }: InterestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        icon: initialData.icon || '',
      });
      setAvatarFile(null);
      setAvatarPreview(initialData.avatar ? getMediaUrl(initialData.avatar) : null);
    } else {
      // Reset form when creating new
      setFormData({
        name: '',
        icon: '',
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [initialData]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous object URL if it exists
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      // Use FileReader like in page.tsx for consistency
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('icon', formData.icon);
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/interests/${initialData.id}/`, data, config);
        setToast({ message: 'Interest updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/interests/', data, config);
        setToast({ message: 'Interest created successfully!', type: 'success', isVisible: true });
      }

      // Short delay to show toast before redirect
      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      // Handle "Unique" error specifically
      const msg = err.response?.data?.name ? 'An interest with this name already exists.' : 'Operation failed.';
      setToast({ message: msg, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={redirectPath}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Interest' : 'Create New Interest'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage interest details and information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the interest name and icon.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Interest Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                required
                type="text"
                placeholder="e.g. Football"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="icon"
                  type="text"
                  className="w-20 text-center text-2xl border-gray-200 focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
                  placeholder="⚽"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Type an emoji (Win + . or Cmd + Ctrl + Space)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Cover Image</CardTitle>
            <CardDescription>Upload a cover image or SVG icon for this interest.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="relative group h-24 w-24 rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                {avatarPreview ? (
                  <>
                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <span className="text-[10px] text-muted-foreground">Click to upload</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => document.getElementById('avatar-input')?.click()}
                  >
                    Choose File
                  </Button>
                  {avatarPreview && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive" 
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Optional. Used for detailed views or cards. Recommended: Square image, 400x400px</p>
                <input 
                  id="avatar-input"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.push(redirectPath)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors"
          >
            {loading ? 'Saving...' : initialData ? 'Update Interest' : 'Create Interest'}
          </Button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
