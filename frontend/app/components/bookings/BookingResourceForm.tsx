'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';

interface Props {
  initialData?: any;
  redirectPath: string;
  clubId?: number; // Optional now
}

export default function BookingResourceForm({ initialData, redirectPath, clubId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<any[]>([]); // To store available clubs
  const [groups, setGroups] = useState<any[]>([]); // To store available groups
  const [qualificationGroups, setQualificationGroups] = useState<any[]>([]); // To store CLOSED groups for qualification
  
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
    club: initialData?.club || clubId || '' // Default to passed prop or empty
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image ? getMediaUrl(initialData.image) : null);

  useEffect(() => {
    // If no specific club is forced (via prop) and we are creating new, fetch list
    if (!clubId && !initialData) {
        api.get('/clubs/?page_size=100').then(res => {
            setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
        });
    }
  }, [clubId, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.club) {
        alert("Please select a club.");
        return;
    }
    if (formData.allowed_user_scope === 'GROUP' && !formData.allowed_group) {
        alert("Please select a group when 'Specific Group Only' is chosen.");
        return;
    }
    if (formData.requires_training && !formData.qualification_group) {
        alert("Please select a qualification group when 'Requires Qualification/Training' is checked.");
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
        router.push(redirectPath);
      } else {
        // CREATE MODE: Capture response to get ID
        const res = await api.post('/bookings/resources/', data, config);
        const newResourceId = res.data.id;
        
        // Redirect to the SCHEDULE page for this new resource
        // We construct the URL by appending the new ID and 'schedule'
        // Example redirectPath: "/admin/club/bookings/resources"
        // Result: "/admin/club/bookings/resources/5/schedule"
        router.push(`${redirectPath}/${newResourceId}/schedule`);
      }
      
    } catch (err) {
      console.error(err);
      alert('Error saving resource.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-6">{initialData ? 'Edit Resource' : 'New Resource'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Club Selector (Only if not fixed) */}
        {!clubId && (
            <div>
                <label className="block text-sm font-bold mb-1">Assign to Club</label>
                <select 
                    required
                    className="w-full border p-2 rounded bg-gray-50"
                    value={formData.club}
                    onChange={e => setFormData({...formData, club: e.target.value})}
                    disabled={!!initialData} // Usually can't move resources between clubs easily
                >
                    <option value="">Select a Club...</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        )}

        <div className="flex gap-6">
           <div className="w-1/3">
             <label className="block text-sm font-bold mb-2">Image</label>
             <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-dashed border-gray-300">
                {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-gray-400">No Image</span>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                        setImageFile(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                />
             </div>
           </div>
           
           <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Name</label>
                <input 
                  required 
                  className="w-full border p-2 rounded" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Type</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={formData.resource_type}
                  onChange={e => setFormData({...formData, resource_type: e.target.value})}
                >
                   <option value="ROOM">Room</option>
                   <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>
           </div>
        </div>

        <div>
            <label className="block text-sm font-bold mb-1">Description</label>
            <textarea 
              className="w-full border p-2 rounded h-24"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
           <h3 className="col-span-full font-bold text-gray-700 text-sm uppercase">Rules & Limits</h3>
           
           <div>
              <label className="block text-sm font-bold mb-1">Max Participants</label>
              <input 
                type="number" 
                min="1"
                className="w-full border p-2 rounded" 
                value={formData.max_participants}
                onChange={e => setFormData({...formData, max_participants: parseInt(e.target.value)})}
              />
           </div>

           <div>
              <label className="block text-sm font-bold mb-1">Who can book?</label>
              <select 
                className="w-full border p-2 rounded"
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
              >
                 <option value="CLUB">This Club Only</option>
                 <option value="MUNICIPALITY">Municipality Members</option>
                 <option value="GLOBAL">Everyone</option>
                 <option value="GROUP">Specific Group Only</option>
              </select>
           </div>

           {formData.allowed_user_scope === 'GROUP' && (
             <div>
                <label className="block text-sm font-bold mb-1">Select Group</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={formData.allowed_group}
                  onChange={e => setFormData({...formData, allowed_group: e.target.value})}
                  required
                >
                   <option value="">Select a Group...</option>
                   {groups.map(g => (
                     <option key={g.id} value={g.id}>{g.name}</option>
                   ))}
                </select>
                {groups.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">No groups available. Please create a group first.</p>
                )}
             </div>
           )}
           
           <div>
              <label className="block text-sm font-bold mb-1">Booking Window (Weeks)</label>
              <input 
                type="number" 
                min="1"
                className="w-full border p-2 rounded"
                value={formData.booking_window_weeks}
                onChange={e => setFormData({...formData, booking_window_weeks: parseInt(e.target.value)})}
              />
              <p className="text-xs text-gray-500 mt-1">How far in advance users can book.</p>
           </div>
           
           <div>
              <label className="block text-sm font-bold mb-1">Max Bookings / User / Week</label>
              <input 
                type="number" 
                min="0"
                className="w-full border p-2 rounded"
                value={formData.max_bookings_per_user_per_week}
                onChange={e => setFormData({...formData, max_bookings_per_user_per_week: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-gray-500 mt-1">Limit how many times per week a user can book this resource. Set to 0 for no limit.</p>
           </div>

           <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="training"
                  checked={formData.requires_training}
                  onChange={e => {
                    setFormData({
                      ...formData, 
                      requires_training: e.target.checked,
                      qualification_group: e.target.checked ? formData.qualification_group : '' // Clear if unchecked
                    });
                  }}
                />
                <label htmlFor="training" className="text-sm font-bold">Requires Qualification/Training</label>
              </div>
              
              {/* Qualification Group Selection - Only show when requires_training is checked */}
              {formData.requires_training && (
                <div>
                  <label className="block text-sm font-bold mb-1">Qualification Group <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.qualification_group}
                    onChange={e => setFormData({...formData, qualification_group: e.target.value})}
                    required
                  >
                    <option value="">Select a hidden group...</option>
                    {qualificationGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Only CLOSED (hidden) groups can be used for qualifications.</p>
                </div>
              )}
           </div>
           
           <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="active"
                checked={formData.is_active}
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
              />
              <label htmlFor="active" className="text-sm font-bold text-green-700">Is Active (Bookable)</label>
           </div>

           <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="auto_approve"
                checked={formData.auto_approve}
                onChange={e => setFormData({...formData, auto_approve: e.target.checked})}
              />
              <label htmlFor="auto_approve" className="text-sm font-bold text-blue-700">Auto-Approve Bookings</label>
              <p className="text-xs text-gray-500 ml-2">If checked, bookings are automatically approved. Otherwise, they require admin approval.</p>
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
           <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
           <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
             {loading ? 'Saving...' : 'Save Resource'}
           </button>
        </div>
      </form>
    </div>
  );
}