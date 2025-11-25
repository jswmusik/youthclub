'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

interface Option { id: number; name: string; [key: string]: any; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }
interface MunicipalityOption extends Option { country?: number | { id: number; name: string }; }
interface ClubOption extends Option { municipality?: number | { id: number; name: string }; municipality_name?: string; }

function ManageYouthPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Dropdowns
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  const [guardiansList, setGuardiansList] = useState<GuardianOption[]>([]);
  const [countries, setCountries] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Guardian search
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [showGuardianDropdown, setShowGuardianDropdown] = useState(false);
  
  // Interest search
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  const initialFormState = {
    email: '', password: '', first_name: '', last_name: '', nickname: '',
    legal_gender: 'MALE', preferred_gender: '', phone_number: '',
    date_of_birth: '', grade: '', preferred_club: '', 
    verification_status: 'UNVERIFIED',
    interests: [] as number[],
    guardians: [] as number[], // Array of Guardian IDs
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchDropdowns();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchYouth();
  }, [searchParams]);

  // Handle edit parameter from URL (e.g., from view page)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !isEditing && !showModal) {
      const userId = parseInt(editId);
      // Try to find user in current list first
      const userToEdit = users.find(u => u.id === userId);
      if (userToEdit) {
        handleOpenEdit(userToEdit);
      } else if (users.length > 0) {
        // User not in current page, fetch it directly
        api.get(`/users/${userId}/`).then(res => {
          handleOpenEdit(res.data);
        }).catch(err => {
          console.error('Failed to load user for editing:', err);
        });
      }
    }
  }, [searchParams, users.length, isEditing, showModal]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/youth_stats/');
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDropdowns = async () => {
    try {
      // Fetch all clubs without pagination for dropdown
      const clubRes = await api.get('/clubs/?page_size=1000');
      const clubsData = Array.isArray(clubRes.data) ? clubRes.data : (clubRes.data?.results || []);
      setClubs(clubsData);
      
      const interestRes = await api.get('/interests/');
      setInterests(Array.isArray(interestRes.data) ? interestRes.data : (interestRes.data?.results || []));

      const guardianRes = await api.get('/users/list_guardians/');
      setGuardiansList(guardianRes.data);
      
      const countryRes = await api.get('/countries/');
      setCountries(Array.isArray(countryRes.data) ? countryRes.data : (countryRes.data?.results || []));
      
      const muniRes = await api.get('/municipalities/');
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : (muniRes.data?.results || []));
    } catch (err) { console.error(err); }
  };

  const fetchYouth = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'YOUTH_MEMBER');
      
      // Copy all filter parameters
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      const ageFrom = searchParams.get('age_from');
      if (ageFrom) params.set('age_from', ageFrom);
      
      const ageTo = searchParams.get('age_to');
      if (ageTo) params.set('age_to', ageTo);
      
      const gradeFrom = searchParams.get('grade_from');
      if (gradeFrom) params.set('grade_from', gradeFrom);
      
      const gradeTo = searchParams.get('grade_to');
      if (gradeTo) params.set('grade_to', gradeTo);
      
      const verificationStatus = searchParams.get('verification_status');
      if (verificationStatus) params.set('verification_status', verificationStatus);
      
      const country = searchParams.get('country');
      if (country) params.set('country', country);
      
      const municipality = searchParams.get('municipality');
      if (municipality) params.set('municipality', municipality);
      
      const preferredClub = searchParams.get('preferred_club');
      if (preferredClub) params.set('preferred_club', preferredClub);
      
      const gender = searchParams.get('legal_gender');
      if (gender) params.set('legal_gender', gender);
      
      const res = await api.get(`/users/?${params.toString()}`);
      setUsers(res.data.results);
      setTotalCount(res.data.count);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditUserId(null);
    setFormData(initialFormState);
    setAvatarFile(null);
    setAvatarPreview(null);
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
    setShowModal(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setEditUserId(user.id);
    
    // Normalize interests/guardians (handle API variations)
    const interestIds = user.interests?.map((i: any) => typeof i === 'object' ? i.id : i) || [];
    // The serializer now returns 'guardians' as a list of IDs directly
    const guardianIds = user.guardians || [];
    
    setFormData({
      email: user.email, password: '', 
      first_name: user.first_name || '', last_name: user.last_name || '',
      nickname: user.nickname || '', 
      legal_gender: user.legal_gender || 'MALE', preferred_gender: user.preferred_gender || '',
      phone_number: user.phone_number || '', 
      date_of_birth: user.date_of_birth || '',
      grade: user.grade || '', 
      preferred_club: user.preferred_club || '',
      verification_status: user.verification_status || 'UNVERIFIED',
      interests: interestIds,
      guardians: guardianIds
    });
    setAvatarFile(null);
    setAvatarPreview(user.avatar ? getMediaUrl(user.avatar) : null);
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      
      // Basic fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'interests') return; 
        if (key === 'guardians') return;
        data.append(key, value.toString());
      });
      
      // Handle Arrays
      formData.interests.forEach(id => data.append('interests', id.toString()));
      formData.guardians.forEach(id => data.append('guardians', id.toString()));
      
      data.append('role', 'YOUTH_MEMBER');
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({
          message: 'Youth member updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/users/', data, config);
        setToast({
          message: 'Youth member created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchYouth();
      fetchStats();
    } catch (err) { 
      setToast({
        message: 'Operation failed. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure?")) return;
    try { 
      await api.delete(`/users/${id}/`);
      setToast({
        message: 'Youth member deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      fetchYouth(); 
      fetchStats(); 
    } 
    catch (err) { 
      setToast({
        message: 'Failed to delete youth member.',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (id: number) => {
    setFormData(prev => {
      const exists = prev.interests.includes(id);
      if (exists) return { ...prev, interests: prev.interests.filter(i => i !== id) };
      return { ...prev, interests: [...prev.interests, id] };
    });
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== id)
    }));
  };

  // Filter interests based on search term
  const filteredInterests = interests.filter(interest => {
    const searchLower = interestSearchTerm.toLowerCase();
    const name = interest.name.toLowerCase();
    return name.includes(searchLower) && !formData.interests.includes(interest.id);
  });

  // Get selected interest details
  const getSelectedInterests = () => {
    return formData.interests.map(id => interests.find(i => i.id === id)).filter(Boolean) as Option[];
  };

  const toggleGuardian = (id: number) => {
    setFormData(prev => {
      const exists = prev.guardians.includes(id);
      if (exists) return { ...prev, guardians: prev.guardians.filter(i => i !== id) };
      return { ...prev, guardians: [...prev.guardians, id] };
    });
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
  };

  const removeGuardian = (id: number) => {
    setFormData(prev => ({
      ...prev,
      guardians: prev.guardians.filter(i => i !== id)
    }));
  };

  // Filter guardians based on search term
  const filteredGuardians = guardiansList.filter(g => {
    const searchLower = guardianSearchTerm.toLowerCase();
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
    const email = g.email.toLowerCase();
    return (fullName.includes(searchLower) || email.includes(searchLower)) && 
           !formData.guardians.includes(g.id);
  });

  // Get selected guardian details
  const getSelectedGuardians = () => {
    return formData.guardians.map(id => guardiansList.find(g => g.id === id)).filter(Boolean) as GuardianOption[];
  };

  // Helper function to get initials from name
  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  // Helper function to get avatar color (consistent for all youth members)
  const getAvatarColor = () => {
    return 'bg-blue-200 text-blue-800';
  };

  // Filter municipalities based on selected country
  const filteredMunicipalities = useMemo(() => {
    const selectedCountry = searchParams.get('country');
    if (!selectedCountry) return municipalities;
    const countryId = parseInt(selectedCountry);
    return municipalities.filter(m => {
      // Handle both cases: m.country is an ID or m.country is an object with id
      return (typeof m.country === 'number' && m.country === countryId) ||
             (typeof m.country === 'object' && m.country?.id === countryId);
    });
  }, [municipalities, searchParams]);

  // Filter clubs based on selected municipality
  const filteredClubs = useMemo(() => {
    const selectedMunicipality = searchParams.get('municipality');
    const selectedCountry = searchParams.get('country');
    
    // If no filters selected, return all clubs
    if (!selectedMunicipality && !selectedCountry) {
      return clubs;
    }
    
    // Filter by municipality if selected (primary filter)
    if (selectedMunicipality) {
      const municipalityId = Number(selectedMunicipality);
      if (isNaN(municipalityId)) return clubs;
      
      return clubs.filter(c => {
        // Get club's municipality ID - handle different data types
        const clubMunicipalityId = typeof c.municipality === 'number' 
          ? c.municipality 
          : typeof c.municipality === 'string' 
          ? Number(c.municipality)
          : typeof c.municipality === 'object' && c.municipality?.id
          ? Number(c.municipality.id)
          : null;
        
        // Direct ID comparison
        if (clubMunicipalityId !== null && !isNaN(clubMunicipalityId)) {
          return clubMunicipalityId === municipalityId;
        }
        
        // Fallback: match by municipality_name
        if (c.municipality_name) {
          const matchingMunicipality = municipalities.find(m => m.id === municipalityId);
          return matchingMunicipality?.name === c.municipality_name;
        }
        
        return false;
      });
    }
    
    // Filter by country if selected (but no municipality)
    if (selectedCountry) {
      const countryId = Number(selectedCountry);
      if (isNaN(countryId)) return clubs;
      
      return clubs.filter(c => {
        // Get club's municipality ID
        const clubMunicipalityId = typeof c.municipality === 'number' 
          ? c.municipality 
          : typeof c.municipality === 'string' 
          ? Number(c.municipality)
          : typeof c.municipality === 'object' && c.municipality?.id
          ? Number(c.municipality.id)
          : null;
        
        if (clubMunicipalityId === null || isNaN(clubMunicipalityId)) return false;
        
        // Find municipality and check its country
        const clubMunicipality = municipalities.find(m => m.id === clubMunicipalityId);
        if (!clubMunicipality) return false;
        
        const municipalityCountryId = typeof clubMunicipality.country === 'number'
          ? clubMunicipality.country
          : typeof clubMunicipality.country === 'string'
          ? Number(clubMunicipality.country)
          : typeof clubMunicipality.country === 'object' && clubMunicipality.country?.id
          ? Number(clubMunicipality.country.id)
          : null;
        
        return municipalityCountryId === countryId;
      });
    }
    
    return clubs;
  }, [clubs, searchParams, municipalities]);

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Youth Members</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Create New Member
        </button>
      </div>

      {/* --- ANALYTICS HUD --- */}
      {stats && (
        <div className="mb-6">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:bg-gray-50 transition-colors mb-3"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Analytics Cards - Collapsible */}
          <div 
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[600px] opacity-100 translate-y-0' 
                : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'
            } overflow-hidden`}
          >
            {/* Card 1: Total Youth */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Youth</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.total_youth}</p>
              <p className="text-blue-100 text-xs">Active members</p>
            </div>

            {/* Card 2: Active (7 Days) */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-green-100 text-xs font-semibold uppercase tracking-wider mb-1">Active (7 Days)</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.activity.active_7_days}</p>
              <p className="text-green-100 text-xs">Recently active</p>
            </div>

            {/* Card 3: Grade Breakdown */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition-all duration-200 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-600 text-xs font-bold uppercase tracking-wider">Grade Breakdown</h3>
                <div className="bg-orange-100 rounded-lg p-1.5">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.grades).map(([grade, count]: any) => (
                  <div key={grade} className="bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-100 flex items-center gap-1.5">
                    <span className="text-xs text-gray-600 font-medium">Gr {grade}:</span>
                    <span className="text-sm font-bold text-orange-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim()) {
                  updateUrl('search', value.trim());
                } else {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('search');
                  params.set('page', '1');
                  router.push(`${pathname}?${params.toString()}`);
                }
              }}
            />
          </div>

          {/* Age Range */}
          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age From</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Min"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('age_from') || ''}
              onChange={(e) => updateUrl('age_from', e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age To</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Max"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('age_to') || ''}
              onChange={(e) => updateUrl('age_to', e.target.value)}
            />
          </div>

          {/* Grade Range */}
          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade From</label>
            <input
              type="number"
              min="1"
              max="12"
              placeholder="Min"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('grade_from') || ''}
              onChange={(e) => updateUrl('grade_from', e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade To</label>
            <input
              type="number"
              min="1"
              max="12"
              placeholder="Max"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('grade_to') || ''}
              onChange={(e) => updateUrl('grade_to', e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('verification_status') || ''}
              onChange={(e) => updateUrl('verification_status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          {/* Country */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('country') || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Clear municipality and club when country changes
                const params = new URLSearchParams(searchParams.toString());
                if (value) {
                  params.set('country', value);
                } else {
                  params.delete('country');
                }
                params.delete('municipality');
                params.delete('preferred_club');
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              <option value="">All Countries</option>
              {Array.isArray(countries) && countries.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Municipality */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('municipality') || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Clear club when municipality changes
                const params = new URLSearchParams(searchParams.toString());
                if (value) {
                  params.set('municipality', value);
                } else {
                  params.delete('municipality');
                }
                params.delete('preferred_club');
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              <option value="">All Municipalities</option>
              {filteredMunicipalities.map(m => (
                <option key={m.id} value={m.id.toString()}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Club */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('preferred_club') || ''}
              onChange={(e) => updateUrl('preferred_club', e.target.value)}
              disabled={searchParams.get('municipality') ? false : (searchParams.get('country') ? false : false)}
            >
              <option value="">
                {searchParams.get('municipality') 
                  ? `Clubs in Selected Municipality (${filteredClubs.length})` 
                  : searchParams.get('country')
                  ? `Clubs in Selected Country (${filteredClubs.length})`
                  : 'All Clubs'}
              </option>
              {filteredClubs.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
            {searchParams.get('municipality') && filteredClubs.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No clubs found for selected municipality</p>
            )}
          </div>

          {/* Gender */}
          <div className="w-32">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('legal_gender') || ''}
              onChange={(e) => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <button
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium pb-2.5"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade / DOB</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatar && !avatarErrors.has(user.id) ? (
                      <img 
                        src={getMediaUrl(user.avatar) || ''}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover mr-3"
                        onError={() => {
                          setAvatarErrors(prev => new Set(prev).add(user.id));
                        }}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor()} flex items-center justify-center font-semibold text-sm mr-3`}>
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}
                    <div>
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                       user.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                       user.verification_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                       'bg-gray-100 text-gray-600'
                   }`}>
                       {user.verification_status || 'UNVERIFIED'}
                   </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Grade: <span className="font-bold">{user.grade || '-'}</span><br/>
                  <span className="text-xs">{user.date_of_birth}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {clubs.find(c => c.id === user.preferred_club)?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <Link href={`/admin/super/youth/${user.id}`} className="text-blue-600 hover:text-blue-900 font-bold">View</Link>
                  <button onClick={() => handleOpenEdit(user)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                  <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
        <div className="flex flex-1 justify-between sm:hidden">
          <button 
            disabled={currentPage === 1}
            onClick={() => updateUrl('page', (currentPage - 1).toString())}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            disabled={currentPage >= totalPages}
            onClick={() => updateUrl('page', (currentPage + 1).toString())}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              {' '}(Total: {totalCount})
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                ← Prev
              </button>
              
              {/* Simple Pagination Numbers */}
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => updateUrl('page', p.toString())}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                      ${p === currentPage 
                        ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                Next →
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Youth' : 'Create Youth'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                <input type="text" placeholder="Nickname" className="border p-2 rounded" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                
                <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder={isEditing ? "New Password" : "Password"} className="border p-2 rounded" required={!isEditing} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
              </div>

              {/* VERIFICATION (Admin Only) */}
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

              {/* DEMOGRAPHICS */}
              <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 gap-4">
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
                        <option value="MALE">Male</option> <option value="FEMALE">Female</option> <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Preferred Gender</label>
                    <input type="text" className="w-full border p-2 rounded" value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
                  </div>
              </div>

              {/* GUARDIANS & CLUB & INTERESTS */}
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

               {/* AVATAR */}
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 mt-2 rounded-full object-cover border" />}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
                  {isEditing ? 'Save Changes' : 'Create Youth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function ManageYouthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageYouthPageContent />
    </Suspense>
  );
}
