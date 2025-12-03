'use client';

import { useParams } from 'next/navigation';
import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';

export default function EditQuestionnairePage() {
  const params = useParams();
  return <QuestionnaireEditor initialId={params.id as string} basePath="/admin/super/questionnaires" scope="SUPER" />;
}

