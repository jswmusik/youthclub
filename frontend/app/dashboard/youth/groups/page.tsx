'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

import api from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';
import { Users as UsersIcon, Search, X, AlertCircle, Globe, MapPin, Building2, Heart } from 'lucide-react';
import YouthFooter from '@/app/components/youth/YouthFooter';


interface Eligibility {
    is_eligible: boolean;
    reasons: string[];
}

interface Group {
    id: number;
    name: string;
    description: string;
    avatar: string | null;
    group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
    club_name?: string;
    municipality_name?: string;
    eligibility: Eligibility;
    membership_status: 'PENDING' | 'APPROVED' | 'REJECTED' | { status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejection_count: number } | null;
    club?: { id: number; name: string };
    municipality?: { id: number; name: string };
}

// Helper Component: Badges
const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        APPROVED: "bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30",
        PENDING: "bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30",
        REJECTED: "bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30"
    };
    return (
        <span className={`text-xs px-3 py-1.5 rounded-lg font-bold ${styles[status as keyof typeof styles] || "bg-[var(--dark-600)]"}`}>
            {status === 'APPROVED' ? 'Member' : status}
        </span>
    );
};

const IneligibleTooltip = ({ reasons }: { reasons: string[] }) => (
    <div className="absolute top-2 right-2 group z-10">
        <div className="bg-[var(--dark-700)] text-[var(--brand-light)]/60 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--dark-500)] cursor-help flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Restricted</span>
        </div>
        <div className="absolute right-0 mt-1 w-56 p-4 bg-[var(--dark-700)] text-[var(--brand-light)] text-xs rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[var(--dark-500)]">
            <p className="font-bold mb-2 text-sm">Requirements not met:</p>
            <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="text-[var(--brand-red)] mt-0.5">•</span>
                        <span className="text-[var(--brand-light)]/80">{r}</span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default function GroupSearchPage() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [paginationSupported, setPaginationSupported] = useState<boolean | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [scopeFilter, setScopeFilter] = useState<'ALL' | 'GLOBAL' | 'MUNI' | 'CLUB' | 'FOLLOWING'>('ALL');
    const [interestFilter, setInterestFilter] = useState(false);

    // Confirmation modal state
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [selectedGroupToJoin, setSelectedGroupToJoin] = useState<Group | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info' | 'warning', isVisible: false });

    // Fetch groups with pagination
    const fetchGroups = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // Try paginated endpoint first, fallback to non-paginated if it fails
            let res;
            let isPaginated = false;
            
            try {
                res = await api.get(`/groups/?page=${pageNum}`);
                isPaginated = true;
                setPaginationSupported(true);
            } catch (paginatedError: any) {
                // If pagination fails (404), try without pagination (only on first page)
                if (paginatedError.response?.status === 404 && pageNum === 1) {
                    res = await api.get('/groups/');
                    isPaginated = false;
                    setPaginationSupported(false);
                } else {
                    throw paginatedError;
                }
            }
            
            // Handle paginated response or direct array
            let groupsData: Group[] = [];
            let hasMoreData = false;

            if (Array.isArray(res.data)) {
                groupsData = res.data;
                // If it's an array, assume no pagination support - disable infinite scroll
                hasMoreData = false;
            } else {
                groupsData = res.data.results || res.data.data || [];
                if (isPaginated) {
                    // Check if there's a next page URL
                    hasMoreData = !!res.data.next;
                } else {
                    // No pagination support, disable infinite scroll
                    hasMoreData = false;
                }
            }

            if (append) {
                setGroups(prev => [...prev, ...groupsData]);
            } else {
                setGroups(groupsData);
            }

            setHasMore(hasMoreData);
        } catch (err) {
            console.error("Failed to fetch groups", err);
            if (!append) {
                setGroups([]);
            }
            setHasMore(false); // Disable infinite scroll on error
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchGroups(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset pagination when scope or interest filters change (but not search - that's client-side only)
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchGroups(1, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scopeFilter, interestFilter]);

    // Infinite scroll observer (only if pagination is supported)
    useEffect(() => {
        // Don't set up observer if pagination is not supported
        if (paginationSupported === false) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && paginationSupported) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchGroups(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMore, loadingMore, loading, page, paginationSupported]);

    const handleJoinClick = (group: Group) => {
        setSelectedGroupToJoin(group);
        setConfirmModalVisible(true);
    };

    const handleJoinConfirm = async () => {
        if (!selectedGroupToJoin) return;

        setIsJoining(true);
        try {
            const res = await api.post(`/groups/${selectedGroupToJoin.id}/join/`);
            setToast({
                message: res.data.message || 'Successfully joined the group!',
                type: 'success',
                isVisible: true
            });
            // Refresh current page
            fetchGroups(page, false);
            setConfirmModalVisible(false);
            setSelectedGroupToJoin(null);
        } catch (err: any) {
            setToast({
                message: err.response?.data?.message || 'Failed to join group',
                type: 'error',
                isVisible: true
            });
            setConfirmModalVisible(false);
            setSelectedGroupToJoin(null);
        } finally {
            setIsJoining(false);
        }
    };

    // --- Filter Logic ---
    const filteredGroups = (Array.isArray(groups) ? groups : []).filter(group => {
        // 1. Search Text
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              group.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Helper to get club ID (handles both number and object cases)
        const getClubId = (club: any): number | null => {
            if (!club) return null;
            return typeof club === 'object' ? club.id : club;
        };
        
        const groupClubId = getClubId(group.club);
        
        // 2. Scope Filter
        let matchesScope = true;
        if (scopeFilter === 'GLOBAL') {
            matchesScope = !group.municipality && !groupClubId;
        } else if (scopeFilter === 'MUNI') {
            matchesScope = !!group.municipality && !groupClubId;
        } else if (scopeFilter === 'CLUB') {
            const preferredClubId = typeof user?.preferred_club === 'object' ? user.preferred_club?.id : user?.preferred_club;
            matchesScope = groupClubId === preferredClubId;
        } else if (scopeFilter === 'FOLLOWING') {
            const isMyClub = groupClubId === (typeof user?.preferred_club === 'object' ? user.preferred_club?.id : user?.preferred_club);
            const isClubGroup = !!groupClubId;
            matchesScope = isClubGroup && !isMyClub && (user?.followed_clubs_ids?.includes(groupClubId) || false);
        }

        // 3. Interest Filter
        let matchesInterest = true;
        if (interestFilter) {
            matchesInterest = group.eligibility.is_eligible;
        }

        return matchesSearch && matchesScope && matchesInterest;
    });

    if (loading) return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                    <YouthSidebar activePath={pathname} darkMode={true} />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60">
                        <main className="px-0 py-2 sm:p-4 md:p-6 pb-24 md:pb-6">
                            {/* Header Section */}
                            <div className="mb-4 sm:mb-6 px-4 sm:px-0">
                                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <UsersIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                                        Groups
                                    </h1>
                                </div>
                                <p className="text-[var(--brand-light)]/60 text-sm pl-8 sm:pl-10 font-semibold">
                                    Discover and join groups
                                </p>
                            </div>

                            {/* Filters Section */}
                            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 py-3 sm:p-4 mb-4 sm:mb-6">
                                {/* Search Bar */}
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                                    <input 
                                        type="text" 
                                        placeholder="Search groups..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2.5 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-sm font-medium text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Chips */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { id: 'ALL', label: 'All Groups', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                        { id: 'GLOBAL', label: 'Global', icon: <Globe className="w-3.5 h-3.5" /> },
                                        { id: 'MUNI', label: 'My Municipality', icon: <MapPin className="w-3.5 h-3.5" /> },
                                        { id: 'CLUB', label: 'My Club', icon: <Building2 className="w-3.5 h-3.5" /> },
                                        { id: 'FOLLOWING', label: 'Following', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setScopeFilter(opt.id as any)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                scopeFilter === opt.id 
                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                                            }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                    
                                    {/* Interest Filter Toggle */}
                                    <button
                                        onClick={() => setInterestFilter(!interestFilter)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            interestFilter 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                                        }`}
                                    >
                                        <Heart className="w-3.5 h-3.5" />
                                        My Interests
                                    </button>
                                </div>
                            </div>

                            {/* --- RESULTS GRID --- */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 px-4 sm:px-0">
                                    {filteredGroups.map(group => {
                                        const isEligible = group.eligibility.is_eligible;
                                        // Handle both old format (string) and new format (object)
                                        const membershipStatus = typeof group.membership_status === 'object' 
                                            ? group.membership_status?.status 
                                            : group.membership_status;
                                        const rejectionCount = typeof group.membership_status === 'object' 
                                            ? (group.membership_status?.rejection_count || 0)
                                            : 0;
                                        
                                        const isMember = membershipStatus === 'APPROVED';
                                        const isPending = membershipStatus === 'PENDING';
                                        const isRejected = membershipStatus === 'REJECTED';
                                        const maxRejectionsReached = isRejected && rejectionCount >= 3;
                                        
                                        // Visual Style: Gray out if ineligible AND not already a member
                                        const cardStyle = (!isEligible && !isMember) ? 'opacity-70 grayscale-[0.3]' : 'opacity-100';

                                        return (
                                            <div key={group.id} className={`bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden flex flex-col hover:border-[var(--brand-primary)]/30 transition-all ${cardStyle}`}>
                                                {/* Header Image */}
                                                <div className="h-40 sm:h-44 bg-[var(--dark-700)] relative">
                                                    {group.background_image ? (
                                                        <img src={group.background_image} alt={group.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                    ) : group.avatar ? (
                                                        <img src={group.avatar} alt={group.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                                                            <UsersIcon className="w-16 h-16 text-white/30" />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Top Badges */}
                                                    <div className="absolute top-2 left-2 flex gap-1.5">
                                                        {group.group_type !== 'OPEN' && (
                                                            <span className="bg-[var(--dark-900)]/80 backdrop-blur-sm text-[var(--brand-light)] text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wide font-bold">
                                                                {group.group_type === 'CLOSED' ? 'Private' : 'Application'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Ineligibility Tooltip */}
                                                    {!isEligible && !isMember && (
                                                        <IneligibleTooltip reasons={group.eligibility.reasons} />
                                                    )}
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                                    <div className="mb-3">
                                                        <h3 className="font-bold text-[var(--brand-light)] text-lg sm:text-xl leading-tight font-heading">{group.name}</h3>
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            {group.club_name ? (
                                                                <>
                                                                    <Building2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                                                    <p className="text-xs text-[var(--brand-primary)] font-bold">
                                                                        {group.club_name}
                                                                    </p>
                                                                </>
                                                            ) : group.municipality_name ? (
                                                                <>
                                                                    <MapPin className="w-3.5 h-3.5 text-[var(--brand-green)]" />
                                                                    <p className="text-xs text-[var(--brand-green)] font-bold">
                                                                        {group.municipality_name}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Globe className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
                                                                    <p className="text-xs text-[var(--brand-purple)] font-bold">
                                                                        Global Group
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-sm text-[var(--brand-light)]/60 mb-4 line-clamp-2 flex-1 font-medium">
                                                        {group.description || <span className="italic text-[var(--brand-light)]/40">No description available.</span>}
                                                    </p>

                                                    {/* Footer Action */}
                                                    <div className="mt-auto pt-4 border-t border-[var(--dark-600)]">
                                                        {isMember ? (
                                                            <div className="flex justify-between items-center gap-2">
                                                                <StatusBadge status="APPROVED" />
                                                                <button 
                                                                    onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                                                                    className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-bold transition-colors"
                                                                >
                                                                    Visit Group →
                                                                </button>
                                                            </div>
                                                        ) : isPending ? (
                                                            <div className="flex justify-between items-center gap-2">
                                                                <StatusBadge status="PENDING" />
                                                                <span className="text-xs text-[var(--brand-light)]/50 font-semibold">Pending...</span>
                                                            </div>
                                                        ) : maxRejectionsReached ? (
                                                            <button
                                                                disabled={true}
                                                                className="w-full py-2.5 rounded-xl text-sm font-bold bg-[var(--dark-700)] text-[var(--brand-light)]/50 cursor-not-allowed border border-[var(--dark-500)]"
                                                            >
                                                                Max Applications Reached
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleJoinClick(group)}
                                                                disabled={!isEligible || maxRejectionsReached}
                                                                className={`w-full py-2.5 sm:py-3 rounded-none sm:rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                                                    (isEligible && !maxRejectionsReached)
                                                                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-500)]'
                                                                }`}
                                                            >
                                                                {isEligible 
                                                                    ? (group.group_type === 'OPEN' ? 'Join Group' : 'Apply to Join') 
                                                                    : 'Unavailable'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Infinite Scroll Trigger */}
                            <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
                                {loadingMore && (
                                    <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                                        <div className="w-6 h-6 border-3 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin"></div>
                                        <span className="text-sm font-semibold">Loading more groups...</span>
                                    </div>
                                )}
                                {!hasMore && filteredGroups.length > 0 && (
                                    <p className="text-sm text-[var(--brand-light)]/40 text-center py-4 font-semibold">
                                        You've reached the end
                                    </p>
                                )}
                            </div>

                            {filteredGroups.length === 0 && !loading && (
                                <div className="text-center py-12 sm:py-20 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-dashed border-[var(--dark-500)]">
                                    <div className="max-w-md mx-auto px-4">
                                        <div className="w-20 h-20 bg-[var(--dark-700)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <UsersIcon className="w-10 h-10 text-[var(--brand-light)]/40" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-[var(--brand-light)] mb-2 font-heading">No groups found</h3>
                                        <p className="text-sm text-[var(--brand-light)]/60 mb-4 font-medium">
                                            Try adjusting your filters or search terms to find more groups.
                                        </p>
                                        <button 
                                            onClick={() => { setSearchTerm(''); setScopeFilter('ALL'); setInterestFilter(false); }}
                                            className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all active:scale-95"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isVisible={confirmModalVisible}
                onClose={() => {
                    if (!isJoining) {
                        setConfirmModalVisible(false);
                        setSelectedGroupToJoin(null);
                    }
                }}
                onConfirm={handleJoinConfirm}
                title={selectedGroupToJoin?.group_type === 'OPEN' ? 'Join Group?' : 'Apply to Join Group?'}
                message={
                    selectedGroupToJoin?.group_type === 'OPEN'
                        ? `Are you sure you want to join "${selectedGroupToJoin?.name}"?`
                        : `Submit an application to join "${selectedGroupToJoin?.name}"? The group admin will review your request.`
                }
                confirmButtonText={selectedGroupToJoin?.group_type === 'OPEN' ? 'Join Group' : 'Submit Application'}
                cancelButtonText="Cancel"
                isLoading={isJoining}
                variant="info"
                darkMode={true}
            />

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
                darkMode={true}
            />
            
            {/* Footer */}
            <YouthFooter />
        </div>
    );
}
