'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import { useAuth } from '../../context/AuthContext';

interface Option { id: number; name: string; }

interface ClubFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY';
}

const WEEKDAYS = [
  { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

const GENDER_RESTRICTIONS = [
  { id: 'ALL', name: 'All Genders' },
  { id: 'BOYS', name: 'Boys Only' },
  { id: 'GIRLS', name: 'Girls Only' },
  { id: 'OTHER', name: 'Other' },
];

export default function ClubForm({ initialData, redirectPath, scope }: ClubFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };
  
  // Data
  const [municipalities, setMunicipalities] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  // Opening Hours State
  const [openingHours, setOpeningHours] = useState<any[]>(initialData?.regular_hours || []);
  const [hourError, setHourError] = useState('');
  
  const initialHourState = {
    weekday: 1, week_cycle: 'ALL',
    open_time: '14:00', close_time: '20:00',
    title: '', gender_restriction: 'ALL',
    restriction_mode: 'NONE', 
    min_value: '', max_value: ''
  };
  const [newHour, setNewHour] = useState(initialHourState);

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    municipality: initialData?.municipality || '', // ID
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    club_categories: initialData?.club_categories || '',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    club_policies: initialData?.club_policies || '',
    // Override Fields (Convert null to empty string for Select input)
    allow_self_registration_override: initialData?.allow_self_registration_override === null ? '' : String(initialData?.allow_self_registration_override),
    require_guardian_override: initialData?.require_guardian_override === null ? '' : String(initialData?.require_guardian_override),
  });

  useEffect(() => {
    // Only Super Admins need to fetch the municipality list
    if (scope === 'SUPER') {
      // Fetch all municipalities by looping through pages
      const fetchAllMunicipalities = async () => {
        try {
          let allMunicipalities: Option[] = [];
          let page = 1;
          let totalCount = 0;
          const pageSize = 100;
          const maxPages = 100;
          
          while (page <= maxPages) {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('page_size', pageSize.toString());
            
            const res: any = await api.get(`/municipalities/?${params.toString()}`);
            const responseData: any = res?.data;
            
            if (!responseData) {
              break;
            }
            
            let pageMunicipalities: Option[] = [];
            
            if (Array.isArray(responseData)) {
              // Non-paginated response
              pageMunicipalities = responseData;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              break;
            } else if (responseData.results && Array.isArray(responseData.results)) {
              // Paginated response
              pageMunicipalities = responseData.results;
              allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
              
              if (page === 1) {
                totalCount = responseData.count || 0;
              }
              
              const hasNext = responseData.next !== null && responseData.next !== undefined;
              const hasAllResults = totalCount > 0 && allMunicipalities.length >= totalCount;
              const gotEmptyPage = pageMunicipalities.length === 0;
              
              if (!hasNext || hasAllResults || gotEmptyPage) {
                break;
              }
              
              page++;
            } else {
              break;
            }
          }
          
          setMunicipalities(allMunicipalities);
        } catch (err) {
          console.error('Failed to fetch municipalities:', err);
          setMunicipalities([]);
        }
      };
      
      fetchAllMunicipalities();
    }
  }, [scope]);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') { setAvatarFile(file); setAvatarPreview(reader.result as string); } 
        else { setHeroFile(file); setHeroPreview(reader.result as string); }
      };
      reader.readAsDataURL(file);
    }
  };

  // Opening Hours Logic
  const checkOverlap = (newItem: any) => {
    // Convert time string "14:00" to minutes
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMins(newItem.open_time);
    const end = toMins(newItem.close_time);

    // Validation: End must be after Start
    if (end <= start) return "Close time must be after Open time.";

    // Check against existing
    for (const h of openingHours) {
      if (h.weekday !== newItem.weekday) continue;
      
      // Cycle Check: Overlap if either is ALL or they match
      const cycleOverlap = h.week_cycle === 'ALL' || newItem.week_cycle === 'ALL' || h.week_cycle === newItem.week_cycle;
      if (!cycleOverlap) continue;

      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);

      // Overlap formula: (StartA < EndB) and (EndA > StartB)
      // Note: We use < and > to allow touching (e.g. 15:00 end and 15:00 start is ok)
      if (start < e2 && end > s2) {
        return `Overlap detected with existing hour: ${h.open_time}-${h.close_time} (${h.week_cycle === 'ALL' ? 'Every Week' : h.week_cycle})`;
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) {
      setHourError(error);
      return;
    }
    setOpeningHours([...openingHours, { ...newHour }]);
    // Keep the day selected for faster entry, reset times/title
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' }); 
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (trim whitespace and check for actual content)
    const trimmedName = formData.name?.trim();
    const municipalityValue = scope === 'SUPER' ? formData.municipality?.toString().trim() : '';
    const trimmedEmail = formData.email?.trim();
    const trimmedPhone = formData.phone?.trim();
    const trimmedDescription = formData.description?.trim();
    const trimmedTerms = formData.terms_and_conditions?.trim();
    const trimmedPolicies = formData.club_policies?.trim();
    
    // Check if municipality is a valid number (for SUPER scope) or user has assigned_municipality (for MUNICIPALITY scope)
    const isValidMunicipality = scope === 'MUNICIPALITY' 
      ? (user?.assigned_municipality !== null && user?.assigned_municipality !== undefined)
      : (municipalityValue && !isNaN(Number(municipalityValue)) && Number(municipalityValue) > 0);
    
    if (!trimmedName || !isValidMunicipality || !trimmedEmail || !trimmedPhone || 
        !trimmedDescription || !trimmedTerms || !trimmedPolicies) {
      const missingFields = [];
      if (!trimmedName) missingFields.push('Name');
      if (scope === 'SUPER' && !isValidMunicipality) missingFields.push('Municipality');
      if (scope === 'MUNICIPALITY' && !isValidMunicipality) missingFields.push('Municipality (not assigned to your account)');
      if (!trimmedEmail) missingFields.push('Email');
      if (!trimmedPhone) missingFields.push('Phone');
      if (!trimmedDescription) missingFields.push('Description');
      if (!trimmedTerms) missingFields.push('Terms & Conditions');
      if (!trimmedPolicies) missingFields.push('Club Policies');
      
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setLoading(true);
    
    try {
      const data = new FormData();
      // Append all form fields with trimmed values (validation already ensured required fields are filled)
      data.append('name', trimmedName);
      if (scope === 'SUPER') {
        data.append('municipality', municipalityValue);
      } else if (scope === 'MUNICIPALITY') {
        // For municipality admins, send their assigned_municipality ID
        // The backend will validate and use this in perform_create
        const userMunicipalityId = user?.assigned_municipality 
          ? (typeof user.assigned_municipality === 'object' 
              ? user.assigned_municipality.id 
              : user.assigned_municipality)
          : null;
        if (userMunicipalityId) {
          data.append('municipality', userMunicipalityId.toString());
        } else {
          throw new Error('Municipality admin must have an assigned municipality');
        }
      }
      data.append('email', trimmedEmail);
      data.append('phone', trimmedPhone);
      data.append('description', trimmedDescription);
      data.append('terms_and_conditions', trimmedTerms);
      data.append('club_policies', trimmedPolicies);
      // Append optional fields
      if (formData.address?.trim()) data.append('address', formData.address.trim());
      if (formData.club_categories?.trim()) data.append('club_categories', formData.club_categories.trim());
      // Latitude and longitude are numbers, convert to string
      if (formData.latitude !== '' && formData.latitude != null) data.append('latitude', String(formData.latitude));
      if (formData.longitude !== '' && formData.longitude != null) data.append('longitude', String(formData.longitude));
      
      // Handle Override Fields Logic
      // If value is empty string, send empty string (backend serializer should convert "" to None)
      if (formData.allow_self_registration_override === '') {
        data.append('allow_self_registration_override', '');
      } else {
        data.append('allow_self_registration_override', formData.allow_self_registration_override);
      }

      if (formData.require_guardian_override === '') {
        data.append('require_guardian_override', '');
      } else {
        data.append('require_guardian_override', formData.require_guardian_override);
      }
      
      // Clean up opening hours data before sending
      const cleanedHours = openingHours.map(hour => {
        const cleaned: any = {
          weekday: hour.weekday,
          week_cycle: hour.week_cycle || 'ALL',
          open_time: hour.open_time,
          close_time: hour.close_time,
          title: hour.title || '',
          gender_restriction: hour.gender_restriction || 'ALL',
          restriction_mode: hour.restriction_mode || 'NONE',
        };
        
        // Only include min_value/max_value if restriction_mode is not 'NONE'
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        } else {
          cleaned.min_value = null;
          cleaned.max_value = null;
        }
        
        return cleaned;
      });
      
      data.append('regular_hours_data', JSON.stringify(cleanedHours));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/clubs/${initialData.id}/`, data, config);
        setToast({ message: 'Club updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/clubs/', data, config);
        setToast({ message: 'Club created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);

    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Operation failed.';
      setToast({ message: `Error: ${errorMessage}`, type: 'error', isVisible: true });
      console.error('Full error:', err);
      console.error('Error response data:', err?.response?.data);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-5xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Club' : 'Create New Club'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LEFT: Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Club Name</label>
              <input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            {scope === 'SUPER' && (
              <div>
                <label className="block text-sm font-bold mb-1">Municipality</label>
                <select required className="w-full border p-2 rounded" value={formData.municipality} onChange={e => setFormData({...formData, municipality: e.target.value})}>
                  <option value="">Select Municipality...</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold mb-1">Email</label><input required type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Phone</label><input required type="text" className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            </div>

            <div><label className="block text-sm font-bold mb-1">Description</label><textarea required rows={3} className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div><label className="block text-sm font-bold mb-1">Address</label><input type="text" className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            
            {/* Registration Settings Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                <h4 className="text-sm font-bold text-blue-800 uppercase">Registration Rules (Overrides)</h4>
                
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Allow Self Registration</label>
                    <select 
                        className="w-full border p-2 rounded text-sm"
                        value={formData.allow_self_registration_override}
                        onChange={e => setFormData({...formData, allow_self_registration_override: e.target.value})}
                    >
                        <option value="">Use Municipality Default</option>
                        <option value="true">Yes, Allow (Override)</option>
                        <option value="false">No, Block (Override)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Require Guardian</label>
                    <select 
                        className="w-full border p-2 rounded text-sm"
                        value={formData.require_guardian_override}
                        onChange={e => setFormData({...formData, require_guardian_override: e.target.value})}
                    >
                        <option value="">Use Municipality Default</option>
                        <option value="true">Yes, Require (Override)</option>
                        <option value="false">No, Optional (Override)</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-bold mb-1">Latitude</label><input type="number" step="any" className="w-full border p-2 rounded" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Longitude</label><input type="number" step="any" className="w-full border p-2 rounded" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} /></div>
            </div>
            
            <div><label className="block text-sm font-bold mb-1">Categories</label><input type="text" className="w-full border p-2 rounded" placeholder="e.g. Sports, Arts" value={formData.club_categories} onChange={e => setFormData({...formData, club_categories: e.target.value})} /></div>
          </div>

          {/* RIGHT: Images & Docs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
                <div>
                    <label className="block text-xs font-bold uppercase mb-2">Avatar</label>
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'avatar')} className="text-xs w-full" />
                    {avatarPreview && <img src={avatarPreview} className="mt-2 h-16 object-contain" />}
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase mb-2">Hero Image</label>
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'hero')} className="text-xs w-full" />
                    {heroPreview && <img src={heroPreview} className="mt-2 h-16 object-cover rounded" />}
                </div>
            </div>

            <div><label className="block text-sm font-bold mb-1">Terms & Conditions</label><textarea required rows={3} className="w-full border p-2 rounded" value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} /></div>
            <div><label className="block text-sm font-bold mb-1">Club Policies</label><textarea required rows={3} className="w-full border p-2 rounded" value={formData.club_policies} onChange={e => setFormData({...formData, club_policies: e.target.value})} /></div>
          </div>
        </div>

        {/* OPENING HOURS */}
        <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Opening Hours</h3>
            
            {/* Builder */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                    <select className="border p-2 rounded text-sm w-32" value={newHour.weekday} onChange={e => setNewHour({...newHour, weekday: parseInt(e.target.value)})}>
                        {WEEKDAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select className="border p-2 rounded text-sm w-32" value={newHour.week_cycle} onChange={e => setNewHour({...newHour, week_cycle: e.target.value})}>
                        {CYCLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="time" className="border p-2 rounded text-sm" value={newHour.open_time} onChange={e => setNewHour({...newHour, open_time: e.target.value})} />
                    <span className="self-center">-</span>
                    <input type="time" className="border p-2 rounded text-sm" value={newHour.close_time} onChange={e => setNewHour({...newHour, close_time: e.target.value})} />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <select className="border p-2 rounded text-sm w-32 bg-white" value={newHour.restriction_mode} onChange={e => setNewHour({...newHour, restriction_mode: e.target.value})}>
                        <option value="NONE">No Restriction</option>
                        <option value="AGE">Age Range</option>
                        <option value="GRADE">Grade Range</option>
                    </select>
                    {newHour.restriction_mode !== 'NONE' && (
                        <div className="flex items-center gap-1">
                            <input type="number" placeholder="From" className="border p-2 rounded text-sm w-16" value={newHour.min_value} onChange={e => setNewHour({...newHour, min_value: e.target.value})} />
                            <span className="text-gray-500">-</span>
                            <input type="number" placeholder="To" className="border p-2 rounded text-sm w-16" value={newHour.max_value} onChange={e => setNewHour({...newHour, max_value: e.target.value})} />
                            <span className="text-xs text-gray-500 font-bold uppercase ml-1">{newHour.restriction_mode}</span>
                        </div>
                    )}
                    <select className="border p-2 rounded text-sm w-36 bg-white" value={newHour.gender_restriction} onChange={e => setNewHour({...newHour, gender_restriction: e.target.value})}>
                        {GENDER_RESTRICTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input type="text" placeholder="Title (Optional)" className="border p-2 rounded text-sm flex-1" value={newHour.title} onChange={e => setNewHour({...newHour, title: e.target.value})} />
                    
                    <button type="button" onClick={addHour} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 ml-auto">+ Add Hour</button>
                </div>
                {hourError && <p className="text-red-600 text-xs font-bold">{hourError}</p>}
            </div>

            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {openingHours.map((hour, idx) => {
                    const dayName = WEEKDAYS.find(d => d.id === hour.weekday)?.name;
                    const cycleName = CYCLES.find(c => c.id === hour.week_cycle)?.name;
                    const genderName = GENDER_RESTRICTIONS.find(g => g.id === hour.gender_restriction)?.name || 'All Genders';
                    return (
                        <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded shadow-sm text-sm">
                            <div className="flex gap-2">
                                <span className="font-bold w-24">{dayName}</span>
                                <span className="text-gray-500 text-xs uppercase w-20 pt-0.5">{cycleName}</span>
                                <span>{hour.open_time.substring(0,5)} - {hour.close_time.substring(0,5)}</span>
                            </div>
                            
                            <div className="flex gap-4 items-center">
                                {hour.restriction_mode !== 'NONE' && (
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">
                                        {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                                    </span>
                                )}
                                {hour.gender_restriction !== 'ALL' && (
                                    <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs font-bold">
                                        {genderName}
                                    </span>
                                )}
                                {hour.title && <span className="text-gray-500 italic">{hour.title}</span>}
                                <button type="button" onClick={() => removeHour(idx)} className="text-red-500 font-bold px-2">×</button>
                            </div>
                        </div>
                    );
                })}
                {openingHours.length === 0 && <p className="text-gray-500 italic text-sm">No opening hours added yet.</p>}
            </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-6">
            <button type="button" onClick={() => router.push(buildUrlWithParams(redirectPath))} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Club'}
            </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}