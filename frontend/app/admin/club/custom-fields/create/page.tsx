'use client';

import CustomFieldForm from '../../../../components/CustomFieldForm';

export default function Page() {
  return (
    <div className="p-8">
      <CustomFieldForm redirectPath="/admin/club/custom-fields" scope="CLUB" />
    </div>
  );
}

