'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { learningApi } from '@/lib/learning-api';
import { Course, LearningCategory, CourseChapter } from '@/types/learning';
import CourseCard from './CourseCard';
import { Search, Filter, X, Video, FileText, Download, BookOpen } from 'lucide-react';

interface Props {
    basePath: string; // e.g. "/admin/club/knowledge/courses"
}

// Helper function to determine primary content type of a course
const getPrimaryContentType = (course: Course & { chapters?: CourseChapter[] }): 'VIDEO' | 'TEXT' | 'FILE' | null => {
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

export default function CourseLibrary({ basePath }: Props) {
    const t = useTranslations('knowledgeAdmin.courses');
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesWithDetails, setCoursesWithDetails] = useState<any[]>([]);
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedType, setSelectedType] = useState<string>('ALL');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [courseRes, catRes] = await Promise.all([
                    learningApi.getAllCourses(),
                    learningApi.getCategories()
                ]);
                
                // Handle paginated response (DRF returns {results: [...]}) or direct array
                const courseData = courseRes.data as any;
                const coursesData = Array.isArray(courseData) ? courseData : (courseData?.results || []);
                setCourses(coursesData);

                // Fetch course details for type determination
                const detailsPromises = coursesData.map((course: Course) =>
                    learningApi.getCourse(course.slug).catch(() => null)
                );
                const detailsResults = await Promise.all(detailsPromises);
                const validDetails = detailsResults.filter(r => r !== null).map(r => r?.data);
                setCoursesWithDetails(validDetails);
                
                // Handle paginated response for categories
                const catData = catRes.data as any;
                const categoriesData = Array.isArray(catData) ? catData : (catData?.results || []);
                setCategories(categoriesData);
            } catch (error) {
                console.error("Failed to load library", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Helper to get primary type for a course from details
    const getCoursePrimaryType = (course: Course): 'VIDEO' | 'TEXT' | 'FILE' | null => {
        const courseDetail = coursesWithDetails.find((cd: any) => cd?.slug === course.slug);
        if (!courseDetail) return null;
        return getPrimaryContentType(courseDetail);
    };

    // Ensure courses is always an array before filtering
    const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || course.category?.toString() === selectedCategory;
        const matchesType = selectedType === 'ALL' || getCoursePrimaryType(course) === selectedType;
        return matchesSearch && matchesCategory && matchesType;
    }) : [];

    const hasActiveFilters = search !== '' || selectedCategory !== 'ALL' || selectedType !== 'ALL';
    const clearFilters = () => {
        setSearch('');
        setSelectedCategory('ALL');
        setSelectedType('ALL');
    };

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    return (
        <div className="py-4 sm:py-6 md:py-8 px-0 space-y-6">
            {/* Header */}
            <div className="px-4 sm:px-6 md:px-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                        <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description')}</p>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mx-0 sm:mx-4 md:mx-6 lg:mx-8">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                <Filter className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--brand-light)]">{t('search.filterTitle')}</h2>
                                <p className="text-sm text-[var(--brand-light)]/50">{t('search.filterSubtitle')}</p>
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="ml-auto px-4 py-2 rounded-xl text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                {t('search.clearAll')}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        {/* Search */}
                        <div className="relative w-full md:flex-[2] lg:flex-[2.5]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5 z-10" />
                            <input 
                                type="text"
                                placeholder={t('search.placeholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-12 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="w-full md:flex-1">
                            <select 
                                value={selectedCategory} 
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                style={selectArrowStyle}
                            >
                                <option value="ALL">{t('search.allCategories')}</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id.toString()}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div className="w-full md:flex-1">
                            <select 
                                value={selectedType} 
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                style={selectArrowStyle}
                            >
                                <option value="ALL">{t('search.allTypes')}</option>
                                <option value="VIDEO">{t('types.video')}</option>
                                <option value="TEXT">{t('types.text')}</option>
                                <option value="FILE">{t('types.files')}</option>
                            </select>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-center justify-start md:justify-end md:flex-shrink-0">
                            <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                {filteredCourses.length} {filteredCourses.length === 1 ? t('course') : t('courses')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="px-4 sm:px-6 md:px-8 py-20 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="px-4 sm:px-6 md:px-8">
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.title')}</h3>
                        <p className="text-[var(--brand-light)]/50 mb-4">{t('emptyState.description')}</p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all"
                            >
                                {t('emptyState.clearFilters')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="px-4 sm:px-6 md:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {filteredCourses.map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                href={`${basePath}/${course.slug}`} 
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
