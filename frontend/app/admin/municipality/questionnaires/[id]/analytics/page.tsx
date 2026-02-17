'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import QuestionnaireAnalytics from '@/app/components/questionnaires/QuestionnaireAnalytics';
import { BarChart3 } from 'lucide-react';

function AnalyticsPageContent() {
  const params = useParams();
  return <QuestionnaireAnalytics questionnaireId={params.id as string} basePath="/admin/municipality/questionnaires" />;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading analytics...</div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <AnalyticsPageContent />
      </Suspense>
    </div>
  );
}