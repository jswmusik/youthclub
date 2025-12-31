'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import QuestionnaireManager from '@/app/components/questionnaires/QuestionnaireManager';
import { ClipboardList } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('questionnairesAdmin');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <ClipboardList className="w-6 h-6 text-white" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

function SuperQuestionnairesPageContent() {
  return (
    <QuestionnaireManager basePath="/admin/super/questionnaires" scope="SUPER" />
  );
}

export default function SuperQuestionnairesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuperQuestionnairesPageContent />
    </Suspense>
  );
}
