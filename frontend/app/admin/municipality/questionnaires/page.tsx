'use client';

import QuestionnaireManager from '@/app/components/questionnaires/QuestionnaireManager';

export default function MunicipalityQuestionnairesPage() {
  return <QuestionnaireManager basePath="/admin/municipality/questionnaires" scope="MUNICIPALITY" />;
}

