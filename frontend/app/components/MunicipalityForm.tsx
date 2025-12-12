'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MunicipalityFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function MunicipalityForm({ initialData, redirectPath }: MunicipalityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Refs for file inputs
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country: String(initialData?.country?.id ?? initialData?.country ?? ''),
    municipality_code: initialData?.municipality_code || '',
    description: initialData?.description || '',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website_link: initialData?.website_link || '',
    allow_self_registration: initialData?.allow_self_registration ?? true,
    require_guardian_at_registration: initialData?.require_guardian_at_registration ?? false,
    facebook: '',
    instagram: ''
  });

  // Images state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);
  const [heroPreview, setHeroPreview] = useState<string | null>(initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  useEffect(() => {
    api.get('/countries/').then(res => {
      setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
    
    // Parse socials
    if (initialData?.social_media) {
      try {
        const social = typeof initialData.social_media === 'string' 
            ? JSON.parse(initialData.social_media) 
            : initialData.social_media;
        setFormData(prev => ({ ...prev, facebook: social.facebook || '', instagram: social.instagram || '' }));
      } catch (e) { console.error(e); }
    }
  }, [initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(preview);
      } else {
        setHeroFile(file);
        setHeroPreview(preview);
      }
    }
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
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if(key !== 'facebook' && key !== 'instagram') data.append(key, value.toString());
      });
      
      data.append('social_media', JSON.stringify({ facebook: formData.facebook, instagram: formData.instagram }));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      if (initialData) {
        await api.patch(`/municipalities/${initialData.id}/`, data, config);
        setToast({ message: 'Saved successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/municipalities/', data, config);
        setToast({ message: 'Created successfully!', type: 'success', isVisible: true });
      }
      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Failed to save. Check inputs.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={redirectPath}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Municipality' : 'Add New Municipality'}
          </h1>
          <p className="text-sm text-muted-foreground">Configure details and settings for this region.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info Card */}
        <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name <span className="text-red-500">*</span></Label>
                        <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Stockholm City" />
                    </div>
                    <div className="space-y-2">
                        <Label>Country <span className="text-red-500">*</span></Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required 
                            value={formData.country} 
                            onChange={e => setFormData({...formData, country: e.target.value})}
                        >
                            <option value="">Select Country</option>
                            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Municipality Code</Label>
                    <Input value={formData.municipality_code} onChange={e => setFormData({...formData, municipality_code: e.target.value})} placeholder="e.g. STHM" maxLength={10} />
                </div>
                
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe this municipality..." />
                </div>

                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                        <Label>Logo / Avatar</Label>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="relative group w-32 h-24 border-2 border-dashed border-input rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => avatarRef.current?.click()}>
                                {avatarPreview ? (
                                    <>
                                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="h-5 w-5 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-2">
                                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                                        <span className="text-[10px] text-muted-foreground">Click to upload</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => avatarRef.current?.click()}>Choose File</Button>
                                    {avatarPreview && (
                                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('avatar')}>
                                            <X className="h-4 w-4 mr-1" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Recommended: 400x300px (JPG, PNG)</p>
                            </div>
                            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Hero Image</Label>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="relative group w-32 h-24 border-2 border-dashed border-input rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => heroRef.current?.click()}>
                                {heroPreview ? (
                                    <>
                                        <img src={heroPreview} alt="Hero preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="h-5 w-5 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-2">
                                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                                        <span className="text-[10px] text-muted-foreground">Click to upload</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => heroRef.current?.click()}>Choose File</Button>
                                    {heroPreview && (
                                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('hero')}>
                                            <X className="h-4 w-4 mr-1" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Recommended: 1200x400px (JPG, PNG)</p>
                            </div>
                            <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'hero')} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Contact & Socials */}
        <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Contact & Socials</CardTitle></CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@city.se" />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+46..." />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Website</Label>
                    <Input type="url" value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <Label>Facebook URL</Label>
                        <Input value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} placeholder="https://facebook.com/..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Instagram URL</Label>
                        <Input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} placeholder="https://instagram.com/..." />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                    <div>
                        <div className="font-medium">Self Registration</div>
                        <div className="text-sm text-muted-foreground">Allow users to register freely via the app.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-gray-300 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                        checked={formData.allow_self_registration}
                        onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
                    />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
                    <div>
                        <div className="font-medium">Require Guardian</div>
                        <div className="text-sm text-muted-foreground">Youths must link a guardian immediately upon registration.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-gray-300 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                        checked={formData.require_guardian_at_registration}
                        onChange={e => setFormData({...formData, require_guardian_at_registration: e.target.checked})}
                    />
                </div>
                
                <div className="space-y-2 pt-2">
                    <Label>Terms & Conditions</Label>
                    <Textarea rows={6} value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} placeholder="Legal text shown to users..." />
                </div>
            </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pb-10">
            <Button type="button" variant="ghost" onClick={() => router.push(redirectPath)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px] w-full sm:w-auto">
                {loading ? 'Saving...' : 'Save Municipality'}
            </Button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
