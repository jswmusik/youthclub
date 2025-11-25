'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

    const navigation = [
        { name: 'Overview', href: '/admin/super' },
        { name: 'Manage Admins', href: '/admin/super/admins' },
        { name: 'Manage Youth', href: '/admin/super/youth' },
        { name: 'Manage Guardians', href: '/admin/super/guardians' },
        { name: 'Manage Interests', href: '/admin/super/interests' },
        { name: 'Manage Countries', href: '/admin/super/countries' },
        { name: 'Manage Municipalities', href: '/admin/super/municipalities' },
        { name: 'Manage Clubs', href: '/admin/super/clubs' },
        { name: 'System Messages', href: '/admin/super/messages' },
      ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-blue-400">Super Admin</h2>
          <p className="text-xs text-slate-400 mt-1">Ungdomsappen 2.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
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