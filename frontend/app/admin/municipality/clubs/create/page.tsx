'use client';

import ClubForm from '../../../../components/ClubForm';

export default function Page() {
  return <ClubForm redirectPath="/admin/municipality/clubs" scope="MUNICIPALITY" />;
}

