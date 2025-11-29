'use client';

import ClubForm from '../../../../components/ClubForm';

export default function Page() {
  return (
    <div className="p-8">
      <ClubForm redirectPath="/admin/super/clubs" scope="SUPER" />
    </div>
  );
}

