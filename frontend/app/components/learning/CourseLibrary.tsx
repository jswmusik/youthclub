'use client';

import { useState, useEffect } from 'react';
import { learningApi } from '@/lib/learning-api';
import { Course, LearningCategory } from '@/types/learning';
import CourseCard from './CourseCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
    basePath: string; // e.g. "/admin/club/knowledge/courses"
}

export default function CourseLibrary({ basePath }: Props) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [courseRes, catRes] = await Promise.all([
                    learningApi.getAllCourses(),
                    learningApi.getCategories()
                ]);
                setCourses(courseRes.data);
                setCategories(catRes.data);
            } catch (error) {
                console.error("Failed to load library", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || course.category?.toString() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input 
                        placeholder="Search for courses..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
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
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-12 text-center text-slate-500">Loading courses...</div>
            ) : filteredCourses.length === 0 ? (
                <div className="py-12 text-center">
                    <h3 className="text-lg font-medium text-slate-900">No courses found</h3>
                    <p className="text-slate-500">Try adjusting your search or filters.</p>
                </div>
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