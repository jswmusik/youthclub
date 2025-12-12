'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, Globe, Building, Users } from 'lucide-react';
import api from '../../../../lib/api';
import { Post } from '../../../../types/post';
import ConfirmationModal from '../../../components/ConfirmationModal';
import Toast from '../../../components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function SuperAdminPostsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [posts, setPosts] = useState<any[]>([]); // Use any to handle the nested details easier
    const [allFilteredPosts, setAllFilteredPosts] = useState<any[]>([]); // Store all filtered posts for pagination
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
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

            // Filter out activity posts (only show actual posts, not automated activity posts)
            postsData = postsData.filter((p: any) => {
                const title = p.title || '';
                // Exclude activity posts: group joins, new groups, questionnaire completions, new questionnaires, inventory actions
                return !title.startsWith('Joined ') && 
                       !title.startsWith('Ny Grupp:') &&
                       !title.startsWith('New Group:') &&
                       !title.startsWith('Completed Questionnaire: ') &&
                       !title.startsWith('New Questionnaire: ') &&
                       !title.startsWith('Borrowed ') &&
                       !title.startsWith('Returned ');
            });

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

            // Calculate stats from filtered posts (excluding activity posts)
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            const filteredForStats = allPosts.filter((p: any) => {
                const title = p.title || '';
                return !title.startsWith('Joined ') && 
                       !title.startsWith('Ny Grupp:') &&
                       !title.startsWith('New Group:') &&
                       !title.startsWith('Completed Questionnaire: ') &&
                       !title.startsWith('New Questionnaire: ') &&
                       !title.startsWith('Borrowed ') &&
                       !title.startsWith('Returned ');
            });
            
            const totalPosts = filteredForStats.length;
            const createdLast7Days = filteredForStats.filter((p: any) => {
                const createdDate = new Date(p.created_at);
                return createdDate >= sevenDaysAgo;
            }).length;
            const createdLast30Days = filteredForStats.filter((p: any) => {
                const createdDate = new Date(p.created_at);
                return createdDate >= thirtyDaysAgo;
            }).length;
            const totalViews = filteredForStats.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0);
            const averageViews = totalPosts > 0 ? Math.round((totalViews / totalPosts) * 10) / 10 : 0;
            
            setStats({
                total_posts: totalPosts,
                created_last_7_days: createdLast7Days,
                created_last_30_days: createdLast30Days,
                average_views: averageViews
            });
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
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Global
                </Badge>
            );
        }
        
        // Super Admin creating for specific Munis
        if (post.target_municipalities_details && post.target_municipalities_details.length > 0) {
            const count = post.target_municipalities_details.length;
            const name = post.target_municipalities_details[0].name;
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <Building className="h-3 w-3 mr-1" />
                    {count > 1 ? `${count} Municipalities` : name}
                </Badge>
            );
        }

        // Super/Muni Admin creating for specific Clubs
        if (post.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {count > 1 ? `${count} Clubs` : name}
                </Badge>
            );
        }

        // Fallback based on ownership
        if (post.owner_role === 'MUNICIPALITY_ADMIN') {
            return (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                    Municipality
                </Badge>
            );
        }
        if (post.owner_role === 'CLUB_ADMIN') {
            return (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                    Club
                </Badge>
            );
        }

        return <span className="text-sm text-gray-400">-</span>;
    };

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalCount = allFilteredPosts.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    if (loading) return (
        <div className="py-20 flex justify-center text-gray-400">
            <div className="animate-pulse">Loading posts...</div>
        </div>
    );

    return (
        <div className="p-8">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Posts</h1>
                    <p className="text-gray-500 mt-1">Manage posts and their information.</p>
                </div>
                <Link href="/admin/super/posts/create">
                    <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
                        <Plus className="h-4 w-4" /> Create Post
                    </Button>
                </Link>
            </div>

            {/* Analytics */}
            {stats && (
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            {/* Card 1: Total Posts */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Total Posts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{stats.total_posts}</div>
                                </CardContent>
                            </Card>

                            {/* Card 2: New Last 7 Days */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">New (7 Days)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{stats.created_last_7_days}</div>
                                </CardContent>
                            </Card>

                            {/* Card 3: New Last 30 Days */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">New (30 Days)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{stats.created_last_30_days}</div>
                                </CardContent>
                            </Card>

                            {/* Card 4: Average Views */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Avg Views</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{stats.average_views}</div>
                                </CardContent>
                            </Card>
                        </div>
                    </CollapsibleContent>
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
                                ref={searchInputRef}
                                placeholder="Search by title..." 
                                className="pl-9 bg-gray-50 border-0"
                                value={searchInput} 
                                onChange={e => setSearchInput(e.target.value)}
                            />
                        </div>
                        
                        {/* Scope Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={searchParams.get('scope') || ''} 
                                onChange={e => updateUrl('scope', e.target.value)}
                            >
                                <option value="">All Scopes</option>
                                <option value="GLOBAL">Global</option>
                                <option value="MUNICIPALITY">Municipality</option>
                                <option value="CLUB">Club</option>
                            </select>
                        </div>
                        
                        {/* Type Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={searchParams.get('type') || ''} 
                                onChange={e => updateUrl('type', e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="TEXT">Text</option>
                                <option value="IMAGE">Image</option>
                                <option value="VIDEO">Video</option>
                            </select>
                        </div>
                        
                        {/* Status Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
                        
                        {/* Clear Button */}
                        <div className="md:col-span-2 lg:col-span-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    router.push(pathname);
                                    setSearchInput('');
                                }}
                                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                            >
                                <X className="h-4 w-4" /> Clear
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content */}
            {posts.length === 0 ? (
                <Card className="border border-gray-100 shadow-sm">
                    <div className="py-20 text-center">
                        <p className="text-gray-500">
                            {searchParams.get('search') || searchParams.get('scope') || searchParams.get('type') || searchParams.get('status')
                                ? 'No posts found matching your filters.'
                                : 'No posts found. Create your first one!'}
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* MOBILE: Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {posts.map(post => (
                            <Card key={post.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-5 w-5 text-[#4D4DA4]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base font-semibold text-[#121213] truncate flex items-center gap-2">
                                                {post.is_pinned && <span className="text-red-500" title="Pinned">📌</span>}
                                                {post.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs text-gray-500 truncate">
                                                By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Scope</span>
                                            {getScopeBadge(post)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Type</span>
                                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                                                {post.post_type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                                            <Badge variant="outline" className={`text-xs ${
                                                post.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                post.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                                {post.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Views</span>
                                            <span className="text-sm text-gray-600">{post.view_count}</span>
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                        <Link href={buildUrlWithParams(`/admin/super/posts/${post.id}`)} className="flex-1">
                                            <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Button>
                                        </Link>
                                        <Link href={buildUrlWithParams(`/admin/super/posts/edit/${post.id}`)} className="flex-1">
                                            <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteClick(post)}
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
                                    <TableHead className="h-12 text-gray-600 font-semibold">Post</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Scope</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Type</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Views</TableHead>
                                    <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {posts.map(post => (
                                    <TableRow key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                                                    <FileText className="h-5 w-5 text-[#4D4DA4]" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[#121213] flex items-center gap-2">
                                                        {post.is_pinned && <span className="text-red-500" title="Pinned">📌</span>}
                                                        {post.title}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {getScopeBadge(post)}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                                                {post.post_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className={`text-xs ${
                                                post.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                post.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                                {post.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm text-gray-600">{post.view_count}</span>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={buildUrlWithParams(`/admin/super/posts/${post.id}`)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={buildUrlWithParams(`/admin/super/posts/edit/${post.id}`)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDeleteClick(post)}
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
                </>
            )}

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

            <ConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setPostToDelete(null); } }}
                onConfirm={handleDeleteConfirm}
                title="Delete Post"
                message={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone.`}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                variant="danger"
                isLoading={isDeleting}
            />
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
            </div>
        </div>
    );
}
