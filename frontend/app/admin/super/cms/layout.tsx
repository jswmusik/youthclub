'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Layers, FileText, Navigation, Sparkles, Cookie } from 'lucide-react';

const tabs = [
  { name: 'Pages', shortName: 'Pages', href: '/admin/super/cms/pages', icon: FileText },
  { name: 'Navigation', shortName: 'Nav', href: '/admin/super/cms/navigation', icon: Navigation },
  { name: 'Creative Features', shortName: 'Features', href: '/admin/super/cms/features', icon: Sparkles },
  { name: 'Cookie Consent', shortName: 'Cookies', href: '/admin/super/cms/cookies', icon: Cookie },
];

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">CMS Manager</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Manage website content, navigation, and legal documents.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-2">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm",
                    isActive
                      ? "bg-[var(--brand-primary)] text-[var(--dark-900)]"
                      : "text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.shortName}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
