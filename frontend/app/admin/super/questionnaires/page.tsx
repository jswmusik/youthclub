'use client';

import QuestionnaireManager from '@/app/components/questionnaires/QuestionnaireManager';

export default function SuperQuestionnairesPage() {
  return <QuestionnaireManager basePath="/admin/super/questionnaires" scope="SUPER" />;
}

