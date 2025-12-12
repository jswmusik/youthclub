'use client';

import MunicipalityManager from '@/app/components/MunicipalityManager';

export default function Page() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <MunicipalityManager basePath="/admin/super/municipalities" />
    </div>
  );
}
