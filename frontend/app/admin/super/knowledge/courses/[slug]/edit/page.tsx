'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course } from '@/types/learning';
import CourseEditorLayout from "@/app/components/learning/CourseEditorLayout";

export default function EditCoursePage() {
    const params = useParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params.slug) return;
        
        const loadCourse = async () => {
            try {
                const res = await learningApi.getCourse(params.slug as string);
                setCourse(res.data);
            } catch (error) {
                console.error("Failed to load course", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadCourse();
    }, [params.slug]);

    if (loading) return <div className="p-8 text-center">Loading course...</div>;
    if (!course) return <div className="p-8 text-center text-red-500">Course not found</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <CourseEditorLayout course={course} />
        </div>
    );
}