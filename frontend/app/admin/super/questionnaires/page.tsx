'use client';

import QuestionnaireManager from '@/app/components/questionnaires/QuestionnaireManager';

export default function SuperQuestionnairesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <QuestionnaireManager basePath="/admin/super/questionnaires" scope="SUPER" />
    </div>
  );
}

