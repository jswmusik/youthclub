'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getClubFollowers, removeClubFollower } from '@/lib/api';
import { getMediaUrl } from '../utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Follower {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  avatar?: string | null;
  role: string;
  date_of_birth?: string | null;
  legal_gender?: string | null;
  preferred_gender?: string | null;
  grade?: number | null;
}

interface ClubFollowersListProps {
  clubId: string | number;
}

export default function ClubFollowersList({ clubId }: ClubFollowersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [allFollowers, setAllFollowers] = useState<Follower[]>([]); // Store all followers for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<Follower | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Filter states - read from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string>(searchParams.get('role') || '');
  const [genderFilter, setGenderFilter] = useState<string>(searchParams.get('gender') || '');

  // Pagination
  const pageSize = 10;
  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    if (clubId) {
      loadFollowers();
    }
  }, [clubId]);

  // Sync filters with URL params on mount
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const gender = searchParams.get('gender') || '';
    const page = Number(searchParams.get('page')) || 1;
    
    setSearchQuery(search);
    setRoleFilter(role);
    setGenderFilter(gender);
    
    // Apply filters if we have allFollowers loaded
    if (allFollowers.length > 0) {
      applyFilters(allFollowers, search, role, gender, page);
    }
  }, [searchParams]);

  const loadFollowers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getClubFollowers(clubId);
      const followersList = Array.isArray(data) ? data : [];
      
      // Debug: Log raw API response
      console.log('Raw API response for followers:', data);
      if (followersList.length > 0) {
        console.log('First follower from API:', JSON.stringify(followersList[0], null, 2));
      }
      
      setAllFollowers(followersList); // Store all followers
      // Apply filters with current page from URL
      const page = Number(searchParams.get('page')) || 1;
      applyFilters(followersList, searchQuery, roleFilter, genderFilter, page);
    } catch (err: any) {
      console.error("Failed to load followers", err);
      setError(err?.response?.data?.error || 'Failed to load followers.');
    } finally {
      setLoading(false);
    }
  };

  // Update URL with current filters and page
  const updateUrl = (updates: { search?: string; role?: string; gender?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.search !== undefined) {
      if (updates.search) params.set('search', updates.search);
      else params.delete('search');
    }
    if (updates.role !== undefined) {
      if (updates.role) params.set('role', updates.role);
      else params.delete('role');
    }
    if (updates.gender !== undefined) {
      if (updates.gender) params.set('gender', updates.gender);
      else params.delete('gender');
    }
    if (updates.page !== undefined) {
      if (updates.page > 1) params.set('page', updates.page.toString());
      else params.delete('page');
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Apply filters to the followers list (returns all filtered results, pagination happens in render)
  const applyFilters = (followersList: Follower[], search: string, role: string, gender: string, page: number = 1) => {
    let filtered = [...followersList];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((f: Follower) => {
        const fullName = `${f.first_name} ${f.last_name}`.toLowerCase();
        const email = f.email?.toLowerCase() || '';
        const nickname = f.nickname?.toLowerCase() || '';
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               nickname.includes(searchLower);
      });
    }

    // Role filter
    if (role) {
      filtered = filtered.filter((f: Follower) => f.role === role);
    }

    // Gender filter
    if (gender) {
      filtered = filtered.filter((f: Follower) => {
        const normalized = getNormalizedGender(f);
        return normalized === gender.toUpperCase();
      });
    }

    setFollowers(filtered);
  };

  // Calculate pagination
  const totalCount = followers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFollowers = followers.slice(startIndex, endIndex);
  
  // Adjust page if current page is beyond available pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages && !loading) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', totalPages.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [totalPages, currentPage, loading, pathname, router, searchParams]);

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateUrl({ search: value, page: 1 }); // Reset to page 1 when searching
  };

  // Handle role filter change
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    updateUrl({ role: value, page: 1 }); // Reset to page 1 when filtering
  };

  // Handle gender filter change
  const handleGenderFilterChange = (value: string) => {
    setGenderFilter(value);
    updateUrl({ gender: value, page: 1 }); // Reset to page 1 when filtering
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setGenderFilter('');
    updateUrl({ search: '', role: '', gender: '', page: 1 });
  };

  const calculateAge = (dateOfBirth: string | null | undefined): number | null => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderDisplay = (user: Follower): string => {
    if (user.preferred_gender) return user.preferred_gender;
    if (user.legal_gender) return user.legal_gender;
    return '—';
  };

  const handleUnfollowClick = (user: Follower) => {
    setUserToUnfollow(user);
    setShowUnfollowModal(true);
  };

  const handleUnfollowConfirm = async () => {
    if (!userToUnfollow) return;

    const userId = userToUnfollow.id;
    try {
      setRemovingUserId(userId);
      await removeClubFollower(clubId, userId);
      
      // Remove from both allFollowers and filtered followers
      const updatedAllFollowers = allFollowers.filter(f => f.id !== userId);
      setAllFollowers(updatedAllFollowers);
      
      // Reapply filters to maintain current page
      let page = Number(searchParams.get('page')) || 1;
      
      // Temporarily apply filters to check if current page will be empty
      let tempFiltered = [...updatedAllFollowers];
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        tempFiltered = tempFiltered.filter((f: Follower) => {
          const fullName = `${f.first_name} ${f.last_name}`.toLowerCase();
          const email = f.email?.toLowerCase() || '';
          const nickname = f.nickname?.toLowerCase() || '';
          return fullName.includes(searchLower) || 
                 email.includes(searchLower) || 
                 nickname.includes(searchLower);
        });
      }
      if (roleFilter) {
        tempFiltered = tempFiltered.filter((f: Follower) => f.role === roleFilter);
      }
      if (genderFilter) {
        tempFiltered = tempFiltered.filter((f: Follower) => {
          const normalized = getNormalizedGender(f);
          return normalized === genderFilter.toUpperCase();
        });
      }
      
      // If current page would be empty, go back one page
      const tempTotalPages = Math.ceil(tempFiltered.length / pageSize);
      if (page > tempTotalPages && tempTotalPages > 0) {
        page = tempTotalPages;
        updateUrl({ page });
      }
      
      applyFilters(updatedAllFollowers, searchQuery, roleFilter, genderFilter, page);
      
      // Close modal
      setShowUnfollowModal(false);
      setUserToUnfollow(null);
    } catch (err: any) {
      console.error("Failed to remove follower", err);
      alert(err?.response?.data?.error || 'Failed to remove follower.');
    } finally {
      setRemovingUserId(null);
    }
  };

  // Helper function to normalize and get gender value
  const getNormalizedGender = (follower: Follower): string | null => {
    // Valid enum values
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    
    // Check preferred_gender first, but only if it's a valid enum value
    if (follower.preferred_gender) {
      const preferredNormalized = String(follower.preferred_gender).toUpperCase().trim();
      // If preferred_gender matches a valid enum value, use it
      if (validGenders.includes(preferredNormalized)) {
        return preferredNormalized;
      }
      // Otherwise, ignore preferred_gender and fall back to legal_gender
    }
    
    // Fall back to legal_gender
    if (follower.legal_gender) {
      const legalNormalized = String(follower.legal_gender).toUpperCase().trim();
      if (validGenders.includes(legalNormalized)) {
        return legalNormalized;
      }
    }
    
    return null;
  };

  // Calculate analytics from allFollowers (not filtered)
  const analytics = {
    total_followers: allFollowers.length,
    youth_members: allFollowers.filter((f: Follower) => f.role === 'YOUTH_MEMBER').length,
    guardians: allFollowers.filter((f: Follower) => f.role === 'GUARDIAN').length,
    gender: {
      male: allFollowers.filter((f: Follower) => {
        const normalized = getNormalizedGender(f);
        return normalized === 'MALE';
      }).length,
      female: allFollowers.filter((f: Follower) => {
        const normalized = getNormalizedGender(f);
        return normalized === 'FEMALE';
      }).length,
      other: allFollowers.filter((f: Follower) => {
        const normalized = getNormalizedGender(f);
        // Only count as "other" if it's explicitly 'OTHER' (from enum)
        return normalized === 'OTHER';
      }).length,
    },
  };

  // Debug: Log gender data for troubleshooting
  useEffect(() => {
    if (allFollowers.length > 0 && !loading) {
      console.log('=== CLUB FOLLOWERS GENDER DEBUG ===');
      allFollowers.forEach((f, index) => {
        const normalized = getNormalizedGender(f);
        console.log(`Follower ${index + 1} (${f.first_name} ${f.last_name}):`, {
          id: f.id,
          preferred_gender: f.preferred_gender,
          'preferred_gender type': typeof f.preferred_gender,
          'preferred_gender === null': f.preferred_gender === null,
          'preferred_gender === undefined': f.preferred_gender === undefined,
          'preferred_gender === ""': f.preferred_gender === '',
          legal_gender: f.legal_gender,
          'legal_gender type': typeof f.legal_gender,
          'legal_gender === null': f.legal_gender === null,
          'legal_gender === undefined': f.legal_gender === undefined,
          'legal_gender === ""': f.legal_gender === '',
          normalized: normalized,
          'normalized === "FEMALE"': normalized === 'FEMALE',
          'normalized === "MALE"': normalized === 'MALE',
          'normalized === "OTHER"': normalized === 'OTHER',
        });
        console.log('Full follower object:', JSON.stringify(f, null, 2));
      });
      console.log('=== END DEBUG ===');
    }
  }, [allFollowers.length, loading]);

  if (loading) {
    return (
      <div className="text-gray-500 p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="mt-2">Loading followers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Total Followers */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Followers</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_followers}</p>
              </div>

              {/* Card 2: Youth Members vs Guardians */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Members vs Guardians</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Youth Members:</span>
                    <span className="font-bold text-gray-900">{analytics.youth_members}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Guardians:</span>
                    <span className="font-bold text-gray-900">{analytics.guardians}</span>
                  </div>
                </div>
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
              ? 'max-h-[500px] opacity-100' 
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
                  placeholder="Search by name, email, or nickname..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchQuery} 
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>

              {/* Role Filter */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={roleFilter} 
                  onChange={e => handleRoleFilterChange(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="YOUTH_MEMBER">Youth Member</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="CLUB_ADMIN">Club Admin</option>
                  <option value="MUNICIPALITY_ADMIN">Municipality Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={genderFilter} 
                  onChange={e => handleGenderFilterChange(e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedFollowers.map((user) => {
              const avatarUrl = user.avatar ? getMediaUrl(user.avatar) : null;
              const displayName = user.nickname || `${user.first_name} ${user.last_name}`;
              const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();
              const age = calculateAge(user.date_of_birth);
              const gender = getGenderDisplay(user);
              const isRemoving = removingUserId === user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-200">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={`${user.first_name} ${user.last_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm font-bold bg-blue-100">
                            {initials || '👤'}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        {user.nickname && (
                          <div className="text-sm text-gray-500">@{user.nickname}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {age !== null ? `${age} years` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.grade !== null && user.grade !== undefined ? `Grade ${user.grade}` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleUnfollowClick(user)}
                      disabled={isRemoving}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRemoving ? 'Removing...' : 'Unfollow'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {followers.length === 0 && !loading && (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {allFollowers.length === 0 ? (
            <p className="mt-2 text-gray-500">This club has no external followers yet.</p>
          ) : (
            <>
              <p className="mt-2 text-gray-500">No followers match your current filters.</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters to see all followers
              </button>
            </>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button 
              disabled={currentPage === 1}
              onClick={() => updateUrl({ page: currentPage - 1 })}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl({ page: currentPage + 1 })}
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
                  onClick={() => updateUrl({ page: currentPage - 1 })}
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
                      onClick={() => updateUrl({ page: p })}
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
                  onClick={() => updateUrl({ page: currentPage + 1 })}
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

      {/* Unfollow Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showUnfollowModal}
        onClose={() => {
          if (!removingUserId) {
            setShowUnfollowModal(false);
            setUserToUnfollow(null);
          }
        }}
        onConfirm={handleUnfollowConfirm}
        title="Unfollow User"
        message={userToUnfollow 
          ? `Are you sure you want to remove "${userToUnfollow.first_name} ${userToUnfollow.last_name}" from this club's followers?`
          : 'Are you sure you want to remove this user from the club followers?'}
        confirmButtonText="Unfollow"
        cancelButtonText="Cancel"
        isLoading={!!removingUserId}
      />
    </div>
  );
}

