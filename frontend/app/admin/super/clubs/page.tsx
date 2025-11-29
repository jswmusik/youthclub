'use client';

import ClubManager from '../../../components/ClubManager';

export default function Page() {
  return (
    <div className="p-8">
      <ClubManager basePath="/admin/super/clubs" scope="SUPER" />
    </div>
  );
}
