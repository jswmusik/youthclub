'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../utils';

interface Option { id: number; name: string; }

interface RewardFormProps {
  initialData?: any;
  redirectPath: string;
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1); // [1...13]
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const TRIGGERS = [
  { value: 'BIRTHDAY', label: '🎂 On Birthday', desc: 'Given automatically on member\'s birthday' },
  { value: 'WELCOME', label: '👋 On Signup', desc: 'Given immediately after registration' },
  { value: 'VERIFIED', label: '✅ On Verification', desc: 'Given when account is verified' },
  { value: 'MOST_ACTIVE', label: '🔥 Most Active', desc: 'Awarded to users with most logins' },
];

export default function RewardForm({ initialData, redirectPath }: RewardFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  // Dropdown Data
  const [groups, setGroups] = useState<Option[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sponsor_name: '',
    sponsor_link: '',
    
    // Targeting
    target_groups: [] as number[],
    target_interests: [] as number[],
    target_genders: [] as string[],
    target_grades: [] as number[],
    min_age: '',
    max_age: '',
    target_member_type: 'YOUTH_MEMBER', // <--- WAS 'YOUTH'

    // Constraints
    expiration_date: '',
    usage_limit: '', // Empty = Unlimited

    // Triggers
    active_triggers: [] as string[],
    trigger_config: {} as any,
    
    is_active: true
  });

  useEffect(() => {
    fetchDropdowns();
    if (initialData) {
      loadInitialData();
    }
  }, [initialData]);

  const fetchDropdowns = async () => {
    try {
      const [grpRes, intRes] = await Promise.all([
        api.get('/groups/'),
        api.get('/interests/')
      ]);
      setGroups(Array.isArray(grpRes.data) ? grpRes.data : grpRes.data.results || []);
      setInterests(Array.isArray(intRes.data) ? intRes.data : intRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialData = () => {
    setFormData({
      name: initialData.name || '',
      description: initialData.description || '',
      sponsor_name: initialData.sponsor_name || '',
      sponsor_link: initialData.sponsor_link || '',
      target_groups: initialData.target_groups || [],
      target_interests: initialData.target_interests || [],
      target_genders: initialData.target_genders || [],
      target_grades: initialData.target_grades || [],
      min_age: initialData.min_age || '',
      max_age: initialData.max_age || '',
      target_member_type: initialData.target_member_type || 'YOUTH_MEMBER',
      expiration_date: initialData.expiration_date || '',
      usage_limit: initialData.usage_limit || '',
      active_triggers: initialData.active_triggers || [],
      trigger_config: initialData.trigger_config || {},
      is_active: initialData.is_active ?? true,
    });
    if (initialData.image) {
      setImagePreview(getMediaUrl(initialData.image));
    }
  };

  // --- Helpers ---

  const handleArrayToggle = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const currentList = prev[field] as any[];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...currentList, value] };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    // Append standard fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'target_groups' || key === 'target_interests' || key === 'target_genders' || key === 'target_grades' || key === 'active_triggers') return; // Handle arrays separately
      if (key === 'trigger_config') {
        data.append(key, JSON.stringify(value));
        return;
      }
      // Handle boolean values
      if (key === 'is_active') {
        data.append(key, value ? 'true' : 'false');
        return;
      }
      // Skip null/empty for optional fields, but include them for PATCH to clear values if needed
      if (value === null || value === '') {
        // For PATCH, we might want to send empty strings to clear fields, but let's skip for now
        return;
      }
      data.append(key, value.toString());
    });

    // Append Arrays (ManyToMany fields - DRF handles multiple values automatically)
    // For PATCH, if arrays are empty, we still need to send them to clear existing relationships
    formData.target_groups.forEach(id => data.append('target_groups', id.toString()));
    formData.target_interests.forEach(id => data.append('target_interests', id.toString()));
    
    // JSON Fields - Send as JSON strings since DRF's MultiPartParser doesn't auto-convert to lists for JSONFields
    // The serializer will parse these JSON strings back to lists
    // Always send these fields, even if empty (send as "[]")
    data.append('target_genders', JSON.stringify(formData.target_genders || []));
    data.append('target_grades', JSON.stringify(formData.target_grades || []));
    data.append('active_triggers', JSON.stringify(formData.active_triggers || []));

    if (imageFile) data.append('image', imageFile);

    try {
      // For FormData, we need to let axios set Content-Type automatically with boundary
      // Override the default 'application/json' header
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (initialData) {
        await api.patch(`/rewards/${initialData.id}/`, data, config);
        setToast({ message: 'Reward updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/rewards/', data, config);
        setToast({ message: 'Reward created!', type: 'success', isVisible: true });
      }
      // Preserve pagination and filter state when redirecting
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
      console.error('Reward save error:', err);
      const errorMessage = err?.response?.data?.detail || 
                          err?.response?.data?.message || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : null) ||
                          err?.message || 
                          'Operation failed.';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* 1. INFO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">1. Reward Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Reward Title</label>
              <input required type="text" className="w-full border p-2 rounded" placeholder="e.g. Free Coffee"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Sponsor Name</label>
              <input type="text" className="w-full border p-2 rounded" placeholder="e.g. Local Cafe"
                value={formData.sponsor_name} onChange={e => setFormData({...formData, sponsor_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Sponsor Link (Optional)</label>
              <input type="url" className="w-full border p-2 rounded" placeholder="https://..."
                value={formData.sponsor_link} onChange={e => setFormData({...formData, sponsor_link: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Reward Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center h-48 flex flex-col items-center justify-center bg-gray-50">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full object-contain mb-2" />
              ) : (
                <span className="text-gray-400 text-sm mb-2">No image selected</span>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Description & Redemption Instructions</label>
          <textarea required rows={4} className="w-full border p-2 rounded" 
            placeholder="Explain what the reward is and how to use it..."
            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>
      </div>

      {/* 2. TARGETING */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">2. Who gets this reward?</h3>
        
        {/* Role Selection */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="member_type" value="YOUTH_MEMBER" // <--- WAS "YOUTH"
              checked={formData.target_member_type === 'YOUTH_MEMBER'} // <--- WAS 'YOUTH'
              onChange={e => setFormData({...formData, target_member_type: e.target.value})}
              className="w-5 h-5 text-blue-600" />
            <span className="font-bold">Youth Members</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="member_type" value="GUARDIAN" 
              checked={formData.target_member_type === 'GUARDIAN'}
              onChange={e => setFormData({...formData, target_member_type: e.target.value})}
              className="w-5 h-5 text-blue-600" />
            <span className="font-bold">Guardians</span>
          </label>
        </div>

        {/* Groups & Interests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-2">Target Groups (Optional)</label>
            <div className="h-40 overflow-y-auto border p-2 rounded bg-gray-50 space-y-1">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.target_groups.includes(g.id)}
                    onChange={() => handleArrayToggle('target_groups', g.id)} />
                  {g.name}
                </label>
              ))}
              {groups.length === 0 && <p className="text-xs text-gray-400">No groups available.</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Target Interests (Optional)</label>
            <div className="h-40 overflow-y-auto border p-2 rounded bg-gray-50 space-y-1">
              {interests.map(i => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.target_interests.includes(i.id)}
                    onChange={() => handleArrayToggle('target_interests', i.id)} />
                  {i.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Demographics (Only for Youth) */}
        {formData.target_member_type === 'YOUTH_MEMBER' && ( // <--- WAS 'YOUTH'
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2">Age Range</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min" className="w-20 border p-2 rounded" 
                    value={formData.min_age} onChange={e => setFormData({...formData, min_age: e.target.value})} />
                  <span>to</span>
                  <input type="number" placeholder="Max" className="w-20 border p-2 rounded" 
                    value={formData.max_age} onChange={e => setFormData({...formData, max_age: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Gender</label>
                <div className="flex gap-4">
                  {GENDERS.map(g => (
                    <label key={g.value} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.target_genders.includes(g.value)}
                        onChange={() => handleArrayToggle('target_genders', g.value)} />
                      {g.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2">Grades</label>
              <div className="flex flex-wrap gap-2">
                {GRADES.map(g => (
                  <button type="button" key={g} onClick={() => handleArrayToggle('target_grades', g)}
                    className={`w-8 h-8 rounded text-sm font-bold border transition
                      ${formData.target_grades.includes(g) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}
                    `}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONSTRAINTS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">3. Limits & Expiration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">Expiration Date</label>
            <input type="date" className="w-full border p-2 rounded" 
              value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Total Usage Limit</label>
            <input type="number" className="w-full border p-2 rounded" placeholder="Leave empty for unlimited"
              value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} />
          </div>
        </div>
      </div>

      {/* 4. TRIGGERS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">4. Automatic Triggers (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRIGGERS.map(t => (
            <label key={t.value} className={`border p-4 rounded-lg cursor-pointer transition flex items-start gap-3
              ${formData.active_triggers.includes(t.value) ? 'bg-green-50 border-green-500' : 'hover:bg-gray-50'}
            `}>
              <input type="checkbox" className="mt-1" 
                checked={formData.active_triggers.includes(t.value)}
                onChange={() => {
                  // For simplistic UI, let's treat JSONField array just like other arrays
                  const current = [...formData.active_triggers];
                  if (current.includes(t.value)) {
                    setFormData({...formData, active_triggers: current.filter(x => x !== t.value)});
                  } else {
                    setFormData({...formData, active_triggers: [...current, t.value]});
                  }
                }}
              />
              <div>
                <span className="block font-bold text-gray-900">{t.label}</span>
                <span className="text-xs text-gray-500">{t.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg disabled:opacity-50">
          {loading ? 'Saving...' : (initialData ? 'Update Reward' : 'Create Reward')}
        </button>
      </div>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </form>
  );
}