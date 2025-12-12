'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../../app/utils';
import { useAuth } from '../../context/AuthContext';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Option { id: number; name: string; }

interface AdminFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function AdminForm({ initialData, redirectPath, scope }: AdminFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Refs for files
  const avatarRef = useRef<HTMLInputElement>(null);

  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);

  // Determine allowed roles based on scope
  const allowedRoles = [];
  if (scope === 'SUPER') allowedRoles.push('SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'MUNICIPALITY') allowedRoles.push('MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'CLUB') allowedRoles.push('CLUB_ADMIN');

  // Determine default role based on scope
  const getDefaultRole = () => {
    if (scope === 'CLUB') return 'CLUB_ADMIN';
    if (scope === 'MUNICIPALITY') return 'MUNICIPALITY_ADMIN';
    return 'MUNICIPALITY_ADMIN'; // Default for SUPER
  };

  // Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    phone_number: initialData?.phone_number || '',
    profession: initialData?.profession || '',
    assigned_municipality: initialData?.assigned_municipality || '',
    assigned_club: initialData?.assigned_club || '',
    hide_contact_info: initialData?.hide_contact_info || false,
    role: initialData?.role || getDefaultRole()
  });

  useEffect(() => {
    fetchDropdowns();
    // Ensure role is always CLUB_ADMIN for CLUB scope
    if (scope === 'CLUB' && !initialData) {
      setFormData(prev => prev.role !== 'CLUB_ADMIN' ? {...prev, role: 'CLUB_ADMIN'} : prev);
    }
  }, [scope, initialData]);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      // Fetch clubs if needed (Muni admins get their scope's clubs automatically via API)
      const clubRes = await api.get('/clubs/');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(preview);
      }
    }
  };

  const handleRemoveImage = (type: 'avatar') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Required fields - always send
      data.append('email', formData.email);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('role', formData.role);
      data.append('legal_gender', formData.legal_gender);
      
      // Password - only send if provided (required for create, optional for update)
      if (formData.password) {
        data.append('password', formData.password);
      }
      
      // Optional fields - only send if they have values
      if (formData.phone_number) {
        data.append('phone_number', formData.phone_number);
      }
      
      if (formData.nickname) {
        data.append('nickname', formData.nickname);
      }
      
      if (formData.profession) {
        data.append('profession', formData.profession);
      }
      
      // Boolean field
      data.append('hide_contact_info', formData.hide_contact_info.toString());

      // Handle assignments - only send if they have values
      if (scope === 'MUNICIPALITY' && currentUser?.assigned_municipality) {
         // If Municipality Admin creates a user, force assignment to their municipality
         const muniId = typeof currentUser.assigned_municipality === 'object' 
            ? currentUser.assigned_municipality.id 
            : currentUser.assigned_municipality;
         data.append('assigned_municipality', muniId.toString());
      } else if (formData.assigned_municipality && formData.assigned_municipality !== '') {
        // Only send if explicitly set and not empty
        data.append('assigned_municipality', formData.assigned_municipality.toString());
      }
      
      if (scope === 'CLUB' && currentUser?.assigned_club) {
         const clubId = typeof currentUser.assigned_club === 'object' 
            ? currentUser.assigned_club.id 
            : currentUser.assigned_club;
         data.append('assigned_club', clubId.toString());
         data.append('role', 'CLUB_ADMIN'); // Force role
      } else if (formData.assigned_club && formData.assigned_club !== '') {
        // Only send if explicitly set and not empty
        data.append('assigned_club', formData.assigned_club.toString());
      }

      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        setToast({ message: 'Admin updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/users/', data, config);
        setToast({ message: 'Admin created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Operation failed. Check your inputs.';
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
            {initialData ? 'Edit Admin' : 'Create New Admin'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage admin details and permissions.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the essential details for the admin user.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            {/* Role Selection (If applicable) */}
            {allowedRoles.length > 1 && (
              <div className="space-y-2">
                <Label>Role <span className="text-red-500">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {allowedRoles.map(role => (
                    <Button
                      key={role}
                      type="button"
                      variant={formData.role === role ? "default" : "outline"}
                      onClick={() => setFormData({...formData, role})}
                      className={formData.role === role ? "bg-[#4D4DA4] hover:bg-[#FF5485] text-white" : ""}
                    >
                      {role.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
              {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
                <div className="space-y-2">
                  <Label>Nickname</Label>
                  <Input type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Password {!initialData && <span className="text-red-500">*</span>}</Label>
                <Input type="password" placeholder={initialData ? "Leave blank to keep current password" : "Password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* 2. Assignments & Permissions */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Assignments & Permissions</CardTitle>
            <CardDescription>Assign the admin to a municipality or club based on their role.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            {/* Show Municipality Dropdown only if creating Municipality Admin and scope allows selection */}
            {formData.role === 'MUNICIPALITY_ADMIN' && scope === 'SUPER' && (
              <div className="space-y-2">
                <Label>Assign Municipality</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.assigned_municipality} 
                  onChange={e => setFormData({...formData, assigned_municipality: e.target.value})}
                >
                  <option value="">Select Municipality</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {/* Show Club Dropdown if creating Club Admin */}
            {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
              <>
                <div className="space-y-2">
                  <Label>Assign Club</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.assigned_club} 
                    onChange={e => setFormData({...formData, assigned_club: e.target.value})}
                  >
                    <option value="">Select Club</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {/* Profession field for Club Admin */}
                <div className="space-y-2">
                  <Label>Profession / Title</Label>
                  <Input type="text" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} placeholder="e.g. Youth Coordinator, Program Director" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Avatar */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload an avatar image for the admin profile.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
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
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'avatar')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(buildUrlWithParams(redirectPath))}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : 'Save Admin'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}