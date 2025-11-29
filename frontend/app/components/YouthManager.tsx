'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface YouthManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function YouthManager({ basePath, scope }: YouthManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Dropdowns
  const [interests, setInterests] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Delete
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchDropdowns();
    fetchAllUsersForAnalytics();
  }, []);

  useEffect(() => {
    fetchYouth();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      const [interestRes, muniRes, clubRes] = await Promise.all([
        api.get('/interests/'),
        scope === 'SUPER' ? api.get('/municipalities/') : Promise.resolve({ data: [] }),
        api.get('/clubs/?page_size=1000')
      ]);
      
      setInterests(Array.isArray(interestRes.data) ? interestRes.data : interestRes.data.results || []);
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsersForAnalytics = async () => {
    try {
      // Fetch all youth members for analytics calculation
      // Fetch page by page until we have all results
      let allUsers: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('role', 'YOUTH_MEMBER');
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/users/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          console.warn(`No response data for page ${page}`);
          break;
        }
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          // Direct array response
          pageUsers = responseData;
          allUsers = [...allUsers, ...pageUsers];
          console.log(`Got array response with ${pageUsers.length} users, total: ${allUsers.length}`);
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          // Paginated response
          pageUsers = responseData.results;
          allUsers = [...allUsers, ...pageUsers];
          
          // Get total count from first page
          if (page === 1) {
            totalCount = responseData.count || 0;
            console.log(`First page: ${pageUsers.length} users, total count: ${totalCount}, has next: ${!!responseData.next}`);
          }
          
          // Check if we should continue
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allUsers.length >= totalCount;
          const gotEmptyPage = pageUsers.length === 0;
          
          console.log(`Page ${page}: Got ${pageUsers.length} users, total so far: ${allUsers.length}/${totalCount}, hasNext: ${hasNext}`);
          
          // Stop if: no next page, we have all results, or got empty page
          if (!hasNext || hasAllResults || gotEmptyPage) {
            console.log(`Stopping: hasNext=${hasNext}, hasAllResults=${hasAllResults}, gotEmptyPage=${gotEmptyPage}`);
            break;
          }
          
          // Continue to next page
          page++;
        } else {
          console.warn(`Unexpected response format on page ${page}:`, responseData);
          break;
        }
      }
      
      console.log(`Analytics complete: Fetched ${allUsers.length} users (expected ${totalCount || 'unknown'})`);
      setAllUsersForAnalytics(allUsers);
    } catch (err) {
      console.error('Error fetching users for analytics:', err);
      setAllUsersForAnalytics([]);
    }
  };

  const fetchYouth = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'YOUTH_MEMBER');
      
      // Get filters from URL
      const search = searchParams.get('search') || '';
      const status = searchParams.get('verification_status') || '';
      const gender = searchParams.get('legal_gender') || '';
      const ageFrom = searchParams.get('age_from') || '';
      const ageTo = searchParams.get('age_to') || '';
      const gradeFrom = searchParams.get('grade_from') || '';
      const gradeTo = searchParams.get('grade_to') || '';
      const interest = searchParams.get('interest') || '';
      const municipality = searchParams.get('municipality') || '';
      const club = searchParams.get('preferred_club') || '';
      const birthdayToday = searchParams.get('birthday_today') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (status) params.set('verification_status', status);
      if (gender) params.set('legal_gender', gender);
      if (ageFrom) params.set('age_from', ageFrom);
      if (ageTo) params.set('age_to', ageTo);
      if (gradeFrom) params.set('grade_from', gradeFrom);
      if (gradeTo) params.set('grade_to', gradeTo);
      if (municipality) params.set('municipality', municipality);
      if (club) params.set('preferred_club', club);
      
      // Handle birthday filter - filter client-side if needed
      // Note: Backend doesn't have birthday_today filter, so we'll filter client-side
      
      // Use server-side pagination
      params.set('page', page);
      params.set('page_size', '10');

      const res = await api.get(`/users/?${params.toString()}`);
      let usersData = Array.isArray(res.data) ? res.data : res.data.results || [];
      
      // Client-side filtering for birthday and interest (if backend doesn't support)
      if (birthdayToday === 'true') {
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate();
        usersData = usersData.filter((u: any) => {
          if (!u.date_of_birth) return false;
          const dob = new Date(u.date_of_birth);
          return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
        });
      }
      
      if (interest) {
        const interestId = parseInt(interest);
        usersData = usersData.filter((u: any) => {
          const userInterests = u.interests || [];
          return userInterests.some((i: any) => {
            const id = typeof i === 'object' ? i.id : i;
            return id === interestId;
          });
        });
      }
      
      setAllUsers(usersData);
      // Get total count from API response
      const count = Array.isArray(res.data) ? usersData.length : (res.data.count || usersData.length);
      setTotalCount(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const ageFrom = searchParams.get('age_from');
    const ageTo = searchParams.get('age_to');
    const gradeFrom = searchParams.get('grade_from');
    const gradeTo = searchParams.get('grade_to');
    const interest = searchParams.get('interest');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('preferred_club');
    const birthdayToday = searchParams.get('birthday_today');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (ageFrom) params.set('age_from', ageFrom);
    if (ageTo) params.set('age_to', ageTo);
    if (gradeFrom) params.set('grade_from', gradeFrom);
    if (gradeTo) params.set('grade_to', gradeTo);
    if (interest) params.set('interest', interest);
    if (municipality) params.set('municipality', municipality);
    if (club) params.set('preferred_club', club);
    if (birthdayToday) params.set('birthday_today', birthdayToday);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({ message: 'User deleted.', type: 'success', isVisible: true });
      fetchYouth();
      fetchAllUsersForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setUserToDelete(null);
    }
  };

  // Calculate analytics from allUsersForAnalytics
  const analytics = {
    total_youth: allUsersForAnalytics.length,
    new_last_7_days: allUsersForAnalytics.filter((u: any) => {
      if (!u.date_joined) return false;
      const joinDate = new Date(u.date_joined);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return joinDate >= sevenDaysAgo;
    }).length,
    gender: {
      male: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'MALE').length,
      female: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'FEMALE').length,
      other: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'OTHER').length,
    },
    verification: {
      verified: allUsersForAnalytics.filter((u: any) => u.verification_status === 'VERIFIED').length,
      unverified_pending: allUsersForAnalytics.filter((u: any) => 
        u.verification_status === 'UNVERIFIED' || u.verification_status === 'PENDING'
      ).length,
    },
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  // Use allUsers directly since we're doing server-side pagination
  const paginatedUsers = allUsers;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Youth Members</h1>
        <Link href={`${basePath}/create`} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow">
          + Add Youth
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!loading && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
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
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[500px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Youth Members */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Youth</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_youth}</p>
              </div>

              {/* Card 2: New Last 7 Days */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New (7 Days)</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.new_last_7_days}</p>
              </div>

              {/* Card 3: Gender Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Gender</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Male:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Female:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.other}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Verification Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Verification</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verified:</span>
                    <span className="font-bold text-green-600">{analytics.verification.verified}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unverified/Pending:</span>
                    <span className="font-bold text-yellow-600">{analytics.verification.unverified_pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter Fields - Collapsible */}
        <div 
          className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
            filtersExpanded 
              ? 'max-h-[1000px] opacity-100' 
              : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''} 
              onChange={e => updateUrl('search', e.target.value)}
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
              onChange={e => updateUrl('age_from', e.target.value)}
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
              onChange={e => updateUrl('age_to', e.target.value)}
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
              onChange={e => updateUrl('grade_from', e.target.value)}
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
              onChange={e => updateUrl('grade_to', e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="w-32">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('legal_gender') || ''} 
              onChange={e => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status */}
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('verification_status') || ''} 
              onChange={e => updateUrl('verification_status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>

          {/* Interests */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Interest</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('interest') || ''} 
              onChange={e => updateUrl('interest', e.target.value)}
            >
              <option value="">All Interests</option>
              {interests.map(i => (
                <option key={i.id} value={i.id.toString()}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Municipality - Only for SUPER scope */}
          {scope === 'SUPER' && (
            <div className="w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-gray-50" 
                value={searchParams.get('municipality') || ''} 
                onChange={e => updateUrl('municipality', e.target.value)}
              >
                <option value="">All Municipalities</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Club */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('preferred_club') || ''} 
              onChange={e => updateUrl('preferred_club', e.target.value)}
            >
              <option value="">All Clubs</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Birthday Today */}
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Birthday</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('birthday_today') || ''} 
              onChange={e => updateUrl('birthday_today', e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Today</option>
            </select>
          </div>

              {/* Clear Filters */}
              <button
                onClick={() => router.push(pathname)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Grade / Age</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={getMediaUrl(u.avatar) || ''} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
                          {getInitials(u.first_name, u.last_name)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        u.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 
                        u.verification_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {u.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.grade && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Grade {u.grade}
                        </span>
                      )}
                      {u.date_of_birth && calculateAge(u.date_of_birth) !== null && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {calculateAge(u.date_of_birth)} years old
                        </span>
                      )}
                      {!u.grade && (!u.date_of_birth || calculateAge(u.date_of_birth) === null) && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithParams(`${basePath}/${u.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithParams(`${basePath}/edit/${u.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setUserToDelete(u)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No youth members found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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
      )}

      <DeleteConfirmationModal 
        isVisible={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        itemName={`${userToDelete?.first_name} ${userToDelete?.last_name}`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}