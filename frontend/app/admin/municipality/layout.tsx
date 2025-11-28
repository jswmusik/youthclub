'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getMediaUrl } from '../../utils';
import api from '../../../lib/api';

const getInitials = (first?: string | null, last?: string | null) => {
  const firstInitial = first?.charAt(0)?.toUpperCase() || '';
  const lastInitial = last?.charAt(0)?.toUpperCase() || '';
  return firstInitial + lastInitial || 'U';
};

export default function MunicipalityAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user, messageCount, refreshMessageCount } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    refreshMessageCount();
    refreshPendingRequestsCount();
  }, []);

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

  const navigation = [
    { name: 'Overview', href: '/admin/municipality' },
    { name: 'My Municipality', href: '/admin/municipality/settings' },
    { name: 'Manage Clubs', href: '/admin/municipality/clubs' },
    { name: 'Manage Admins', href: '/admin/municipality/admins' },
    { name: 'Manage Youth', href: '/admin/municipality/youth' },
    { name: 'Manage Guardians', href: '/admin/municipality/guardians' },
    { name: 'News Feed', href: '/admin/municipality/news-feed' },
    { name: 'Manage Posts', href: '/admin/municipality/posts' },
    { name: 'Groups', href: '/admin/municipality/groups' },
    { name: 'Applications', href: '/admin/municipality/groups/requests', showBadge: true },
    { name: 'Manage Rewards', href: '/admin/municipality/rewards' },
    { name: 'Message Board', href: '/admin/municipality/msgboard', showBadge: true },
    { name: 'Custom Fields', href: '/admin/municipality/custom-fields' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Link href="/admin/municipality/profile" className="inline-block">
            {user?.avatar ? (
              <img
                src={getMediaUrl(user.avatar) || ''}
                alt="Profile avatar"
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-semibold border-2 border-blue-400">
                {getInitials(user?.first_name, user?.last_name)}
              </div>
            )}
          </Link>
          <div className="leading-tight">
            <h2 className="text-base font-semibold text-blue-100">
              {user?.first_name || ''} {user?.last_name || ''}
            </h2>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              {user?.role?.replace(/_/g, ' ') || 'Municipality Admin'}
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
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.name}</span>
                {item.showBadge && item.href.includes('/requests') && pendingRequestsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.5rem] px-2 py-0.5">
                    {pendingRequestsCount}
                  </span>
                )}
                {item.showBadge && !item.href.includes('/requests') && messageCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.5rem] px-2 py-0.5">
                    {messageCount}
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
  );
}

