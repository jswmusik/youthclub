'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';

// --- Interfaces ---
interface Option { id: number; name: string; }

interface Club extends Option {
  municipality: number;
  effective_registration_allowed: boolean;
  effective_require_guardian: boolean;
  terms_and_conditions: string;
  club_policies: string;
}

interface Municipality extends Option {
  terms_and_conditions: string;
  allow_self_registration: boolean; // Used for initial filtering
}

interface Interest extends Option {
  icon: string;
}

// Custom Field Interfaces
interface CustomFieldDef {
    id: number;
    name: string;
    field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
    options: string[];
    required: boolean;
    help_text?: string;
}

export default function YouthRegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // --- Data Sources ---
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  
  // Custom Fields Schema
  const [youthCustomFields, setYouthCustomFields] = useState<CustomFieldDef[]>([]);
  const [guardianCustomFields, setGuardianCustomFields] = useState<CustomFieldDef[]>([]);

  // --- Selection State ---
  const [selectedMuni, setSelectedMuni] = useState<Municipality | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Guardian Lookup State
  const [guardianExists, setGuardianExists] = useState(false);
  const [checkingGuardian, setCheckingGuardian] = useState(false);
  
  // Loading states for custom fields
  const [loadingYouthFields, setLoadingYouthFields] = useState(false);
  const [loadingGuardianFields, setLoadingGuardianFields] = useState(false);

  // --- Form Data ---
  const [formData, setFormData] = useState({
    // Account
    email: '',
    password: '',
    confirm_password: '',
    
    // Profile
    first_name: '',
    last_name: '',
    nickname: '',
    date_of_birth: '',
    grade: '',
    legal_gender: 'MALE',
    preferred_gender: '',
    interests: [] as number[],
    
    // Custom Fields Values (Key = Field ID)
    custom_field_values: {} as Record<string, any>,

    // Guardian
    guardian_email: '',
    guardian_first_name: '',
    guardian_last_name: '',
    guardian_phone: '',
    guardian_legal_gender: 'MALE',
    
    // Guardian Custom Fields
    guardian_custom_field_values: {} as Record<string, any>,
    
    // Consents
    terms_accepted: false,
  });

  // --- Fetch Initial Data ---
  useEffect(() => {
    // 1. Fetch Municipalities (Public)
    api.get('/municipalities/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      // Filter out municipalities that block self-registration entirely (optional optimization)
      setMunicipalities(data);
    }).catch(err => {
      console.error('Failed to fetch municipalities:', err);
    });

    // 2. Fetch Interests
    api.get('/interests/').then(res => {
      const interests = Array.isArray(res.data) ? res.data : res.data.results || [];
      console.log('Interests fetched:', interests);
      setInterestsList(interests);
    }).catch(err => {
      console.error('Failed to fetch interests:', err);
    });
  }, []);

  // --- Fetch Clubs when Muni changes ---
  useEffect(() => {
    if (selectedMuni) {
      api.get(`/clubs/?municipality=${selectedMuni.id}`).then(res => {
        const allClubs = Array.isArray(res.data) ? res.data : res.data.results;
        // CRITICAL: Filter clubs based on the "Effective" setting computed by backend
        const openClubs = allClubs.filter((c: Club) => c.effective_registration_allowed === true);
        setClubs(openClubs);
      });
    } else {
      setClubs([]);
    }
  }, [selectedMuni]);

  // --- Fetch Custom Fields when Club Selected ---
  useEffect(() => {
    if (selectedClub) {
        console.log('Fetching custom fields for club:', selectedClub.id);
        setLoadingYouthFields(true);
        setLoadingGuardianFields(true);
        
        // Fetch Youth Fields (public endpoint - no auth required)
        api.get(`/custom-fields/public/?club_id=${selectedClub.id}&target_role=YOUTH_MEMBER`, {
          skipAuth: true
        } as any)
           .then(res => {
             console.log('Full response for youth fields:', res);
             console.log('Response data:', res.data);
             console.log('Response data type:', typeof res.data, 'Is array:', Array.isArray(res.data));
             const fields = Array.isArray(res.data) ? res.data : (res.data?.results || res.data || []);
             console.log('Parsed youth custom fields:', fields, 'Count:', fields.length);
             setYouthCustomFields(fields);
             setLoadingYouthFields(false);
           })
           .catch(err => {
             console.error('Failed to fetch youth custom fields:', err);
             console.error('Error response:', err.response);
             console.error('Error details:', err.response?.data);
             setYouthCustomFields([]);
             setLoadingYouthFields(false);
           });

        // Fetch Guardian Fields (public endpoint - no auth required)
        api.get(`/custom-fields/public/?club_id=${selectedClub.id}&target_role=GUARDIAN`, {
          skipAuth: true
        } as any)
           .then(res => {
             console.log('Full response for guardian fields:', res);
             console.log('Response data:', res.data);
             console.log('Response data type:', typeof res.data, 'Is array:', Array.isArray(res.data));
             const fields = Array.isArray(res.data) ? res.data : (res.data?.results || res.data || []);
             console.log('Parsed guardian custom fields:', fields, 'Count:', fields.length);
             setGuardianCustomFields(fields);
             setLoadingGuardianFields(false);
           })
           .catch(err => {
             console.error('Failed to fetch guardian custom fields:', err);
             console.error('Error response:', err.response);
             console.error('Error details:', err.response?.data);
             setGuardianCustomFields([]);
             setLoadingGuardianFields(false);
           });
    } else {
      // Reset when no club selected
      setYouthCustomFields([]);
      setGuardianCustomFields([]);
      setLoadingYouthFields(false);
      setLoadingGuardianFields(false);
    }
  }, [selectedClub]);

  // --- Guardian Check Logic ---
  const checkGuardianEmail = async () => {
    if (!formData.guardian_email || !formData.guardian_email.includes('@')) return;
    setCheckingGuardian(true);
    try {
        const res = await api.post('/register/check-guardian/', { email: formData.guardian_email }, {
          skipAuth: true
        } as any);
        setGuardianExists(res.data.exists);
        if (res.data.exists) {
            setToast({ message: 'Guardian found! We will link your account.', type: 'success', isVisible: true });
        }
    } catch (e) {
        console.error(e);
    } finally {
        setCheckingGuardian(false);
    }
  };

  // --- Helpers ---
  const updateCF = (fieldId: number, value: any, isGuardian = false) => {
    const key = isGuardian ? 'guardian_custom_field_values' : 'custom_field_values';
    setFormData(prev => ({
        ...prev,
        [key]: { ...prev[key], [fieldId]: value }
    }));
  };
  
  const handleInterestToggle = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists ? prev.interests.filter(i => i !== id) : [...prev.interests, id]
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.terms_accepted) {
      setToast({ message: 'You must accept the terms.', type: 'error', isVisible: true });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirm_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        preferred_club_id: selectedClub?.id,
        legal_gender: formData.legal_gender,
        custom_fields: formData.custom_field_values,
      };
      
      // Add optional fields only if they have values
      if (formData.nickname) payload.nickname = formData.nickname;
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.grade && !isNaN(parseInt(formData.grade))) {
        payload.grade = parseInt(formData.grade);
      }
      if (formData.preferred_gender) payload.preferred_gender = formData.preferred_gender;
      if (formData.interests && formData.interests.length > 0) {
        payload.interests = formData.interests;
      }
      
      // Guardian fields (only send if filled)
      if (formData.guardian_email) {
        payload.guardian_email = formData.guardian_email;
        // Only send full details if guardian is NEW
        if (!guardianExists) {
            payload.guardian_first_name = formData.guardian_first_name;
            payload.guardian_last_name = formData.guardian_last_name;
            payload.guardian_phone = formData.guardian_phone;
            payload.guardian_legal_gender = formData.guardian_legal_gender;
            payload.guardian_custom_fields = formData.guardian_custom_field_values;
        }
      }

      await api.post('/register/youth/', payload, {
        skipAuth: true
      } as any); // Public Endpoint
      
      setToast({ message: 'Registration Successful!', type: 'success', isVisible: true });
      setTimeout(() => router.push('/login'), 2000);

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed.';
      setToast({ message: msg, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  // --- Renderers ---
  const renderCustomFields = (fields: CustomFieldDef[], isGuardian = false) => {
    return fields.map(field => (
        <div key={field.id} className="mb-3">
            <label className="block text-sm font-bold text-gray-700 mb-1">
                {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.field_type === 'TEXT' && (
                <input 
                    type="text" 
                    className="w-full border p-2 rounded"
                    value={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || ''}
                    onChange={e => updateCF(field.id, e.target.value, isGuardian)}
                />
            )}
            {field.field_type === 'BOOLEAN' && (
                <input 
                    type="checkbox" 
                    className="w-5 h-5 text-blue-600 rounded"
                    checked={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || false}
                    onChange={e => updateCF(field.id, e.target.checked, isGuardian)}
                />
            )}
            {(field.field_type === 'SINGLE_SELECT') && (
                <select 
                    className="w-full border p-2 rounded"
                    value={(isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || ''}
                    onChange={e => updateCF(field.id, e.target.value, isGuardian)}
                >
                    <option value="">Select...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            )}
            {(field.field_type === 'MULTI_SELECT') && (
                <div className="space-y-2">
                    {field.options.map(opt => {
                        const currentValues = (isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || [];
                        const isChecked = Array.isArray(currentValues) && currentValues.includes(opt);
                        return (
                            <label key={opt} className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    className="w-4 h-4 text-blue-600 rounded"
                                    onChange={e => {
                                        const current = (isGuardian ? formData.guardian_custom_field_values : formData.custom_field_values)[field.id] || [];
                                        const updated = e.target.checked 
                                            ? [...(Array.isArray(current) ? current : []), opt]
                                            : (Array.isArray(current) ? current.filter((v: string) => v !== opt) : []);
                                        updateCF(field.id, updated, isGuardian);
                                    }}
                                />
                                <span className="text-sm">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            )}
            {field.help_text && <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>}
        </div>
    ));
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      
      {/* Header / Progress */}
      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Youth Registration</h2>
        <div className="flex gap-2">
            {[1,2,3,4,5].map(s => (
                <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-300'}`} />
            ))}
        </div>
      </div>

      <div className="p-8 min-h-[400px]">
        
        {/* STEP 1: LOCATION */}
        {step === 1 && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800">Where do you hang out?</h3>
                <select className="w-full border p-3 rounded-lg" onChange={(e) => {
                    const m = municipalities.find(m => m.id === parseInt(e.target.value));
                    setSelectedMuni(m || null); setSelectedClub(null);
                }}>
                    <option value="">-- Choose Municipality --</option>
                    {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {selectedMuni && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clubs.map(club => (
                            <div key={club.id} onClick={() => setSelectedClub(club)} className={`p-4 border rounded-lg cursor-pointer ${selectedClub?.id === club.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                                <div className="font-bold">{club.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* STEP 2: ACCOUNT */}
        {step === 2 && (
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">Login Details</h3>
                <input type="email" placeholder="Email" className="w-full border p-3 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Password" className="w-full border p-3 rounded-lg" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <input type="password" placeholder="Confirm Password" className="w-full border p-3 rounded-lg" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} />
            </div>
        )}

        {/* STEP 3: PROFILE & CUSTOM FIELDS */}
        {step === 3 && (
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">About You</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" className="border p-3 rounded-lg" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    <input type="text" placeholder="Last Name" className="border p-3 rounded-lg" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="border p-3 rounded-lg" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                    <input type="number" placeholder="Grade" className="border p-3 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <select className="border p-3 rounded-lg" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <input type="text" placeholder="Preferred Gender (Optional)" className="border p-3 rounded-lg" value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
                </div>
                <input type="text" placeholder="Nickname (Optional)" className="w-full border p-3 rounded-lg" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />

                {/* INTERESTS */}
                <div className="pt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Interests</label>
                    {interestsList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {interestsList.map(i => (
                                <button 
                                    key={i.id} 
                                    onClick={() => handleInterestToggle(i.id)} 
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${formData.interests.includes(i.id) ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
                                >
                                    {i.icon} {i.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No interests available</p>
                    )}
                </div>

                {/* YOUTH CUSTOM FIELDS */}
                {loadingYouthFields ? (
                    <div className="pt-4 border-t mt-4">
                        <p className="text-sm text-gray-500">Loading custom fields...</p>
                    </div>
                ) : youthCustomFields.length > 0 ? (
                    <div className="pt-4 border-t mt-4">
                        <h4 className="font-bold text-gray-800 mb-3">Additional Questions</h4>
                        {renderCustomFields(youthCustomFields, false)}
                    </div>
                ) : (
                    <div className="pt-4 border-t mt-4">
                        <p className="text-xs text-gray-400">No custom fields configured for this club (Debug: {youthCustomFields.length} fields)</p>
                    </div>
                )}
            </div>
        )}

        {/* STEP 4: GUARDIAN */}
        {step === 4 && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800">Guardian</h3>
                
                {/* Email Check */}
                <div className="flex gap-2">
                    <input 
                        type="email" 
                        placeholder="Guardian Email" 
                        className={`w-full border p-3 rounded-lg ${guardianExists ? 'bg-green-50 border-green-300 text-green-800' : ''}`}
                        value={formData.guardian_email} 
                        onChange={e => {
                            setFormData({...formData, guardian_email: e.target.value});
                            setGuardianExists(false); // Reset if they change email
                        }}
                        onBlur={checkGuardianEmail}
                    />
                </div>
                
                {/* Conditional Fields */}
                {formData.guardian_email && !guardianExists && !checkingGuardian && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="First Name" className="border p-3 rounded-lg" value={formData.guardian_first_name} onChange={e => setFormData({...formData, guardian_first_name: e.target.value})} />
                            <input type="text" placeholder="Last Name" className="border p-3 rounded-lg" value={formData.guardian_last_name} onChange={e => setFormData({...formData, guardian_last_name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Phone" className="border p-3 rounded-lg" value={formData.guardian_phone} onChange={e => setFormData({...formData, guardian_phone: e.target.value})} />
                            <select className="border p-3 rounded-lg" value={formData.guardian_legal_gender} onChange={e => setFormData({...formData, guardian_legal_gender: e.target.value})}>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        
                        {/* GUARDIAN CUSTOM FIELDS */}
                        {guardianCustomFields.length > 0 && (
                            <div className="pt-4 border-t mt-4">
                                <h4 className="font-bold text-gray-800 mb-3">Guardian Details</h4>
                                {renderCustomFields(guardianCustomFields, true)}
                            </div>
                        )}
                    </div>
                )}

                {guardianExists && (
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm border border-green-200">
                        ✅ Account found! We will link you to this guardian automatically.
                    </div>
                )}
            </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">Finish Up</h3>
                <div className="border p-4 rounded text-sm text-gray-600 max-h-40 overflow-y-auto">
                    <strong>Terms:</strong> {selectedMuni?.terms_and_conditions} <br/><br/>
                    <strong>Policies:</strong> {selectedClub?.club_policies}
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={formData.terms_accepted} onChange={e => setFormData({...formData, terms_accepted: e.target.checked})} className="w-5 h-5" />
                    <span>I accept the Terms & Conditions</span>
                </label>
            </div>
        )}

      </div>

      {/* Footer Nav */}
      <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
        {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-gray-600 font-bold">Back</button> : <div/>}
        {step < 5 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedClub} className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50">Next</button>
        ) : (
            <button onClick={handleSubmit} disabled={loading || !formData.terms_accepted} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Complete</button>
        )}
      </div>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}