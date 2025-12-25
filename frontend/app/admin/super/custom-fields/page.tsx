'use client';

import { Suspense } from 'react';
import CustomFieldManager from '../../../components/CustomFieldManager';
import { Settings2 } from 'lucide-react';

function CustomFieldManagerPageContent() {
  return (
    <CustomFieldManager basePath="/admin/super/custom-fields" scope="SUPER" />
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={
        <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div className="text-[var(--brand-light)]/60 animate-pulse">Loading custom fields...</div>
        </div>
      }>
        <CustomFieldManagerPageContent />
      </Suspense>
    </div>
  );
}
