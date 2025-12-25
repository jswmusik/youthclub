'use client';

import ClubManager from '../../../components/ClubManager';

export default function Page() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <ClubManager basePath="/admin/municipality/clubs" scope="MUNICIPALITY" />
    </div>
  );
}
