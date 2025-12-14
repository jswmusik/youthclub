'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course, CourseChapter, LearningCategory } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, FolderOpen, Eye, BarChart3, ChevronUp, BookOpen, Video, FileText, Download, X, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import Link from 'next/link';

export default function CourseManager() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesWithDetails, setCoursesWithDetails] = useState<any[]>([]);
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    
    // Get filter values from URL
    const searchTerm = searchParams.get('search') || '';
    const filterType = searchParams.get('type') || '';
    const filterCategory = searchParams.get('category') || '';

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
        try {
            setLoading(true);
            const currentPage = Number(searchParams.get('page')) || 1;
            const res = await learningApi.getAllCourses();
            // Handle paginated response (DRF returns {results: [...]}) or direct array
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
            setLoading(false);
        }
    };

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Reset to page 1 when filters change
        if (key !== 'page') {
            params.delete('page');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    // Helper function to determine primary content type of a course
    const getPrimaryContentType = (course: any): 'VIDEO' | 'TEXT' | 'FILE' | null => {
        if (!course?.chapters) return null;
        
        // Collect all content items from all chapters
        const allItems: any[] = [];
        course.chapters.forEach((chapter: CourseChapter) => {
            if (chapter.items && Array.isArray(chapter.items)) {
                allItems.push(...chapter.items);
            }
        });
        
        if (allItems.length === 0) return null;
        
        // Count items by type
        const typeCounts = {
            VIDEO: allItems.filter((item: any) => item.type === 'VIDEO').length,
            TEXT: allItems.filter((item: any) => item.type === 'TEXT').length,
            FILE: allItems.filter((item: any) => item.type === 'FILE').length,
        };
        
        // Determine primary type (whichever has the most items)
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

    const handleDelete = async (slug: string) => {
        if (!confirm("Are you sure you want to delete this course? This cannot be undone.")) return;
        try {
            await learningApi.deleteCourse(slug);
            setCourses(prev => prev.filter(c => c.slug !== slug));
        } catch (error) {
            alert("Failed to delete course");
        }
    };

    // Helper to get primary type for a course from details
    const getCoursePrimaryType = (course: Course): 'VIDEO' | 'TEXT' | 'FILE' | null => {
        const courseDetail = coursesWithDetails.find((cd: any) => cd?.slug === course.slug);
        if (!courseDetail) return null;
        return getPrimaryContentType(courseDetail);
    };

    // Format scheduled date/time compactly (e.g., "15/12 14:30")
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

    // Filter courses based on search, type, and category
    const filteredCourses = Array.isArray(courses) ? courses.filter(c => {
        const matchesSearch = !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !filterCategory || c.category?.toString() === filterCategory;
        const matchesType = !filterType || getCoursePrimaryType(c) === filterType;
        return matchesSearch && matchesCategory && matchesType;
    }) : [];

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(filteredCourses.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Knowledge Center Management</h1>
                    <p className="text-gray-500 mt-1">Manage courses, tutorials, and resources for system administrators.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/admin/super/knowledge/categories')}>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Manage Categories
                    </Button>
                    <Button onClick={() => router.push('/admin/super/knowledge/courses/create')} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Course
                    </Button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {!loading && (
                <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
                    <Card className="border-0 shadow-sm bg-gray-900">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-gray-400" />
                                <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                                    Analytics Dashboard
                                </h3>
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
                            <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {/* Total Courses */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                                                    }}>
                                                    <BookOpen className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Total Courses</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_courses}</div>
                                        </div>
                                    </Card>

                                    {/* Video Courses */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(56, 189, 248, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
                                                    }}>
                                                    <Video className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Video Courses</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.video_courses}</div>
                                        </div>
                                    </Card>

                                    {/* Text Courses */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#FF5485]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(255, 84, 133, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5485] to-[#FF8FA3] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(255, 84, 133, 0.5), 0 0 20px rgba(255, 143, 163, 0.3)',
                                                    }}>
                                                    <FileText className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Text Courses</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.text_courses}</div>
                                        </div>
                                    </Card>

                                    {/* File Resources */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(52, 211, 153, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(52, 211, 153, 0.3)',
                                                    }}>
                                                    <Download className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">File Resources</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.file_resources}</div>
                                        </div>
                                    </Card>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            )}

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search */}
                        <div className="relative md:col-span-4 lg:col-span-3">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Search courses..." 
                                className="pl-9 bg-gray-50 border-0"
                                value={searchTerm}
                                onChange={e => updateUrl('search', e.target.value)}
                            />
                        </div>
                        
                        {/* Type Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={filterType} 
                                onChange={e => updateUrl('type', e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="VIDEO">Video</option>
                                <option value="TEXT">Text</option>
                                <option value="FILE">File</option>
                            </select>
                        </div>
                        
                        {/* Category Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={filterCategory} 
                                onChange={e => updateUrl('category', e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
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
                </div>
            </Card>

            {/* Content */}
            {loading ? (
                <div className="py-20 flex justify-center text-gray-400">
                    <div className="animate-pulse">Loading...</div>
                </div>
            ) : paginatedCourses.length === 0 ? (
                <Card className="border border-gray-100 shadow-sm">
                    <div className="py-20 text-center">
                        <p className="text-gray-500">No courses found.</p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* MOBILE: Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {paginatedCourses.map((course) => {
                            const primaryType = getCoursePrimaryType(course);
                            return (
                                <Card key={course.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {course.cover_image && (
                                                <img 
                                                    src={course.cover_image} 
                                                    alt="" 
                                                    className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base font-semibold text-[#121213] truncate">
                                                    {course.title}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {course.category_name && (
                                                        <span className="text-xs text-gray-500">{course.category_name}</span>
                                                    )}
                                                    {primaryType === 'VIDEO' && (
                                                        <Badge variant="outline" className="text-xs bg-blue-50 text-[#0EA5E9] border-[#0EA5E9]/30 inline-flex items-center gap-1">
                                                            <Video className="w-3 h-3" /> Video
                                                        </Badge>
                                                    )}
                                                    {primaryType === 'TEXT' && (
                                                        <Badge variant="outline" className="text-xs bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30 inline-flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Text
                                                        </Badge>
                                                    )}
                                                    {primaryType === 'FILE' && (
                                                        <Badge variant="outline" className="text-xs bg-green-50 text-[#10B981] border-[#10B981]/30 inline-flex items-center gap-1">
                                                            <Download className="w-3 h-3" /> File
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge status={course.status} />
                                            {course.visible_to_roles.length > 0 ? (
                                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                                                    {course.visible_to_roles.length} Roles
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs bg-green-50 text-[#10B981] border-[#10B981]/30">
                                                    All Admins
                                                </Badge>
                                            )}
                                            {course.status === 'SCHEDULED' && course.published_at && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="font-medium">{formatScheduledDate(course.published_at)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-8 px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                onClick={() => window.open(`/admin/super/knowledge/courses/${course.slug}`, '_blank')}
                                            >
                                                <Eye className="w-4 h-4 mr-1.5" />
                                                Preview
                                            </Button>
                                            <Link href={`/admin/super/knowledge/courses/${course.slug}/edit`}>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className="h-8 px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                >
                                                    <Edit className="w-4 h-4 mr-1.5" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(course.slug)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1.5" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* DESKTOP: Table */}
                    <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Title</TableHead>
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Type</TableHead>
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Category</TableHead>
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Roles</TableHead>
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Status</TableHead>
                                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Scheduled</TableHead>
                                    <TableHead className="h-12 px-6 text-right text-gray-600 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedCourses.map((course) => {
                                    const primaryType = getCoursePrimaryType(course);
                                    return (
                                        <TableRow key={course.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {course.cover_image && (
                                                        <img 
                                                            src={course.cover_image} 
                                                            alt="" 
                                                            className="w-9 h-9 rounded-full object-cover bg-gray-100"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-[#121213]">{course.title}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                {primaryType === 'VIDEO' && (
                                                    <Badge variant="outline" className="text-xs bg-blue-50 text-[#0EA5E9] border-[#0EA5E9]/30 inline-flex items-center gap-1">
                                                        <Video className="w-3 h-3" /> Video
                                                    </Badge>
                                                )}
                                                {primaryType === 'TEXT' && (
                                                    <Badge variant="outline" className="text-xs bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30 inline-flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Text
                                                    </Badge>
                                                )}
                                                {primaryType === 'FILE' && (
                                                    <Badge variant="outline" className="text-xs bg-green-50 text-[#10B981] border-[#10B981]/30 inline-flex items-center gap-1">
                                                        <Download className="w-3 h-3" /> File
                                                    </Badge>
                                                )}
                                                {!primaryType && (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                <span className="text-sm text-[#121213]">{course.category_name || '-'}</span>
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                {course.visible_to_roles.length > 0 
                                                    ? <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">{course.visible_to_roles.length} Roles</Badge>
                                                    : <Badge variant="outline" className="text-xs bg-green-50 text-[#10B981] border-[#10B981]/30">All Admins</Badge>
                                                }
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                <StatusBadge status={course.status} />
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                {course.status === 'SCHEDULED' && course.published_at ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        <span className="font-medium">{formatScheduledDate(course.published_at)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                        onClick={() => window.open(`/admin/super/knowledge/courses/${course.slug}`, '_blank')}
                                                        title="Preview course"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Link href={`/admin/super/knowledge/courses/${course.slug}/edit`}>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(course.slug)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
        </div>
    );
}