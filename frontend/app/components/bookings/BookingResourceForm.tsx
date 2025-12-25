'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, Package, Calendar, Users, Settings, Image as ImageIcon } from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import Toast from '../Toast';

interface Props {
  initialData?: any;
  redirectPath: string;
  clubId?: number; // Optional now
}

export default function BookingResourceForm({ initialData, redirectPath, clubId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [clubs, setClubs] = useState<any[]>([]); // To store available clubs
  const [groups, setGroups] = useState<any[]>([]); // To store available groups
  const [qualificationGroups, setQualificationGroups] = useState<any[]>([]); // To store CLOSED groups for qualification
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    resource_type: initialData?.resource_type || 'ROOM',
    requires_training: initialData?.requires_training || false,
    qualification_group: (initialData?.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData?.qualification_group || ''),
    max_participants: initialData?.max_participants || 1,
    allowed_user_scope: initialData?.allowed_user_scope || 'CLUB',
    allowed_group: (initialData?.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData?.allowed_group || ''),
    auto_approve: initialData?.auto_approve ?? false,
    booking_window_weeks: initialData?.booking_window_weeks || 4,
    max_bookings_per_user_per_week: initialData?.max_bookings_per_user_per_week || 3,
    is_active: initialData?.is_active ?? true,
    club: (initialData?.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData?.club || clubId || '') // Handle object or ID
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image ? getMediaUrl(initialData.image) : null);

  useEffect(() => {
    // Fetch clubs list if not forced via prop (needed for both create and edit modes)
    if (!clubId) {
        api.get('/clubs/?page_size=100').then(res => {
            setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
        }).catch(err => {
            console.error('Failed to load clubs', err);
        });
    }
  }, [clubId]);

  // Update formData when initialData changes (for async loading in edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        resource_type: initialData.resource_type || 'ROOM',
        requires_training: initialData.requires_training || false,
        qualification_group: (initialData.qualification_group && typeof initialData.qualification_group === 'object') ? initialData.qualification_group.id : (initialData.qualification_group || ''),
        max_participants: initialData.max_participants || 1,
        allowed_user_scope: initialData.allowed_user_scope || 'CLUB',
        allowed_group: (initialData.allowed_group && typeof initialData.allowed_group === 'object') ? initialData.allowed_group.id : (initialData.allowed_group || ''),
        auto_approve: initialData.auto_approve ?? false,
        booking_window_weeks: initialData.booking_window_weeks || 4,
        max_bookings_per_user_per_week: initialData.max_bookings_per_user_per_week || 3,
        is_active: initialData.is_active ?? true,
        club: (initialData.club && typeof initialData.club === 'object') ? initialData.club.id : (initialData.club || clubId || '')
      });
      
      // Update image preview if image exists
      if (initialData.image) {
        setImagePreview(getMediaUrl(initialData.image));
      }
    }
  }, [initialData, clubId]);

  useEffect(() => {
    // Fetch groups when club is selected or available
    const targetClubId = clubId || formData.club || initialData?.club;
    if (targetClubId) {
      api.get(`/groups/?club=${targetClubId}&page_size=100`).then(res => {
        const allGroups = Array.isArray(res.data) ? res.data : res.data.results || [];
        setGroups(allGroups);
        
        // Filter CLOSED groups for qualification (hidden groups)
        const closedGroups = allGroups.filter((g: any) => g.group_type === 'CLOSED');
        setQualificationGroups(closedGroups);
      }).catch(err => {
        console.error('Failed to load groups', err);
        setGroups([]);
        setQualificationGroups([]);
      });
    } else {
      setGroups([]);
      setQualificationGroups([]);
    }
  }, [clubId, formData.club, initialData?.club]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.club) {
        setToast({ message: 'Please select a club.', type: 'error', isVisible: true });
        return;
    }
    if (formData.allowed_user_scope === 'GROUP' && !formData.allowed_group) {
        setToast({ message: 'Please select a group when "Specific Group Only" is chosen.', type: 'error', isVisible: true });
        return;
    }
    if (formData.requires_training && !formData.qualification_group) {
        setToast({ message: 'Please select a qualification group when "Requires Qualification/Training" is checked.', type: 'error', isVisible: true });
        return;
    }
    setLoading(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Handle empty string for allowed_group and qualification_group - send empty string to clear it
        if (key === 'allowed_group' || key === 'qualification_group') {
          data.append(key, value || '');
        } else {
          data.append(key, value.toString());
        }
      });
      if (imageFile) data.append('image', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        // EDIT MODE: Stay here or go back to list
        await api.patch(`/bookings/resources/${initialData.id}/`, data, config);
        setToast({ message: 'Resource updated successfully!', type: 'success', isVisible: true });
        setTimeout(() => router.push(redirectPath), 1000);
      } else {
        // CREATE MODE: Capture response to get ID
        const res = await api.post('/bookings/resources/', data, config);
        const newResourceId = res.data.id;
        setToast({ message: 'Resource created successfully!', type: 'success', isVisible: true });
        
        // Redirect to the SCHEDULE page for this new resource
        setTimeout(() => router.push(`${redirectPath}/${newResourceId}/schedule`), 1000);
      }
      
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Error saving resource.';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  // Styling
  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
  
  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={redirectPath}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? 'Edit Resource' : 'Create New Resource'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              Manage booking resource details and settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Basic Information */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Basic Information</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Enter the basic details for this resource.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Club Selector (Only if not fixed) */}
              {!clubId && (
                <div>
                  <label className={labelClasses}>
                    Assign to Club <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <select 
                    required
                    className={`${inputClasses('club')} appearance-none cursor-pointer`}
                    style={selectArrowStyle}
                    value={formData.club}
                    onChange={e => setFormData({...formData, club: e.target.value})}
                    onFocus={() => setFocusedField('club')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">Select a Club...</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>
                    Name <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    className={inputClasses('name')}
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter resource name"
                  />
                </div>
                <div>
                  <label className={labelClasses}>
                    Type <span className="text-[var(--brand-primary)]">*</span>
                  </label>
                  <select 
                    className={`${inputClasses('resource_type')} appearance-none cursor-pointer`}
                    style={selectArrowStyle}
                    value={formData.resource_type}
                    onChange={e => setFormData({...formData, resource_type: e.target.value})}
                    onFocus={() => setFocusedField('resource_type')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="ROOM">Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Description</label>
                <textarea 
                  className={`${inputClasses('description')} min-h-[100px] resize-none`}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter a description for this resource..."
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>
          </div>

          {/* 2. Resource Image */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Resource Image</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Upload an image for this resource.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div 
                  className="relative group h-32 w-32 rounded-xl border-2 border-dashed border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center overflow-hidden shrink-0 hover:border-[var(--brand-primary)]/50 transition-colors cursor-pointer"
                  onClick={() => imageRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="h-full w-full object-cover" alt="Resource preview" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Package className="h-8 w-8 text-[var(--brand-light)]/40 mx-auto mb-1" />
                      <span className="text-xs text-[var(--brand-light)]/50">Click to upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => imageRef.current?.click()}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                      Choose File
                    </button>
                    {imagePreview && (
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 transition-all flex items-center gap-2"
                      >
                        <X className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/50">Recommended: Square image, 400x400px</p>
                </div>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>
          </div>

          {/* 3. Rules & Limits */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Rules & Limits</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Configure booking rules and participant limits.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClasses}>Max Participants</label>
                  <input 
                    type="number" 
                    min="1"
                    className={inputClasses('max_participants')}
                    value={formData.max_participants}
                    onChange={e => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                    onFocus={() => setFocusedField('max_participants')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Who can book?</label>
                  <select 
                    className={`${inputClasses('allowed_user_scope')} appearance-none cursor-pointer`}
                    style={selectArrowStyle}
                    value={formData.allowed_user_scope}
                    onChange={e => {
                      const newScope = e.target.value;
                      setFormData({
                        ...formData, 
                        allowed_user_scope: newScope,
                        // Clear group selection if not GROUP scope
                        allowed_group: newScope === 'GROUP' ? formData.allowed_group : ''
                      });
                    }}
                    onFocus={() => setFocusedField('allowed_user_scope')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="CLUB">This Club Only</option>
                    <option value="MUNICIPALITY">Municipality Members</option>
                    <option value="GLOBAL">Everyone</option>
                    <option value="GROUP">Specific Group Only</option>
                  </select>
                </div>

                {formData.allowed_user_scope === 'GROUP' && (
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>
                      Select Group <span className="text-[var(--brand-primary)]">*</span>
                    </label>
                    <select 
                      className={`${inputClasses('allowed_group')} appearance-none cursor-pointer`}
                      style={selectArrowStyle}
                      value={formData.allowed_group}
                      onChange={e => setFormData({...formData, allowed_group: e.target.value})}
                      required
                      onFocus={() => setFocusedField('allowed_group')}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="">Select a Group...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {groups.length === 0 && (
                      <p className="text-xs text-[var(--brand-peach)] mt-1">No groups available. Please create a group first.</p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className={labelClasses}>Booking Window (Weeks)</label>
                  <input 
                    type="number" 
                    min="1"
                    className={inputClasses('booking_window_weeks')}
                    value={formData.booking_window_weeks}
                    onChange={e => setFormData({...formData, booking_window_weeks: parseInt(e.target.value)})}
                    onFocus={() => setFocusedField('booking_window_weeks')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">How far in advance users can book.</p>
                </div>
                
                <div>
                  <label className={labelClasses}>Max Bookings / User / Week</label>
                  <input 
                    type="number" 
                    min="0"
                    className={inputClasses('max_bookings_per_user_per_week')}
                    value={formData.max_bookings_per_user_per_week}
                    onChange={e => setFormData({...formData, max_bookings_per_user_per_week: parseInt(e.target.value) || 0})}
                    onFocus={() => setFocusedField('max_bookings_per_user_per_week')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">Limit how many times per week a user can book this resource. Set to 0 for no limit.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Settings */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Settings</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Configure resource availability and approval settings.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="training"
                    checked={formData.requires_training}
                    onChange={e => {
                      setFormData({
                        ...formData, 
                        requires_training: e.target.checked,
                        qualification_group: e.target.checked ? formData.qualification_group : ''
                      });
                    }}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] cursor-pointer"
                  />
                  <label htmlFor="training" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer">
                    Requires Qualification/Training
                  </label>
                </div>
                
                {/* Qualification Group Selection - Only show when requires_training is checked */}
                {formData.requires_training && (
                  <div className="ml-8 space-y-2">
                    <label className={labelClasses}>
                      Qualification Group <span className="text-[var(--brand-primary)]">*</span>
                    </label>
                    <select 
                      className={`${inputClasses('qualification_group')} appearance-none cursor-pointer`}
                      style={selectArrowStyle}
                      value={formData.qualification_group}
                      onChange={e => setFormData({...formData, qualification_group: e.target.value})}
                      required
                      onFocus={() => setFocusedField('qualification_group')}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="">Select a hidden group...</option>
                      {qualificationGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--brand-light)]/50">Only CLOSED (hidden) groups can be used for qualifications.</p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-[var(--dark-600)] pt-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="active"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/20 focus:border-[var(--brand-green)] cursor-pointer"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer">
                    Is Active (Bookable)
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id="auto_approve"
                    checked={formData.auto_approve}
                    onChange={e => setFormData({...formData, auto_approve: e.target.checked})}
                    className="h-5 w-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] cursor-pointer mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="auto_approve" className="text-sm font-medium text-[var(--brand-light)] cursor-pointer block mb-1">
                      Auto-Approve Bookings
                    </label>
                    <p className="text-xs text-[var(--brand-light)]/50">If checked, bookings are automatically approved. Otherwise, they require admin approval.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--dark-600)] px-4 sm:px-0">
            <button 
              type="button" 
              onClick={() => router.back()} 
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 rounded-xl text-sm font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : initialData ? 'Update Resource' : 'Create Resource'}
            </button>
          </div>
        </form>

        <Toast 
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast({ ...toast, isVisible: false })}
          darkMode
          duration={1250}
        />
      </div>
    </div>
  );
}
