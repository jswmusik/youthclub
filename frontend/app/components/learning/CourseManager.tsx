'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import StatusBadge from './StatusBadge';
import Link from 'next/link';

export default function CourseManager() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await learningApi.getAllCourses();
            // Handle paginated response (DRF returns {results: [...]}) or direct array
            const data = res.data as any;
            const coursesData = Array.isArray(data) ? data : (data?.results || []);
            setCourses(coursesData);
        } catch (error: any) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
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

    // Handle paginated response (DRF returns {results: [...]}) or direct array
    // Ensure courses is always an array before filtering
    const filteredCourses = Array.isArray(courses) ? courses.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Course Library</h2>
                <Button onClick={() => router.push('/admin/super/knowledge/courses/create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Course
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <Input 
                            placeholder="Search courses..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading courses...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCourses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No courses found. Create one to get started!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCourses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    {course.cover_image && (
                                                        <img 
                                                            src={course.cover_image} 
                                                            alt="" 
                                                            className="w-10 h-10 rounded object-cover bg-gray-100"
                                                        />
                                                    )}
                                                    <span>{course.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{course.category_name || '-'}</TableCell>
                                            <TableCell>
                                                {course.visible_to_roles.length > 0 
                                                    ? <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">{course.visible_to_roles.length} Roles</span>
                                                    : <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">All Admins</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={course.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link href={`/admin/super/knowledge/courses/${course.slug}/edit`}>
                                                            <Edit className="w-4 h-4 text-blue-600" />
                                                        </Link>
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDelete(course.slug)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}