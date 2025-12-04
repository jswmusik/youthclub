'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getMediaUrl } from '../../utils';
import api from '../../../lib/api';
// 1. Import the RoleGuard
import RoleGuard from '../../components/RoleGuard';

const getInitials = (first?: string | null, last?: string | null) => {
  const firstInitial = first?.charAt(0)?.toUpperCase() || '';
  const lastInitial = last?.charAt(0)?.toUpperCase() || '';
  return firstInitial + lastInitial || 'S';
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user, messageCount, refreshMessageCount } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useEffect(() => {
    refreshMessageCount();
    refreshPendingRequestsCount();
    refreshPendingBookingsCount();
  }, [refreshMessageCount]);

  const refreshPendingRequestsCount = async () => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }
    
    try {
      const res = await api.get('/group-requests/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPendingRequestsCount(data.length);
    } catch (err: any) {
      // Silently handle 401 (unauthorized) - user might not be logged in or token expired
      if (err?.response?.status === 401) {
        setPendingRequestsCount(0);
        return;
      }
      console.error('Failed to load pending requests count', err);
      setPendingRequestsCount(0);
    }
  };

  const refreshPendingBookingsCount = async () => {
    if (!user) {
      setPendingBookingsCount(0);
      return;
    }
    
    try {
      const res = await api.get('/bookings/bookings/?status=PENDING');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPendingBookingsCount(data.length);
    } catch (err: any) {
      // Silently handle 401 (unauthorized) - user might not be logged in or token expired
      if (err?.response?.status === 401) {
        setPendingBookingsCount(0);
        return;
      }
      console.error('Failed to load pending bookings count', err);
      setPendingBookingsCount(0);
    }
  };

    const navigation = [
        { name: 'Overview', href: '/admin/super' },
        { name: 'Manage Admins', href: '/admin/super/admins' },
        { name: 'Manage Youth', href: '/admin/super/youth' },
        { name: 'Manage Guardians', href: '/admin/super/guardians' },
        // --- NEW NEWS SECTION ---
        { name: 'News Management', href: '/admin/super/news' }, 
        { name: 'News Tags', href: '/admin/super/news/tags' },
        { name: 'News Feed', href: '/admin/super/news-feed' },
        { name: 'Manage Posts', href: '/admin/super/posts' },
        { name: 'Questionnaires', href: '/admin/super/questionnaires' },
        // ------------------------
        { name: 'Manage Interests', href: '/admin/super/interests' },
        { name: 'Manage Countries', href: '/admin/super/countries' },
        { name: 'Manage Municipalities', href: '/admin/super/municipalities' },
        { name: 'Manage Clubs', href: '/admin/super/clubs' },
        { name: 'System Messages', href: '/admin/super/messages' },
        { name: 'Manage Groups', href: '/admin/super/groups' },
        { name: 'Applications', href: '/admin/super/groups/requests', showBadge: true },
        { name: 'Manage Rewards', href: '/admin/super/rewards' },
        { name: 'Inventory', href: '/admin/super/inventory' },
        { name: 'Bookings', href: '/admin/super/bookings' },
        { name: 'Booking Calendar', href: '/admin/super/bookings/calendar' },
        { name: 'Booking Resources', href: '/admin/super/bookings/resources' },
        { name: 'Custom Fields', href: '/admin/super/custom-fields' },
      ];

  // 2. Wrap the entire return with RoleGuard
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      <div className="min-h-screen bg-gray-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Link href="/admin/super/profile" className="inline-block">
            {user?.avatar ? (
              <img
                src={getMediaUrl(user.avatar) || ''}
                alt="Profile avatar"
                className="w-12 h-12 rounded-full object-cover border-2 border-red-400"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-semibold border-2 border-red-400">
                {getInitials(user?.first_name, user?.last_name)}
              </div>
            )}
          </Link>
          <div className="leading-tight">
            <h2 className="text-base font-semibold text-red-100">
              {user?.first_name || ''} {user?.last_name || ''}
            </h2>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              {user?.role?.replace(/_/g, ' ') || 'Super Admin'}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.name}</span>
                {(item as any).showBadge && item.href.includes('/requests') && pendingRequestsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.5rem] px-2 py-0.5">
                    {pendingRequestsCount}
                  </span>
                )}
                {(item as any).showBadge && !item.href.includes('/requests') && messageCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.5rem] px-2 py-0.5">
                    {messageCount}
                  </span>
                )}
                {item.href.includes('/bookings') && !item.href.includes('/calendar') && !item.href.includes('/resources') && pendingBookingsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-yellow-500 text-white text-xs font-bold min-w-[1.5rem] px-2 py-0.5">
                    {pendingBookingsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-sm font-bold transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
    </RoleGuard>
  );
}