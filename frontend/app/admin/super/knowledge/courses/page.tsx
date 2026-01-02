'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import CourseManager from "@/app/components/learning/CourseManager";
import { BookOpen } from 'lucide-react';

function KnowledgeCoursesPageContent() {
  return <CourseManager />;
}

function LoadingFallback() {
  const t = useTranslations('knowledgeAdmin.courses');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <BookOpen className="w-6 h-6 text-[var(--dark-900)]" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function KnowledgeCoursesPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingFallback />}>
        <KnowledgeCoursesPageContent />
      </Suspense>
    </div>
  );
}
