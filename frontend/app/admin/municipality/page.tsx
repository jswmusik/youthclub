'use client';

import { useAuth } from '../../../context/AuthContext';

export default function MunicipalityDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-blue-600 mb-3">Municipality Admin</h1>
      <p className="text-gray-600 mb-6">Welcome, {user?.first_name || 'Municipality Admin'}.</p>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Manage your municipality data and settings from the navigation menu.</p>
      </div>
    </div>
  );
}