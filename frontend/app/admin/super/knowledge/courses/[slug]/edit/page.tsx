'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course } from '@/types/learning';
import CourseEditorLayout from "@/app/components/learning/CourseEditorLayout";
import { BookOpen } from 'lucide-react';

function EditCoursePageContent() {
    const t = useTranslations('knowledgeAdmin.courses.edit');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
                    <BookOpen className="w-6 h-6 text-[var(--dark-900)]" />
                </div>
                <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
            </div>
        );
    }
    
    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-[var(--brand-red)]" />
                </div>
                <div className="text-[var(--brand-red)] font-medium">{t('courseNotFound')}</div>
            </div>
        );
    }

    return <CourseEditorLayout course={course} basePath="/admin/super/knowledge" />;
}

function LoadingFallback() {
    const t = useTranslations('knowledgeAdmin.courses.edit');
    return (
        <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
                <BookOpen className="w-6 h-6 text-[var(--dark-900)]" />
            </div>
            <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
        </div>
    );
}

export default function EditCoursePage() {
    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <Suspense fallback={<LoadingFallback />}>
                <EditCoursePageContent />
            </Suspense>
        </div>
    );
}
