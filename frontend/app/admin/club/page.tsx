'use client';

import { useAuth } from '../../../context/AuthContext';

export default function ClubAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <div className="px-4 sm:px-6 md:px-8">
        <h1 className="text-3xl font-bold text-[var(--brand-primary)] mb-3">Club Admin</h1>
        <p className="text-[var(--brand-light)]/60 mb-6">Welcome, {user?.first_name || 'Club Admin'}.</p>
        <div className="bg-[var(--dark-800)] p-6 rounded-xl border border-[var(--dark-600)]">
          <p className="text-[var(--brand-light)]">Manage your daily club operations, events, and members from the navigation menu.</p>
        </div>
      </div>
    </div>
  );
}
