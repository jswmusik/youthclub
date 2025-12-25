'use client';

import GroupManager from '../../../components/GroupManager';

export default function MunicipalityAdminGroupsPage() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <GroupManager basePath="/admin/municipality/groups" />
    </div>
  );
}