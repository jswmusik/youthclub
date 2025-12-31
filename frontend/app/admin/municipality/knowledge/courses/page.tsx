'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import CourseLibrary from '@/app/components/learning/CourseLibrary';
import { BookOpen } from 'lucide-react';

function KnowledgeCoursesPageContent() {
  return <CourseLibrary basePath="/admin/municipality/knowledge/courses" />;
}

function LoadingFallback() {
  const t = useTranslations('knowledgeAdmin.courses');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
        <BookOpen className="w-6 h-6 text-white" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function MunicipalityCourseLibraryPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingFallback />}>
        <KnowledgeCoursesPageContent />
      </Suspense>
    </div>
  );
}
