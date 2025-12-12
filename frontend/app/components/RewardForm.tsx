'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, X, Gift } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Option { id: number; name: string; }

interface RewardFormProps {
  initialData?: any;
  redirectPath: string;
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1); // [1...13]
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const TRIGGERS = [
  { value: 'BIRTHDAY', label: '🎂 On Birthday', desc: 'Given automatically on member\'s birthday' },
  { value: 'WELCOME', label: '👋 On Signup', desc: 'Given immediately after registration' },
  { value: 'VERIFIED', label: '✅ On Verification', desc: 'Given when account is verified' },
  { value: 'MOST_ACTIVE', label: '🔥 Most Active', desc: 'Awarded to users with most logins' },
];

export default function RewardForm({ initialData, redirectPath }: RewardFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  // Dropdown Data
  const [groups, setGroups] = useState<Option[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Files
  const imageRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sponsor_name: '',
    sponsor_link: '',
    
    // Targeting
    target_groups: [] as number[],
    target_interests: [] as number[],
    target_genders: [] as string[],
    target_grades: [] as number[],
    min_age: '',
    max_age: '',
    target_member_type: 'YOUTH_MEMBER', // <--- WAS 'YOUTH'

    // Constraints
    expiration_date: '',
    usage_limit: '', // Empty = Unlimited

    // Triggers
    active_triggers: [] as string[],
    trigger_config: {} as any,
    
    is_active: true
  });

  useEffect(() => {
    fetchDropdowns();
    if (initialData) {
      loadInitialData();
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      const [grpRes, intRes] = await Promise.all([
        api.get('/groups/'),
        api.get('/interests/')
      ]);
      setGroups(Array.isArray(grpRes.data) ? grpRes.data : grpRes.data.results || []);
      setInterests(Array.isArray(intRes.data) ? intRes.data : intRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialData = () => {
    setFormData({
      name: initialData.name || '',
      description: initialData.description || '',
      sponsor_name: initialData.sponsor_name || '',
      sponsor_link: initialData.sponsor_link || '',
      target_groups: initialData.target_groups || [],
      target_interests: initialData.target_interests || [],
      target_genders: initialData.target_genders || [],
      target_grades: initialData.target_grades || [],
      min_age: initialData.min_age || '',
      max_age: initialData.max_age || '',
      target_member_type: initialData.target_member_type || 'YOUTH_MEMBER',
      expiration_date: initialData.expiration_date || '',
      usage_limit: initialData.usage_limit || '',
      active_triggers: initialData.active_triggers || [],
      trigger_config: initialData.trigger_config || {},
      is_active: initialData.is_active ?? true,
    });
    if (initialData.image) {
      setImagePreview(getMediaUrl(initialData.image));
    }
  };

  // --- Helpers ---

  const handleArrayToggle = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const currentList = prev[field] as any[];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...currentList, value] };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    // Append standard fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'target_groups' || key === 'target_interests' || key === 'target_genders' || key === 'target_grades' || key === 'active_triggers') return; // Handle arrays separately
      if (key === 'trigger_config') {
        data.append(key, JSON.stringify(value));
        return;
      }
      // Handle boolean values
      if (key === 'is_active') {
        data.append(key, value ? 'true' : 'false');
        return;
      }
      // Skip null/empty for optional fields, but include them for PATCH to clear values if needed
      if (value === null || value === '') {
        // For PATCH, we might want to send empty strings to clear fields, but let's skip for now
        return;
      }
      data.append(key, value.toString());
    });

    // Append Arrays (ManyToMany fields - DRF handles multiple values automatically)
    // For PATCH, if arrays are empty, we still need to send them to clear existing relationships
    formData.target_groups.forEach(id => data.append('target_groups', id.toString()));
    formData.target_interests.forEach(id => data.append('target_interests', id.toString()));
    
    // JSON Fields - Send as JSON strings since DRF's MultiPartParser doesn't auto-convert to lists for JSONFields
    // The serializer will parse these JSON strings back to lists
    // Always send these fields, even if empty (send as "[]")
    data.append('target_genders', JSON.stringify(formData.target_genders || []));
    data.append('target_grades', JSON.stringify(formData.target_grades || []));
    data.append('active_triggers', JSON.stringify(formData.active_triggers || []));

    if (imageFile) data.append('image', imageFile);

    try {
      // For FormData, we need to let axios set Content-Type automatically with boundary
      // Override the default 'application/json' header
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (initialData) {
        await api.patch(`/rewards/${initialData.id}/`, data, config);
        setToast({ message: 'Reward updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/rewards/', data, config);
        setToast({ message: 'Reward created!', type: 'success', isVisible: true });
      }
      // Preserve pagination and filter state when redirecting
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
      console.error('Reward save error:', err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : null) ||
                          err?.message || 
                          'Operation failed.';
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
            {initialData ? 'Edit Reward' : 'Create New Reward'}
          </h1>
          <p className="text-sm text-muted-foreground">Rewards can be targeted to specific groups, demographics, or triggered automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Reward Details */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Reward Details</CardTitle>
            <CardDescription>Enter the basic information about this reward.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reward Title <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  placeholder="e.g. Free Coffee"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Sponsor Name</Label>
                <Input 
                  placeholder="e.g. Local Cafe"
                  value={formData.sponsor_name} 
                  onChange={e => setFormData({...formData, sponsor_name: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Sponsor Link (Optional)</Label>
                <Input 
                  type="url" 
                  placeholder="https://..."
                  value={formData.sponsor_link} 
                  onChange={e => setFormData({...formData, sponsor_link: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description & Redemption Instructions <span className="text-red-500">*</span></Label>
              <textarea 
                required 
                rows={4} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Explain what the reward is and how to use it..."
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Reward Image */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Reward Image</CardTitle>
            <CardDescription>Upload an image for this reward.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex gap-4 items-center">
                <div className="relative group h-32 w-32 rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => imageRef.current?.click()}>
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground">Click to upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => imageRef.current?.click()}>Choose File</Button>
                    {imagePreview && (
                      <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemoveImage}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: Square image, 400x400px</p>
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Targeting */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Who Gets This Reward?</CardTitle>
            <CardDescription>Define the target audience for this reward.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer flex-1">
                  <input 
                    type="radio" 
                    name="member_type" 
                    value="YOUTH_MEMBER"
                    checked={formData.target_member_type === 'YOUTH_MEMBER'}
                    onChange={e => setFormData({...formData, target_member_type: e.target.value})}
                    className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                  />
                  <span className="text-sm font-medium">Youth Members</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer flex-1">
                  <input 
                    type="radio" 
                    name="member_type" 
                    value="GUARDIAN" 
                    checked={formData.target_member_type === 'GUARDIAN'}
                    onChange={e => setFormData({...formData, target_member_type: e.target.value})}
                    className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                  />
                  <span className="text-sm font-medium">Guardians</span>
                </label>
              </div>
            </div>

            {/* Groups & Interests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Groups (Optional)</Label>
                <div className="h-40 overflow-y-auto border border-input p-3 rounded-md bg-muted/30 space-y-2">
                  {groups.map(g => (
                    <label key={g.id} className="flex items-center space-x-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={formData.target_groups.includes(g.id)}
                        onChange={() => handleArrayToggle('target_groups', g.id)}
                        className="text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                      />
                      <span>{g.name}</span>
                    </label>
                  ))}
                  {groups.length === 0 && <p className="text-xs text-muted-foreground">No groups available.</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Interests (Optional)</Label>
                <div className="h-40 overflow-y-auto border border-input p-3 rounded-md bg-muted/30 space-y-2">
                  {interests.map(i => (
                    <label key={i.id} className="flex items-center space-x-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={formData.target_interests.includes(i.id)}
                        onChange={() => handleArrayToggle('target_interests', i.id)}
                        className="text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                      />
                      <span>{i.name}</span>
                    </label>
                  ))}
                  {interests.length === 0 && <p className="text-xs text-muted-foreground">No interests available.</p>}
                </div>
              </div>
            </div>

            {/* Demographics (Only for Youth) */}
            {formData.target_member_type === 'YOUTH_MEMBER' && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age Range</Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="number" 
                        placeholder="Min" 
                        className="w-20"
                        value={formData.min_age} 
                        onChange={e => setFormData({...formData, min_age: e.target.value})} 
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input 
                        type="number" 
                        placeholder="Max" 
                        className="w-20"
                        value={formData.max_age} 
                        onChange={e => setFormData({...formData, max_age: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex gap-4">
                      {GENDERS.map(g => (
                        <label key={g.value} className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.target_genders.includes(g.value)}
                            onChange={() => handleArrayToggle('target_genders', g.value)}
                            className="text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                          />
                          <span className="text-sm">{g.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Grades</Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map(g => (
                      <button 
                        type="button" 
                        key={g} 
                        onClick={() => handleArrayToggle('target_grades', g)}
                        className={`w-10 h-10 rounded-full font-bold text-sm transition
                          ${formData.target_grades.includes(g) 
                            ? 'bg-[#4D4DA4] text-white border-[#4D4DA4] shadow-md' 
                            : 'bg-white text-gray-600 border border-input hover:border-[#4D4DA4]'}
                        `}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Limits & Expiration */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Limits & Expiration</CardTitle>
            <CardDescription>Set expiration date and usage limits for this reward.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input 
                  type="date" 
                  value={formData.expiration_date} 
                  onChange={e => setFormData({...formData, expiration_date: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Total Usage Limit</Label>
                <Input 
                  type="number" 
                  placeholder="Leave empty for unlimited"
                  value={formData.usage_limit} 
                  onChange={e => setFormData({...formData, usage_limit: e.target.value})} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Automatic Triggers */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Automatic Triggers (Optional)</CardTitle>
            <CardDescription>Select when this reward should be automatically given.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRIGGERS.map(t => (
                <label 
                  key={t.value} 
                  className={`border p-4 rounded-lg cursor-pointer transition flex items-start gap-3
                    ${formData.active_triggers.includes(t.value) 
                      ? 'bg-[#EBEBFE]/30 border-[#4D4DA4]' 
                      : 'hover:bg-gray-50 border-input'}
                  `}
                >
                  <input 
                    type="checkbox" 
                    className="mt-1 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                    checked={formData.active_triggers.includes(t.value)}
                    onChange={() => {
                      const current = [...formData.active_triggers];
                      if (current.includes(t.value)) {
                        setFormData({...formData, active_triggers: current.filter(x => x !== t.value)});
                      } else {
                        setFormData({...formData, active_triggers: [...current, t.value]});
                      }
                    }}
                  />
                  <div>
                    <span className="block font-semibold text-[#121213]">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 6. Status */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Set whether this reward is active or inactive.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="is_active"
                  checked={formData.is_active === true}
                  onChange={() => setFormData({...formData, is_active: true})}
                  className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="is_active"
                  checked={formData.is_active === false}
                  onChange={() => setFormData({...formData, is_active: false})}
                  className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                />
                <span className="text-sm font-medium">Inactive</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(buildUrlWithParams(redirectPath))}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : initialData ? 'Update Reward' : 'Create Reward'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}