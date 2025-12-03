'use client';

import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';

export default function CreateQuestionnairePage() {
  return <QuestionnaireEditor basePath="/admin/club/questionnaires" scope="CLUB" />;
}

