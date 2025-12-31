'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course, CourseChapter, LearningCategory } from '@/types/learning';
import { Plus, Search, Edit, Trash2, FolderOpen, Eye, BarChart3, ChevronUp, ChevronDown, BookOpen, Video, FileText, Download, X, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Link from 'next/link';
import ConfirmationModal from '../ConfirmationModal';
import { useToast } from '../../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

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

function CourseCardSkeleton() {
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

function CourseTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
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

// SwipeableCard Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function SwipeableCard({ children, onClick, onEdit, onDelete }: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const newTranslate = Math.max(-120, Math.min(0, currentXRef.current + diff));
    setTranslateX(newTranslate);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX < -60) {
      setTranslateX(-120);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        {onEdit && (
          <button
            onClick={onEdit}
            className="w-[60px] bg-[var(--brand-primary)] flex items-center justify-center text-[var(--dark-900)]"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-[60px] bg-[var(--brand-red)] flex items-center justify-center text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Main content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (translateX === 0 && onClick) {
            onClick();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function CourseManager() {
    const t = useTranslations('knowledgeAdmin.courses');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesWithDetails, setCoursesWithDetails] = useState<any[]>([]);
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [itemToDelete, setItemToDelete] = useState<Course | null>(null);
    const { success, error, info, warning } = useToast();
    
    // Filter state
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [filterType, setFilterType] = useState(searchParams.get('type') || '');
    const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');

    // Debounced filter update
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchInput) params.set('search', searchInput); else params.delete('search');
            if (filterType) params.set('type', filterType); else params.delete('type');
            if (filterCategory) params.set('category', filterCategory); else params.delete('category');
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, filterType, filterCategory]);

    useEffect(() => {
        fetchCategories();
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [searchParams]);

    const fetchCategories = async () => {
        try {
            const res = await learningApi.getCategories();
            const data = res.data as any;
            const categoriesData = Array.isArray(data) ? data : (data?.results || []);
            setCategories(categoriesData);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    const fetchCourses = async () => {
        setLoading(true);
        setShowSkeleton(true);
        const startTime = Date.now();
        
        try {
            const res = await learningApi.getAllCourses();
            const data = res.data as any;
            const coursesData = Array.isArray(data) ? data : (data?.results || []);
            const count = data?.count || coursesData.length;
            
            setCourses(coursesData);
            setTotalCount(count);
            
            // Fetch course details for analytics
            const detailsPromises = coursesData.map((course: Course) => 
                learningApi.getCourse(course.slug).catch(() => null)
            );
            const detailsResults = await Promise.all(detailsPromises);
            const validDetails = detailsResults.filter(r => r !== null).map(r => r?.data);
            setCoursesWithDetails(validDetails);
        } catch (error: any) {
            console.error("Failed to fetch courses", error);
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
            
            setTimeout(() => {
                setLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    };

    // Helper function to determine primary content type of a course
    const getPrimaryContentType = (course: any): 'VIDEO' | 'TEXT' | 'FILE' | null => {
        if (!course?.chapters) return null;
        
        const allItems: any[] = [];
        course.chapters.forEach((chapter: CourseChapter) => {
            if (chapter.items && Array.isArray(chapter.items)) {
                allItems.push(...chapter.items);
            }
        });
        
        if (allItems.length === 0) return null;
        
        const typeCounts = {
            VIDEO: allItems.filter((item: any) => item.type === 'VIDEO').length,
            TEXT: allItems.filter((item: any) => item.type === 'TEXT').length,
            FILE: allItems.filter((item: any) => item.type === 'FILE').length,
        };
        
        const maxCount = Math.max(typeCounts.VIDEO, typeCounts.TEXT, typeCounts.FILE);
        if (maxCount === 0) return null;
        
        if (typeCounts.VIDEO === maxCount) return 'VIDEO';
        if (typeCounts.TEXT === maxCount) return 'TEXT';
        if (typeCounts.FILE === maxCount) return 'FILE';
        
        return null;
    };

    // Calculate analytics based on primary content type
    const analytics = {
        total_courses: courses.length,
        video_courses: coursesWithDetails.filter((course: any) => getPrimaryContentType(course) === 'VIDEO').length,
        text_courses: coursesWithDetails.filter((course: any) => getPrimaryContentType(course) === 'TEXT').length,
        file_resources: coursesWithDetails.filter((course: any) => getPrimaryContentType(course) === 'FILE').length,
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await learningApi.deleteCourse(itemToDelete.slug);
            setCourses(prev => prev.filter(c => c.slug !== itemToDelete.slug));
            success(t('toast.courseDeleted'));
            setItemToDelete(null);
        } catch (error) {
            error(t('toast.failedToDelete'));
        }
    };

    // Helper to get primary type for a course from details
    const getCoursePrimaryType = (course: Course): 'VIDEO' | 'TEXT' | 'FILE' | null => {
        const courseDetail = coursesWithDetails.find((cd: any) => cd?.slug === course.slug);
        if (!courseDetail) return null;
        return getPrimaryContentType(courseDetail);
    };

    // Format scheduled date/time compactly
    const formatScheduledDate = (dateString?: string | null): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month} ${hours}:${minutes}`;
        } catch {
            return '';
        }
    };

    // Filter courses
    const filteredCourses = Array.isArray(courses) ? courses.filter(c => {
        const searchTerm = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const category = searchParams.get('category') || '';
        
        const matchesSearch = !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !category || c.category?.toString() === category;
        const matchesType = !type || getCoursePrimaryType(c) === type;
        return matchesSearch && matchesCategory && matchesType;
    }) : [];

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(filteredCourses.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

    const clearFilters = () => {
        setSearchInput('');
        setFilterType('');
        setFilterCategory('');
        router.push(pathname);
    };

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', p.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // Determine base path from pathname
    const getBasePath = () => {
        if (pathname.includes('/admin/super/')) return '/admin/super/knowledge';
        if (pathname.includes('/admin/municipality/')) return '/admin/municipality/knowledge';
        if (pathname.includes('/admin/club/')) return '/admin/club/knowledge';
        return '/admin/super/knowledge';
    };

    const basePath = getBasePath();

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    const hasFilters = searchInput || filterType || filterCategory;

    // Type badge component
    const TypeBadge = ({ type }: { type: 'VIDEO' | 'TEXT' | 'FILE' | null }) => {
        if (!type) return <span className="text-sm text-[var(--brand-light)]/40">-</span>;
        
        const config = {
            VIDEO: { icon: Video, bg: 'bg-[var(--brand-blue)]/20', text: 'text-[var(--brand-blue)]', border: 'border-[var(--brand-blue)]/30', label: t('types.VIDEO') },
            TEXT: { icon: FileText, bg: 'bg-[var(--brand-purple)]/20', text: 'text-[var(--brand-purple)]', border: 'border-[var(--brand-purple)]/30', label: t('types.TEXT') },
            FILE: { icon: Download, bg: 'bg-[var(--brand-green)]/20', text: 'text-[var(--brand-green)]', border: 'border-[var(--brand-green)]/30', label: t('types.FILE') },
        };
        
        const { icon: Icon, bg, text, border, label } = config[type];
        
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text} border ${border}`}>
                <Icon className="w-3 h-3" /> {label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <div className="py-4 sm:py-8 px-0 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                        </div>
                        <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 px-4 sm:px-0">
                        <Link href={`${basePath}/categories`}>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                                <FolderOpen className="h-4 w-4" /> {t('categories')}
                            </button>
                        </Link>
                        <Link href={`${basePath}/courses/create`}>
                            <button className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2 transition-all">
                                <Plus className="h-4 w-4" /> {t('newCourse')}
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {!showSkeleton && (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                        <button 
                            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                    <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
                            </div>
                            {analyticsExpanded ? (
                                <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
                            )}
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
                            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                
                                {/* Total Courses */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                            <BookOpen className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_courses}</div>
                                </div>

                                {/* Video Courses */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                                            <Video className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.video')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.video_courses}</div>
                                </div>

                                {/* Text Courses */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[#A78BFA] flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.text')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-purple)]">{analytics.text_courses}</div>
                                </div>

                                {/* File Resources */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                            <Download className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.files')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.file_resources}</div>
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
                                placeholder={t('search.placeholder')}
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
                            <div className="w-full sm:w-[140px]">
                                <select 
                                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                    style={selectArrowStyle}
                                >
                                    <option value="">{t('search.allTypes')}</option>
                                    <option value="VIDEO">{t('types.VIDEO')}</option>
                                    <option value="TEXT">{t('types.TEXT')}</option>
                                    <option value="FILE">{t('types.FILE')}</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-[180px]">
                                <select 
                                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                    value={filterCategory}
                                    onChange={e => setFilterCategory(e.target.value)}
                                    style={selectArrowStyle}
                                >
                                    <option value="">{t('search.allCategories')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" /> {t('search.clearAll')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                {!showSkeleton && paginatedCourses.length > 0 && (
                    <div className="px-4 sm:px-0">
                        <p className="text-sm text-[var(--brand-light)]/50">
                            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedCourses.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{filteredCourses.length}</span> {t('statsBar.course', { count: filteredCourses.length })}
                        </p>
                    </div>
                )}

                {/* Content */}
                {showSkeleton ? (
                    <>
                        {/* Mobile Cards Skeleton */}
                        <div className="flex flex-col md:hidden">
                            {[...Array(4)].map((_, i) => (
                                <CourseCardSkeleton key={i} />
                            ))}
                        </div>

                        {/* Desktop Table Skeleton */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.title')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.type')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.category')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.scheduled')}</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(5)].map((_, i) => (
                                        <CourseTableRowSkeleton key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : paginatedCourses.length === 0 ? (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-20 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <p className="text-[var(--brand-light)]/50 mb-2">{t('emptyState.noCoursesFound')}</p>
                        <p className="text-[var(--brand-light)]/30 text-sm">
                            {hasFilters ? t('emptyState.tryAdjustingFilters') : t('emptyState.createFirstCourse')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {paginatedCourses.map((course) => {
                                const primaryType = getCoursePrimaryType(course);
                                return (
                                    <SwipeableCard 
                                        key={course.id}
                                        onClick={() => router.push(`${basePath}/courses/${course.slug}`)}
                                        onEdit={() => router.push(`${basePath}/courses/${course.slug}/edit`)}
                                        onDelete={() => setItemToDelete(course)}
                                    >
                                        <div className="border-y border-[var(--dark-600)] p-4">
                                            <div className="flex items-start gap-3">
                                                {/* Image */}
                                                {course.cover_image ? (
                                                    <img 
                                                        src={course.cover_image} 
                                                        alt={course.title}
                                                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="h-6 w-6 text-white" />
                                                    </div>
                                                )}
                                                
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-[var(--brand-light)] truncate">{course.title}</h3>
                                                    <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">
                                                        {course.category_name || t('uncategorized')}
                                                    </p>
                                                    
                                                    {/* Badges */}
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <TypeBadge type={primaryType} />
                                                        <StatusBadge status={course.status} />
                                                        {course.status === 'SCHEDULED' && course.published_at && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                                                                <Clock className="w-3 h-3" /> {formatScheduledDate(course.published_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </SwipeableCard>
                                );
                            })}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.title')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.type')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.category')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.scheduled')}</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCourses.map((course) => {
                                        const primaryType = getCoursePrimaryType(course);
                                        return (
                                            <tr key={course.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        {course.cover_image ? (
                                                            <img 
                                                                src={course.cover_image} 
                                                                alt={course.title}
                                                                className="w-10 h-10 rounded-xl object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                                                <BookOpen className="h-5 w-5 text-white" />
                                                            </div>
                                                        )}
                                                        <div className="font-semibold text-[var(--brand-light)]">{course.title}</div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <TypeBadge type={primaryType} />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-sm text-[var(--brand-light)]/70">{course.category_name || t('uncategorized')}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <StatusBadge status={course.status} />
                                                </td>
                                                <td className="py-4 px-6">
                                                    {course.status === 'SCHEDULED' && course.published_at ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-[var(--brand-peach)]">
                                                            <Clock className="w-3 h-3" /> {formatScheduledDate(course.published_at)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-[var(--brand-light)]/40">-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button 
                                                            className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all flex items-center justify-center"
                                                            onClick={() => window.open(`${basePath}/courses/${course.slug}`, '_blank')}
                                                            title={t('actions.previewCourse')}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <Link href={`${basePath}/courses/${course.slug}/edit`}>
                                                            <button className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center">
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                        </Link>
                                                        <button 
                                                            className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                                                            onClick={() => setItemToDelete(course)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination */}
                {!showSkeleton && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('actions.previous')}
                        </button>
                        <div className="text-sm text-[var(--brand-light)]/50">
                            {t('actions.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('actions.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
                        </div>
                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('actions.next')}
                        </button>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal 
                    isVisible={!!itemToDelete} 
                    onClose={() => setItemToDelete(null)} 
                    onConfirm={handleDelete} 
                    title={t('modals.deleteCourse.title')}
                    message={t('modals.deleteCourse.message', { title: itemToDelete?.title })}
                    confirmButtonText={t('modals.deleteCourse.confirm')}
                    cancelButtonText={t('modals.deleteCourse.cancel')}
                    variant="danger"
                    darkMode
                />

                {/* Toast Notification */}
                </div>
        </div>
    );
}
