'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { learningApi } from '@/lib/learning-api';
import { Course, LearningCategory } from '@/types/learning';
import CourseCard from './CourseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowRight, BookOpen, GraduationCap, TrendingUp, 
    Sparkles, PlayCircle, BarChart3
} from 'lucide-react';

interface Props {
    basePath: string; // e.g. "/admin/club/knowledge/courses"
}

export default function KnowledgeDashboard({ basePath }: Props) {
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D4DA4] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading knowledge center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4D4DA4] via-[#6B6BC4] to-[#FF5485] p-6 md:p-8 text-white">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Knowledge Center
                        </Badge>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
                        Master Your Platform
                        <br />
                        <span className="text-[#FFE066]">One Course at a Time</span>
                    </h1>
                    
                    <p className="text-base md:text-lg text-white/90 max-w-2xl mb-6 leading-relaxed">
                        Unlock the full potential of your platform with our comprehensive learning resources. 
                        From beginner guides to advanced techniques, everything you need is here.
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                        <Button 
                            size="lg" 
                            className="bg-white text-[#4D4DA4] hover:bg-white/90 font-semibold transition-all"
                            asChild
                        >
                            <Link href={`${basePath}`}>
                                <BookOpen className="w-5 h-5 mr-2" />
                                Browse All Courses
                            </Link>
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline" 
                            className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 font-semibold"
                            asChild
                        >
                            <Link href={`${basePath}?filter=recommended`}>
                                <TrendingUp className="w-5 h-5 mr-2" />
                                Recommended
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Continue Learning */}
            {inProgress.length > 0 && (
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#EBEBFE] rounded-lg">
                                <PlayCircle className="w-6 h-6 text-[#4D4DA4]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#121213]">Continue Learning</h2>
                                <p className="text-sm text-gray-500">Pick up where you left off</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <Button variant="ghost" size="sm" className="text-[#4D4DA4] hover:text-[#FF5485]">
                                View all <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {inProgress.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recommended Courses */}
            {recommended.length > 0 && (
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-[#FF5485] to-[#FF6B9D] rounded-lg">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#121213]">Recommended for You</h2>
                                <p className="text-sm text-gray-500">Curated courses just for you</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <Button variant="ghost" size="sm" className="text-[#4D4DA4] hover:text-[#FF5485]">
                                View all <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recommended.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Latest Courses */}
            {latest.length > 0 && (
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-[#4D4DA4] to-[#6B6BC4] rounded-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#121213]">Latest Courses</h2>
                                <p className="text-sm text-gray-500">Fresh content added recently</p>
                            </div>
                        </div>
                        <Link href={`${basePath}`}>
                            <Button variant="ghost" size="sm" className="text-[#4D4DA4] hover:text-[#FF5485]">
                                View all <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {latest.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Browse by Category */}
            {categories.length > 0 && (
                <section>
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#EBEBFE] rounded-lg">
                                <BarChart3 className="w-6 h-6 text-[#4D4DA4]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#121213]">Browse by Category</h2>
                                <p className="text-sm text-gray-500">Explore courses organized by topic</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => {
                            const categoryCourses = getCoursesByCategory(category.id);
                            if (categoryCourses.length === 0) return null;
                            
                            return (
                                <Card key={category.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xl font-bold text-[#121213] group-hover:text-[#4D4DA4] transition-colors">
                                                {category.name}
                                            </CardTitle>
                                            <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20">
                                                {categoryCourses.length} {categoryCourses.length === 1 ? 'course' : 'courses'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {categoryCourses.map(course => (
                                            <Link 
                                                key={course.id} 
                                                href={`${basePath}/${course.slug}`}
                                                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group/item"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm text-[#121213] group-hover/item:text-[#4D4DA4] transition-colors truncate">
                                                            {course.title}
                                                        </h4>
                                                        {course.user_progress && (
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className="bg-[#4D4DA4] h-full rounded-full transition-all"
                                                                        style={{ width: `${course.user_progress.percent_completed || 0}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {course.user_progress.percent_completed || 0}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover/item:text-[#4D4DA4] transition-colors flex-shrink-0 mt-0.5" />
                                                </div>
                                            </Link>
                                        ))}
                                        {categoryCourses.length >= 3 && (
                                            <Link href={`${basePath}?category=${category.id}`}>
                                                <Button variant="ghost" size="sm" className="w-full text-[#4D4DA4] hover:text-[#FF5485] hover:bg-[#EBEBFE]">
                                                    View all courses <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </Link>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {courses.length === 0 && (
                <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="py-16 text-center">
                        <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No courses available yet</h3>
                        <p className="text-gray-500 mb-6">Check back soon for new learning resources!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
