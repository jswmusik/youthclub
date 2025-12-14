'use client';

import { useState, useEffect } from 'react';
import { learningApi } from '@/lib/learning-api';
import { Course, LearningCategory, CourseChapter } from '@/types/learning';
import CourseCard from './CourseCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Video, FileText, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

    return (
        <div className="space-y-6">
            {/* Stunning Filter Section */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-white via-[#EBEBFE]/30 to-white overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] rounded-lg">
                            <Filter className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#121213]">Find Your Perfect Course</h2>
                            <p className="text-sm text-gray-500">Filter by name, category, or content type</p>
                        </div>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="ml-auto text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                            >
                                <X className="h-4 w-4" />
                                Clear filters
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        {/* Search */}
                        <div className="relative w-full md:flex-[2] lg:flex-[2.5]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                            <Input 
                                placeholder="Search courses by name..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-12 py-3 bg-white border-2 border-gray-200 focus:border-[#4D4DA4] focus:ring-2 focus:ring-[#4D4DA4]/20 rounded-xl transition-all w-full"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="w-full md:flex-1">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="h-12 min-h-12 py-3 px-4 bg-white border-2 border-gray-200 focus:border-[#4D4DA4] focus:ring-2 focus:ring-[#4D4DA4]/20 rounded-xl data-[size=default]:h-12 w-full">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Categories</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type Filter */}
                        <div className="w-full md:flex-1">
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="h-12 min-h-12 py-3 px-4 bg-white border-2 border-gray-200 focus:border-[#4D4DA4] focus:ring-2 focus:ring-[#4D4DA4]/20 rounded-xl data-[size=default]:h-12 w-full">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="VIDEO">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4 text-blue-600" />
                                            <span>Video Courses</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="TEXT">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-600" />
                                            <span>Text Courses</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="FILE">
                                        <div className="flex items-center gap-2">
                                            <Download className="w-4 h-4 text-green-600" />
                                            <span>File Resources</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-center justify-start md:justify-end md:flex-shrink-0">
                            <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20 px-4 py-2 text-sm font-semibold">
                                {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D4DA4] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading courses...</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-200">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses found</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your search or filters.</p>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                className="mt-2"
                            >
                                Clear all filters
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            href={`${basePath}/${course.slug}`} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
