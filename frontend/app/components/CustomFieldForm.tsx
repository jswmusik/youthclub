'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import { useAuth } from '../../context/AuthContext';

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {initialData ? 'Edit Field Definition' : 'Create Custom Field'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">Field Label</label>
            <input 
              required 
              type="text" 
              className="w-full border p-2 rounded" 
              placeholder="e.g. T-Shirt Size"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Data Type</label>
            <select 
              className="w-full border p-2 rounded bg-white"
              value={formData.field_type}
              // @ts-ignore
              onChange={e => setFormData({...formData, field_type: e.target.value})}
            >
              <option value="TEXT">Text (Free type)</option>
              <option value="SINGLE_SELECT">Single Select (Dropdown)</option>
              <option value="MULTI_SELECT">Multi Select (Checkboxes)</option>
              <option value="BOOLEAN">Boolean (Yes/No Checkbox)</option>
            </select>
          </div>
        </div>

        {/* Usage Context */}
        <div>
            <label className="block text-sm font-bold mb-1">Used For</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full hover:bg-gray-50">
                    <input 
                        type="radio" 
                        name="context"
                        value="USER_PROFILE"
                        checked={formData.context === 'USER_PROFILE'}
                        onChange={e => setFormData({...formData, context: e.target.value})}
                        className="text-blue-600"
                    />
                    <div>
                        <span className="block font-bold text-gray-800">User Profile</span>
                        <span className="text-xs text-gray-500">Shown during registration/profile edit</span>
                    </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full hover:bg-gray-50">
                    <input 
                        type="radio" 
                        name="context"
                        value="EVENT"
                        checked={formData.context === 'EVENT'}
                        onChange={e => setFormData({...formData, context: e.target.value})}
                        className="text-blue-600"
                    />
                    <div>
                        <span className="block font-bold text-gray-800">Event Booking</span>
                        <span className="text-xs text-gray-500">Shown when booking an event ticket</span>
                    </div>
                </label>
            </div>
        </div>

        <div>
            <label className="block text-sm font-bold mb-1">Help Text (Optional)</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded text-sm text-gray-600" 
              placeholder="e.g. Select the size for your team jersey"
              value={formData.help_text}
              onChange={e => setFormData({...formData, help_text: e.target.value})}
            />
        </div>

        {/* OPTIONS BUILDER */}
        {(formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && (
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <label className="block text-sm font-bold mb-2 text-blue-800">Options List</label>
                <div className="flex gap-2 mb-3">
                    <input 
                        type="text" 
                        className="flex-1 border p-2 rounded text-sm"
                        placeholder="Type option and press Enter/Add..."
                        value={formData.currentOptionInput}
                        onChange={e => setFormData({...formData, currentOptionInput: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    />
                    <button type="button" onClick={addOption} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Add</button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {formData.options.map((opt: string, idx: number) => (
                        <span key={idx} className="bg-white border border-blue-200 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-2">
                            {opt}
                            <button type="button" onClick={() => removeOption(idx)} className="text-red-500 font-bold hover:text-red-700">×</button>
                        </span>
                    ))}
                    {formData.options.length === 0 && <span className="text-xs text-gray-500 italic">No options added yet.</span>}
                </div>
            </div>
        )}

        {/* TARGET ROLES */}
        <div>
            <label className="block text-sm font-bold mb-2">Who should verify this?</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={formData.target_roles.includes('YOUTH_MEMBER')}
                        onChange={() => toggleRole('YOUTH_MEMBER')}
                        className="w-5 h-5 text-blue-600"
                    />
                    <span>Youth Members</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={formData.target_roles.includes('GUARDIAN')}
                        onChange={() => toggleRole('GUARDIAN')}
                        className="w-5 h-5 text-blue-600"
                    />
                    <span>Guardians</span>
                </label>
            </div>
        </div>

        {/* FIELD STATUS */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
            <label className="block text-sm font-bold text-gray-800 mb-3">Field Status</label>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            checked={formData.is_published}
                            onChange={e => setFormData({...formData, is_published: e.target.checked})}
                            className="w-6 h-6 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div className="flex-1">
                        <span className="block font-semibold text-gray-900">
                            {formData.is_published ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-600">
                            {formData.is_published 
                                ? 'This field will be visible to users' 
                                : 'This field will be hidden from users'}
                        </span>
                    </div>
                    {formData.is_published ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-bold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Inactive
                        </div>
                    )}
                </label>
            </div>
        </div>

        {/* SETTINGS */}
        <div className="flex gap-6 bg-gray-50 p-4 rounded border">
            <label className="flex items-center gap-2 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={formData.required}
                    onChange={e => setFormData({...formData, required: e.target.checked})}
                    className="w-5 h-5 text-red-600 rounded"
                />
                <span className="font-medium text-gray-700">Required Field</span>
            </label>
        </div>

        {/* MUNICIPALITY: LIMIT CLUBS */}
        {scope === 'MUNICIPALITY' && (
            <div className="border-t pt-4">
                <label className="block text-sm font-bold mb-2">Limit to Specific Clubs (Optional)</label>
                <p className="text-xs text-gray-500 mb-2">If no clubs are selected, this field applies to ALL clubs in your municipality.</p>
                <div className="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2 bg-gray-50">
                    {clubs.map(club => (
                        <label key={club.id} className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={formData.specific_clubs.includes(club.id)}
                                onChange={() => toggleClub(club.id)}
                            />
                            {club.name}
                        </label>
                    ))}
                    {clubs.length === 0 && <p className="text-xs text-gray-400">No clubs found.</p>}
                </div>
            </div>
        )}

        <div className="flex justify-end gap-4 border-t pt-6">
            <button type="button" onClick={() => router.push(redirectPath)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-8 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Field'}
            </button>
        </div>
      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}