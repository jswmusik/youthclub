'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Layers, FileText, Navigation, Sparkles, Cookie, CreditCard, Mail } from 'lucide-react';

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('cmsAdmin');
  const pathname = usePathname();

  const tabs = [
    { name: t('tabs.pages'), shortName: t('tabs.pagesShort'), href: '/admin/super/cms/pages', icon: FileText },
    { name: t('tabs.navigation'), shortName: t('tabs.navigationShort'), href: '/admin/super/cms/navigation', icon: Navigation },
    { name: t('tabs.features'), shortName: t('tabs.featuresShort'), href: '/admin/super/cms/features', icon: Sparkles },
    { name: t('tabs.cookies'), shortName: t('tabs.cookiesShort'), href: '/admin/super/cms/cookies', icon: Cookie },
    { name: t('tabs.pricing'), shortName: t('tabs.pricingShort'), href: '/admin/super/cms/pricing', icon: CreditCard },
    { name: t('tabs.contact'), shortName: t('tabs.contactShort'), href: '/admin/super/cms/contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Layers className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
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
