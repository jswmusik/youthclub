'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';

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

  // Search States
  const [youthSearchTerm, setYouthSearchTerm] = useState('');
  const [showYouthDropdown, setShowYouthDropdown] = useState(false);

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
    // In Django serializer, 'youth_members' is a list of IDs
    youth_members: initialData?.youth_members ? initialData.youth_members : [], 
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
      
      // Basic Fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'youth_members') return;
        data.append(key, value.toString());
      });

      // Arrays
      formData.youth_members.forEach((id: number) => data.append('youth_members', id.toString()));
      
      data.append('role', 'GUARDIAN');
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        setToast({ message: 'Guardian updated!', type: 'success', isVisible: true });
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Guardian' : 'Create Guardian'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. IDENTITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder={initialData ? "New Password (Optional)" : "Password"} className="border p-2 rounded" required={!initialData} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
            <select className="border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
            </select>
        </div>

        {/* 2. VERIFICATION */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-800 mb-2">Verification Status</label>
            <div className="flex gap-4">
                {['UNVERIFIED', 'PENDING', 'VERIFIED'].map(status => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="verification_status"
                            value={status}
                            checked={formData.verification_status === status}
                            onChange={e => setFormData({...formData, verification_status: e.target.value})}
                            className="text-blue-600"
                        />
                        <span className="text-sm font-medium">{status}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* 3. ASSIGN YOUTH */}
        <div>
            <label className="block text-sm font-bold mb-2">Assign Youth Members</label>
            
            {/* Selected Youth Display */}
            {formData.youth_members.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    {getSelectedYouth().map(y => (
                        <span 
                            key={y.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-full font-medium"
                        >
                            {y.first_name} {y.last_name} {y.grade && `(Gr ${y.grade})`}
                            <button
                                type="button"
                                onClick={() => removeYouth(y.id)}
                                className="hover:bg-green-700 rounded-full p-0.5 transition-colors"
                                aria-label={`Remove ${y.first_name} ${y.last_name}`}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Searchable Dropdown */}
            <div className="relative mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search youth members by name or email..."
                        value={youthSearchTerm}
                        onChange={(e) => {
                            setYouthSearchTerm(e.target.value);
                            setShowYouthDropdown(true);
                        }}
                        onFocus={() => setShowYouthDropdown(true)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <svg 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Dropdown List */}
                {showYouthDropdown && (
                    <>
                        <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowYouthDropdown(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredYouth.length > 0 ? (
                                filteredYouth.map(y => (
                                    <button
                                        key={y.id}
                                        type="button"
                                        onClick={() => toggleYouth(y.id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
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
        </div>

        {/* 4. AVATAR */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
            <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
            {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 mt-2 rounded-full object-cover border" />}
        </div>

        {/* 5. CUSTOM FIELDS */}
        <CustomFieldsForm
            targetRole="GUARDIAN"
            context="USER_PROFILE"
            values={customFieldValues}
            onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
            userId={initialData ? initialData.id : null}
            // For guardians, we don't strictly bind to a club/muni for field logic 
            // unless your business logic requires guardians to belong to a club directly.
            // Usually guardians inherit scope from children, but for Custom Fields visibility, 
            // passing null here means they see Global fields. 
            // If you want them to see specific fields based on admin scope, pass currentUser IDs.
            userMunicipalityId={scope === 'MUNICIPALITY' && currentUser?.assigned_municipality ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality) : null}
            userClubId={scope === 'CLUB' && currentUser?.assigned_club ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club) : null}
        />

        {/* FOOTER */}
        <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={() => router.push(redirectPath)} className="text-gray-500">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Guardian')}
            </button>
        </div>
      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}