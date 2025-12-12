'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { BarChart3, Filter, ChevronDown, ChevronUp, Search, X, Users, UserCheck, UserX } from 'lucide-react';
import { getClubFollowers, removeClubFollower } from '@/lib/api';
import { getMediaUrl } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
      <div className="py-20 text-center text-gray-400 animate-pulse">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4D4DA4]"></div>
        <p className="mt-2">Loading followers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Analytics Dashboard */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                <ChevronUp className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                  analyticsExpanded ? "rotate-0" : "rotate-180"
                )} />
                <span className="sr-only">Toggle Analytics</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Total Followers */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Followers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_followers}</div>
                </CardContent>
              </Card>

              {/* Card 2: Youth Members vs Guardians */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Members vs Guardians</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Youth Members:</span>
                    <span className="font-bold text-[#121213]">{analytics.youth_members}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Guardians:</span>
                    <span className="font-bold text-[#121213]">{analytics.guardians}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Gender Breakdown */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Gender</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Male:</span>
                    <span className="font-bold text-[#121213]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Female:</span>
                    <span className="font-bold text-[#121213]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other:</span>
                    <span className="font-bold text-[#121213]">{analytics.gender.other}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* FILTERS */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
        <Card className="border border-gray-100 shadow-sm">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Filters</span>
              </div>
              <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-gray-100 p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Search */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      type="text" 
                      placeholder="Search by name, email..." 
                      className="pl-9 bg-gray-50 border-gray-200"
                      value={searchQuery} 
                      onChange={e => handleSearchChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Role</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4]"
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
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Gender</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4]"
                    value={genderFilter} 
                    onChange={e => handleGenderFilterChange(e.target.value)}
                  >
                    <option value="">All Genders</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 md:mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                >
                  <X className="h-4 w-4" /> Clear Filters
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Content */}
      {paginatedFollowers.length === 0 && !loading ? (
        <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          {allFollowers.length === 0 ? (
            <p className="text-gray-500">This club has no followers yet.</p>
          ) : (
            <>
              <p className="text-gray-500">No followers match your current filters.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-4 text-[#4D4DA4] hover:text-[#4D4DA4] hover:bg-[#EBEBFE]"
              >
                Clear filters to see all followers
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedFollowers.map((user) => {
              const avatarUrl = user.avatar ? getMediaUrl(user.avatar) : null;
              const displayName = user.nickname || `${user.first_name} ${user.last_name}`;
              const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();
              const age = calculateAge(user.date_of_birth);
              const gender = getGenderDisplay(user);
              const isRemoving = removingUserId === user.id;

              return (
                <Card key={user.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                        <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                        <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                          {initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-[#121213] truncate">
                          {user.first_name} {user.last_name}
                        </CardTitle>
                        {user.nickname && (
                          <p className="text-xs text-gray-500 truncate">@{user.nickname}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500">Email</span>
                        <div className="font-medium text-gray-900 truncate">{user.email}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Age</span>
                        <div className="font-medium text-gray-900">{age !== null ? `${age} years` : '—'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Gender</span>
                        <div className="font-medium text-gray-900">{gender}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Grade</span>
                        <div className="font-medium text-gray-900">
                          {user.grade !== null && user.grade !== undefined ? `Grade ${user.grade}` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {user.role.replace(/_/g, ' ')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfollowClick(user)}
                        disabled={isRemoving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        {isRemoving ? 'Removing...' : 'Unfollow'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block rounded-xl border border-gray-100 bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-[#EBEBFE]/50">
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="text-[#4D4DA4] font-semibold">User</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Email</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Age</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Gender</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Grade</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Role</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFollowers.map((user) => {
                  const avatarUrl = user.avatar ? getMediaUrl(user.avatar) : null;
                  const displayName = user.nickname || `${user.first_name} ${user.last_name}`;
                  const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();
                  const age = calculateAge(user.date_of_birth);
                  const gender = getGenderDisplay(user);
                  const isRemoving = removingUserId === user.id;

                  return (
                    <TableRow key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                            <AvatarFallback className="rounded-lg font-bold text-[10px] bg-[#EBEBFE] text-[#4D4DA4]">
                              {initials || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[#121213]">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.nickname && (
                              <div className="text-xs text-gray-500">@{user.nickname}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-gray-600">{user.email}</TableCell>
                      <TableCell className="py-4 text-gray-600">
                        {age !== null ? `${age} years` : '—'}
                      </TableCell>
                      <TableCell className="py-4 text-gray-600">{gender}</TableCell>
                      <TableCell className="py-4 text-gray-600">
                        {user.grade !== null && user.grade !== undefined ? `Grade ${user.grade}` : '—'}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {user.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnfollowClick(user)}
                          disabled={isRemoving}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          {isRemoving ? 'Removing...' : 'Unfollow'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}


      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <div className="text-sm text-gray-500">
            Showing page <span className="font-medium text-[#121213]">{currentPage}</span> of <span className="font-medium text-[#121213]">{totalPages}</span>
            {' '}(Total: <span className="font-medium text-[#121213]">{totalCount}</span>)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => updateUrl({ page: currentPage - 1 })}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                // Show first page, last page, current page, and pages around current
                if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                  return (
                    <Button
                      key={p}
                      variant={p === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateUrl({ page: p })}
                      className={p === currentPage 
                        ? 'bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white' 
                        : 'text-gray-600 hover:text-gray-900'}
                    >
                      {p}
                    </Button>
                  );
                } else if (p === currentPage - 2 || p === currentPage + 2) {
                  return <span key={p} className="px-2 text-gray-400">...</span>;
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl({ page: currentPage + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Unfollow Confirmation Modal */}
      <ConfirmationModal
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
        variant="danger"
      />
    </div>
  );
}

