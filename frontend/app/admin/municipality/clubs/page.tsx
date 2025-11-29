'use client';

import ClubManager from '../../../components/ClubManager';

export default function Page() {
  return (
    <div className="p-8">
      <ClubManager basePath="/admin/municipality/clubs" scope="MUNICIPALITY" />
    </div>
  );
}
