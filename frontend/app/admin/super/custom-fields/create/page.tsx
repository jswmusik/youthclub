'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import CustomFieldForm from '../../../../components/CustomFieldForm';
import { Settings2 } from 'lucide-react';

function CreateCustomFieldPageContent() {
  return (
    <CustomFieldForm redirectPath="/admin/super/custom-fields" scope="SUPER" />
  );
}

export default function Page() {
  const t = useTranslations('customFields.form');
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
          <Settings2 className="w-6 h-6 text-[var(--dark-900)]" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loadingForm')}</div>
      </div>
    }>
      <CreateCustomFieldPageContent />
    </Suspense>
  );
}
