'use client';

import CustomFieldManager from '../../../components/CustomFieldManager';

export default function MunicipalityCustomFieldsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Municipality Fields</h1>
        <p className="text-gray-500">
          Create fields applicable to clubs within your municipality. You can limit specific fields to specific clubs.
        </p>
      </div>
      
      <CustomFieldManager scope="MUNICIPALITY" />
    </div>
  );
}