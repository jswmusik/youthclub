'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, 
    Users, UserPlus, TrendingUp, ChevronLeft, Sparkles, Zap 
} from 'lucide-react';
import api from '../../../../lib/api';
import { Post } from '../../../../types/post';
import ConfirmationModal from '../../../components/ConfirmationModal';
import Toast from '../../../components/Toast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
    children: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    onClick: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onClick }: SwipeableCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const actionWidth = 140;
    const threshold = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
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
        onEdit();
        setIsOpen(false);
        setCurrentX(0);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
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
                {!isOpen && (
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

function PostCardSkeleton() {
    return (
        <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
            <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2 mt-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PostTableRowSkeleton() {
    return (
        <tr className="border-b border-[var(--dark-600)]/50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-28" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-10" /></td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            </td>
        </tr>
    );
}

export default function ClubAdminPostsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [posts, setPosts] = useState<any[]>([]);
    const [allFilteredPosts, setAllFilteredPosts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const loadStartTime = useRef<number>(0);
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: number; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value); else params.delete(key);
        if (key !== 'page') {
            params.set('page', '1');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        
        if (page && page !== '1') params.set('page', page);
        if (search) params.set('search', search);
        if (type) params.set('type', type);
        if (status) params.set('status', status);
        
        const queryString = params.toString();
        return queryString ? `${path}?${queryString}` : path;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const currentSearch = searchParams.get('search') || '';
            if (searchInput !== currentSearch) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchInput) params.set('search', searchInput); else params.delete('search');
                params.set('page', '1');
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 0);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchData = useCallback(async () => {
        loadStartTime.current = Date.now();
        setLoading(true);
        try {
            const search = searchParams.get('search') || '';
            const type = searchParams.get('type') || '';
            const status = searchParams.get('status') || '';
            
            let allPosts: any[] = [];
            let pageNum = 1;
            let totalCount = 0;
            const fetchPageSize = 100;
            const maxPages = 100;
            
            while (pageNum <= maxPages) {
                const postsRes = await api.get(`/posts/?page=${pageNum}&page_size=${fetchPageSize}`);
                const responseData = postsRes.data;
                
                if (Array.isArray(responseData)) {
                    allPosts = [...allPosts, ...responseData];
                    break;
                } else if (responseData.results && Array.isArray(responseData.results)) {
                    const pagePosts = responseData.results;
                    allPosts = [...allPosts, ...pagePosts];
                    
                    if (pageNum === 1) {
                        totalCount = responseData.count || 0;
                    }
                    
                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const hasAllResults = totalCount > 0 && allPosts.length >= totalCount;
                    const gotEmptyPage = pagePosts.length === 0;
                    
                    if (!hasNext || hasAllResults || gotEmptyPage) {
                        break;
                    }
                    
                    pageNum++;
                } else {
                    allPosts = Array.isArray(responseData) ? responseData : [];
                    break;
                }
            }
            
            let postsData = allPosts;

            // Filter out activity posts
            postsData = postsData.filter((p: any) => {
                const title = p.title || '';
                return !title.startsWith('Joined ') && 
                       !title.startsWith('Ny Grupp:') &&
                       !title.startsWith('New Group:') &&
                       !title.startsWith('Completed Questionnaire: ') &&
                       !title.startsWith('New Questionnaire: ') &&
                       !title.startsWith('Borrowed ') &&
                       !title.startsWith('Returned ') &&
                       !title.startsWith('Reward:') &&
                       !title.startsWith('Belöning:');
            });

            // Club admins only see club posts (filter out global and municipality posts)
            postsData = postsData.filter((p: any) => 
                !p.is_global && 
                !(p.target_municipalities_details && p.target_municipalities_details.length > 0)
            );

            if (search) {
                const searchLower = search.toLowerCase();
                postsData = postsData.filter((p: any) => 
                    p.title?.toLowerCase().includes(searchLower)
                );
            }

            if (type) {
                postsData = postsData.filter((p: any) => p.post_type === type);
            }

            if (status) {
                postsData = postsData.filter((p: any) => p.status === status);
            }

            // Sort by created_at descending (newest first)
            postsData = postsData.sort((a: any, b: any) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA;
            });

            setAllFilteredPosts(postsData);
            
            const currentPage = Number(searchParams.get('page')) || 1;
            const pageSize = 10;
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedPosts = postsData.slice(startIndex, endIndex);

            setPosts(paginatedPosts);

            // Calculate stats
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
                       !title.startsWith('Returned ') &&
                       !title.startsWith('Reward:') &&
                       !title.startsWith('Belöning:');
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

            const elapsed = Date.now() - loadStartTime.current;
            const remaining = MIN_LOADING_TIME - elapsed;
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }
        } catch (err) {
            console.error("Failed to fetch posts", err);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const urlSearch = searchParams.get('search') || '';
        if (urlSearch !== searchInput && document.activeElement !== searchInputRef.current) {
            setSearchInput(urlSearch);
        }
    }, [searchParams]);

    const handleDeleteClick = (post: any) => {
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

    const getScopeBadge = (post: any) => {
        if (post.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] text-xs font-medium border border-[var(--brand-purple)]/30">
                    <Users className="h-3 w-3" />
                    {count > 1 ? `${count} Clubs` : name}
                </span>
            );
        }

        if (post.owner_role === 'CLUB_ADMIN') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/60 text-xs font-medium border border-[var(--dark-500)]">
                    Club
                </span>
            );
        }

        return <span className="text-sm text-[var(--brand-light)]/40">-</span>;
    };

    const getTypeBadge = (postType: string) => {
        const styles: Record<string, string> = {
            'TEXT': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'IMAGE': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'VIDEO': 'bg-[var(--brand-pink)]/20 text-[var(--brand-pink)] border-[var(--brand-pink)]/30',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[postType] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'}`}>
                {postType}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PUBLISHED': 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30',
            'DRAFT': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'SCHEDULED': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'ARCHIVED': 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'}`}>
                {status}
            </span>
        );
    };

    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalCount = allFilteredPosts.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const hasActiveFilters = searchParams.get('search') || searchParams.get('type') || searchParams.get('status');

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Manage Posts</h1>
                            <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">Create and manage your club posts</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <Link href="/admin/club/posts/templates" className="sm:order-first">
                            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 font-medium hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm">
                                <Sparkles className="h-4 w-4" /> Templates
                            </button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/admin/club/posts/quick" className="flex-1 sm:flex-none">
                                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-semibold hover:opacity-90 transition-all">
                                    <Zap className="h-4 w-4" /> Quick Post
                                </button>
                            </Link>
                            <Link href="/admin/club/posts/create" className="flex-1 sm:flex-none">
                                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-semibold hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all">
                                    <Plus className="h-4 w-4" /> Advanced
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {stats && (
                    <div className="mb-6">
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                            <button 
                                onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                                className="w-full flex items-center justify-between px-4 sm:px-6 py-4"
                            >
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
                                    <span className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</span>
                                </div>
                                <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/60 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
                            </button>
                            
                            <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {/* Total Posts */}
                                        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30 transition-all">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-xs text-[var(--brand-light)]/60 font-medium">Total Posts</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[var(--brand-light)]">{stats.total_posts}</div>
                                        </div>

                                        {/* New (7 Days) */}
                                        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-blue)]/30 transition-all">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                                                    <UserPlus className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-xs text-[var(--brand-light)]/60 font-medium">New (7 Days)</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[var(--brand-light)]">{stats.created_last_7_days}</div>
                                        </div>

                                        {/* New (30 Days) */}
                                        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-green)]/30 transition-all">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-green)] to-[#34D399] flex items-center justify-center">
                                                    <UserPlus className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-xs text-[var(--brand-light)]/60 font-medium">New (30 Days)</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[var(--brand-light)]">{stats.created_last_30_days}</div>
                                        </div>

                                        {/* Average Views */}
                                        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-pink)]/30 transition-all">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-pink)] to-[#FF8FA3] flex items-center justify-center">
                                                    <TrendingUp className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-xs text-[var(--brand-light)]/60 font-medium">Avg Views</span>
                                            </div>
                                            <div className="text-2xl font-bold text-[var(--brand-light)]">{stats.average_views}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                    <div className="px-4 sm:px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                            {/* Search */}
                            <div className="relative lg:col-span-5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                                <input 
                                    ref={searchInputRef}
                                    placeholder="Search by title..." 
                                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-colors"
                                    value={searchInput} 
                                    onChange={e => setSearchInput(e.target.value)}
                                />
                            </div>
                            
                            {/* Type Filter */}
                            <div className="lg:col-span-2">
                                <select 
                                    className="w-full h-10 px-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors cursor-pointer"
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
                            <div className="lg:col-span-3">
                                <select 
                                    className="w-full h-10 px-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors cursor-pointer"
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
                            <div className="lg:col-span-2">
                                <button
                                    onClick={() => {
                                        router.push(pathname);
                                        setSearchInput('');
                                    }}
                                    className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:border-[var(--brand-red)]/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <X className="h-4 w-4" /> Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center justify-between px-4 sm:px-0 mb-4">
                    <p className="text-sm text-[var(--brand-light)]/60">
                        Showing <span className="text-[var(--brand-primary)] font-semibold">{posts.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> posts
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <>
                        {/* Mobile Skeletons */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {[1, 2, 3, 4, 5].map(i => (
                                <PostCardSkeleton key={i} />
                            ))}
                        </div>
                        {/* Desktop Skeletons */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Post</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Type</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Views</th>
                                        <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <PostTableRowSkeleton key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : posts.length === 0 ? (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 text-center">
                        <FileText className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                        <p className="text-[var(--brand-light)]/50 mb-2">
                            {hasActiveFilters ? 'No posts found matching your filters' : 'No posts found'}
                        </p>
                        <p className="text-sm text-[var(--brand-light)]/30 mb-6">
                            {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first post to get started'}
                        </p>
                        {!hasActiveFilters && (
                            <Link href="/admin/club/posts/create">
                                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-purple)] transition-all">
                                    <Plus className="h-4 w-4" /> Create Post
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* MOBILE: Swipeable Cards */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {posts.map(post => (
                                <SwipeableCard
                                    key={post.id}
                                    onEdit={() => router.push(buildUrlWithParams(`/admin/club/posts/edit/${post.id}`))}
                                    onDelete={() => handleDeleteClick(post)}
                                    onClick={() => router.push(buildUrlWithParams(`/admin/club/posts/${post.id}`))}
                                >
                                    <div className="p-4 border-y border-[var(--dark-600)]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                                <FileText className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {post.is_pinned && <span className="text-[var(--brand-peach)]" title="Pinned">📌</span>}
                                                    <h3 className="font-semibold text-[var(--brand-light)] truncate">{post.title}</h3>
                                                </div>
                                                <p className="text-xs text-[var(--brand-light)]/50 mb-2">
                                                    By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {getTypeBadge(post.post_type)}
                                                    {getStatusBadge(post.status)}
                                                    <span className="text-xs text-[var(--brand-light)]/40">{post.view_count} views</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwipeableCard>
                            ))}
                        </div>

                        {/* DESKTOP: Table */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Post</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Type</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Views</th>
                                        <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.map(post => (
                                        <tr key={post.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                                        <FileText className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                                            {post.is_pinned && <span className="text-[var(--brand-peach)]" title="Pinned">📌</span>}
                                                            {post.title}
                                                        </div>
                                                        <div className="text-xs text-[var(--brand-light)]/50">
                                                            By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">{getTypeBadge(post.post_type)}</td>
                                            <td className="py-4 px-6">{getStatusBadge(post.status)}</td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-[var(--brand-light)]/70">{post.view_count}</span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={buildUrlWithParams(`/admin/club/posts/${post.id}`)}>
                                                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </Link>
                                                    <Link href={buildUrlWithParams(`/admin/club/posts/edit/${post.id}`)}>
                                                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/50 hover:text-[var(--brand-blue)] hover:bg-[var(--dark-600)] transition-all">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDeleteClick(post)}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-6 px-4 sm:px-0">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => updateUrl('page', (currentPage - 1).toString())}
                            className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            Prev
                        </button>
                        <span className="text-sm text-[var(--brand-light)]/60">
                            Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
                        </span>
                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => updateUrl('page', (currentPage + 1).toString())}
                            className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            Next
                        </button>
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
                    darkMode={true}
                    isLoading={isDeleting}
                />
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    isVisible={toast.isVisible} 
                    onClose={() => setToast({ ...toast, isVisible: false })} 
                    darkMode 
                    duration={1250}
                />
            </div>
        </div>
    );
}

