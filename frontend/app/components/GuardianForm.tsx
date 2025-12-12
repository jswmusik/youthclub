'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Search } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';
import { fetchGuardianRelationships, verifyGuardianRelationship, rejectGuardianRelationship, resetGuardianRelationship } from '../../lib/api';
import ConfirmationModal from './ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface YouthOption { id: number; first_name: string; last_name: string; email: string; grade?: number; }

interface GuardianFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function GuardianForm({ initialData, redirectPath, scope }: GuardianFormProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Dropdown Data
  const [youthList, setYouthList] = useState<YouthOption[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);

  // Search States
  const [youthSearchTerm, setYouthSearchTerm] = useState('');
  const [showYouthDropdown, setShowYouthDropdown] = useState(false);

  // Refs for files
  const avatarRef = useRef<HTMLInputElement>(null);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);

  // Main Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone_number: initialData?.phone_number || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    verification_status: initialData?.verification_status || 'UNVERIFIED',
    // In Django serializer, 'youth_members' can be a list of IDs or objects with relationship details
    // Normalize to just IDs for form state
    youth_members: initialData?.youth_members 
      ? initialData.youth_members.map((item: any) => typeof item === 'object' && item !== null ? item.id : item).filter((id: any) => id != null)
      : [], 
  });

  // Custom Fields State
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchDropdowns();
    if (initialData) {
        // Load custom field values
        api.get(`/users/${initialData.id}/`).then(res => {
            const values: Record<number, any> = {};
            (res.data.custom_field_values || []).forEach((cfv: any) => {
                values[cfv.field] = cfv.value;
            });
            setCustomFieldValues(values);
        }).catch(console.error);
        
        // Load relationships for this guardian
        if (initialData.id) {
            fetchGuardianRelationships({ guardian_id: initialData.id })
                .then(res => {
                    const relData = res.data.results || res.data || [];
                    // Deduplicate by relationship ID to avoid showing the same relationship multiple times
                    const uniqueRelationships = Array.isArray(relData) 
                        ? relData.filter((rel: any, index: number, self: any[]) => 
                            index === self.findIndex((r: any) => r.id === rel.id)
                          )
                        : [];
                    setRelationships(uniqueRelationships);
                })
                .catch(err => console.error('Error fetching relationships:', err));
        }
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      // Allows selecting youth available to this admin
      const res = await api.get('/users/list_youth/');
      setYouthList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Handlers ---

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (type: 'avatar') => {
    if (type === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  };

  // Youth Link Logic
  const toggleYouth = (id: number) => {
    setFormData(prev => {
      const exists = prev.youth_members.includes(id);
      if (exists) return { ...prev, youth_members: prev.youth_members.filter((i: number) => i !== id) };
      return { ...prev, youth_members: [...prev.youth_members, id] };
    });
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
  };

  const removeYouth = (id: number) => {
    setFormData(prev => ({
      ...prev,
      youth_members: prev.youth_members.filter((i: number) => i !== id)
    }));
  };

  // Get selected youth details
  const getSelectedYouth = () => {
    return formData.youth_members.map((id: number) => youthList.find(y => y.id === id)).filter(Boolean) as YouthOption[];
  };

  // Filter youth based on search term (matches page.tsx logic)
  const filteredYouth = youthList.filter(y => {
    const searchLower = youthSearchTerm.toLowerCase();
    const fullName = `${y.first_name} ${y.last_name}`.toLowerCase();
    const email = y.email.toLowerCase();
    return (fullName.includes(searchLower) || email.includes(searchLower)) && 
           !formData.youth_members.includes(y.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Fields that should NOT be sent for guardians
      const guardianExcludedFields = ['grade', 'preferred_club', 'interests', 'assigned_club', 'assigned_municipality'];
      
      // Basic Fields - only send fields that are defined and not empty (except password)
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return; // Skip empty password on update
        if (key === 'youth_members') return; // Handle separately
        if (guardianExcludedFields.includes(key)) return; // Skip guardian-inapplicable fields
        
        // Handle empty strings - convert to null for optional fields, or skip
        if (value === null || value === undefined || value === '') {
          // For optional fields like phone_number, send empty string (backend will handle it)
          if (key === 'phone_number') {
            data.append(key, '');
          }
          return;
        }
        
        data.append(key, value.toString());
      });

      // Arrays - only append if there are youth members
      if (formData.youth_members && formData.youth_members.length > 0) {
        formData.youth_members.forEach((item: any) => {
          // Handle both object format {id: number} and plain number
          const id = typeof item === 'object' && item !== null ? item.id : item;
          if (id && !isNaN(Number(id))) {
            data.append('youth_members', id.toString());
          }
        });
      }
      
      data.append('role', 'GUARDIAN');
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        try {
          // Debug: Log what we're sending
          console.log('FormData being sent:');
          for (const [key, value] of data.entries()) {
            console.log(`${key}:`, value);
          }
          
          await api.patch(`/users/${initialData.id}/`, data, config);
          userId = initialData.id;
          setToast({ message: 'Guardian updated!', type: 'success', isVisible: true });
        } catch (patchErr: any) {
          console.error('Update error:', patchErr);
          console.error('Error response:', patchErr.response?.data);
          console.error('Error status:', patchErr.response?.status);
          console.error('Error headers:', patchErr.response?.headers);
          
          // Try to extract error message from various possible locations
          let errorMsg = 'Failed to update guardian';
          if (patchErr.response?.data) {
            if (patchErr.response.data.detail) {
              errorMsg = patchErr.response.data.detail;
            } else if (patchErr.response.data.error) {
              errorMsg = patchErr.response.data.error;
            } else if (typeof patchErr.response.data === 'string') {
              errorMsg = patchErr.response.data;
            } else if (typeof patchErr.response.data === 'object') {
              // Try to extract first error message from validation errors
              const errorKeys = Object.keys(patchErr.response.data);
              if (errorKeys.length > 0) {
                const firstError = patchErr.response.data[errorKeys[0]];
                if (Array.isArray(firstError)) {
                  errorMsg = `${errorKeys[0]}: ${firstError[0]}`;
                } else if (typeof firstError === 'string') {
                  errorMsg = `${errorKeys[0]}: ${firstError}`;
                } else {
                  errorMsg = JSON.stringify(patchErr.response.data);
                }
              } else {
                errorMsg = JSON.stringify(patchErr.response.data);
              }
            }
          } else if (patchErr.message) {
            errorMsg = patchErr.message;
          }
          
          setToast({ message: errorMsg, type: 'error', isVisible: true });
          setLoading(false);
          return;
        }
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        setToast({ message: 'Guardian created!', type: 'success', isVisible: true });
      }

      // Save Custom Fields
      if (Object.keys(customFieldValues).length > 0) {
        try {
          await api.post('/custom-fields/save_values_for_user/', {
            user_id: userId,
            values: customFieldValues,
          });
        } catch (err) {
          console.error('Failed to save custom field values:', err);
        }
      }

      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
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
            {initialData ? 'Edit Guardian' : 'Create New Guardian'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage guardian details and information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Profile Visuals */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Profile Visuals</CardTitle>
            <CardDescription>Upload profile avatar image.</CardDescription>
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
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
            </div>
          </CardContent>
        </Card>

        {/* 3. Verification Status */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Set the verification status for this guardian.</CardDescription>
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

        {/* 4. Existing Relationships (Edit Mode Only) */}
        {initialData && relationships.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Existing Relationships</CardTitle>
              <CardDescription>Manage relationships with youth members.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="space-y-3">
                {relationships
                  .filter((rel: any) => {
                    const relGuardianId = rel.guardian || (typeof rel.guardian === 'object' ? rel.guardian?.id : null);
                    return relGuardianId === initialData.id || rel.guardian_id === initialData.id;
                  })
                  .map((rel: any) => {
                    const youthId = rel.youth || rel.youth_id;
                    const youth = youthList.find((y: any) => y.id === youthId);
                    if (!youth) {
                      return (
                        <RelationshipCard
                          key={rel.id}
                          relationship={rel}
                          youth={{
                            id: youthId,
                            first_name: rel.youth_first_name || 'Unknown',
                            last_name: rel.youth_last_name || '',
                            email: rel.youth_email || '',
                            grade: rel.youth_grade || undefined,
                          }}
                          onUpdate={() => {
                            fetchGuardianRelationships({ guardian_id: initialData.id })
                              .then(res => {
                                const relData = res.data.results || res.data || [];
                                const uniqueRelationships = Array.isArray(relData) 
                                  ? relData.filter((r: any, index: number, self: any[]) => 
                                      index === self.findIndex((rel: any) => rel.id === r.id)
                                    )
                                  : [];
                                setRelationships(uniqueRelationships);
                              })
                              .catch(err => console.error('Error refreshing relationships:', err));
                          }}
                        />
                      );
                    }
                    
                    return (
                      <RelationshipCard
                        key={rel.id}
                        relationship={rel}
                        youth={youth}
                        onUpdate={() => {
                          fetchGuardianRelationships({ guardian_id: initialData.id })
                            .then(res => {
                              const relData = res.data.results || res.data || [];
                              const uniqueRelationships = Array.isArray(relData) 
                                ? relData.filter((r: any, index: number, self: any[]) => 
                                    index === self.findIndex((rel: any) => rel.id === r.id)
                                  )
                                : [];
                              setRelationships(uniqueRelationships);
                            })
                            .catch(err => console.error('Error refreshing relationships:', err));
                        }}
                      />
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Assign Youth Members */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Assign Youth Members</CardTitle>
            <CardDescription>Link this guardian to youth members.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            {/* Selected Youth Display */}
            {formData.youth_members.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#4D4DA4]/20">
                {getSelectedYouth().map(y => (
                  <Badge key={y.id} variant="outline" className="bg-[#4D4DA4] text-white border-[#4D4DA4] px-3 py-1">
                    {y.first_name} {y.last_name} {y.grade && `(Gr ${y.grade})`}
                    <button
                      type="button"
                      onClick={() => removeYouth(y.id)}
                      className="ml-2 hover:bg-[#4D4DA4]/80 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${y.first_name} ${y.last_name}`}
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
                  placeholder="Search youth members by name or email..."
                  value={youthSearchTerm}
                  onChange={(e) => {
                    setYouthSearchTerm(e.target.value);
                    setShowYouthDropdown(true);
                  }}
                  onFocus={() => setShowYouthDropdown(true)}
                  className="pl-9"
                />
              </div>

              {/* Dropdown List */}
              {showYouthDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowYouthDropdown(false)}
                  ></div>
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredYouth.length > 0 ? (
                      filteredYouth.map(y => (
                        <button
                          key={y.id}
                          type="button"
                          onClick={() => toggleYouth(y.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#EBEBFE]/50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{y.first_name} {y.last_name}</div>
                          <div className="text-xs text-gray-500">{y.email} {y.grade && `• Grade ${y.grade}`}</div>
                        </button>
                      ))
                    ) : youthSearchTerm ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No youth members found matching "{youthSearchTerm}"
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {formData.youth_members.length === 0 
                          ? 'No youth members found. Create a youth member first.'
                          : 'All youth members are already selected.'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 6. Custom Fields */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>Additional custom field values for this guardian.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <CustomFieldsForm
              targetRole="GUARDIAN"
              context="USER_PROFILE"
              values={customFieldValues}
              onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
              userId={initialData ? initialData.id : null}
              userMunicipalityId={scope === 'MUNICIPALITY' && currentUser?.assigned_municipality ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality) : null}
              userClubId={scope === 'CLUB' && currentUser?.assigned_club ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club) : null}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="ghost" onClick={() => router.push(redirectPath)}>Cancel</Button>
          <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
            {loading ? 'Saving...' : initialData ? 'Update Guardian' : 'Create Guardian'}
          </Button>
        </div>
      </form>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}

// Relationship Card Component for Edit Form
function RelationshipCard({ relationship, youth, onUpdate }: { relationship: any; youth: YouthOption; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const [showResetModal, setShowResetModal] = useState(false);

  const status = relationship.status || 'PENDING';
  const relationshipType = relationship.relationship_type || 'GUARDIAN';
  const isPrimary = relationship.is_primary_guardian || false;

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship verified successfully!', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to verify relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this relationship?')) return;
    setLoading(true);
    try {
      await rejectGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship rejected.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reject relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    setShowResetModal(false);
    setLoading(true);
    try {
      await resetGuardianRelationship(relationship.id);
      setToast({ message: 'Relationship reset to pending.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
        setToast({ ...toast, isVisible: false });
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reset relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="font-semibold text-[#121213] mb-1">{youth.first_name} {youth.last_name}</p>
              <p className="text-sm text-gray-600 mb-3">{youth.email} {youth.grade && `• Grade ${youth.grade}`}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-[#EBEBFE]/30 text-[#4D4DA4] border-[#4D4DA4]/20">
                  {relationshipType.toLowerCase()}
                </Badge>
                {isPrimary && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Primary
                  </Badge>
                )}
                <Badge variant="outline" className={
                  status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                  status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-yellow-50 text-yellow-700 border-yellow-200'
                }>
                  {status}
                </Badge>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex gap-2">
            {status === 'PENDING' && (
              <>
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Processing...' : 'Verify'}
                </Button>
                <Button
                  type="button"
                  onClick={handleReject}
                  disabled={loading}
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                >
                  {loading ? 'Processing...' : 'Reject'}
                </Button>
              </>
            )}
            {status === 'ACTIVE' && (
              <Button
                type="button"
                onClick={handleResetClick}
                disabled={loading}
                size="sm"
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {loading ? 'Processing...' : 'Reset to Pending'}
              </Button>
            )}
            {status === 'REJECTED' && (
              <>
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  type="button"
                  onClick={handleResetClick}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? 'Processing...' : 'Reset'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmationModal
        isVisible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
        title="Reset Relationship"
        message="Are you sure you want to reset this relationship back to pending status?"
        confirmButtonText="Reset to Pending"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
      />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </>
  );
}