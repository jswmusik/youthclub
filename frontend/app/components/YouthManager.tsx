'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Users, Clock, UserCheck, ShieldCheck, Building, UserPlus, UsersRound, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
        
        if (!responseData) break;
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageUsers = responseData;
          allUsers = [...allUsers, ...pageUsers];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageUsers = responseData.results;
          allUsers = [...allUsers, ...pageUsers];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allUsers.length >= totalCount;
          const gotEmptyPage = pageUsers.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
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
      
      params.set('page', page);
      params.set('page_size', '10');

      const res = await api.get(`/users/?${params.toString()}`);
      let usersData = Array.isArray(res.data) ? res.data : res.data.results || [];
      
      if (birthdayToday === 'true') {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
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
      setToast({ message: 'Youth member deleted.', type: 'success', isVisible: true });
      fetchYouth();
      fetchAllUsersForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setUserToDelete(null);
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'UNVERIFIED': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getClubName = (user: any) => {
    if (!user.preferred_club) return 'No club';
    const clubId = typeof user.preferred_club === 'object' ? user.preferred_club.id : user.preferred_club;
    const club = clubs.find(c => c.id === clubId);
    return club?.name || 'No club';
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

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedUsers = allUsers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Youth Members</h1>
          <p className="text-gray-500 mt-1">Manage youth members and their information.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Youth
          </Button>
        </Link>
      </div>

      {/* Analytics */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <Card className="border-0 shadow-sm bg-gray-900">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Analytics Dashboard</h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 h-8 text-gray-400 hover:text-white hover:bg-gray-800">
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                    analyticsExpanded ? "rotate-0" : "rotate-180"
                  )} />
                  <span className="sr-only">Toggle Analytics</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="transition-all duration-500 ease-in-out">
              <CardContent className="p-4 sm:p-6 transition-opacity duration-500 ease-in-out">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Total Youth */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Total Youth</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-[#4D4DA4]/30 flex items-center justify-center shadow-md">
                          <Users className="h-5 w-5 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.total_youth}</div>
                    </CardContent>
                  </Card>

                  {/* Card 2: New Last 7 Days */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">New (7 Days)</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center shadow-md">
                          <UserPlus className="h-5 w-5 text-blue-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.new_last_7_days}</div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Gender Breakdown */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Gender Breakdown</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center shadow-md">
                          <UsersRound className="h-5 w-5 text-purple-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Male:</span>
                          <span className="font-bold text-white">{analytics.gender.male}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Female:</span>
                          <span className="font-bold text-white">{analytics.gender.female}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Other:</span>
                          <span className="font-bold text-white">{analytics.gender.other}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Verification Status */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Verification</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-green-500/30 flex items-center justify-center shadow-md">
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Verified:</span>
                          <span className="font-bold text-white">{analytics.verification.verified}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Unverified/Pending:</span>
                          <span className="font-bold text-white">{analytics.verification.unverified_pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Gender Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('legal_gender') || ''} 
                onChange={e => updateUrl('legal_gender', e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('verification_status') || ''} 
                onChange={e => updateUrl('verification_status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
            
            {/* Municipality Filter - Only for SUPER scope */}
            {scope === 'SUPER' && (
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
            
            {/* Club Filter */}
            <div className={cn("md:col-span-2", scope === 'SUPER' ? "lg:col-span-2" : "lg:col-span-3")}>
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('preferred_club') || ''} 
                onChange={e => updateUrl('preferred_club', e.target.value)}
              >
                <option value="">All Clubs</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(pathname)}
                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-3 border-t border-gray-100">
            <div className="col-span-1">
              <Input
                type="number"
                placeholder="Age from"
                className="h-9 bg-gray-50 border-0"
                value={searchParams.get('age_from') || ''}
                onChange={e => updateUrl('age_from', e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <Input
                type="number"
                placeholder="Age to"
                className="h-9 bg-gray-50 border-0"
                value={searchParams.get('age_to') || ''}
                onChange={e => updateUrl('age_to', e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <Input
                type="number"
                placeholder="Grade from"
                className="h-9 bg-gray-50 border-0"
                value={searchParams.get('grade_from') || ''}
                onChange={e => updateUrl('grade_from', e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <Input
                type="number"
                placeholder="Grade to"
                className="h-9 bg-gray-50 border-0"
                value={searchParams.get('grade_to') || ''}
                onChange={e => updateUrl('grade_to', e.target.value)}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('interest') || ''} 
                onChange={e => updateUrl('interest', e.target.value)}
              >
                <option value="">All Interests</option>
                {interests.map(i => (
                  <option key={i.id} value={i.id.toString()}>{i.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('birthday_today') || ''} 
                onChange={e => updateUrl('birthday_today', e.target.value)}
              >
                <option value="">All Birthdays</option>
                <option value="true">Today</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : paginatedUsers.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No youth members found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedUsers.map(user => (
              <Card key={user.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                      <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {user.first_name} {user.last_name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Building className="h-3 w-3 flex-shrink-0" />
                        {getClubName(user)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                      <Badge variant="outline" className={getStatusBadge(user.verification_status)}>
                        {user.verification_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Grade / Age</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {user.grade && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Grade {user.grade}
                          </Badge>
                        )}
                        {user.date_of_birth && calculateAge(user.date_of_birth) !== null && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {calculateAge(user.date_of_birth)} years
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={buildUrlWithParams(`${basePath}/${user.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setUserToDelete(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">User</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Grade / Age</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map(user => (
                  <TableRow key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-[#121213]">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            {getClubName(user)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={getStatusBadge(user.verification_status)}>
                        {user.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {user.grade && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Grade {user.grade}
                          </Badge>
                        )}
                        {user.date_of_birth && calculateAge(user.date_of_birth) !== null && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            {calculateAge(user.date_of_birth)} years
                          </Badge>
                        )}
                        {!user.grade && (!user.date_of_birth || calculateAge(user.date_of_birth) === null) && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${user.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Prev
              </Button>
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal 
        isVisible={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Youth Member"
        message={`Are you sure you want to delete "${userToDelete?.first_name} ${userToDelete?.last_name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
