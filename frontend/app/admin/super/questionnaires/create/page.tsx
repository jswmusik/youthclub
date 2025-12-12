'use client';

import QuestionnaireEditor from '@/app/components/questionnaires/QuestionnaireEditor';

export default function CreateQuestionnairePage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <QuestionnaireEditor basePath="/admin/super/questionnaires" scope="SUPER" />
    </div>
  );
}

