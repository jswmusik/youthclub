'use client';

import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';

export default function CreateQuestionnairePage() {
  return <QuestionnaireEditor basePath="/admin/super/questionnaires" scope="SUPER" />;
}

