'use client';

import { useParams } from 'next/navigation';
import QuestionnaireAnalytics from '@/app/components/questionnaires/QuestionnaireAnalytics';

export default function AnalyticsPage() {
  const params = useParams();
  return <QuestionnaireAnalytics questionnaireId={params.id as string} basePath="/admin/municipality/questionnaires" />;
}

