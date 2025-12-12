'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Search } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Option { id: number; name: string; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }

interface YouthFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function YouthForm({ initialData, redirectPath, scope }: YouthFormProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Dropdown Data
  const [clubs, setClubs] = useState<Option[]>([]);
  const [interestsList, setInterestsList] = useState<Option[]>([]);
  const [guardiansList, setGuardiansList] = useState<GuardianOption[]>([]);

  // Refs for files
  const avatarRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  // Search States
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [showGuardianDropdown, setShowGuardianDropdown] = useState(false);
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  // --- VISUALS STATE ---
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);
  
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(initialData?.background_image ? getMediaUrl(initialData.background_image) : null);
  
  const [mood, setMood] = useState(initialData?.mood_status || '');

  // Main Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    preferred_gender: initialData?.preferred_gender || '',
    phone_number: initialData?.phone_number || '',
    date_of_birth: initialData?.date_of_birth || '',
    grade: initialData?.grade || '',
    // Handle object vs ID for preferred_club
    preferred_club: initialData?.preferred_club ? (typeof initialData.preferred_club === 'object' ? initialData.preferred_club.id : initialData.preferred_club) : '',
    verification_status: initialData?.verification_status || 'UNVERIFIED',
    // Handle array of objects vs IDs
    interests: initialData?.interests ? initialData.interests.map((i: any) => typeof i === 'object' ? i.id : i) : [],
    guardians: initialData?.guardians ? initialData.guardians.map((g: any) => typeof g === 'object' ? g.id : g) : [],
  });

  // Custom Fields State
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchDropdowns();
    if (initialData) {
        // Load custom field values if editing
        api.get(`/users/${initialData.id}/`).then(res => {
            const values: Record<number, any> = {};
            (res.data.custom_field_values || []).forEach((cfv: any) => {
                values[cfv.field] = cfv.value;
            });
            setCustomFieldValues(values);
        }).catch(console.error);
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      const [clubRes, intRes, guardRes] = await Promise.all([
        api.get('/clubs/?page_size=1000'),
        api.get('/interests/'),
        api.get('/users/list_guardians/')
      ]);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
      setInterestsList(Array.isArray(intRes.data) ? intRes.data : intRes.data.results || []);
      setGuardiansList(guardRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Handlers ---

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBgFile(e.target.files[0]);
      setBgPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'bg') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    } else {
      setBgFile(null);
      setBgPreview(null);
      if (bgRef.current) bgRef.current.value = '';
    }
  };

  // Interest Logic
  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return { 
        ...prev, 
        interests: exists ? prev.interests.filter((i: number) => i !== id) : [...prev.interests, id] 
      };
    });
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((i: number) => i !== id)
    }));
  };

  const getSelectedInterests = () => formData.interests.map((id: number) => interestsList.find(i => i.id === id)).filter(Boolean) as Option[];
  
  const filteredInterests = interestsList.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
  );

  // Guardian Logic
  const toggleGuardian = (id: number) => {
    setFormData(prev => {
      const exists = prev.guardians.includes(id);
      return { 
        ...prev, 
        guardians: exists ? prev.guardians.filter((g: number) => g !== id) : [...prev.guardians, id] 
      };
    });
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
  };

  const removeGuardian = (id: number) => {
    setFormData(prev => ({
      ...prev,
      guardians: prev.guardians.filter((g: number) => g !== id)
    }));
  };

  const getSelectedGuardians = () => formData.guardians.map((id: number) => guardiansList.find(g => g.id === id)).filter(Boolean) as GuardianOption[];

  const filteredGuardians = guardiansList.filter(g => {
    const term = guardianSearchTerm.toLowerCase();
    const match = g.email.toLowerCase().includes(term) || g.first_name.toLowerCase().includes(term) || g.last_name.toLowerCase().includes(term);
    return match && !formData.guardians.includes(g.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Basic Fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'interests' || key === 'guardians') return;
        data.append(key, value.toString());
      });

      // Arrays
      formData.interests.forEach((id: number) => data.append('interests', id.toString()));
      formData.guardians.forEach((id: number) => data.append('guardians', id.toString()));
      
      // Fixed Role
      data.append('role', 'YOUTH_MEMBER');
      
      // Visuals - only append files if they're new uploads
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }
      if (bgFile) {
        data.append('background_image', bgFile);
      }
      // Always append mood_status (can be empty string)
      if (mood !== undefined) {
        data.append('mood_status', mood);
      }

      // Auto-assign context for Club Admin if they didn't select one
      if (scope === 'CLUB' && currentUser?.assigned_club && !formData.preferred_club) {
         const clubId = typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club;
         data.append('preferred_club', clubId.toString());
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        setToast({ message: 'Youth member updated!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        setToast({ message: 'Youth member created!', type: 'success', isVisible: true });
      }

      // Save Custom Fields
      if (Object.keys(customFieldValues).length > 0) {
        await api.post('/custom-fields/save_values_for_user/', {
            user_id: userId,
            values: customFieldValues
        });
      }

      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed.', type: 'error', isVisible: true });
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
            {initialData ? 'Edit Youth Member' : 'Create New Youth Member'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage youth member details and information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Profile Visuals */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Profile Visuals</CardTitle>
            <CardDescription>Upload profile images and set mood status.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Background Image */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex gap-4 items-center">
                  <div className="relative group h-20 w-32 rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => bgRef.current?.click()}>
                    {bgPreview ? (
                      <>
                        <img src={bgPreview} className="h-full w-full object-cover" />
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
                      {bgPreview && (
                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveImage('bg')}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: 1200x400px</p>
                  </div>
                  <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgChange} />
                </div>
              </div>

              {/* Avatar & Mood */}
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label>Mood Status</Label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Playing FIFA..." 
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Identity */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Enter basic personal information.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{initialData ? 'New Password (Optional)' : 'Password'} {!initialData && <span className="text-red-500">*</span>}</Label>
                <Input type="password" required={!initialData} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Verification Status */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Set the verification status for this youth member.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              {['UNVERIFIED', 'PENDING', 'VERIFIED'].map(status => (
                <label key={status} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="verification_status"
                    value={status}
                    checked={formData.verification_status === status}
                    onChange={e => setFormData({...formData, verification_status: e.target.value})}
                    className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                  />
                  <span className="text-sm font-medium">{status}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 4. Demographics */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
            <CardDescription>Enter demographic information.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input type="number" placeholder="e.g. 7" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Legal Gender</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.legal_gender} 
                  onChange={e => setFormData({...formData, legal_gender: e.target.value})}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Gender</Label>
                <Input value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Club & Guardians & Interests */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Club, Guardians & Interests</CardTitle>
            <CardDescription>Assign club, guardians, and interests for this youth member.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            {/* Preferred Club */}
            <div className="space-y-2">
              <Label>Preferred Club</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.preferred_club} 
                onChange={e => setFormData({...formData, preferred_club: e.target.value})}
              >
                <option value="">Select Club...</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Guardians */}
            <div className="space-y-2">
              <Label>Assign Guardians</Label>
              
              {/* Selected Guardians Display */}
              {formData.guardians.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#4D4DA4]/20">
                  {getSelectedGuardians().map(g => (
                    <Badge key={g.id} variant="outline" className="bg-[#4D4DA4] text-white border-[#4D4DA4] px-3 py-1">
                      {g.first_name} {g.last_name}
                      <button
                        type="button"
                        onClick={() => removeGuardian(g.id)}
                        className="ml-2 hover:bg-[#4D4DA4]/80 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${g.first_name} ${g.last_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Searchable Dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search guardians by name or email..."
                    value={guardianSearchTerm}
                    onChange={(e) => {
                      setGuardianSearchTerm(e.target.value);
                      setShowGuardianDropdown(true);
                    }}
                    onFocus={() => setShowGuardianDropdown(true)}
                    className="pl-9"
                  />
                </div>

                {/* Dropdown List */}
                {showGuardianDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowGuardianDropdown(false)}
                    ></div>
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredGuardians.length > 0 ? (
                        filteredGuardians.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGuardian(g.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#EBEBFE]/50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{g.first_name} {g.last_name}</div>
                            <div className="text-xs text-gray-500">{g.email}</div>
                          </button>
                        ))
                      ) : guardianSearchTerm ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No guardians found matching "{guardianSearchTerm}"
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {formData.guardians.length === 0 
                            ? 'No guardians available. Create a guardian first.'
                            : 'All guardians are already selected.'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label>Interests</Label>
              
              {/* Selected Interests Display */}
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#4D4DA4]/20">
                  {getSelectedInterests().map(interest => (
                    <Badge key={interest.id} variant="outline" className="bg-[#4D4DA4] text-white border-[#4D4DA4] px-3 py-1">
                      {interest.name}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest.id)}
                        className="ml-2 hover:bg-[#4D4DA4]/80 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${interest.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Searchable Dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search interests by name..."
                    value={interestSearchTerm}
                    onChange={(e) => {
                      setInterestSearchTerm(e.target.value);
                      setShowInterestDropdown(true);
                    }}
                    onFocus={() => setShowInterestDropdown(true)}
                    className="pl-9"
                  />
                </div>

                {/* Dropdown List */}
                {showInterestDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowInterestDropdown(false)}
                    ></div>
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredInterests.length > 0 ? (
                        filteredInterests.map(interest => (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#EBEBFE]/50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{interest.name}</div>
                          </button>
                        ))
                      ) : interestSearchTerm ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No interests found matching "{interestSearchTerm}"
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {formData.interests.length === 0 
                            ? 'No interests available. Create interests in the admin panel first.'
                            : 'All interests are already selected.'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Custom Fields */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>Additional custom field values for this youth member.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <CustomFieldsForm
              targetRole="YOUTH_MEMBER"
              context="USER_PROFILE"
              values={customFieldValues}
              onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
              userId={initialData ? initialData.id : null}
              userMunicipalityId={null}
              userClubId={formData.preferred_club ? Number(formData.preferred_club) : null}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(redirectPath)}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : initialData ? 'Update Youth' : 'Create Youth'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
