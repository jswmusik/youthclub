'use client';

import CustomFieldForm from '../../../../components/CustomFieldForm';

export default function Page() {
  return (
    <div className="p-8">
      <CustomFieldForm redirectPath="/admin/super/custom-fields" scope="SUPER" />
    </div>
  );
}

