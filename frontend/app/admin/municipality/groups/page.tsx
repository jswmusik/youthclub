'use client';

import GroupManager from '../../../components/GroupManager';

export default function MunicipalityAdminGroupsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <GroupManager basePath="/admin/municipality/groups" />
    </div>
  );
}