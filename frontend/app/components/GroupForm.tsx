'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import MemberSelector from './MemberSelector';
import CustomRuleBuilder from './CustomRuleBuilder';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Interest {
  id: number;
  name: string;
}

interface GroupFormProps {
  initialData?: any; // If provided, we are in "Edit Mode"
  redirectPath: string; // Where to go after saving
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1); // [1, 2, ... 12, 13]
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export default function GroupForm({ initialData, redirectPath }: GroupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  
  // File uploads
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_type: 'OPEN',
    target_member_type: 'YOUTH',
    min_age: '',
    max_age: '',
    grades: [] as number[],
    genders: [] as string[],
    interests: [] as number[],
    custom_field_rules: {} as Record<string, any>, // NEW: Custom Fields
    members_to_add: [] as number[],
  });

  useEffect(() => {
    // 1. Fetch Interests
    api.get('/interests/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setInterestsList(data || []);
    });

    // 2. Load Initial Data (if editing)
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        group_type: initialData.group_type,
        target_member_type: initialData.target_member_type,
        min_age: initialData.min_age || '',
        max_age: initialData.max_age || '',
        grades: initialData.grades || [],
        genders: initialData.genders || [],
        interests: initialData.interests || [],
        custom_field_rules: initialData.custom_field_rules || {}, // Load existing rules
        members_to_add: [],
      });
      
      // Set previews for existing images
      if (initialData.avatar) {
        setAvatarPreview(getMediaUrl(initialData.avatar));
      }
      if (initialData.background_image) {
        setBackgroundPreview(getMediaUrl(initialData.background_image));
      }
    }
  }, [initialData]);
  
  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
    };
  }, [avatarPreview, backgroundPreview]);

  // --- Handlers ---

  const toggleGrade = (grade: number) => {
    setFormData(prev => {
      const exists = prev.grades.includes(grade);
      if (exists) return { ...prev, grades: prev.grades.filter(g => g !== grade) };
      return { ...prev, grades: [...prev.grades, grade].sort((a, b) => a - b) };
    });
  };

  const toggleGender = (gender: string) => {
    setFormData(prev => {
      const exists = prev.genders.includes(gender);
      if (exists) return { ...prev, genders: prev.genders.filter(g => g !== gender) };
      return { ...prev, genders: [...prev.genders, gender] };
    });
  };

  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      if (exists) return { ...prev, interests: prev.interests.filter(i => i !== id) };
      return { ...prev, interests: [...prev.interests, id] };
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
      setBackgroundImageFile(file);
      setBackgroundPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'bg') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setBackgroundImageFile(null);
      setBackgroundPreview(null);
      if (bgRef.current) bgRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Basic fields
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('group_type', formData.group_type);
      data.append('target_member_type', formData.target_member_type);
      
      if (formData.min_age) {
        data.append('min_age', parseInt(formData.min_age as string).toString());
      }
      if (formData.max_age) {
        data.append('max_age', parseInt(formData.max_age as string).toString());
      }
      
      // Arrays
      data.append('grades', JSON.stringify(formData.grades));
      data.append('genders', JSON.stringify(formData.genders));
      formData.interests.forEach(id => data.append('interests', id.toString()));
      
      // Custom field rules - always send, even if empty
      data.append('custom_field_rules', JSON.stringify(formData.custom_field_rules || {}));
      
      // File uploads - only append if new files are selected
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }
      if (backgroundImageFile) {
        data.append('background_image', backgroundImageFile);
      }
      
      // Members to add
      formData.members_to_add.forEach(id => data.append('members_to_add', id.toString()));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        // Update
        await api.patch(`/groups/${initialData.id}/`, data, config);
        setToast({ message: 'Group updated successfully!', type: 'success', isVisible: true });
      } else {
        // Create
        await api.post('/groups/', data, config);
        setToast({ message: 'Group created successfully!', type: 'success', isVisible: true });
      }
      
      // Delay redirect slightly to show toast
      // Use redirectPath as-is if it already contains query parameters
      // Otherwise, append current search params
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => {
        router.push(finalRedirectPath);
      }, 1000);

    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please check your inputs.', type: 'error', isVisible: true });
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
            {initialData ? 'Edit Group' : 'Create New Group'}
          </h1>
          <p className="text-sm text-muted-foreground">Define the rules for who belongs in this group.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter group name, type, and description.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group Name <span className="text-red-500">*</span></Label>
                <Input 
                  required
                  placeholder="e.g. Summer Football Camp"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Group Type <span className="text-red-500">*</span></Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.group_type}
                  onChange={e => setFormData({...formData, group_type: e.target.value})}
                >
                  <option value="OPEN">Open (Join Freely)</option>
                  <option value="APPLICATION">Application Required</option>
                  <option value="CLOSED">Closed (Invite Only)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea 
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe what this group is about..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Profile Visuals */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Profile Visuals</CardTitle>
            <CardDescription>Upload profile images for this group.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Background Image */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative group h-20 w-32 rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => bgRef.current?.click()}>
                    {backgroundPreview ? (
                      <>
                        <img src={backgroundPreview} className="h-full w-full object-cover" />
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
                      <Button type="button" variant="secondary" size="sm" onClick={() => bgRef.current?.click()}>Choose File</Button>
                      {backgroundPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('bg')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: 1200x400px</p>
                  </div>
                  <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundChange} />
                </div>
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar</Label>
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
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Membership Rules */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Membership Rules</CardTitle>
            <CardDescription>Define who can join this group based on criteria.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            {/* Member Type */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer flex-1">
                  <input 
                    type="radio" 
                    name="member_type"
                    value="YOUTH"
                    checked={formData.target_member_type === 'YOUTH'}
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

            {/* Age Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Age</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Any"
                  value={formData.min_age}
                  onChange={e => setFormData({...formData, min_age: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Age</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100"
                  placeholder="Any"
                  value={formData.max_age}
                  onChange={e => setFormData({...formData, max_age: e.target.value})}
                />
              </div>
            </div>

            {/* Grades (Only if Youth) */}
            {formData.target_member_type === 'YOUTH' && (
              <div className="space-y-2">
                <Label>Allowed Grades</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map(grade => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition
                        ${formData.grades.includes(grade) 
                          ? 'bg-[#4D4DA4] text-white shadow-md' 
                          : 'bg-white border border-input text-gray-600 hover:border-[#4D4DA4]'}
                      `}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
                {formData.grades.length === 0 && <p className="text-xs text-muted-foreground mt-1">Leave empty to allow all grades.</p>}
              </div>
            )}

            {/* Gender */}
            <div className="space-y-2">
              <Label>Allowed Genders</Label>
              <div className="flex gap-4">
                {GENDERS.map(g => (
                  <label key={g.value} className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.genders.includes(g.value)}
                      onChange={() => toggleGender(g.value)}
                      className="text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                    />
                    <span className="text-sm">{g.label}</span>
                  </label>
                ))}
              </div>
              {formData.genders.length === 0 && <p className="text-xs text-muted-foreground mt-1">Leave empty to allow all genders.</p>}
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label>Required Interests</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-input p-4 rounded-lg bg-muted/30">
                {interestsList.map(interest => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition
                      ${formData.interests.includes(interest.id)
                        ? 'bg-[#4D4DA4] text-white'
                        : 'bg-white border border-input text-gray-600 hover:border-[#4D4DA4]'}
                    `}
                  >
                    {interest.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Users matching ANY of selected interests will be eligible.</p>
            </div>

            {/* Custom Field Rules */}
            <div className="space-y-2">
              <Label>Custom Field Rules</Label>
              <p className="text-xs text-muted-foreground mb-2">Members must match ALL these additional conditions.</p>
              <CustomRuleBuilder 
                currentRules={formData.custom_field_rules}
                onChange={(newRules) => setFormData(prev => ({...prev, custom_field_rules: newRules}))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Add Members */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Add Members</CardTitle>
            <CardDescription>Select users to immediately add to this group.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The list below filters based on ALL the rules above (Age, Grade, Interests, Custom Fields).
            </p>
            
            <MemberSelector
              criteria={{
                target_member_type: formData.target_member_type,
                min_age: formData.min_age,
                max_age: formData.max_age,
                grades: formData.grades,
                genders: formData.genders,
                interests: formData.interests,
                custom_field_rules: formData.custom_field_rules
              }}
              selectedIds={formData.members_to_add}
              onChange={(ids) => setFormData(prev => ({ ...prev, members_to_add: ids }))}
              excludeGroupId={initialData?.id}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(redirectPath)}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : initialData ? 'Update Group' : 'Create Group'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}