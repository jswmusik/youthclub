'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import KnowledgeDashboard from '@/app/components/learning/KnowledgeDashboard';
import { GraduationCap } from 'lucide-react';

function KnowledgePageContent() {
  return <KnowledgeDashboard basePath="/admin/municipality/knowledge/courses" />;
}

function LoadingFallback() {
  const t = useTranslations('knowledgeAdmin');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
        <GraduationCap className="w-6 h-6 text-white" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function MunicipalityKnowledgePage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingFallback />}>
        <KnowledgePageContent />
      </Suspense>
    </div>
  );
}