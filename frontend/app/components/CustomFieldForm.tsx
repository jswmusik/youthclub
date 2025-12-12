'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface CustomFieldFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

interface ClubOption { id: number; name: string; }

export default function CustomFieldForm({ initialData, redirectPath, scope }: CustomFieldFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    help_text: initialData?.help_text || '',
    field_type: initialData?.field_type || 'TEXT',
    options: initialData?.options || [],
    currentOptionInput: '',
    required: initialData?.required || false,
    is_published: initialData?.is_published ?? true,
    target_roles: initialData?.target_roles || ['YOUTH_MEMBER'],
    specific_clubs: initialData?.specific_clubs || [],
    context: initialData?.context || 'USER_PROFILE',
  });

  useEffect(() => {
    // If Municipality Admin, fetch clubs to allow limiting scope
    if (scope === 'MUNICIPALITY') {
      api.get('/clubs/').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
  }, [scope]);

  // --- Handlers ---

  const addOption = () => {
    if (!formData.currentOptionInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, prev.currentOptionInput.trim()],
      currentOptionInput: ''
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_: string, i: number) => i !== index)
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const roles = prev.target_roles.includes(role)
        ? prev.target_roles.filter((r: string) => r !== role)
        : [...prev.target_roles, role];
      return { ...prev, target_roles: roles };
    });
  };

  const toggleClub = (clubId: number) => {
    setFormData(prev => {
      const list = prev.specific_clubs.includes(clubId)
        ? prev.specific_clubs.filter((id: number) => id !== clubId)
        : [...prev.specific_clubs, clubId];
      return { ...prev, specific_clubs: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && formData.options.length === 0) {
      setToast({ message: "Please add at least one option.", type: 'error', isVisible: true });
      return;
    }
    if (formData.target_roles.length === 0) {
      setToast({ message: "Please select at least one target role.", type: 'error', isVisible: true });
      return;
    }

    setLoading(true);

    const payload = {
      name: formData.name,
      help_text: formData.help_text,
      field_type: formData.field_type,
      options: formData.options,
      required: formData.required,
      is_published: formData.is_published,
      target_roles: formData.target_roles,
      specific_clubs: formData.specific_clubs,
      context: formData.context,
    };

    try {
      if (initialData) {
        await api.patch(`/custom-fields/${initialData.id}/`, payload);
        setToast({ message: 'Field updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/custom-fields/', payload);
        setToast({ message: 'Field created!', type: 'success', isVisible: true });
      }
      // Preserve URL parameters (pagination, filters) when redirecting
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
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
            {initialData ? 'Edit Custom Field' : 'Create Custom Field'}
          </h1>
          <p className="text-sm text-muted-foreground">Define a new custom field for your forms.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the field label, type, and context.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Label <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  type="text" 
                  placeholder="e.g. T-Shirt Size"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Type <span className="text-red-500">*</span></Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.field_type}
                  onChange={e => setFormData({...formData, field_type: e.target.value as any})}
                >
                  <option value="TEXT">Text (Free type)</option>
                  <option value="SINGLE_SELECT">Single Select (Dropdown)</option>
                  <option value="MULTI_SELECT">Multi Select (Checkboxes)</option>
                  <option value="BOOLEAN">Boolean (Yes/No Checkbox)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Help Text (Optional)</Label>
              <Input 
                type="text" 
                placeholder="e.g. Select the size for your team jersey"
                value={formData.help_text}
                onChange={e => setFormData({...formData, help_text: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Usage Context */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Usage Context</CardTitle>
            <CardDescription>Select where this field will be displayed.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-input hover:border-[#4D4DA4]/50 hover:bg-[#EBEBFE]/30 transition-colors">
                <input 
                  type="radio" 
                  name="context"
                  value="USER_PROFILE"
                  checked={formData.context === 'USER_PROFILE'}
                  onChange={e => setFormData({...formData, context: e.target.value})}
                  className="mt-1 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                />
                <div className="flex-1">
                  <div className="font-semibold text-foreground">User Profile</div>
                  <div className="text-sm text-muted-foreground mt-1">Shown during registration/profile edit</div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-input hover:border-[#4D4DA4]/50 hover:bg-[#EBEBFE]/30 transition-colors">
                <input 
                  type="radio" 
                  name="context"
                  value="EVENT"
                  checked={formData.context === 'EVENT'}
                  onChange={e => setFormData({...formData, context: e.target.value})}
                  className="mt-1 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                />
                <div className="flex-1">
                  <div className="font-semibold text-foreground">Event Booking</div>
                  <div className="text-sm text-muted-foreground mt-1">Shown when booking an event ticket</div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 3. Options Builder */}
        {(formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Options List</CardTitle>
              <CardDescription>Add options for {formData.field_type === 'SINGLE_SELECT' ? 'dropdown' : 'checkbox'} selection.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  placeholder="Type option and press Enter or click Add..."
                  value={formData.currentOptionInput}
                  onChange={e => setFormData({...formData, currentOptionInput: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  className="flex-1"
                />
                <Button type="button" onClick={addOption} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>
              
              {formData.options.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-4 bg-[#EBEBFE]/30 rounded-lg border border-[#4D4DA4]/20">
                  {formData.options.map((opt: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-white border-[#4D4DA4]/30 text-[#4D4DA4] px-3 py-1.5 flex items-center gap-2">
                      {opt}
                      <button 
                        type="button" 
                        onClick={() => removeOption(idx)} 
                        className="ml-1 hover:bg-[#4D4DA4]/10 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${opt}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No options added yet. Add at least one option to continue.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. Target Roles */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Target Roles</CardTitle>
            <CardDescription>Select which user roles should see this field.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.target_roles.includes('YOUTH_MEMBER')}
                  onChange={() => toggleRole('YOUTH_MEMBER')}
                  className="w-4 h-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                />
                <span className="text-sm font-medium">Youth Members</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.target_roles.includes('GUARDIAN')}
                  onChange={() => toggleRole('GUARDIAN')}
                  className="w-4 h-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                />
                <span className="text-sm font-medium">Guardians</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 5. Field Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Field Settings</CardTitle>
            <CardDescription>Configure field status and requirements.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            {/* Field Status */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-input bg-[#EBEBFE]/30">
              <div className="flex items-center gap-3 flex-1">
                <input 
                  type="checkbox" 
                  checked={formData.is_published}
                  onChange={e => setFormData({...formData, is_published: e.target.checked})}
                  className="w-5 h-5 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                />
                <div className="flex-1">
                  <div className="font-semibold text-foreground">
                    {formData.is_published ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formData.is_published 
                      ? 'This field will be visible to users' 
                      : 'This field will be hidden from users'}
                  </div>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={formData.is_published 
                  ? "bg-green-50 text-green-700 border-green-200" 
                  : "bg-gray-50 text-gray-600 border-gray-200"
                }
              >
                {formData.is_published ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Required Field */}
            <div className="flex items-center gap-3 p-4 rounded-lg border border-input">
              <input 
                type="checkbox" 
                checked={formData.required}
                onChange={e => setFormData({...formData, required: e.target.checked})}
                className="w-5 h-5 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
              />
              <div>
                <div className="font-semibold text-foreground">Required Field</div>
                <div className="text-sm text-muted-foreground">Users must fill this field before submitting</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Municipality: Limit Clubs */}
        {scope === 'MUNICIPALITY' && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Limit to Specific Clubs</CardTitle>
              <CardDescription>Optionally limit this field to specific clubs. If no clubs are selected, this field applies to ALL clubs in your municipality.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {clubs.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4 bg-[#EBEBFE]/30 space-y-2">
                  {clubs.map(club => (
                    <label key={club.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.specific_clubs.includes(club.id)}
                        onChange={() => toggleClub(club.id)}
                        className="w-4 h-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                      />
                      <span className="text-sm">{club.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No clubs found.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(redirectPath)}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : initialData ? 'Update Field' : 'Create Field'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
