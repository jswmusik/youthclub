'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, 
    Copy, ToggleLeft, ToggleRight, ChevronLeft, Sparkles, FileText,
    Megaphone, Calendar, Star, Bell, PartyPopper, Info, AlertTriangle,
    Heart, Trophy, Rocket, Globe, Building, Users, Pin, MessageSquare
} from 'lucide-react';
import api from '../../../lib/api';
import ConfirmationModal from '../ConfirmationModal';
import Toast from '../Toast';

// Types
interface PostTemplate {
    id: number;
    name: string;
    description: string;
    icon: string;
    icon_emoji: string;
    role_scope: string;
    default_post_type: string;
    is_global: boolean;
    is_pinned_default: boolean;
    send_push_notification: boolean;
    usage_count: number;
    is_active: boolean;
    target_summary: string;
    settings_summary: string;
    created_by_name: string;
    created_at: string;
    updated_at: string;
}

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Icon mapping
const ICON_MAP: Record<string, React.ReactNode> = {
    'MEGAPHONE': <Megaphone className="w-4 h-4" />,
    'CALENDAR': <Calendar className="w-4 h-4" />,
    'STAR': <Star className="w-4 h-4" />,
    'BELL': <Bell className="w-4 h-4" />,
    'PARTY': <PartyPopper className="w-4 h-4" />,
    'INFO': <Info className="w-4 h-4" />,
    'WARNING': <AlertTriangle className="w-4 h-4" />,
    'HEART': <Heart className="w-4 h-4" />,
    'TROPHY': <Trophy className="w-4 h-4" />,
    'ROCKET': <Rocket className="w-4 h-4" />,
};

// Swipeable Card Component
interface SwipeableCardProps {
    children: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onClick: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onDuplicate, onClick }: SwipeableCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const actionWidth = 210; // 3 buttons
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
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); setCurrentX(0); }}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-purple)] text-white transition-all active:bg-[var(--brand-purple)]/80"
                >
                    <Copy className="w-5 h-5" />
                    <span className="text-xs font-medium">Copy</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); setCurrentX(0); }}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
                >
                    <Edit className="w-5 h-5" />
                    <span className="text-xs font-medium">Edit</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); setCurrentX(0); }}
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

