'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { learningApi } from '@/lib/learning-api';
import { Course, LearningCategory } from '@/types/learning';
import CourseCard from './CourseCard';
import { 
    ArrowRight, BookOpen, GraduationCap, TrendingUp, 
    Sparkles, PlayCircle, BarChart3
} from 'lucide-react';

interface Props {
    basePath: string; // e.g. "/admin/club/knowledge/courses"
}

export default function KnowledgeDashboard({ basePath }: Props) {
    const t = useTranslations('knowledgeAdmin.dashboard');
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [coursesRes, categoriesRes] = await Promise.all([
                    learningApi.getAllCourses(),
                    learningApi.getCategories()
                ]);
                
                // Handle paginated response (DRF returns {results: [...]}) or direct array
                const coursesData = coursesRes.data as any;
                const coursesArray = Array.isArray(coursesData) ? coursesData : (coursesData?.results || []);
                setCourses(coursesArray);

                const categoriesData = categoriesRes.data as any;
                const categoriesArray = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.results || []);
                setCategories(categoriesArray);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Logic for sections
    const inProgress = courses.filter(c => c.user_progress && c.user_progress.status === 'IN_PROGRESS');
    
    // Recommended courses (prioritize is_recommended flag)
    const recommended = courses.filter(c => 
        (c.is_recommended || c.status === 'PUBLISHED') && 
        (!c.user_progress || c.user_progress.status !== 'COMPLETED')
    ).sort((a, b) => (b.is_recommended ? 1 : 0) - (a.is_recommended ? 1 : 0))
    .slice(0, 4);

    // Latest courses (sort by published_at or just take first published)
    const latest = courses
        .filter(c => c.status === 'PUBLISHED' && (!c.user_progress || c.user_progress.status !== 'COMPLETED'))
        .sort((a, b) => {
            // Sort by published_at if available, otherwise maintain order
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, 4);

    // Get courses by category
    const getCoursesByCategory = (categoryId: number) => {
        return courses.filter(c => c.category === categoryId && c.status === 'PUBLISHED').slice(0, 3);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] px-4">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <GraduationCap className="w-6 h-6 text-[var(--dark-900)]" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4 sm:py-6 md:py-8 px-0 space-y-8 sm:space-y-12 pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-none sm:rounded-2xl bg-[var(--dark-800)] border-y sm:border border-[var(--dark-600)] p-6 md:p-10 mx-0 sm:mx-4 md:mx-6">
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--brand-primary)]/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[var(--brand-purple)]/15 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-3xl"></div>
                </div>
                
                {/* Accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--brand-primary)]"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-[var(--brand-primary)] rounded-xl">
                            <GraduationCap className="w-6 h-6 text-[var(--dark-900)]" />
                        </div>
                        <div className="px-3 py-1.5 bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            {t('hero.badge')}
                        </div>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-[var(--brand-light)]">
                        {t('hero.title')}
                        <br />
                        <span className="text-[var(--brand-primary)]">{t('hero.titleHighlight')}</span>
                    </h1>
                    
                    <p className="text-base md:text-lg text-[var(--brand-light)]/70 max-w-2xl mb-8 leading-relaxed">
                        {t('hero.description')}
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                        <Link 
                            href={`${basePath}`}
                            className="px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 font-semibold transition-all flex items-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20 hover:shadow-xl hover:shadow-[var(--brand-primary)]/30"
                        >
                            <BookOpen className="w-5 h-5" />
                            {t('hero.browseAllCourses')}
                        </Link>
                        <Link 
                            href={`${basePath}?filter=recommended`}
                            className="px-6 py-3 rounded-xl bg-[var(--dark-700)] text-[var(--brand-light)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] font-semibold transition-all flex items-center gap-2"
                        >
                            <TrendingUp className="w-5 h-5" />
                            {t('hero.recommended')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Continue Learning */}
            {inProgress.length > 0 && (
                <section className="px-4 sm:px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center">
                                <PlayCircle className="w-5 h-5 text-[var(--brand-blue)]" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('sections.continueLearning.title')}</h2>
                                <p className="text-sm text-[var(--brand-light)]/50">{t('sections.continueLearning.subtitle')}</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all flex items-center gap-2">
                                {t('sections.viewAll')} <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {inProgress.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recommended Courses */}
            {recommended.length > 0 && (
                <section className="px-4 sm:px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-[var(--dark-900)]" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('sections.recommended.title')}</h2>
                                <p className="text-sm text-[var(--brand-light)]/50">{t('sections.recommended.subtitle')}</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all flex items-center gap-2">
                                {t('sections.viewAll')} <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {recommended.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Latest Courses */}
            {latest.length > 0 && (
                <section className="px-4 sm:px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[var(--dark-900)]" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('sections.latest.title')}</h2>
                                <p className="text-sm text-[var(--brand-light)]/50">{t('sections.latest.subtitle')}</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all flex items-center gap-2">
                                {t('sections.viewAll')} <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {latest.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Browse by Category */}
            {categories.length > 0 && (
                <section className="px-4 sm:px-6 md:px-8">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-[var(--brand-purple)]" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('sections.byCategory.title')}</h2>
                                <p className="text-sm text-[var(--brand-light)]/50">{t('sections.byCategory.subtitle')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {categories.map(category => {
                            const categoryCourses = getCoursesByCategory(category.id);
                            if (categoryCourses.length === 0) return null;
                            
                            return (
                                <div 
                                    key={category.id} 
                                    className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden hover:border-[var(--brand-primary)]/30 transition-all group"
                                >
                                    <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                                                {category.name}
                                            </h3>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                                {categoryCourses.length} {categoryCourses.length === 1 ? t('sections.byCategory.course') : t('sections.byCategory.courses')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {categoryCourses.map(course => (
                                            <Link 
                                                key={course.id} 
                                                href={`${basePath}/${course.slug}`}
                                                className="block p-3 rounded-xl hover:bg-[var(--dark-700)] transition-colors group/item"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm text-[var(--brand-light)] group-hover/item:text-[var(--brand-primary)] transition-colors truncate">
                                                            {course.title}
                                                        </h4>
                                                        {course.user_progress && (
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <div className="w-16 bg-[var(--dark-600)] rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className="bg-[var(--brand-primary)] h-full rounded-full transition-all"
                                                                        style={{ width: `${course.user_progress.percent_completed || 0}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-[var(--brand-light)]/50">
                                                                    {course.user_progress.percent_completed || 0}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover/item:text-[var(--brand-primary)] transition-colors flex-shrink-0 mt-0.5" />
                                                </div>
                                            </Link>
                                        ))}
                                        {categoryCourses.length >= 3 && (
                                            <Link href={`${basePath}?category=${category.id}`}>
                                                <button className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/30 transition-all flex items-center justify-center gap-2">
                                                    {t('sections.byCategory.viewAllCourses')} <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {courses.length === 0 && (
                <div className="px-4 sm:px-6 md:px-8">
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                            <GraduationCap className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <h3 className="text-xl font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.title')}</h3>
                        <p className="text-[var(--brand-light)]/50 mb-6">{t('emptyState.description')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
