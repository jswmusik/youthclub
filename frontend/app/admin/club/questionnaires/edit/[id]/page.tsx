'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';
import { ClipboardList } from 'lucide-react';

function EditQuestionnairePageContent() {
  const params = useParams();
  return <QuestionnaireEditor initialId={params.id as string} basePath="/admin/club/questionnaires" scope="CLUB" />;
}

export default function EditQuestionnairePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading questionnaire...</span>
          </div>
        </div>
      </div>
    }>
      <EditQuestionnairePageContent />
    </Suspense>
  );
}