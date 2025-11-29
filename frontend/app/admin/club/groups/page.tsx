'use client';

import GroupManager from '../../../components/GroupManager';

export default function ClubAdminGroupsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <GroupManager basePath="/admin/club/groups" />
    </div>
  );
}