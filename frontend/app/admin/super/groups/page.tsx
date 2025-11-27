'use client';

import GroupManager from '../../../components/GroupManager';

export default function SuperAdminGroupsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <GroupManager basePath="/admin/super/groups" />
    </div>
  );
}