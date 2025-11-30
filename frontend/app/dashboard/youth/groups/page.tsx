'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import NavBar from '@/app/components/NavBar';

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
    membership_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    club?: { id: number; name: string };
    municipality?: { id: number; name: string };
}

// Helper Component: Badges
const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        APPROVED: "bg-green-100 text-green-700 border-green-200",
        PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
        REJECTED: "bg-red-100 text-red-700 border-red-200"
    };
    return (
        <span className={`text-xs px-2 py-1 rounded border font-medium ${styles[status as keyof typeof styles] || "bg-gray-100"}`}>
            {status === 'APPROVED' ? 'Member' : status}
        </span>
    );
};

const IneligibleTooltip = ({ reasons }: { reasons: string[] }) => (
    <div className="absolute top-2 right-2 group z-10">
        <div className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded border border-gray-200 cursor-help shadow-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span>Restricted</span>
        </div>
        <div className="absolute right-0 mt-1 w-48 p-3 bg-gray-800 text-white text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="font-bold mb-1">Requirements not met:</p>
            <ul className="list-disc pl-3 space-y-1">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    </div>
);

export default function GroupSearchPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [paginationSupported, setPaginationSupported] = useState<boolean | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [scopeFilter, setScopeFilter] = useState<'ALL' | 'GLOBAL' | 'MUNI' | 'CLUB' | 'FOLLOWING'>('ALL');
    const [interestFilter, setInterestFilter] = useState(false);

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

    const handleJoin = async (groupId: number) => {
        try {
            const res = await api.post(`/groups/${groupId}/join/`);
            alert(res.data.message); // Replace with Toast in production
            // Refresh current page
            fetchGroups(page, false);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to join");
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
            // Check if club ID is in followed_clubs (assuming AuthContext provides this, or we infer from context)
            // If AuthContext doesn't have followed_clubs, this filter might be weak on frontend.
            // Ideally backend handles scope, this just toggles visibility. 
            // For now, let's assume if it's NOT my preferred club and NOT global/muni, it's a followed club.
            const isMyClub = groupClubId === (typeof user?.preferred_club === 'object' ? user.preferred_club?.id : user?.preferred_club);
            const isClubGroup = !!groupClubId;
            matchesScope = isClubGroup && !isMyClub && (user?.followed_clubs_ids?.includes(groupClubId) || false);
        }

        // 3. Interest Filter
        // If checked, we ONLY show groups where eligibility.reasons does NOT contain "Does not match your interests"
        // Or simply leverage the eligibility flag if interest is the *only* barrier.
        let matchesInterest = true;
        if (interestFilter) {
            // We want groups that are ELIGIBLE (which implies interests match)
            // OR groups where the ONLY reason for ineligibility is NOT interests.
            // Simplified: Just show eligible groups.
            matchesInterest = group.eligibility.is_eligible;
        }

        return matchesSearch && matchesScope && matchesInterest;
    });

    if (loading) return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row gap-8">
                
                {/* --- SIDEBAR FILTERS (Sticky) --- */}
                <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
                        <p className="text-sm text-gray-500 mt-1">Discover & Join</p>
                    </div>

                    {/* Search Input */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Find a group..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Scope Filters */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by Level</label>
                        <div className="space-y-1">
                            {[
                                { id: 'ALL', label: 'All Groups' },
                                { id: 'GLOBAL', label: 'Global / Public' },
                                { id: 'MUNI', label: 'My Municipality' },
                                { id: 'CLUB', label: 'My Club' },
                                { id: 'FOLLOWING', label: 'Followed Clubs' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setScopeFilter(opt.id as any)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        scopeFilter === opt.id 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interest Toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${interestFilter ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                {interestFilter && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={interestFilter}
                                onChange={(e) => setInterestFilter(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">Match my interests only</span>
                        </label>
                    </div>
                </aside>

                {/* --- RESULTS GRID --- */}
                <main className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredGroups.map(group => {
                            const isEligible = group.eligibility.is_eligible;
                            const isMember = !!group.membership_status;
                            
                            // Visual Style: Gray out if ineligible AND not already a member
                            const cardStyle = (!isEligible && !isMember) ? 'opacity-70 grayscale-[0.3]' : 'opacity-100';

                            return (
                                <div key={group.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${cardStyle}`}>
                                    {/* Header Image */}
                                    <div className="h-32 bg-gray-200 relative">
                                        {group.background_image ? (
                                            <img src={group.background_image} alt={group.name} className="w-full h-full object-cover" />
                                        ) : group.avatar ? (
                                            <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                                                 <span className="text-4xl">👥</span>
                                            </div>
                                        )}
                                        
                                        {/* Top Badges */}
                                        <div className="absolute top-2 left-2 flex gap-1">
                                            {group.group_type !== 'OPEN' && (
                                                <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
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
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="mb-3">
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{group.name}</h3>
                                            <p className="text-xs text-blue-600 font-medium mt-1">
                                                {group.club_name ? `Club: ${group.club_name}` : (group.municipality_name ? `Muni: ${group.municipality_name}` : "Global Group")}
                                            </p>
                                        </div>
                                        
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                                            {group.description || <span className="italic text-gray-400">No description available.</span>}
                                        </p>

                                        {/* Footer Action */}
                                        <div className="mt-auto pt-4 border-t border-gray-100">
                                            {group.membership_status ? (
                                                <div className="flex justify-between items-center">
                                                    <StatusBadge status={group.membership_status} />
                                                    <button 
                                                        onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Visit Group
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleJoin(group.id)}
                                                    disabled={!isEligible}
                                                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                                                        isEligible 
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow' 
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
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
                            <div className="flex items-center gap-2 text-gray-500">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Loading more groups...</span>
                            </div>
                        )}
                        {!hasMore && filteredGroups.length > 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">
                                You've reached the end
                            </p>
                        )}
                    </div>

                    {filteredGroups.length === 0 && !loading && (
                        <div className="text-center py-20">
                            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No groups found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-1">
                                Try adjusting your filters or search terms to find more groups.
                            </p>
                            <button 
                                onClick={() => { setSearchTerm(''); setScopeFilter('ALL'); setInterestFilter(false); }}
                                className="mt-4 text-blue-600 font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </main>
            </div>
            </div>
        </div>
    );
}
