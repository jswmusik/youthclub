'use client';

import { useAuth } from '../../../context/AuthContext';

export default function MunicipalityDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-600">Municipality Admin</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">Welcome, {user?.first_name}</span>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Logout
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Manage your clubs and municipality settings here.</p>
      </div>
    </div>
  );
}