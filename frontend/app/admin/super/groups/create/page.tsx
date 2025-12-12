'use client';

import GroupForm from '../../../../components/GroupForm';

export default function Page() {
  return (
    <div className="p-8">
      <GroupForm redirectPath="/admin/super/groups" />
    </div>
  );
}