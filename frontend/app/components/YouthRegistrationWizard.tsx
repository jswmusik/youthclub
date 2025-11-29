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

export default function YouthRegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // --- Data Sources ---
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);

  // --- Selection State ---
  const [selectedMuni, setSelectedMuni] = useState<Municipality | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

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

    // Guardian
    guardian_email: '',
    guardian_first_name: '',
    guardian_last_name: '',
    guardian_phone: '',
    
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
    });

    // 2. Fetch Interests
    api.get('/interests/').then(res => {
      setInterestsList(Array.isArray(res.data) ? res.data : res.data.results);
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

  // --- Handlers ---
  
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
        if (formData.guardian_first_name) payload.guardian_first_name = formData.guardian_first_name;
        if (formData.guardian_last_name) payload.guardian_last_name = formData.guardian_last_name;
        if (formData.guardian_phone) payload.guardian_phone = formData.guardian_phone;
      }

      await api.post('/register/youth/', payload); // Public Endpoint
      
      setToast({ message: 'Registration Successful! Please login.', type: 'success', isVisible: true });
      setTimeout(() => router.push('/login'), 2000);

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Registration failed.';
      setToast({ message: msg, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  // --- Step Navigation Validation ---
  const canProceed = () => {
    switch(step) {
      case 1: return !!selectedClub;
      case 2: 
        return formData.email && formData.password && 
               formData.password === formData.confirm_password && 
               formData.password.length >= 8;
      case 3:
        return formData.first_name && formData.last_name && 
               formData.date_of_birth && formData.grade;
      case 4:
        // If Guardian is REQUIRED, check fields. If Optional, always allow.
        if (selectedClub?.effective_require_guardian) {
           return formData.guardian_email && formData.guardian_first_name;
        }
        return true;
      default: return true;
    }
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
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Municipality</label>
                    <select 
                        className="w-full border p-3 rounded-lg bg-white"
                        onChange={(e) => {
                            const m = municipalities.find(m => m.id === parseInt(e.target.value));
                            setSelectedMuni(m || null);
                            setSelectedClub(null);
                        }}
                    >
                        <option value="">-- Choose Area --</option>
                        {municipalities.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {selectedMuni && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Youth Club</label>
                        {clubs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clubs.map(club => (
                                    <div 
                                        key={club.id}
                                        onClick={() => setSelectedClub(club)}
                                        className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedClub?.id === club.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
                                    >
                                        <div className="font-bold text-gray-800">{club.name}</div>
                                        {club.effective_require_guardian && (
                                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded mt-2 inline-block">
                                                Requires Guardian
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <p className="text-gray-500 italic">No clubs available for registration in this area.</p>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* STEP 2: ACCOUNT */}
        {step === 2 && (
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">Create your Login</h3>
                <input 
                    type="email" placeholder="Email Address"
                    className="w-full border p-3 rounded-lg"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
                <input 
                    type="password" placeholder="Password (Min 8 chars)"
                    className="w-full border p-3 rounded-lg"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <input 
                    type="password" placeholder="Confirm Password"
                    className="w-full border p-3 rounded-lg"
                    value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                />
            </div>
        )}

        {/* STEP 3: PROFILE */}
        {step === 3 && (
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">Tell us about you</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" className="border p-3 rounded-lg" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    <input type="text" placeholder="Last Name" className="border p-3 rounded-lg" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
                <input type="text" placeholder="Nickname (Optional)" className="w-full border p-3 rounded-lg" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Birth Date</label>
                        <input type="date" className="w-full border p-3 rounded-lg" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Grade</label>
                        <input type="number" placeholder="e.g. 7" className="w-full border p-3 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <select className="border p-3 rounded-lg" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <input type="text" placeholder="Preferred Gender (Optional)" className="border p-3 rounded-lg" value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
                </div>

                <div className="pt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Interests</label>
                    <div className="flex flex-wrap gap-2">
                        {interestsList.map(interest => (
                            <button 
                                key={interest.id}
                                onClick={() => handleInterestToggle(interest.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${formData.interests.includes(interest.id) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {interest.icon} {interest.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* STEP 4: GUARDIAN */}
        {step === 4 && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">Parent / Guardian</h3>
                    {selectedClub?.effective_require_guardian ? (
                        <p className="text-orange-600 text-sm mt-1 font-medium">⚠️ This club requires a guardian to register.</p>
                    ) : (
                        <p className="text-gray-500 text-sm mt-1">Optional. You can add this later.</p>
                    )}
                </div>

                <div className="space-y-4">
                    <input type="email" placeholder="Guardian Email" className="w-full border p-3 rounded-lg" value={formData.guardian_email} onChange={e => setFormData({...formData, guardian_email: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Guardian First Name" className="border p-3 rounded-lg" value={formData.guardian_first_name} onChange={e => setFormData({...formData, guardian_first_name: e.target.value})} />
                        <input type="text" placeholder="Guardian Last Name" className="border p-3 rounded-lg" value={formData.guardian_last_name} onChange={e => setFormData({...formData, guardian_last_name: e.target.value})} />
                    </div>
                    <input type="text" placeholder="Guardian Phone" className="w-full border p-3 rounded-lg" value={formData.guardian_phone} onChange={e => setFormData({...formData, guardian_phone: e.target.value})} />
                </div>
            </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800">Final Step</h3>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <p>You are registering for <strong>{selectedClub?.name}</strong>.</p>
                    <p className="mt-1">Your account status will be <strong>UNVERIFIED</strong> until you visit the club.</p>
                </div>

                <div className="space-y-4 border rounded-lg p-4 max-h-40 overflow-y-auto text-xs text-gray-600">
                    <p className="font-bold">Municipality Terms:</p>
                    <p>{selectedMuni?.terms_and_conditions}</p>
                    <div className="border-t my-2"></div>
                    <p className="font-bold">Club Policies:</p>
                    <p>{selectedClub?.club_policies}</p>
                </div>

                <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={formData.terms_accepted} 
                        onChange={e => setFormData({...formData, terms_accepted: e.target.checked})} 
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-700 font-medium">I agree to the Terms & Conditions and Club Policies.</span>
                </label>
            </div>
        )}

      </div>

      {/* FOOTER NAV */}
      <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
        {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">
                Back
            </button>
        )}
        {step === 1 && <div></div>}

        {step < 5 ? (
            <button 
                onClick={() => setStep(step + 1)} 
                disabled={!canProceed()}
                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {/* Change button text for Guardian step if optional */}
                {step === 4 && !selectedClub?.effective_require_guardian && !formData.guardian_email 
                    ? 'Skip & Next' 
                    : 'Next'}
            </button>
        ) : (
            <button 
                onClick={handleSubmit} 
                disabled={loading || !formData.terms_accepted}
                className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
                {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
        )}
      </div>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}