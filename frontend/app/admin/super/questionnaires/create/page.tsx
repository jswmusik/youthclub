'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';
import { ClipboardList } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('questionnairesAdmin.editor');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
        <div className="flex items-center justify-center gap-3 py-20">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
            <ClipboardList className="h-5 w-5 text-[var(--dark-900)]" />
          </div>
          <span className="text-[var(--brand-light)]/50">{t('loadingForm')}</span>
        </div>
      </div>
    </div>
  );
}

function CreateQuestionnairePageContent() {
  return (
    <QuestionnaireEditor basePath="/admin/super/questionnaires" scope="SUPER" />
  );
}

export default function CreateQuestionnairePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateQuestionnairePageContent />
    </Suspense>
  );
}