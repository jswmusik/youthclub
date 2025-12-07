'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserProfile, saveCustomFieldValues } from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import api from '@/lib/api';
import Toast from '@/app/components/Toast';

interface CustomField {
  id: number;
  name: string;
  help_text?: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options?: string[];
  required: boolean;
  value?: any;
}

export default function ProfileEditForm({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, any>>({});
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning', isVisible: false });
  
  // Interests state
  const [interestsList, setInterestsList] = useState<any[]>([]);
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    nickname: user.nickname || '',
    phone_number: user.phone_number || '',
    mood_status: user.mood_status || '',
    preferred_language: user.preferred_language || 'sv',
    date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
    grade: user.grade || '',
    legal_gender: user.legal_gender || '',
    preferred_gender: user.preferred_gender || '',
    notification_email_enabled: user.notification_email_enabled !== undefined ? user.notification_email_enabled : true,
    interests: user.interests ? user.interests.map((i: any) => typeof i === 'object' ? i.id : i) : [],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  
  // Previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar ? getMediaUrl(user.avatar) : null);
  const [bgPreview, setBgPreview] = useState<string | null>(user.background_image ? getMediaUrl(user.background_image) : null);

  // Fetch interests list
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await api.get('/interests/');
        const interests = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        setInterestsList(interests);
      } catch (error) {
        console.error('Failed to fetch interests:', error);
      }
    };
    fetchInterests();
  }, []);

  // Fetch custom fields
  useEffect(() => {
    const fetchCustomFields = async () => {
      if (!user?.preferred_club) {
        setLoadingFields(false);
        return;
      }

      try {
        const clubId = typeof user.preferred_club === 'object' 
          ? user.preferred_club.id 
          : user.preferred_club;
        
        const response = await api.get(`/custom-fields/public/?club_id=${clubId}&target_role=YOUTH_MEMBER`, {
          skipAuth: false
        } as any);
        
        const fields = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        
        setCustomFields(fields);
        
        // Initialize custom field values from user data
        const initialValues: Record<number, any> = {};
        fields.forEach((field: CustomField) => {
          // Check if user has a value for this field
          if (user.custom_field_values) {
            const userValue = user.custom_field_values.find((cfv: any) => cfv.field === field.id);
            if (userValue) {
              initialValues[field.id] = userValue.value;
            }
          }
          // Also check if field has a value property (from CustomFieldUserViewSerializer)
          if (field.value !== undefined && field.value !== null) {
            initialValues[field.id] = field.value;
          }
        });
        setCustomFieldValues(initialValues);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      } finally {
        setLoadingFields(false);
      }
    };

    fetchCustomFields();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCustomFieldChange = (fieldId: number, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Interests handlers
  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      return { 
        ...prev, 
        interests: exists ? prev.interests.filter((i: number) => i !== id) : [...prev.interests, id] 
      };
    });
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((i: number) => i !== id)
    }));
  };

  const getSelectedInterests = () => formData.interests.map((id: number) => interestsList.find(i => i.id === id)).filter(Boolean) as any[];
  
  const filteredInterests = interestsList.filter(i => 
    i.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) && !formData.interests.includes(i.id)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setBgFile(file);
        setBgPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for API - convert empty strings to null/undefined for optional fields
      const formDataToSend = new FormData();
      
      // Add basic fields
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('nickname', formData.nickname);
      formDataToSend.append('phone_number', formData.phone_number);
      formDataToSend.append('mood_status', formData.mood_status);
      formDataToSend.append('preferred_language', formData.preferred_language);
      formDataToSend.append('notification_email_enabled', formData.notification_email_enabled.toString());
      
      // Add files
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }
      if (bgFile) {
        formDataToSend.append('background_image', bgFile);
      }
      
      // Add optional fields
      if (formData.date_of_birth) {
        formDataToSend.append('date_of_birth', formData.date_of_birth);
      }
      if (formData.grade) {
        formDataToSend.append('grade', formData.grade.toString());
      }
      if (formData.legal_gender) {
        formDataToSend.append('legal_gender', formData.legal_gender);
      }
      if (formData.preferred_gender) {
        formDataToSend.append('preferred_gender', formData.preferred_gender);
      }
      
      // Add interests array
      formData.interests.forEach((id: number) => {
        formDataToSend.append('interests', id.toString());
      });
      
      const apiData: any = formDataToSend;
      
      // Convert empty strings to null/undefined for optional fields
      if (formData.date_of_birth === '') {
        apiData.date_of_birth = undefined;
      } else {
        apiData.date_of_birth = formData.date_of_birth;
      }
      
      if (formData.grade === '') {
        apiData.grade = null;
      } else {
        apiData.grade = formData.grade;
      }
      
      if (formData.legal_gender === '') {
        apiData.legal_gender = undefined;
      } else {
        apiData.legal_gender = formData.legal_gender;
      }
      
      if (formData.preferred_gender === '') {
        apiData.preferred_gender = undefined;
      } else {
        apiData.preferred_gender = formData.preferred_gender;
      }
      
      // Update profile - use FormData directly for interests support
      await api.patch('/auth/users/me/', apiData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update custom fields if there are any
      if (Object.keys(customFieldValues).length > 0) {
        // Convert field IDs to strings for the API
        const valuesToSave: Record<string, any> = {};
        Object.entries(customFieldValues).forEach(([fieldId, value]) => {
          valuesToSave[fieldId.toString()] = value;
        });
        await saveCustomFieldValues(valuesToSave);
      }
      
      // Show success toast
      setToast({ message: 'Profile updated successfully!', type: 'success', isVisible: true });
      
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        router.push('/dashboard/youth/profile');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Update failed", error);
      setToast({ message: 'Failed to update profile. Please try again.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] ?? field.value ?? (field.field_type === 'BOOLEAN' ? false : field.field_type === 'MULTI_SELECT' ? [] : '');
    
    return (
      <div key={field.id} className="mb-6">
        <label className="block text-base font-semibold text-gray-700 mb-2">
          {field.name} {field.required && <span className="text-red-500">*</span>}
        </label>
        
        {field.field_type === 'TEXT' && (
          <input 
            type="text" 
            className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        )}
        
        {field.field_type === 'BOOLEAN' && (
          <div className="flex items-center py-2">
            <input 
              type="checkbox" 
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded"
              checked={value === true || value === 'true'}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
            />
            <span className="ml-3 text-base text-gray-700 font-medium">Yes</span>
          </div>
        )}
        
        {field.field_type === 'SINGLE_SELECT' && (
          <select 
            className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        
        {field.field_type === 'MULTI_SELECT' && (
          <div className="space-y-3 mt-1">
            {field.options?.map(opt => {
              const currentValues = Array.isArray(value) ? value : [];
              const isChecked = currentValues.includes(opt);
              return (
                <label key={opt} className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-blue-600 rounded border-2 border-gray-300"
                    checked={isChecked}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...currentValues, opt]
                        : currentValues.filter((v: string) => v !== opt);
                      handleCustomFieldChange(field.id, updated);
                    }}
                  />
                  <span className="text-base text-gray-700">{opt}</span>
                </label>
              );
            })}
          </div>
        )}
        
        {field.help_text && (
          <p className="text-sm text-gray-500 mt-2">{field.help_text}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 md:p-10 rounded-xl shadow-sm border border-gray-100">
      
      {/* IMAGES SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Background Image */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-3">Cover Image</label>
          <div 
            className="h-48 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 relative group"
            style={{ backgroundImage: bgPreview ? `url(${bgPreview})` : 'none' }}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition flex items-center justify-center">
               <label className="cursor-pointer bg-white/90 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-white">
                 Change Cover
                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bg')} />
               </label>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-3">Avatar</label>
          <div className="flex items-center gap-6">
            <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 relative">
               {avatarPreview ? (
                 <img src={avatarPreview} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">?</div>
               )}
            </div>
            <label className="cursor-pointer bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-50 transition">
               Upload New
               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
            </label>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 my-8" />

      {/* TEXT FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">First Name</label>
           <input 
             type="text" 
             name="first_name" 
             value={formData.first_name} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>
        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Last Name</label>
           <input 
             type="text" 
             name="last_name" 
             value={formData.last_name} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Nickname (Display Name)</label>
           <div className="mt-1 flex rounded-lg shadow-sm border-2 border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition">
             <span className="inline-flex items-center px-4 py-3 rounded-l-lg border-r-2 border-gray-300 bg-gray-50 text-gray-600 text-lg font-medium">@</span>
             <input 
               type="text" 
               name="nickname" 
               value={formData.nickname} 
               onChange={handleChange}
               className="flex-1 block w-full px-4 py-3 text-base rounded-r-lg border-0 focus:ring-0"
             />
           </div>
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Status / Mood</label>
           <input 
             type="text" 
             name="mood_status" 
             placeholder="e.g. Playing FIFA..."
             value={formData.mood_status} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Phone Number</label>
           <input 
             type="tel" 
             name="phone_number" 
             value={formData.phone_number} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Preferred Language</label>
           <select 
             name="preferred_language" 
             value={formData.preferred_language} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           >
             <option value="sv">Swedish</option>
             <option value="en">English</option>
           </select>
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Date of Birth</label>
           <input 
             type="date" 
             name="date_of_birth" 
             value={formData.date_of_birth} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Grade</label>
           <input 
             type="number" 
             name="grade" 
             min="1"
             max="12"
             value={formData.grade} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Legal Gender</label>
           <select 
             name="legal_gender" 
             value={formData.legal_gender} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           >
             <option value="">Select...</option>
             <option value="MALE">Male</option>
             <option value="FEMALE">Female</option>
             <option value="OTHER">Other</option>
           </select>
        </div>

        <div>
           <label className="block text-base font-semibold text-gray-700 mb-2">Preferred Gender</label>
           <input 
             type="text" 
             name="preferred_gender" 
             placeholder="e.g. They/Them"
             value={formData.preferred_gender} 
             onChange={handleChange}
             className="mt-1 block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
           />
        </div>
      </div>

      {/* Interests Section */}
      <div className="mt-8">
        <label className="block text-base font-semibold text-gray-700 mb-3">Interests</label>
        
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
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
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
              <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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

      <div className="flex items-center py-2">
        <input 
          id="notification_email" 
          type="checkbox" 
          name="notification_email_enabled" 
          checked={formData.notification_email_enabled} 
          onChange={handleChange}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded"
        />
        <label htmlFor="notification_email" className="ml-3 block text-base text-gray-900 font-medium">
          Enable email notifications
        </label>
      </div>

      {/* CUSTOM FIELDS SECTION */}
      {loadingFields ? (
        <div className="text-base text-gray-500 py-4">Loading custom fields...</div>
      ) : customFields.length > 0 && (
        <>
          <hr className="border-gray-200 my-8" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h3>
            <div className="space-y-6">
              {customFields.map(field => renderCustomField(field))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <button 
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-700 font-semibold hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </form>
  );
}
