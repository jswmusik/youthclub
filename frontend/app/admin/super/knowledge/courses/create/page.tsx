'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import CourseSettingsForm from "@/app/components/learning/CourseSettingsForm";
import { BookOpen } from 'lucide-react';

function CreateCoursePageContent() {
    return (
        <CourseSettingsForm basePath="/admin/super/knowledge" />
    );
}

function LoadingFallback() {
    const t = useTranslations('knowledgeAdmin.courses.form');
    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
            <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
                <div className="flex items-center justify-center gap-3 py-20">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[var(--brand-light)]/50">{t('loading')}</span>
                </div>
            </div>
        </div>
    );
}

export default function CreateCoursePage() {
    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <Suspense fallback={<LoadingFallback />}>
                <CreateCoursePageContent />
            </Suspense>
        </div>
    );
}
