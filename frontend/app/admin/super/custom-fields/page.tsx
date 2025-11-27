'use client';

import CustomFieldManager from '../../../components/CustomFieldManager';

export default function SuperCustomFieldsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Global Custom Fields</h1>
        <p className="text-gray-500">
          Manage fields that appear on <strong>ALL</strong> user profiles across the platform.
        </p>
      </div>
      
      <CustomFieldManager scope="SUPER" />
    </div>
  );
}