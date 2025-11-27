'use client';

import GroupForm from '../../../../components/GroupForm';

export default function CreateGroupPage() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Group</h1>
        <p className="text-gray-500">Define the rules for who belongs in this group.</p>
      </div>
      
      <GroupForm redirectPath="/admin/super/groups" />
    </div>
  );
}