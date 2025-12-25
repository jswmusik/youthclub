'use client';

import MunicipalityManager from '@/app/components/MunicipalityManager';

export default function Page() {
  return (
    <div className="py-4 sm:py-8 px-0">
      <MunicipalityManager basePath="/admin/super/municipalities" />
    </div>
  );
}
