'use client';

import { Suspense } from 'react';
import CustomFieldForm from '../../../../components/CustomFieldForm';
import { Settings2 } from 'lucide-react';

function CreateCustomFieldPageContent() {
  return (
    <CustomFieldForm redirectPath="/admin/club/custom-fields" scope="CLUB" />
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading form...</div>
      </div>
    }>
      <CreateCustomFieldPageContent />
    </Suspense>
  );
}
