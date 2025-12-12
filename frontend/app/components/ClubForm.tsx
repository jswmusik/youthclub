'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import { useAuth } from '../../context/AuthContext';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Option { id: number; name: string; }

interface ClubFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY';
}

const WEEKDAYS = [
  { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

const GENDER_RESTRICTIONS = [
  { id: 'ALL', name: 'All Genders' },
  { id: 'BOYS', name: 'Boys Only' },
  { id: 'GIRLS', name: 'Girls Only' },
  { id: 'OTHER', name: 'Other' },
];

export default function ClubForm({ initialData, redirectPath, scope }: ClubFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Refs for files
  const avatarRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  // Opening Hours
  const [openingHours, setOpeningHours] = useState<any[]>(initialData?.regular_hours || []);
  const [hourError, setHourError] = useState('');
  const [newHour, setNewHour] = useState({
    weekday: 1, week_cycle: 'ALL', open_time: '14:00', close_time: '20:00',
    title: '', gender_restriction: 'ALL', restriction_mode: 'NONE', min_value: '', max_value: ''
  });

  // Form Data
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    municipality: initialData?.municipality || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    club_categories: initialData?.club_categories || '',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    club_policies: initialData?.club_policies || '',
    allow_self_registration_override: initialData?.allow_self_registration_override === null ? '' : String(initialData?.allow_self_registration_override),
    require_guardian_override: initialData?.require_guardian_override === null ? '' : String(initialData?.require_guardian_override),
  });

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  useEffect(() => {
    if (scope === 'SUPER') {
      const fetchAll = async () => {
        try {
          let allMunicipalities: Option[] = [];
          let page = 1;
          let totalCount = 0;
          const pageSize = 100;
          const maxPages = 100;
          
          while (page <= maxPages) {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('page_size', pageSize.toString());
            
            const res: any = await api.get(`/municipalities/?${params.toString()}`);
            const responseData: any = res?.data;
            
            if (!responseData) break;
            
            let pageMunicipalities: Option[] = [];
            
            if (Array.isArray(responseData)) {
              pageMunicipalities = responseData;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              break;
            } else if (responseData.results && Array.isArray(responseData.results)) {
              pageMunicipalities = responseData.results;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              
              if (page === 1) totalCount = responseData.count || 0;
              
              const hasNext = responseData.next !== null && responseData.next !== undefined;
              const hasAllResults = totalCount > 0 && allMunicipalities.length >= totalCount;
              const gotEmptyPage = pageMunicipalities.length === 0;
              
              if (!hasNext || hasAllResults || gotEmptyPage) break;
              page++;
            } else {
              break;
            }
          }
          
          setMunicipalities(allMunicipalities);
        } catch (e) { 
          console.error(e); 
        }
      };
      fetchAll();
    }
  }, [scope]);

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

  // Opening Hours Logic
  const checkOverlap = (newItem: any) => {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMins(newItem.open_time);
    const end = toMins(newItem.close_time);

    if (end <= start) return "Close time must be after Open time.";

    for (const h of openingHours) {
      if (h.weekday !== newItem.weekday) continue;
      
      const cycleOverlap = h.week_cycle === 'ALL' || newItem.week_cycle === 'ALL' || h.week_cycle === newItem.week_cycle;
      if (!cycleOverlap) continue;

      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);

      if (start < e2 && end > s2) {
        return `Overlap detected with existing hour: ${h.open_time}-${h.close_time} (${h.week_cycle === 'ALL' ? 'Every Week' : h.week_cycle})`;
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) {
      setHourError(error);
      return;
    }
    setOpeningHours([...openingHours, { ...newHour }]);
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' });
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name?.trim();
    const municipalityValue = scope === 'SUPER' ? formData.municipality?.toString().trim() : '';
    const trimmedEmail = formData.email?.trim();
    const trimmedPhone = formData.phone?.trim();
    const trimmedDescription = formData.description?.trim();
    const trimmedTerms = formData.terms_and_conditions?.trim();
    const trimmedPolicies = formData.club_policies?.trim();
    
    const isValidMunicipality = scope === 'MUNICIPALITY' 
      ? (user?.assigned_municipality !== null && user?.assigned_municipality !== undefined)
      : (municipalityValue && !isNaN(Number(municipalityValue)) && Number(municipalityValue) > 0);
    
    if (!trimmedName || !isValidMunicipality || !trimmedEmail || !trimmedPhone || 
        !trimmedDescription || !trimmedTerms || !trimmedPolicies) {
      const missingFields = [];
      if (!trimmedName) missingFields.push('Name');
      if (scope === 'SUPER' && !isValidMunicipality) missingFields.push('Municipality');
      if (scope === 'MUNICIPALITY' && !isValidMunicipality) missingFields.push('Municipality (not assigned to your account)');
      if (!trimmedEmail) missingFields.push('Email');
      if (!trimmedPhone) missingFields.push('Phone');
      if (!trimmedDescription) missingFields.push('Description');
      if (!trimmedTerms) missingFields.push('Terms & Conditions');
      if (!trimmedPolicies) missingFields.push('Club Policies');
      
      setToast({ message: `Please fill in: ${missingFields.join(', ')}`, type: 'error', isVisible: true });
      return;
    }
    
    setLoading(true);
    
    try {
      const data = new FormData();
      data.append('name', trimmedName);
      if (scope === 'SUPER') {
        data.append('municipality', municipalityValue);
      } else if (scope === 'MUNICIPALITY') {
        const userMunicipalityId = user?.assigned_municipality 
          ? (typeof user.assigned_municipality === 'object' 
              ? user.assigned_municipality.id 
              : user.assigned_municipality)
          : null;
        if (userMunicipalityId) {
          data.append('municipality', userMunicipalityId.toString());
        } else {
          throw new Error('Municipality admin must have an assigned municipality');
        }
      }
      data.append('email', trimmedEmail);
      data.append('phone', trimmedPhone);
      data.append('description', trimmedDescription);
      data.append('terms_and_conditions', trimmedTerms);
      data.append('club_policies', trimmedPolicies);
      if (formData.address?.trim()) data.append('address', formData.address.trim());
      if (formData.club_categories?.trim()) data.append('club_categories', formData.club_categories.trim());
      if (formData.latitude !== '' && formData.latitude != null) data.append('latitude', String(formData.latitude));
      if (formData.longitude !== '' && formData.longitude != null) data.append('longitude', String(formData.longitude));
      
      if (formData.allow_self_registration_override === '') {
        data.append('allow_self_registration_override', '');
      } else {
        data.append('allow_self_registration_override', formData.allow_self_registration_override);
      }

      if (formData.require_guardian_override === '') {
        data.append('require_guardian_override', '');
      } else {
        data.append('require_guardian_override', formData.require_guardian_override);
      }
      
      const cleanedHours = openingHours.map(hour => {
        const cleaned: any = {
          weekday: hour.weekday,
          week_cycle: hour.week_cycle || 'ALL',
          open_time: hour.open_time,
          close_time: hour.close_time,
          title: hour.title || '',
          gender_restriction: hour.gender_restriction || 'ALL',
          restriction_mode: hour.restriction_mode || 'NONE',
        };
        
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        } else {
          cleaned.min_value = null;
          cleaned.max_value = null;
        }
        
        return cleaned;
      });
      
      data.append('regular_hours_data', JSON.stringify(cleanedHours));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/clubs/${initialData.id}/`, data, config);
        setToast({ message: 'Club updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/clubs/', data, config);
        setToast({ message: 'Club created!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Failed to save. Check inputs.';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={buildUrlWithParams(redirectPath)}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Club' : 'Create New Club'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage details, location, and opening hours.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Info */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the essential details for the club.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Club Name <span className="text-red-500">*</span></Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              {scope === 'SUPER' && (
                <div className="space-y-2">
                  <Label>Municipality <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required 
                    value={formData.municipality} 
                    onChange={e => setFormData({...formData, municipality: e.target.value})}
                  >
                    <option value="">Select Municipality</option>
                    {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Textarea rows={3} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <Input value={formData.club_categories} onChange={e => setFormData({...formData, club_categories: e.target.value})} placeholder="e.g. Sports, Arts, Music" />
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label>Logo / Avatar</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative group h-20 w-20 rounded-full border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => avatarRef.current?.click()}>
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} className="h-full w-full object-cover" />
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
                      <Button type="button" variant="secondary" size="sm" onClick={() => avatarRef.current?.click()}>Choose File</Button>
                      {avatarPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('avatar')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: Square image, 400x400px</p>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hero Image</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative group h-20 w-32 rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => heroRef.current?.click()}>
                    {heroPreview ? (
                      <>
                        <img src={heroPreview} className="h-full w-full object-cover" />
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
                      <Button type="button" variant="secondary" size="sm" onClick={() => heroRef.current?.click()}>Choose File</Button>
                      {heroPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('hero')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: 1200x400px</p>
                  </div>
                  <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'hero')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contact & Location */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Contact & Location</CardTitle>
            <CardDescription>Provide contact information and location details.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-red-500">*</span></Label>
                <Input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Opening Hours */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Opening Hours</CardTitle>
            <CardDescription>Define when the club is open and any restrictions.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            
            {/* Builder Bar */}
            <div className="bg-muted/20 p-4 rounded-lg border space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newHour.weekday} onChange={e => setNewHour({...newHour, weekday: parseInt(e.target.value)})}>
                  {WEEKDAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newHour.week_cycle} onChange={e => setNewHour({...newHour, week_cycle: e.target.value})}>
                  {CYCLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-1 items-center col-span-2 sm:col-span-2 md:col-span-2">
                  <Input type="time" className="h-9" value={newHour.open_time} onChange={e => setNewHour({...newHour, open_time: e.target.value})} />
                  <span className="text-muted-foreground">-</span>
                  <Input type="time" className="h-9" value={newHour.close_time} onChange={e => setNewHour({...newHour, close_time: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Optional Title</Label>
                  <Input placeholder="e.g. Teen Night" className="h-9" value={newHour.title} onChange={e => setNewHour({...newHour, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gender Restriction</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newHour.gender_restriction} onChange={e => setNewHour({...newHour, gender_restriction: e.target.value})}>
                    {GENDER_RESTRICTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Restriction Mode</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={newHour.restriction_mode} onChange={e => setNewHour({...newHour, restriction_mode: e.target.value})}>
                    <option value="NONE">No Restriction</option>
                    <option value="AGE">Age Range</option>
                    <option value="GRADE">Grade Range</option>
                  </select>
                </div>
                {newHour.restriction_mode !== 'NONE' && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input type="number" placeholder="Min" className="h-9" value={newHour.min_value} onChange={e => setNewHour({...newHour, min_value: e.target.value})} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input type="number" placeholder="Max" className="h-9" value={newHour.max_value} onChange={e => setNewHour({...newHour, max_value: e.target.value})} />
                    </div>
                  </div>
                )}
                {newHour.restriction_mode === 'NONE' && (
                  <div></div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={addHour} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2">
                  <Plus className="h-4 w-4" /> Add Hour
                </Button>
              </div>
              {hourError && <p className="text-destructive text-sm font-medium">{hourError}</p>}
            </div>

            {/* List */}
            <div className="space-y-2">
              {openingHours.map((hour, i) => {
                const dayName = WEEKDAYS.find(d => d.id === hour.weekday)?.name;
                const cycleName = CYCLES.find(c => c.id === hour.week_cycle)?.name;
                const genderName = GENDER_RESTRICTIONS.find(g => g.id === hour.gender_restriction)?.name || 'All Genders';
                return (
                  <div key={i} className="flex justify-between items-center bg-card border border-gray-100 p-3 rounded-md shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="flex gap-4 items-center">
                        <span className="font-bold w-24 text-sm">{dayName}</span>
                        <div className="text-sm">
                          <span className="font-mono bg-muted px-2 py-1 rounded">{hour.open_time} - {hour.close_time}</span>
                          {hour.week_cycle !== 'ALL' && <span className="ml-2 text-xs text-muted-foreground uppercase">{cycleName}</span>}
                          {hour.title && <span className="ml-2 text-xs font-semibold text-[#4D4DA4]">{hour.title}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {hour.restriction_mode !== 'NONE' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                            {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                          </Badge>
                        )}
                        {hour.gender_restriction !== 'ALL' && (
                          <Badge variant="outline" className="bg-pink-50 text-pink-800 border-pink-200">
                            {genderName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeHour(i)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {openingHours.length === 0 && <p className="text-center text-sm text-muted-foreground italic py-4">No opening hours added.</p>}
            </div>
          </CardContent>
        </Card>

        {/* 4. Legal Documents */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Legal Documents</CardTitle>
            <CardDescription>Terms, conditions, and policies for club members.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Terms & Conditions <span className="text-red-500">*</span></Label>
              <Textarea rows={4} required value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} placeholder="Enter terms and conditions..." />
            </div>
            <div className="space-y-2">
              <Label>Club Policies <span className="text-red-500">*</span></Label>
              <Textarea rows={4} required value={formData.club_policies} onChange={e => setFormData({...formData, club_policies: e.target.value})} placeholder="Enter club policies..." />
            </div>
          </CardContent>
        </Card>

        {/* 5. Settings & Overrides */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
            <CardDescription>Override default municipality settings for this specific club.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Allow Self Registration</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={formData.allow_self_registration_override} onChange={e => setFormData({...formData, allow_self_registration_override: e.target.value})}>
                  <option value="">Use Default</option>
                  <option value="true">Yes, Allow</option>
                  <option value="false">No, Block</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Require Guardian</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={formData.require_guardian_override} onChange={e => setFormData({...formData, require_guardian_override: e.target.value})}>
                  <option value="">Use Default</option>
                  <option value="true">Yes, Require</option>
                  <option value="false">No, Optional</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(buildUrlWithParams(redirectPath))}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : 'Save Club'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
