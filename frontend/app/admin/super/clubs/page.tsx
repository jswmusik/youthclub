'use client';

import ClubManager from '../../../components/ClubManager';

export default function Page() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <ClubManager basePath="/admin/super/clubs" scope="SUPER" />
    </div>
  );
}
