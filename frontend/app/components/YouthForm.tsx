'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import Toast from './Toast';
import CustomFieldsForm from './CustomFieldsForm';
import { useAuth } from '../../context/AuthContext';

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
      // For updates, if no new file is selected, backend will keep existing image
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

      // Auto-assign context for Club Admin if they didn't select one (though dropdown handles it)
      if (scope === 'CLUB' && currentUser?.assigned_club && !formData.preferred_club) {
         const clubId = typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club;
         data.append('preferred_club', clubId.toString());
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      let userId: number;

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        userId = initialData.id;
        setToast({ message: 'Youth updated!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/users/', data, config);
        userId = res.data.id;
        setToast({ message: 'Youth created!', type: 'success', isVisible: true });
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Youth Member' : 'Create Youth Member'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- 0. VISUALS SECTION --- */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-700">Profile Visuals</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Background Image */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cover Image</label>
                    <div 
                        className="h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:bg-gray-50 transition"
                    >
                        {bgPreview ? (
                            <img src={bgPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-gray-400">
                                <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs">Upload Cover</span>
                            </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
                            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Change</span>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            onChange={handleBgChange}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                {/* Avatar & Mood */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Avatar</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden relative group">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    onChange={handleAvatarChange}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">Click image to change</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Mood Status</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Playing FIFA..." 
                            className="w-full border p-2 rounded text-sm"
                            value={mood}
                            onChange={(e) => setMood(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* 1. IDENTITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            <input type="text" placeholder="Nickname" className="border p-2 rounded" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
            <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder={initialData ? "New Password (Optional)" : "Password"} className="border p-2 rounded" required={!initialData} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
        </div>

        {/* 2. VERIFICATION STATUS */}
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

        {/* 3. DEMOGRAPHICS */}
        <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date of Birth</label>
                <input type="date" className="w-full border p-2 rounded" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Grade</label>
                <input type="number" placeholder="e.g. 7" className="w-full border p-2 rounded" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Legal Gender</label>
                <select className="w-full border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Preferred Gender</label>
                <input type="text" className="w-full border p-2 rounded" value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
            </div>
        </div>

        {/* 4. CLUB & GUARDIANS & INTERESTS */}
        <div>
            <label className="block text-sm font-bold mb-2">Preferred Club</label>
            <select className="w-full border p-2 rounded mb-4" value={formData.preferred_club} onChange={e => setFormData({...formData, preferred_club: e.target.value})}>
                <option value="">Select Club...</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="block text-sm font-bold mb-2">Assign Guardians</label>
            
            {/* Selected Guardians Display */}
            {formData.guardians.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {getSelectedGuardians().map(g => (
                        <span 
                            key={g.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium"
                        >
                            {g.first_name} {g.last_name}
                            <button
                                type="button"
                                onClick={() => removeGuardian(g.id)}
                                className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                aria-label={`Remove ${g.first_name} ${g.last_name}`}
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
                        placeholder="Search guardians by name or email..."
                        value={guardianSearchTerm}
                        onChange={(e) => {
                            setGuardianSearchTerm(e.target.value);
                            setShowGuardianDropdown(true);
                        }}
                        onFocus={() => setShowGuardianDropdown(true)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                {showGuardianDropdown && (
                    <>
                        <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowGuardianDropdown(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredGuardians.length > 0 ? (
                                filteredGuardians.map(g => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => toggleGuardian(g.id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
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

            <label className="block text-sm font-bold mb-2">Interests</label>
            
            {/* Selected Interests Display */}
            {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    {getSelectedInterests().map(interest => (
                        <span 
                            key={interest.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-full font-medium"
                        >
                            {interest.name}
                            <button
                                type="button"
                                onClick={() => removeInterest(interest.id)}
                                className="hover:bg-purple-700 rounded-full p-0.5 transition-colors"
                                aria-label={`Remove ${interest.name}`}
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
                        placeholder="Search interests by name..."
                        value={interestSearchTerm}
                        onChange={(e) => {
                            setInterestSearchTerm(e.target.value);
                            setShowInterestDropdown(true);
                        }}
                        onFocus={() => setShowInterestDropdown(true)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                {showInterestDropdown && (
                    <>
                        <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowInterestDropdown(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredInterests.length > 0 ? (
                                filteredInterests.map(interest => (
                                    <button
                                        key={interest.id}
                                        type="button"
                                        onClick={() => toggleInterest(interest.id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
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

        {/* 6. CUSTOM FIELDS */}
        <CustomFieldsForm
            targetRole="YOUTH_MEMBER"
            context="USER_PROFILE"
            values={customFieldValues}
            onChange={(fieldId, value) => setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }))}
            userId={initialData ? initialData.id : null}
            userMunicipalityId={null} // Auto-calculated in component based on club
            userClubId={formData.preferred_club ? Number(formData.preferred_club) : null}
        />

        {/* FOOTER */}
        <div className="flex justify-end gap-4 border-t pt-4">
            <button type="button" onClick={() => router.push(redirectPath)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Youth'}
            </button>
        </div>
      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
