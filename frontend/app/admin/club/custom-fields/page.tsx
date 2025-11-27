'use client';

import CustomFieldManager from '../../../components/CustomFieldManager';

export default function ClubCustomFieldsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Club Specific Fields</h1>
        <p className="text-gray-500">
          Create fields that only members of your club will see.
        </p>
      </div>
      
      <CustomFieldManager scope="CLUB" />
    </div>
  );
}