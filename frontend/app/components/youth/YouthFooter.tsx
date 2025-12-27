'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { 
  Facebook, 
  Instagram, 
  Heart,
  ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import { cmsApi } from '@/lib/cms-api';
import { MenuItem } from '@/types/cms';

// TikTok icon (not available in lucide-react)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export default function YouthFooter() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();
  const [communityFooterItems, setCommunityFooterItems] = useState<MenuItem[]>([]);

  // Fetch CMS community footer items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const menuData = await cmsApi.getPublicMenu();
        setCommunityFooterItems(menuData.community_footer || []);
      } catch (error) {
        console.error('Failed to fetch menu items:', error);
      }
    };
    fetchMenu();
  }, []);

  // Helper to get the link href for a menu item
  const getMenuItemHref = (item: MenuItem) => {
    if (item.page && item.page_slug) {
      return `/p/${item.page_slug}`;
    }
    return item.external_url || '#';
  };

  // Helper to check if link is external
  const isExternalLink = (item: MenuItem) => {
    return !item.page && item.external_url;
  };

  const socialLinks = [
    { 
      label: 'Facebook', 
      href: 'https://facebook.com', 
      icon: Facebook,
      color: 'hover:text-[#1877F2]'
    },
    { 
      label: 'Instagram', 
      href: 'https://instagram.com', 
      icon: Instagram,
      color: 'hover:text-[#E4405F]'
    },
    { 
      label: 'TikTok', 
      href: 'https://tiktok.com', 
      icon: TikTokIcon,
      color: 'hover:text-white'
    },
  ];

  return (
    <footer className="bg-[var(--dark-800)] border-t border-[var(--dark-600)] mt-auto relative z-40">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/dashboard/youth" className="inline-block mb-4">
              <Image
                src="/ua-logo-2026.svg"
                alt="Youth App"
                width={160}
                height={50}
                className="h-14 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-[var(--brand-light)]/60 text-sm leading-relaxed mb-6 max-w-sm">
              {t('description')}
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 transition-all hover:bg-[var(--dark-600)] hover:border-[var(--brand-primary)]/30 ${social.color}`}
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* CMS Community Footer Items - Column 1 */}
          {communityFooterItems.length > 0 && (
            <div>
              <h3 className="text-[var(--brand-light)] font-bold text-sm uppercase tracking-wider mb-4">
                {t('links')}
              </h3>
              <ul className="space-y-3">
                {communityFooterItems.slice(0, Math.ceil(communityFooterItems.length / 2)).map((item) => (
                  <li key={item.id}>
                    {isExternalLink(item) ? (
                      <a
                        href={getMenuItemHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] text-sm transition-colors flex items-center gap-1"
                      >
                        {item.label}
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link 
                        href={getMenuItemHref(item)}
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] text-sm transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CMS Community Footer Items - Column 2 */}
          {communityFooterItems.length > 1 && (
            <div>
              <h3 className="text-[var(--brand-light)] font-bold text-sm uppercase tracking-wider mb-4">
                {t('more')}
              </h3>
              <ul className="space-y-3">
                {communityFooterItems.slice(Math.ceil(communityFooterItems.length / 2)).map((item) => (
                  <li key={item.id}>
                    {isExternalLink(item) ? (
                      <a
                        href={getMenuItemHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] text-sm transition-colors flex items-center gap-1"
                      >
                        {item.label}
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link 
                        href={getMenuItemHref(item)}
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] text-sm transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Newsletter Section (Optional - for future use) */}
        <div className="mt-12 pt-8 border-t border-[var(--dark-600)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-[var(--brand-light)] font-bold mb-1">{t('stayUpdated')}</h3>
              <p className="text-[var(--brand-light)]/60 text-sm">
                {t('getLatestNews')}
              </p>
            </div>
            <div className="flex gap-2 max-w-md w-full md:w-auto">
              <input
                type="email"
                placeholder={t('enterEmail')}
                className="flex-1 md:w-64 px-4 py-2.5 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-sm text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
              />
              <button className="px-5 py-2.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold text-sm rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all whitespace-nowrap">
                {t('subscribe')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--dark-600)] bg-[var(--dark-900)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-[var(--brand-light)]/50 text-center sm:text-left">
              © {currentYear} Youth App. {t('allRightsReserved')}
            </p>
            <p className="text-[var(--brand-light)]/50 flex items-center gap-1">
              {t('madeWithLove')} <Heart className="w-4 h-4 text-[var(--brand-primary)] fill-[var(--brand-primary)]" /> {t('forCommunity')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
