'use client';

import AdminForm from '@/app/components/AdminForm';

export default function Page() {
  return (
    <div className="p-8">
        <div className="mb-4">
            <h1 className="text-2xl font-bold">Create Administrator</h1>
            <p className="text-gray-500">Add a new admin to your municipality.</p>
        </div>
        <AdminForm redirectPath="/admin/municipality/admins" scope="MUNICIPALITY" />
    </div>
  );
}

