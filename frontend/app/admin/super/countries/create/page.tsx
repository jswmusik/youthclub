'use client';

import CountryForm from '@/app/components/CountryForm';

export default function Page() {
  return (
    <div className="p-8">
      <CountryForm redirectPath="/admin/super/countries" />
    </div>
  );
}

