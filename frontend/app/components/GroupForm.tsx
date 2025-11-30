'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import MemberSelector from './MemberSelector';
import CustomRuleBuilder from './CustomRuleBuilder';
import { getMediaUrl } from '../utils';

interface Interest {
  id: number;
  name: string;
}

interface GroupFormProps {
  initialData?: any; // If provided, we are in "Edit Mode"
  redirectPath: string; // Where to go after saving
}

const GRADES = Array.from({ length: 13 }, (_, i) => i + 1); // [1, 2, ... 12, 13]
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export default function GroupForm({ initialData, redirectPath }: GroupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  
  // File uploads
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_type: 'OPEN',
    target_member_type: 'YOUTH',
    min_age: '',
    max_age: '',
    grades: [] as number[],
    genders: [] as string[],
    interests: [] as number[],
    custom_field_rules: {} as Record<string, any>, // NEW: Custom Fields
    members_to_add: [] as number[],
  });

  useEffect(() => {
    // 1. Fetch Interests
    api.get('/interests/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setInterestsList(data || []);
    });

    // 2. Load Initial Data (if editing)
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        group_type: initialData.group_type,
        target_member_type: initialData.target_member_type,
        min_age: initialData.min_age || '',
        max_age: initialData.max_age || '',
        grades: initialData.grades || [],
        genders: initialData.genders || [],
        interests: initialData.interests || [],
        custom_field_rules: initialData.custom_field_rules || {}, // Load existing rules
        members_to_add: [],
      });
      
      // Set previews for existing images
      if (initialData.avatar) {
        setAvatarPreview(getMediaUrl(initialData.avatar));
      }
      if (initialData.background_image) {
        setBackgroundPreview(getMediaUrl(initialData.background_image));
      }
    }
  }, [initialData]);
  
  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
    };
  }, [avatarPreview, backgroundPreview]);

  // --- Handlers ---

  const toggleGrade = (grade: number) => {
    setFormData(prev => {
      const exists = prev.grades.includes(grade);
      if (exists) return { ...prev, grades: prev.grades.filter(g => g !== grade) };
      return { ...prev, grades: [...prev.grades, grade].sort((a, b) => a - b) };
    });
  };

  const toggleGender = (gender: string) => {
    setFormData(prev => {
      const exists = prev.genders.includes(gender);
      if (exists) return { ...prev, genders: prev.genders.filter(g => g !== gender) };
      return { ...prev, genders: [...prev.genders, gender] };
    });
  };

  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      if (exists) return { ...prev, interests: prev.interests.filter(i => i !== id) };
      return { ...prev, interests: [...prev.interests, id] };
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview);
      }
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBackgroundPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Basic fields
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('group_type', formData.group_type);
      data.append('target_member_type', formData.target_member_type);
      
      if (formData.min_age) {
        data.append('min_age', parseInt(formData.min_age as string).toString());
      }
      if (formData.max_age) {
        data.append('max_age', parseInt(formData.max_age as string).toString());
      }
      
      // Arrays
      data.append('grades', JSON.stringify(formData.grades));
      data.append('genders', JSON.stringify(formData.genders));
      formData.interests.forEach(id => data.append('interests', id.toString()));
      
      // Custom field rules - always send, even if empty
      data.append('custom_field_rules', JSON.stringify(formData.custom_field_rules || {}));
      
      // File uploads - only append if new files are selected
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }
      if (backgroundImageFile) {
        data.append('background_image', backgroundImageFile);
      }
      
      // Members to add
      formData.members_to_add.forEach(id => data.append('members_to_add', id.toString()));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        // Update
        await api.patch(`/groups/${initialData.id}/`, data, config);
        setToast({ message: 'Group updated successfully!', type: 'success', isVisible: true });
      } else {
        // Create
        await api.post('/groups/', data, config);
        setToast({ message: 'Group created successfully!', type: 'success', isVisible: true });
      }
      
      // Delay redirect slightly to show toast
      // Use redirectPath as-is if it already contains query parameters
      // Otherwise, append current search params
      let finalRedirectPath = redirectPath;
      if (!redirectPath.includes('?')) {
        const currentSearchParams = searchParams.toString();
        if (currentSearchParams) {
          finalRedirectPath = `${redirectPath}?${currentSearchParams}`;
        }
      }
      setTimeout(() => {
        router.push(finalRedirectPath);
      }, 1000);

    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please check your inputs.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      
      {/* SECTION 1: BASIC INFO */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">1. Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">Group Name</label>
            <input 
              required
              type="text"
              className="w-full border p-2.5 rounded-lg"
              placeholder="e.g. Summer Football Camp"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Group Type</label>
            <select 
              className="w-full border p-2.5 rounded-lg"
              value={formData.group_type}
              onChange={e => setFormData({...formData, group_type: e.target.value})}
            >
              <option value="OPEN">Open (Join Freely)</option>
              <option value="APPLICATION">Application Required</option>
              <option value="CLOSED">Closed (Invite Only)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Description</label>
          <textarea 
            rows={3}
            className="w-full border p-2.5 rounded-lg"
            placeholder="Describe what this group is about..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-bold mb-1">Avatar Image</label>
          <div className="flex items-center gap-4">
            {avatarPreview && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full border p-2 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Square image recommended (e.g., 400x400px)</p>
            </div>
          </div>
        </div>

        {/* Background Image Upload */}
        <div>
          <label className="block text-sm font-bold mb-1">Background Image</label>
          <div className="flex items-center gap-4">
            {backgroundPreview && (
              <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={backgroundPreview} alt="Background preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundChange}
                className="w-full border p-2 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Wide image recommended (e.g., 1200x400px)</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TARGETING RULES */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">2. Membership Rules</h3>
        
        {/* Member Type */}
        <div>
          <label className="block text-sm font-bold mb-2">Target Audience</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg hover:bg-gray-50 flex-1">
              <input 
                type="radio" 
                name="member_type"
                value="YOUTH"
                checked={formData.target_member_type === 'YOUTH'}
                onChange={e => setFormData({...formData, target_member_type: e.target.value})}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-bold">Youth Members</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg hover:bg-gray-50 flex-1">
              <input 
                type="radio" 
                name="member_type"
                value="GUARDIAN"
                checked={formData.target_member_type === 'GUARDIAN'}
                onChange={e => setFormData({...formData, target_member_type: e.target.value})}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-bold">Guardians</span>
            </label>
          </div>
        </div>

        {/* Age Range */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">Min Age</label>
            <input 
              type="number" min="0" max="100"
              className="w-full border p-2.5 rounded-lg"
              placeholder="Any"
              value={formData.min_age}
              onChange={e => setFormData({...formData, min_age: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Max Age</label>
            <input 
              type="number" min="0" max="100"
              className="w-full border p-2.5 rounded-lg"
              placeholder="Any"
              value={formData.max_age}
              onChange={e => setFormData({...formData, max_age: e.target.value})}
            />
          </div>
        </div>

        {/* Grades (Only if Youth) */}
        {formData.target_member_type === 'YOUTH' && (
          <div>
            <label className="block text-sm font-bold mb-2">Allowed Grades</label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map(grade => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`w-10 h-10 rounded-full font-bold text-sm transition
                    ${formData.grades.includes(grade) 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}
                  `}
                >
                  {grade}
                </button>
              ))}
            </div>
            {formData.grades.length === 0 && <p className="text-xs text-gray-400 mt-1">Leave empty to allow all grades.</p>}
          </div>
        )}

        {/* Gender */}
        <div>
          <label className="block text-sm font-bold mb-2">Allowed Genders</label>
          <div className="flex gap-4">
            {GENDERS.map(g => (
              <label key={g.value} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.genders.includes(g.value)}
                  onChange={() => toggleGender(g.value)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm">{g.label}</span>
              </label>
            ))}
          </div>
          {formData.genders.length === 0 && <p className="text-xs text-gray-400 mt-1">Leave empty to allow all genders.</p>}
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-bold mb-2">Required Interests</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border p-4 rounded-lg bg-gray-50">
            {interestsList.map(interest => (
              <button
                key={interest.id}
                type="button"
                onClick={() => toggleInterest(interest.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition
                  ${formData.interests.includes(interest.id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'}
                `}
              >
                {interest.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Users matching ANY of selected interests will be eligible.</p>
        </div>

        {/* NEW: CUSTOM FIELD RULES */}
        <div>
          <label className="block text-sm font-bold mb-2">Custom Field Rules</label>
          <p className="text-xs text-gray-500 mb-2">Members must match ALL these additional conditions.</p>
          <CustomRuleBuilder 
            currentRules={formData.custom_field_rules}
            onChange={(newRules) => setFormData(prev => ({...prev, custom_field_rules: newRules}))}
          />
        </div>
      </div>

      {/* SECTION 3: ADD MEMBERS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">3. Add Members</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select users to immediately add to this group. 
          The list below filters based on ALL the rules above (Age, Grade, Interests, Custom Fields).
        </p>
        
        <MemberSelector
          criteria={{
            target_member_type: formData.target_member_type,
            min_age: formData.min_age,
            max_age: formData.max_age,
            grades: formData.grades,
            genders: formData.genders,
            interests: formData.interests,
            // Pass the new rules
            custom_field_rules: formData.custom_field_rules
          }}
          selectedIds={formData.members_to_add}
          onChange={(ids) => setFormData(prev => ({ ...prev, members_to_add: ids }))}
          excludeGroupId={initialData?.id}
        />
      </div>

      {/* FOOTER */}
      <div className="flex justify-end gap-4 border-t pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Group'}
        </button>
      </div>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </form>
  );
}