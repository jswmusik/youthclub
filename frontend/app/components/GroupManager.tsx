'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, 
  Users, Building, UsersRound, FolderX, ChevronLeft, Layers, Globe, Lock, FileQuestion
} from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
  showActions?: boolean;
}

function SwipeableCard({ children, onEdit, onDelete, onClick, showActions = true }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showActions) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !showActions) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    if (!showActions) return;
    setIsDragging(false);
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
    setIsOpen(false);
    setCurrentX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      {/* Action buttons (behind the card) */}
      {showActions && (
        <div className="absolute inset-y-0 right-0 flex items-stretch">
          <button
            onClick={handleEditClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
          >
            <Edit className="w-5 h-5" />
            <span className="text-xs font-medium">Edit</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">Delete</span>
          </button>
        </div>
      )}

      {/* Swipeable card content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {/* Swipe hint indicator */}
        {showActions && !isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

function GroupCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function GroupPageSkeleton() {
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col md:hidden">
        {[...Array(4)].map((_, i) => (
          <GroupCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Group</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Location</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Type</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Members</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <GroupTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface Group {
  id: number;
  name: string;
  group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
  is_system_group: boolean;
  member_count?: number;
  pending_request_count?: number;
  created_at: string;
  municipality: number | null;
  municipality_name?: string;
  club: number | null;
  club_name?: string;
}

interface GroupManagerProps {
  basePath: string;
}

export default function GroupManager({ basePath }: GroupManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [allFilteredGroups, setAllFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const isSuperAdmin = basePath.includes('/super');
  const isMuniAdmin = basePath.includes('/municipality');
  
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMembers: 0,
    activeGroups: 0,
    emptyGroups: 0
  });
  
  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [municipalityFilter, setMunicipalityFilter] = useState(searchParams.get('municipality') || '');
  const [clubFilter, setClubFilter] = useState(searchParams.get('club') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  
  useEffect(() => {
    const totalMembers = allGroups.reduce((sum, g) => {
      const count = g.member_count ?? 0;
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);
    const activeGroups = allGroups.filter(g => {
      const count = g.member_count ?? 0;
      return typeof count === 'number' && count > 0;
    }).length;
    
    setStats({
      totalGroups: allGroups.length,
      totalMembers,
      activeGroups,
      emptyGroups: allGroups.length - activeGroups
    });
  }, [allGroups]);

  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Debounced Filter Update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (municipalityFilter) params.set('municipality', municipalityFilter); else params.delete('municipality');
      if (clubFilter) params.set('club', clubFilter); else params.delete('club');
      if (typeFilter) params.set('type', typeFilter); else params.delete('type');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, municipalityFilter, clubFilter, typeFilter]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('club');
    const type = searchParams.get('type');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    if (club) params.set('club', club);
    if (type) params.set('type', type);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    fetchDropdowns();
    fetchGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchParams, allGroups]);

  const fetchDropdowns = async () => {
    try {
      const [muniRes, clubRes] = await Promise.all([
        isSuperAdmin ? api.get('/municipalities/') : Promise.resolve({ data: [] }),
        api.get('/clubs/?page_size=1000')
      ]);
      
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      let allGroupsData: Group[] = [];
      let pageNum = 1;
      let totalCount = 0;
      const fetchPageSize = 100;
      const maxPages = 100;
      
      while (pageNum <= maxPages) {
        const res = await api.get(`/groups/?page=${pageNum}&page_size=${fetchPageSize}`);
        const responseData = res.data;
        
        if (Array.isArray(responseData)) {
          allGroupsData = [...allGroupsData, ...responseData];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          const pageGroups = responseData.results;
          allGroupsData = [...allGroupsData, ...pageGroups];
          
          if (pageNum === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allGroupsData.length >= totalCount;
          const gotEmptyPage = pageGroups.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          pageNum++;
        } else {
          allGroupsData = Array.isArray(responseData) ? responseData : [];
          break;
        }
      }
      
      setAllGroups(allGroupsData);
      applyFilters();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load groups.', type: 'error', isVisible: true });
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  };

  const applyFilters = () => {
    let filtered = [...allGroups];

    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(g => 
        g.name?.toLowerCase().includes(searchLower)
      );
    }

    const municipality = searchParams.get('municipality') || '';
    if (municipality) {
      filtered = filtered.filter(g => 
        g.municipality?.toString() === municipality
      );
    }

    const club = searchParams.get('club') || '';
    if (club) {
      filtered = filtered.filter(g => 
        g.club?.toString() === club
      );
    }

    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(g => 
        g.group_type === type
      );
    }

    setAllFilteredGroups(filtered);
    
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = filtered.slice(startIndex, endIndex);
    
    setGroups(paginatedGroups);
  };

  const clearFilters = () => {
    setSearchInput('');
    setMunicipalityFilter('');
    setClubFilter('');
    setTypeFilter('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/groups/${selectedGroup.id}/`);
      setToast({ message: 'Group deleted successfully.', type: 'success', isVisible: true });
      fetchGroups();
    } catch (err) {
      setToast({ message: 'Failed to delete group.', type: 'error', isVisible: true });
    } finally {
      setShowDelete(false);
      setSelectedGroup(null);
    }
  };

  const getTypeBadgeClasses = (type: string) => {
    switch (type) {
      case 'OPEN': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'APPLICATION': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'CLOSED': return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'OPEN': return <Globe className="w-3 h-3" />;
      case 'APPLICATION': return <FileQuestion className="w-3 h-3" />;
      case 'CLOSED': return <Lock className="w-3 h-3" />;
      default: return <Layers className="w-3 h-3" />;
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(allFilteredGroups.length / pageSize);

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const hasFilters = searchInput || municipalityFilter || clubFilter || typeFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Manage Groups</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Manage member segments and filters.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> Add Group
          </button>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header */}
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          {/* Content */}
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Groups */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Layers className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{stats.totalGroups}</div>
              </div>

              {/* Total Members */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Members</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{stats.totalMembers}</div>
              </div>

              {/* Active Groups */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Active</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{stats.activeGroups}</div>
              </div>

              {/* Empty Groups */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                    <FolderX className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Empty</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{stats.emptyGroups}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Search by group name..." 
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors text-xl"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isSuperAdmin && (
              <div className="w-full sm:w-[200px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={municipalityFilter}
                  onChange={e => setMunicipalityFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">All Municipalities</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id.toString()}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            {(isSuperAdmin || isMuniAdmin) && (
              <div className="w-full sm:w-[200px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={clubFilter}
                  onChange={e => setClubFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">All Clubs</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-full sm:w-[160px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">All Types</option>
                <option value="OPEN">Open</option>
                <option value="APPLICATION">Application</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && groups.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            Showing <span className="text-[var(--brand-primary)] font-semibold">{groups.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{allFilteredGroups.length}</span> {allFilteredGroups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <GroupPageSkeleton />
      ) : groups.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No groups found</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first group.'}
          </p>
          {!hasFilters && (
            <Link href={`${basePath}/create`}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> Add Group
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {groups.map((group) => (
              <SwipeableCard
                key={group.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${group.id}`))}
                onEdit={!group.is_system_group ? () => router.push(buildUrlWithParams(`${basePath}/edit/${group.id}`)) : undefined}
                onDelete={!group.is_system_group ? () => { setSelectedGroup(group); setShowDelete(true); } : undefined}
                showActions={!group.is_system_group}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                          {group.name}
                        </h3>
                        {group.is_system_group && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                            System
                          </span>
                        )}
                      </div>
                      
                      {/* Location */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-[var(--brand-light)]/40" />
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">
                          {isSuperAdmin && group.municipality_name ? group.municipality_name : ''}
                          {isSuperAdmin && group.municipality_name && group.club_name ? ' • ' : ''}
                          {(isSuperAdmin || isMuniAdmin) && group.club_name ? group.club_name : ''}
                          {!group.municipality_name && !group.club_name && 'Global'}
                        </p>
                      </div>
                      
                      {/* Type & Members */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadgeClasses(group.group_type)}`}>
                          {getTypeIcon(group.group_type)}
                          {group.group_type}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                          {group.member_count ?? 0} members
                        </span>
                        {(group.pending_request_count ?? 0) > 0 && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]">
                            {group.pending_request_count} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Group</th>
                  {(isSuperAdmin || isMuniAdmin) && (
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Location</th>
                  )}
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Members</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, index) => (
                  <tr 
                    key={group.id} 
                    className={`${index !== groups.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-[var(--brand-primary)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--brand-light)]">{group.name}</span>
                            {group.is_system_group && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                System
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {(isSuperAdmin || isMuniAdmin) && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--brand-light)]/60">
                          {isSuperAdmin && group.municipality_name ? (
                            <span>{group.municipality_name}</span>
                          ) : null}
                          {isSuperAdmin && group.municipality_name && group.club_name ? (
                            <span className="mx-1 text-[var(--brand-light)]/30">•</span>
                          ) : null}
                          {(isSuperAdmin || isMuniAdmin) && group.club_name ? (
                            <span>{group.club_name}</span>
                          ) : null}
                          {!group.municipality_name && !group.club_name && (
                            <span className="text-[var(--brand-light)]/30">Global</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadgeClasses(group.group_type)}`}>
                        {getTypeIcon(group.group_type)}
                        {group.group_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[var(--brand-light)]">{group.member_count ?? 0}</span>
                        {(group.pending_request_count ?? 0) > 0 && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                            {group.pending_request_count} pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${group.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        {!group.is_system_group && (
                          <>
                            <Link href={buildUrlWithParams(`${basePath}/edit/${group.id}`)}>
                              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                                <Edit className="w-4 h-4" />
                              </button>
                            </Link>
                            <button 
                              onClick={() => { setSelectedGroup(group); setShowDelete(true); }}
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
              <button 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-sm text-[var(--brand-light)]/50">
                Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ConfirmationModal 
        isVisible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${selectedGroup?.name}"? This will remove all members from this group. This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
        darkMode={true}
      />
      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} darkMode />
    </div>
  );
}
