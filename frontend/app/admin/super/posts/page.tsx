'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { Post } from '../../../../types/post';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import Toast from '../../../components/Toast';

export default function SuperAdminPostsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [posts, setPosts] = useState<any[]>([]); // Use any to handle the nested details easier
    const [allFilteredPosts, setAllFilteredPosts] = useState<any[]>([]); // Store all filtered posts for pagination
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: number; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value); else params.delete(key);
        // Reset to page 1 when filters change (except when changing page itself)
        if (key !== 'page') {
            params.set('page', '1');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const scope = searchParams.get('scope');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        
        if (page && page !== '1') params.set('page', page);
        if (search) params.set('search', search);
        if (scope) params.set('scope', scope);
        if (type) params.set('type', type);
        if (status) params.set('status', status);
        
        const queryString = params.toString();
        return queryString ? `${path}?${queryString}` : path;
    };

    // Debounced search update - use replace to avoid navigation and preserve focus
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentSearch = searchParams.get('search') || '';
            if (searchInput !== currentSearch) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchInput) params.set('search', searchInput); else params.delete('search');
                // Use replace instead of push to avoid adding to history and causing navigation
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                // Restore focus after URL update
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 0);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get filters from URL
            const search = searchParams.get('search') || '';
            const scope = searchParams.get('scope') || '';
            const type = searchParams.get('type') || '';
            const status = searchParams.get('status') || '';
            
            // Fetch ALL posts by paginating through all pages
            // (Backend paginates by default, so we need to fetch all pages)
            let allPosts: any[] = [];
            let pageNum = 1;
            let totalCount = 0;
            const fetchPageSize = 100; // Fetch large pages to minimize requests
            const maxPages = 100; // Safety limit
            
            while (pageNum <= maxPages) {
                const postsRes = await api.get(`/posts/?page=${pageNum}&page_size=${fetchPageSize}`);
                const responseData = postsRes.data;
                
                
                if (Array.isArray(responseData)) {
                    // Direct array response (unlikely with DRF)
                    allPosts = [...allPosts, ...responseData];
                    break;
                } else if (responseData.results && Array.isArray(responseData.results)) {
                    // Paginated response
                    const pagePosts = responseData.results;
                    allPosts = [...allPosts, ...pagePosts];
                    
                    // Get total count from first page
                    if (pageNum === 1) {
                        totalCount = responseData.count || 0;
                    }
                    
                    // Check if we should continue
                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const hasAllResults = totalCount > 0 && allPosts.length >= totalCount;
                    const gotEmptyPage = pagePosts.length === 0;
                    
                    // Stop if: no next page, we have all results, or got empty page
                    if (!hasNext || hasAllResults || gotEmptyPage) {
                        break;
                    }
                    
                    // Continue to next page
                    pageNum++;
                } else {
                    // Fallback: treat as array
                    allPosts = Array.isArray(responseData) ? responseData : [];
                    break;
                }
            }
            
            let postsData = allPosts;

            // Client-side filtering for search (title)
            if (search) {
                const searchLower = search.toLowerCase();
                postsData = postsData.filter((p: any) => 
                    p.title?.toLowerCase().includes(searchLower)
                );
            }

            // Client-side filtering for scope
            if (scope) {
                if (scope === 'GLOBAL') {
                    postsData = postsData.filter((p: any) => p.is_global === true);
                } else if (scope === 'MUNICIPALITY') {
                    postsData = postsData.filter((p: any) => 
                        !p.is_global && 
                        (p.target_municipalities_details && p.target_municipalities_details.length > 0)
                    );
                } else if (scope === 'CLUB') {
                    postsData = postsData.filter((p: any) => 
                        !p.is_global && 
                        (p.target_clubs_details && p.target_clubs_details.length > 0)
                    );
                }
            }

            // Client-side filtering for type
            if (type) {
                postsData = postsData.filter((p: any) => p.post_type === type);
            }

            // Client-side filtering for status
            if (status) {
                postsData = postsData.filter((p: any) => p.status === status);
            }

            // Store all filtered posts for pagination calculation
            setAllFilteredPosts(postsData);
            
            // Pagination
            const currentPage = Number(searchParams.get('page')) || 1;
            const pageSize = 10;
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedPosts = postsData.slice(startIndex, endIndex);

            setPosts(paginatedPosts);

            const statsRes = await api.get('/posts/analytics_overview/');
            setStats(statsRes.data);
        } catch (err) {
            console.error("Failed to fetch posts", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchParams]);

    // Sync searchInput with URL when it changes externally (e.g., clear filters)
    // Only sync if the input is not currently focused (user not typing)
    useEffect(() => {
        const urlSearch = searchParams.get('search') || '';
        // Only sync if input is not focused to avoid interrupting user typing
        if (urlSearch !== searchInput && document.activeElement !== searchInputRef.current) {
            setSearchInput(urlSearch);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleDeleteClick = (post: Post) => {
        setPostToDelete({ id: post.id, title: post.title });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!postToDelete) return;

        setIsDeleting(true);
        try {
            await api.delete(`/posts/${postToDelete.id}/`);
            setToast({ message: 'Post deleted successfully!', type: 'success', isVisible: true });
            setShowDeleteModal(false);
            setPostToDelete(null);
            fetchData(); 
        } catch (err) {
            setToast({ message: 'Failed to delete post.', type: 'error', isVisible: true });
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper to determine what to show in the "Scope" column
    const getScopeBadge = (post: any) => {
        if (post.is_global) {
            return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold">🌍 Global</span>;
        }
        
        // Super Admin creating for specific Munis
        if (post.target_municipalities_details && post.target_municipalities_details.length > 0) {
            const count = post.target_municipalities_details.length;
            const name = post.target_municipalities_details[0].name;
            return (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                    🏛️ {count > 1 ? `${count} Municipalities` : name}
                </span>
            );
        }

        // Super/Muni Admin creating for specific Clubs
        if (post.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                    ⚽ {count > 1 ? `${count} Clubs` : name}
                </span>
            );
        }

        // Fallback based on ownership
        if (post.owner_role === 'MUNICIPALITY_ADMIN') return <span className="text-gray-500 text-xs">Municipality</span>;
        if (post.owner_role === 'CLUB_ADMIN') return <span className="text-gray-500 text-xs">Club</span>;

        return <span className="text-gray-400 text-xs">-</span>;
    };

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalCount = allFilteredPosts.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    if (loading) return <div className="p-8 text-center">Loading posts...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Post Management</h1>
                <Link 
                    href="/admin/super/posts/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                    + Create New Post
                </Link>
            </div>

            {/* Analytics Dashboard */}
            {stats && !loading && (
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
                            {/* Card 1: Total Posts */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Posts</h3>
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{stats.total_posts}</p>
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
                                <p className="text-3xl font-bold text-gray-900">{stats.created_last_7_days}</p>
                            </div>

                            {/* Card 3: New Last 30 Days */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New (30 Days)</h3>
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{stats.created_last_30_days}</p>
                            </div>

                            {/* Card 4: Average Views */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Views</h3>
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{stats.average_views}</p>
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
                                    ref={searchInputRef}
                                    type="text" 
                                    placeholder="Search by title..." 
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={searchInput} 
                                    onChange={e => setSearchInput(e.target.value)}
                                />
                            </div>

                            {/* Scope */}
                            <div className="w-48">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scope</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={searchParams.get('scope') || ''} 
                                    onChange={e => updateUrl('scope', e.target.value)}
                                >
                                    <option value="">All Scopes</option>
                                    <option value="GLOBAL">Global</option>
                                    <option value="MUNICIPALITY">Municipality</option>
                                    <option value="CLUB">Club</option>
                                </select>
                            </div>

                            {/* Type */}
                            <div className="w-40">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={searchParams.get('type') || ''} 
                                    onChange={e => updateUrl('type', e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="TEXT">Text</option>
                                    <option value="IMAGE">Image</option>
                                    <option value="VIDEO">Video</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div className="w-48">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={searchParams.get('status') || ''} 
                                    onChange={e => updateUrl('status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="ARCHIVED">Archived</option>
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

            {/* Posts Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Scope</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Views</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {posts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    {searchParams.get('search') || searchParams.get('scope') || searchParams.get('type') || searchParams.get('status')
                                        ? 'No posts found matching your filters.'
                                        : 'No posts found. Create your first one!'}
                                </td>
                            </tr>
                        ) : (
                            posts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">
                                            {post.is_pinned && <span className="mr-2 text-red-500" title="Pinned">📌</span>}
                                            {post.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    
                                    {/* NEW SCOPE COLUMN */}
                                    <td className="px-6 py-4">
                                        {getScopeBadge(post)}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {post.post_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                            post.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {post.view_count}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link 
                                                href={buildUrlWithParams(`/admin/super/posts/${post.id}`)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View
                                            </Link>
                                            <Link 
                                                href={buildUrlWithParams(`/admin/super/posts/edit/${post.id}`)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </Link>
                                            <button 
                                                onClick={() => handleDeleteClick(post)}
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
                            ))
                        )}
                    </tbody>
                </table>
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
                isVisible={showDeleteModal}
                onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setPostToDelete(null); } }}
                onConfirm={handleDeleteConfirm}
                itemName={postToDelete?.title}
                isLoading={isDeleting}
            />
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
        </div>
    );
}
