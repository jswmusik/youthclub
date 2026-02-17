'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import CoursePlayerLayout from '@/app/components/learning/CoursePlayerLayout';
import { BookOpen } from 'lucide-react';

function CoursePlayerContent() {
    const params = useParams();
    return (
        <CoursePlayerLayout 
            courseSlug={params.slug as string} 
            backUrl="/admin/super/knowledge/courses" 
        />
    );
}

export default function SuperAdminCoursePlayer() {
    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <Suspense fallback={
                <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-[var(--brand-light)]/60 animate-pulse">Loading course...</div>
                </div>
            }>
                <CoursePlayerContent />
            </Suspense>
        </div>
    );
}