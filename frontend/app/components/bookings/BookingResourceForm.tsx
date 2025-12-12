'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, Package } from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import Toast from '../Toast';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Props {
  initialData?: any;
  redirectPath: string;
  clubId?: number; // Optional now
}

export default function BookingResourceForm({ initialData, redirectPath, clubId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [clubs, setClubs] = useState<any[]>([]); // To store available clubs
  const [groups, setGroups] = useState<any[]>([]); // To store available groups
  const [qualificationGroups, setQualificationGroups] = useState<any[]>([]); // To store CLOSED groups for qualification
  
  const imageRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    resource_type: initialData?.resource_type || 'ROOM',
    requires_training: initialData?.requires_training || false,
    qualification_group: (initialData?.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData?.qualification_group || ''),
    max_participants: initialData?.max_participants || 1,
    allowed_user_scope: initialData?.allowed_user_scope || 'CLUB',
    allowed_group: (initialData?.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData?.allowed_group || ''),
    auto_approve: initialData?.auto_approve ?? false,
    booking_window_weeks: initialData?.booking_window_weeks || 4,
    max_bookings_per_user_per_week: initialData?.max_bookings_per_user_per_week || 3,
    is_active: initialData?.is_active ?? true,
    club: (initialData?.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData?.club || clubId || '') // Handle object or ID
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image ? getMediaUrl(initialData.image) : null);

  useEffect(() => {
    // Fetch clubs list if not forced via prop (needed for both create and edit modes)
    if (!clubId) {
        api.get('/clubs/?page_size=100').then(res => {
            setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
        }).catch(err => {
            console.error('Failed to load clubs', err);
        });
    }
  }, [clubId]);

  // Update formData when initialData changes (for async loading in edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        resource_type: initialData.resource_type || 'ROOM',
        requires_training: initialData.requires_training || false,
        qualification_group: (initialData.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData.qualification_group || ''),
        max_participants: initialData.max_participants || 1,
        allowed_user_scope: initialData.allowed_user_scope || 'CLUB',
        allowed_group: (initialData.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData.allowed_group || ''),
        auto_approve: initialData.auto_approve ?? false,
        booking_window_weeks: initialData.booking_window_weeks || 4,
        max_bookings_per_user_per_week: initialData.max_bookings_per_user_per_week || 3,
        is_active: initialData.is_active ?? true,
        club: (initialData.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData.club || clubId || '')
      });
      
      // Update image preview if image exists
      if (initialData.image) {
        setImagePreview(getMediaUrl(initialData.image));
      }
    }
  }, [initialData, clubId]);

  useEffect(() => {
    // Fetch groups when club is selected or available
    const targetClubId = clubId || formData.club || initialData?.club;
    if (targetClubId) {
      api.get(`/groups/?club=${targetClubId}&page_size=100`).then(res => {
        const allGroups = Array.isArray(res.data) ? res.data : res.data.results || [];
        setGroups(allGroups);
        
        // Filter CLOSED groups for qualification (hidden groups)
        const closedGroups = allGroups.filter((g: any) => g.group_type === 'CLOSED');
        setQualificationGroups(closedGroups);
      }).catch(err => {
        console.error('Failed to load groups', err);
        setGroups([]);
        setQualificationGroups([]);
      });
    } else {
      setGroups([]);
      setQualificationGroups([]);
    }
  }, [clubId, formData.club, initialData?.club]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.club) {
        setToast({ message: 'Please select a club.', type: 'error', isVisible: true });
        return;
    }
    if (formData.allowed_user_scope === 'GROUP' && !formData.allowed_group) {
        setToast({ message: 'Please select a group when "Specific Group Only" is chosen.', type: 'error', isVisible: true });
        return;
    }
    if (formData.requires_training && !formData.qualification_group) {
        setToast({ message: 'Please select a qualification group when "Requires Qualification/Training" is checked.', type: 'error', isVisible: true });
        return;
    }
    setLoading(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Handle empty string for allowed_group and qualification_group - send empty string to clear it
        if (key === 'allowed_group' || key === 'qualification_group') {
          data.append(key, value || '');
        } else {
          data.append(key, value.toString());
        }
      });
      if (imageFile) data.append('image', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        // EDIT MODE: Stay here or go back to list
        await api.patch(`/bookings/resources/${initialData.id}/`, data, config);
        setToast({ message: 'Resource updated successfully!', type: 'success', isVisible: true });
        setTimeout(() => router.push(redirectPath), 1000);
      } else {
        // CREATE MODE: Capture response to get ID
        const res = await api.post('/bookings/resources/', data, config);
        const newResourceId = res.data.id;
        setToast({ message: 'Resource created successfully!', type: 'success', isVisible: true });
        
        // Redirect to the SCHEDULE page for this new resource
        setTimeout(() => router.push(`${redirectPath}/${newResourceId}/schedule`), 1000);
      }
      
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Error saving resource.';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
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
          <h1 className="text-2xl font-bold tracking-tight text-[#121213]">
            {initialData ? 'Edit Resource' : 'Create New Resource'}
          </h1>
          <p className="text-sm text-gray-500">Manage booking resource details and settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details for this resource.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            {/* Club Selector (Only if not fixed) */}
            {!clubId && (
              <div className="space-y-2">
                <Label>Assign to Club <span className="text-red-500">*</span></Label>
                <select 
                  required
                  className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                  value={formData.club}
                  onChange={e => setFormData({...formData, club: e.target.value})}
                >
                  <option value="">Select a Club...</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  className="h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Type <span className="text-red-500">*</span></Label>
                <select 
                  className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                  value={formData.resource_type}
                  onChange={e => setFormData({...formData, resource_type: e.target.value})}
                >
                  <option value="ROOM">Room</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                className="min-h-[100px] bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Enter a description for this resource..."
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Resource Image */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Resource Image</CardTitle>
            <CardDescription>Upload an image for this resource.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="relative group h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => imageRef.current?.click()}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                    <span className="text-xs text-gray-500">Click to upload</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => imageRef.current?.click()}>Choose File</Button>
                  {imagePreview && (
                    <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleRemoveImage}>
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">Recommended: Square image, 400x400px</p>
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </CardContent>
        </Card>

        {/* 3. Rules & Limits */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Rules & Limits</CardTitle>
            <CardDescription>Configure booking rules and participant limits.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input 
                  type="number" 
                  min="1"
                  className="h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                  value={formData.max_participants}
                  onChange={e => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Who can book?</Label>
                <select 
                  className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                  value={formData.allowed_user_scope}
                  onChange={e => {
                    const newScope = e.target.value;
                    setFormData({
                      ...formData, 
                      allowed_user_scope: newScope,
                      // Clear group selection if not GROUP scope
                      allowed_group: newScope === 'GROUP' ? formData.allowed_group : ''
                    });
                  }}
                >
                  <option value="CLUB">This Club Only</option>
                  <option value="MUNICIPALITY">Municipality Members</option>
                  <option value="GLOBAL">Everyone</option>
                  <option value="GROUP">Specific Group Only</option>
                </select>
              </div>

              {formData.allowed_user_scope === 'GROUP' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Select Group <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                    value={formData.allowed_group}
                    onChange={e => setFormData({...formData, allowed_group: e.target.value})}
                    required
                  >
                    <option value="">Select a Group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {groups.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">No groups available. Please create a group first.</p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Booking Window (Weeks)</Label>
                <Input 
                  type="number" 
                  min="1"
                  className="h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                  value={formData.booking_window_weeks}
                  onChange={e => setFormData({...formData, booking_window_weeks: parseInt(e.target.value)})}
                />
                <p className="text-xs text-gray-500">How far in advance users can book.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Max Bookings / User / Week</Label>
                <Input 
                  type="number" 
                  min="0"
                  className="h-12 bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                  value={formData.max_bookings_per_user_per_week}
                  onChange={e => setFormData({...formData, max_bookings_per_user_per_week: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-gray-500">Limit how many times per week a user can book this resource. Set to 0 for no limit.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure resource availability and approval settings.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="training"
                  checked={formData.requires_training}
                  onChange={e => {
                    setFormData({
                      ...formData, 
                      requires_training: e.target.checked,
                      qualification_group: e.target.checked ? formData.qualification_group : ''
                    });
                  }}
                  className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300"
                />
                <Label htmlFor="training" className="text-sm font-medium cursor-pointer">Requires Qualification/Training</Label>
              </div>
              
              {/* Qualification Group Selection - Only show when requires_training is checked */}
              {formData.requires_training && (
                <div className="ml-6 space-y-2">
                  <Label>Qualification Group <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                    value={formData.qualification_group}
                    onChange={e => setFormData({...formData, qualification_group: e.target.value})}
                    required
                  >
                    <option value="">Select a hidden group...</option>
                    {qualificationGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">Only CLOSED (hidden) groups can be used for qualifications.</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="active"
                checked={formData.is_active}
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4 text-green-600 focus:ring-green-600 rounded border-gray-300"
              />
              <Label htmlFor="active" className="text-sm font-medium text-green-700 cursor-pointer">Is Active (Bookable)</Label>
            </div>

            <div className="flex items-start space-x-2">
              <input 
                type="checkbox" 
                id="auto_approve"
                checked={formData.auto_approve}
                onChange={e => setFormData({...formData, auto_approve: e.target.checked})}
                className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300 mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="auto_approve" className="text-sm font-medium cursor-pointer">Auto-Approve Bookings</Label>
                <p className="text-xs text-gray-500 mt-1">If checked, bookings are automatically approved. Otherwise, they require admin approval.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            {loading ? 'Saving...' : initialData ? 'Update Resource' : 'Create Resource'}
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