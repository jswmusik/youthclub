'use client';

import { Suspense } from 'react';
import CustomFieldManager from '../../../components/CustomFieldManager';

function CustomFieldManagerPageContent() {
  return (
    <div className="p-8">
      <CustomFieldManager basePath="/admin/super/custom-fields" scope="SUPER" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CustomFieldManagerPageContent />
    </Suspense>
  );
}