function TemplateCardSkeleton() {
    return (
        <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
            <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-2 mt-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TemplateTableRowSkeleton() {
    return (
        <tr className="border-b border-[var(--dark-600)]/50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-60" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-10" /></td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            </td>
        </tr>
    );
}

interface PostTemplateManagerProps {
    basePath: string;
}

export default function PostTemplateManager({ basePath }: PostTemplateManagerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [templates, setTemplates] = useState<PostTemplate[]>([]);
    const [allFilteredTemplates, setAllFilteredTemplates] = useState<PostTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const loadStartTime = useRef<number>(0);
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<{ id: number; name: string } | null>(null);
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
        const showInactive = searchParams.get('show_inactive');
        
        if (page && page !== '1') params.set('page', page);
        if (search) params.set('search', search);
        if (showInactive) params.set('show_inactive', showInactive);
        
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
            const showInactive = searchParams.get('show_inactive') === 'true';
            
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (showInactive) params.set('show_inactive', 'true');
            
            const res = await api.get(`/post-templates/?${params.toString()}`);
            let templatesData = Array.isArray(res.data) ? res.data : res.data.results || [];
            
            setAllFilteredTemplates(templatesData);
            
            const currentPage = Number(searchParams.get('page')) || 1;
            const pageSize = 10;
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedTemplates = templatesData.slice(startIndex, endIndex);

            setTemplates(paginatedTemplates);

            const elapsed = Date.now() - loadStartTime.current;
            const remaining = MIN_LOADING_TIME - elapsed;
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }
        } catch (err) {
            console.error("Failed to fetch templates", err);
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

    const handleDeleteClick = (template: PostTemplate) => {
        setTemplateToDelete({ id: template.id, name: template.name });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!templateToDelete) return;

        setIsDeleting(true);
        try {
            await api.delete(`/post-templates/${templateToDelete.id}/`);
            setToast({ message: 'Template deleted successfully!', type: 'success', isVisible: true });
            setShowDeleteModal(false);
            setTemplateToDelete(null);
            fetchData(); 
        } catch (err) {
            setToast({ message: 'Failed to delete template.', type: 'error', isVisible: true });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicate = async (template: PostTemplate) => {
        try {
            await api.post(`/post-templates/${template.id}/duplicate/`);
            setToast({ message: 'Template duplicated!', type: 'success', isVisible: true });
            fetchData();
        } catch (err) {
            setToast({ message: 'Failed to duplicate template.', type: 'error', isVisible: true });
        }
    };

    const handleToggleActive = async (template: PostTemplate) => {
        try {
            await api.post(`/post-templates/${template.id}/toggle_active/`);
            setToast({ message: `Template ${template.is_active ? 'deactivated' : 'activated'}!`, type: 'success', isVisible: true });
            fetchData();
        } catch (err) {
            setToast({ message: 'Failed to toggle template status.', type: 'error', isVisible: true });
        }
    };

    const getStatusBadge = (isActive: boolean) => {
        if (isActive) {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
                    Active
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]">
                Inactive
            </span>
        );
    };

    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalCount = allFilteredTemplates.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const hasActiveFilters = searchParams.get('search') || searchParams.get('show_inactive');
    const showInactive = searchParams.get('show_inactive') === 'true';

    // Stats
    const totalTemplates = allFilteredTemplates.length;
    const activeTemplates = allFilteredTemplates.filter(t => t.is_active).length;
    const totalUsage = allFilteredTemplates.reduce((sum, t) => sum + t.usage_count, 0);

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Post Templates</h1>
                            <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">Create and manage reusable templates for quick posting</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`${basePath}/posts`}>
                            <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all">
                                <FileText className="h-4 w-4" /> Posts
                            </button>
                        </Link>
                        <Link href={`${basePath}/posts/templates/create`}>
                            <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-purple)] transition-all">
                                <Plus className="h-4 w-4" /> Create Template
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Analytics Dashboard */}
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
                                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                    {/* Total Templates */}
                                    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                                <Sparkles className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs text-[var(--brand-light)]/60 font-medium">Total</span>
                                        </div>
                                        <div className="text-2xl font-bold text-[var(--brand-light)]">{totalTemplates}</div>
                                    </div>

                                    {/* Active Templates */}
                                    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-green)]/30 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-green)] to-[#34D399] flex items-center justify-center">
                                                <ToggleRight className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs text-[var(--brand-light)]/60 font-medium">Active</span>
                                        </div>
                                        <div className="text-2xl font-bold text-[var(--brand-light)]">{activeTemplates}</div>
                                    </div>

                                    {/* Total Usage */}
                                    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)] hover:border-[var(--brand-blue)]/30 transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                                                <FileText className="h-4 w-4 text-white" />
                                            </div>
                                            <span className="text-xs text-[var(--brand-light)]/60 font-medium">Used</span>
                                        </div>
                                        <div className="text-2xl font-bold text-[var(--brand-light)]">{totalUsage}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                    <div className="px-4 sm:px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            {/* Search */}
                            <div className="relative sm:col-span-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                                <input 
                                    ref={searchInputRef}
                                    placeholder="Search templates..." 
                                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-colors"
                                    value={searchInput} 
                                    onChange={e => setSearchInput(e.target.value)}
                                />
                            </div>
                            
                            {/* Show Inactive Toggle */}
                            <div className="sm:col-span-3">
                                <button
                                    onClick={() => updateUrl('show_inactive', showInactive ? '' : 'true')}
                                    className={`w-full h-10 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                                        showInactive 
                                            ? 'bg-[var(--brand-primary)]/20 border-[var(--brand-primary)]/30 text-[var(--brand-primary)]' 
                                            : 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30'
                                    }`}
                                >
                                    {showInactive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                    <span className="text-sm font-medium">Show Inactive</span>
                                </button>
                            </div>
                            
                            {/* Clear Button */}
                            <div className="sm:col-span-3">
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
                        Showing <span className="text-[var(--brand-primary)] font-semibold">{templates.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> templates
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <>
                        {/* Mobile Skeletons */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {[1, 2, 3, 4, 5].map(i => (
                                <TemplateCardSkeleton key={i} />
                            ))}
                        </div>
                        {/* Desktop Skeletons */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Template</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Target</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Settings</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Used</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                                        <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <TemplateTableRowSkeleton key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : templates.length === 0 ? (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 text-center">
                        <Sparkles className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                        <p className="text-[var(--brand-light)]/50 mb-2">
                            {hasActiveFilters ? 'No templates found matching your filters' : 'No templates found'}
                        </p>
                        <p className="text-sm text-[var(--brand-light)]/30 mb-6">
                            {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first template to get started'}
                        </p>
                        {!hasActiveFilters && (
                            <Link href={`${basePath}/posts/templates/create`}>
                                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-purple)] transition-all">
                                    <Plus className="h-4 w-4" /> Create Template
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* MOBILE: Swipeable Cards */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {templates.map(template => (
                                <SwipeableCard
                                    key={template.id}
                                    onEdit={() => router.push(buildUrlWithParams(`${basePath}/posts/templates/edit/${template.id}`))}
                                    onDelete={() => handleDeleteClick(template)}
                                    onDuplicate={() => handleDuplicate(template)}
                                    onClick={() => router.push(buildUrlWithParams(`${basePath}/posts/templates/edit/${template.id}`))}
                                >
                                    <div className="p-4 border-y border-[var(--dark-600)]">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0 text-white">
                                                {ICON_MAP[template.icon] || <Megaphone className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-[var(--brand-light)] truncate">{template.name}</h3>
                                                    {!template.is_active && (
                                                        <span className="text-xs text-[var(--brand-light)]/40">(Inactive)</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--brand-light)]/50 mb-2 line-clamp-2">
                                                    {template.description || 'No description'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/60 text-xs">
                                                        <Users className="w-3 h-3" />
                                                        {template.target_summary}
                                                    </span>
                                                    <span className="text-xs text-[var(--brand-light)]/40">
                                                        Used {template.usage_count}×
                                                    </span>
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
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Template</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Target</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Settings</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Used</th>
                                        <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                                        <th className="h-12 px-6 text-right text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => (
                                        <tr key={template.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0 text-white">
                                                        {ICON_MAP[template.icon] || <Megaphone className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                                            {template.name}
                                                        </div>
                                                        <div className="text-xs text-[var(--brand-light)]/50 line-clamp-1 max-w-[200px]">
                                                            {template.description || 'No description'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-[var(--brand-light)]/70 line-clamp-1 max-w-[150px]">
                                                    {template.target_summary}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {template.send_push_notification && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] text-xs">
                                                            <Bell className="w-3 h-3" /> Push
                                                        </span>
                                                    )}
                                                    {template.is_pinned_default && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs">
                                                            <Pin className="w-3 h-3" /> Pin
                                                        </span>
                                                    )}
                                                    {!template.send_push_notification && !template.is_pinned_default && (
                                                        <span className="text-xs text-[var(--brand-light)]/40">Default</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-[var(--brand-light)]/70">{template.usage_count}</span>
                                            </td>
                                            <td className="py-4 px-6">{getStatusBadge(template.is_active)}</td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button 
                                                        onClick={() => handleToggleActive(template)}
                                                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                                                            template.is_active 
                                                                ? 'text-[var(--brand-green)] hover:bg-[var(--brand-green)]/10' 
                                                                : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-green)] hover:bg-[var(--dark-600)]'
                                                        }`}
                                                        title={template.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {template.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDuplicate(template)}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/50 hover:text-[var(--brand-purple)] hover:bg-[var(--dark-600)] transition-all"
                                                        title="Duplicate"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                    <Link href={buildUrlWithParams(`${basePath}/posts/templates/edit/${template.id}`)}>
                                                        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/50 hover:text-[var(--brand-blue)] hover:bg-[var(--dark-600)] transition-all">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDeleteClick(template)}
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
                    onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setTemplateToDelete(null); } }}
                    onConfirm={handleDeleteConfirm}
                    title="Delete Template"
                    message={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
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


