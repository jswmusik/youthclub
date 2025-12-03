'use client';

import QuestionnaireManager from '@/app/components/questionnaires/QuestionnaireManager';

export default function ClubQuestionnairesPage() {
  return <QuestionnaireManager basePath="/admin/club/questionnaires" scope="CLUB" />;
}

