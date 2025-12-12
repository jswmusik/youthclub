'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import QuestionnaireAnalytics from '@/app/components/questionnaires/QuestionnaireAnalytics';

function AnalyticsPageContent() {
  const params = useParams();
  return <QuestionnaireAnalytics questionnaireId={params.id as string} basePath="/admin/super/questionnaires" />;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <div className="p-4 sm:p-6 md:p-8">
        <AnalyticsPageContent />
      </div>
    </Suspense>
  );
}

