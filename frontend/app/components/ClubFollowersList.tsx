'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { BarChart3, ChevronUp, ChevronDown, Search, X, Users, UserCheck, UserX, UsersRound, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getClubFollowers, removeClubFollower } from '@/lib/api';
import { getMediaUrl } from '../utils';
import ConfirmationModal from './ConfirmationModal';

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
  const t = useTranslations('followers');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [allFollowers, setAllFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<Follower | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string>(searchParams.get('role') || '');
  const [genderFilter, setGenderFilter] = useState<string>(searchParams.get('gender') || '');

  const pageSize = 10;
  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    if (clubId) {
      loadFollowers();
    }
  }, [clubId]);

  useEffect(() => {
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const gender = searchParams.get('gender') || '';
    const page = Number(searchParams.get('page')) || 1;
    
    setSearchQuery(search);
    setRoleFilter(role);
    setGenderFilter(gender);
    
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
      
      setAllFollowers(followersList);
      const page = Number(searchParams.get('page')) || 1;
      applyFilters(followersList, searchQuery, roleFilter, genderFilter, page);
    } catch (err: any) {
      console.error("Failed to load followers", err);
      setError(err?.response?.data?.error || t('errors.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

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

  const applyFilters = (followersList: Follower[], search: string, role: string, gender: string, page: number = 1) => {
    let filtered = [...followersList];

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

    if (role) {
      filtered = filtered.filter((f: Follower) => f.role === role);
    }

    if (gender) {
      filtered = filtered.filter((f: Follower) => {
        const normalized = getNormalizedGender(f);
        return normalized === gender.toUpperCase();
      });
    }

    setFollowers(filtered);
  };

  const totalCount = followers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFollowers = followers.slice(startIndex, endIndex);
  
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages && !loading) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', totalPages.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [totalPages, currentPage, loading, pathname, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateUrl({ search: value, page: 1 });
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    updateUrl({ role: value, page: 1 });
  };

  const handleGenderFilterChange = (value: string) => {
    setGenderFilter(value);
    updateUrl({ gender: value, page: 1 });
  };

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
    const getNormalizedGenderValue = (gender: string | null | undefined): string | null => {
      if (!gender) return null;
      const normalized = String(gender).toUpperCase().trim();
      const validGenders = ['MALE', 'FEMALE', 'OTHER'];
      return validGenders.includes(normalized) ? normalized : null;
    };

    const preferred = getNormalizedGenderValue(user.preferred_gender);
    if (preferred) return t(`genders.${preferred}`);
    
    const legal = getNormalizedGenderValue(user.legal_gender);
    if (legal) return t(`genders.${legal}`);
    
    return '—';
  };

  const getRoleDisplay = (role: string): string => {
    return t(`roles.${role}` as any) || role.replace(/_/g, ' ');
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'YOUTH_MEMBER':
        return 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]';
      case 'GUARDIAN':
        return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]';
      case 'CLUB_ADMIN':
        return 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]';
      case 'MUNICIPALITY_ADMIN':
        return 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]';
      case 'SUPER_ADMIN':
        return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]';
      default:
        return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70';
    }
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
      
      const updatedAllFollowers = allFollowers.filter(f => f.id !== userId);
      setAllFollowers(updatedAllFollowers);
      
      let page = Number(searchParams.get('page')) || 1;
      
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
      
      const tempTotalPages = Math.ceil(tempFiltered.length / pageSize);
      if (page > tempTotalPages && tempTotalPages > 0) {
        page = tempTotalPages;
        updateUrl({ page });
      }
      
      applyFilters(updatedAllFollowers, searchQuery, roleFilter, genderFilter, page);
      
      setShowUnfollowModal(false);
      setUserToUnfollow(null);
    } catch (err: any) {
      console.error("Failed to remove follower", err);
      alert(err?.response?.data?.error || t('errors.failedToRemove'));
    } finally {
      setRemovingUserId(null);
    }
  };

  const getNormalizedGender = (follower: Follower): string | null => {
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    
    if (follower.preferred_gender) {
      const preferredNormalized = String(follower.preferred_gender).toUpperCase().trim();
      if (validGenders.includes(preferredNormalized)) {
        return preferredNormalized;
      }
    }
    
    if (follower.legal_gender) {
      const legalNormalized = String(follower.legal_gender).toUpperCase().trim();
      if (validGenders.includes(legalNormalized)) {
        return legalNormalized;
      }
    }
    
    return null;
  };

  const analytics = {
    total_followers: allFollowers.length,
    youth_members: allFollowers.filter((f: Follower) => f.role === 'YOUTH_MEMBER').length,
    guardians: allFollowers.filter((f: Follower) => f.role === 'GUARDIAN').length,
    gender: {
      male: allFollowers.filter((f: Follower) => getNormalizedGender(f) === 'MALE').length,
      female: allFollowers.filter((f: Follower) => getNormalizedGender(f) === 'FEMALE').length,
      other: allFollowers.filter((f: Follower) => getNormalizedGender(f) === 'OTHER').length,
    },
  };

  const getInitials = (first?: string, last?: string) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const hasFilters = searchQuery || roleFilter || genderFilter;

  if (loading) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
        <div className="py-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
        <div className="py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-red)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <button 
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          className="w-full px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h2>
          </div>
          {analyticsExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/50" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/50" />
          )}
        </button>
        
        {analyticsExpanded && (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Followers */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--brand-primary)]/20">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_followers}</div>
                <div className="text-xs text-[var(--brand-light)]/50 font-medium mt-1">{t('totalFollowers')}</div>
              </div>

              {/* Youth Members */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/30 transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--brand-blue)]/20">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.youth_members}</div>
                <div className="text-xs text-[var(--brand-light)]/50 font-medium mt-1">{t('youthMembers')}</div>
              </div>

              {/* Guardians */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/30 transition-all text-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--brand-peach)]/20">
                  <UsersRound className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.guardians}</div>
                <div className="text-xs text-[var(--brand-light)]/50 font-medium mt-1">{t('guardians')}</div>
              </div>

              {/* Gender Breakdown */}
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-third)]/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--brand-third)]/20">
                  <CheckCircle2 className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div className="text-xs text-[var(--brand-light)]/50 font-medium text-center mb-2">{t('gender')}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/60">{t('male')}:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/60">{t('female')}:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/60">{t('other')}:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.other}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('filters')}</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
              <input 
                type="text"
                placeholder={t('searchPlaceholder')} 
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            
            {/* Role Filter */}
            <div>
              <select 
                className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors appearance-none cursor-pointer"
                value={roleFilter} 
                onChange={e => handleRoleFilterChange(e.target.value)}
              >
                <option value="">{t('allRoles')}</option>
                <option value="YOUTH_MEMBER">{t('youthMember')}</option>
                <option value="GUARDIAN">{t('guardian')}</option>
                <option value="CLUB_ADMIN">{t('clubAdmin')}</option>
                <option value="MUNICIPALITY_ADMIN">{t('municipalityAdmin')}</option>
                <option value="SUPER_ADMIN">{t('superAdmin')}</option>
              </select>
            </div>
            
            {/* Gender Filter */}
            <div>
              <select 
                className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors appearance-none cursor-pointer"
                value={genderFilter} 
                onChange={e => handleGenderFilterChange(e.target.value)}
              >
                <option value="">{t('allGenders')}</option>
                <option value="MALE">{t('male')}</option>
                <option value="FEMALE">{t('female')}</option>
                <option value="OTHER">{t('other')}</option>
              </select>
            </div>
            
            {/* Clear Button */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-10 px-4 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" /> {t('clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {paginatedFollowers.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            {allFollowers.length === 0 ? (
              <>
                <p className="text-[var(--brand-light)]/50 font-medium">{t('noFollowersYet')}</p>
                <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('noFollowersDescription')}</p>
              </>
            ) : (
              <>
                <p className="text-[var(--brand-light)]/50 font-medium">{t('noMatchesFound')}</p>
                <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('tryAdjustingFilters')}</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/30 transition-all text-sm font-medium"
                >
                  {t('clearFilters')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.user')}</th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.email')}</th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.age')}</th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.gender')}</th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.grade')}</th>
                  <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.role')}</th>
                  <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFollowers.map((user) => {
                  const age = calculateAge(user.date_of_birth);
                  const gender = getGenderDisplay(user);
                  const isRemoving = removingUserId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-[var(--dark-600)] hover:bg-[var(--dark-700)]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                            {user.avatar ? (
                              <img src={getMediaUrl(user.avatar) || ''} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                                <span className="text-xs font-bold text-white">
                                  {getInitials(user.first_name, user.last_name)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--brand-light)]">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.nickname && (
                              <div className="text-xs text-[var(--brand-light)]/50">@{user.nickname}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[var(--brand-light)]/70 text-sm">{user.email}</td>
                      <td className="py-4 px-6 text-[var(--brand-light)]/70 text-sm">
                        {age !== null ? `${age} ${t('years')}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-[var(--brand-light)]/70 text-sm">{gender}</td>
                      <td className="py-4 px-6">
                        {user.grade !== null && user.grade !== undefined ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                            {t('grade')} {user.grade}
                          </span>
                        ) : (
                          <span className="text-[var(--brand-light)]/30">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeClasses(user.role)}`}>
                          {getRoleDisplay(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleUnfollowClick(user)}
                          disabled={isRemoving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all text-sm font-medium disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4" />
                          {isRemoving ? t('removing') : t('unfollow')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-0">
            {paginatedFollowers.map((user) => {
              const age = calculateAge(user.date_of_birth);
              const isRemoving = removingUserId === user.id;

              return (
                <div key={user.id} className="bg-[var(--dark-800)] border-y border-[var(--dark-600)] border-l-4 border-l-[var(--brand-primary)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                      {user.avatar ? (
                        <img src={getMediaUrl(user.avatar) || ''} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                          <span className="text-sm font-bold text-white">
                            {getInitials(user.first_name, user.last_name)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">
                            {user.first_name} {user.last_name}
                          </div>
                          {user.nickname && (
                            <div className="text-xs text-[var(--brand-light)]/50">@{user.nickname}</div>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0 ${getRoleBadgeClasses(user.role)}`}>
                          {getRoleDisplay(user.role)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('tableHeaders.age')}</div>
                          <div className="text-[var(--brand-light)]/70">{age !== null ? `${age} ${t('years')}` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('tableHeaders.grade')}</div>
                          <div className="text-[var(--brand-light)]/70">
                            {user.grade !== null && user.grade !== undefined ? `${t('grade')} ${user.grade}` : '—'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnfollowClick(user)}
                        disabled={isRemoving}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        {isRemoving ? t('removing') : t('unfollow')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-6 px-4">
              <button 
                disabled={currentPage === 1} 
                onClick={() => updateUrl({ page: currentPage - 1 })}
                className="w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                <span className="text-sm text-[var(--brand-light)]">
                  {t('pagination.page')} <span className="font-semibold text-[var(--brand-primary)]">{currentPage}</span> {t('pagination.of')} {totalPages}
                </span>
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl({ page: currentPage + 1 })}
                className="w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
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
        title={t('unfollowModal.title')}
        message={userToUnfollow 
          ? t('unfollowModal.message', { name: `${userToUnfollow.first_name} ${userToUnfollow.last_name}` })
          : t('unfollowModal.messageGeneric')}
        confirmButtonText={t('unfollowModal.confirm')}
        cancelButtonText={t('unfollowModal.cancel')}
        isLoading={!!removingUserId}
        variant="danger"
      />
    </div>
  );
}
