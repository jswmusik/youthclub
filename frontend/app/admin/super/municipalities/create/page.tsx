'use client';

import MunicipalityForm from '@/app/components/MunicipalityForm';

export default function Page() {
  return (
    <div className="p-8">
      <MunicipalityForm redirectPath="/admin/super/municipalities" />
    </div>
  );
}

