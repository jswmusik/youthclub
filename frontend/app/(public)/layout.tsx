// frontend/app/(public)/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ExternalLink, ChevronRight, User, LogOut, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cmsApi } from '@/lib/cms-api';
import { MenuItem } from '@/types/cms';
import CookieConsentBanner from '@/app/components/cms/CookieConsentBanner';
import NewsletterModal from '@/app/components/NewsletterModal';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { motion, AnimatePresence } from 'framer-motion';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerItems, setHeaderItems] = useState<MenuItem[]>([]);
  const [footerItems, setFooterItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  
  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes('@')) {
      setShowNewsletterModal(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Fetch CMS menu items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const menuData = await cmsApi.getPublicMenu();
        setHeaderItems(menuData.header || []);
        setFooterItems(menuData.footer || []);
      } catch (error) {
        console.error('Failed to fetch menu items:', error);
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'SUPER_ADMIN': return '/admin/super';
      case 'MUNICIPALITY_ADMIN': return '/admin/municipality';
      case 'CLUB_ADMIN': return '/admin/club';
      case 'GUARDIAN': return '/dashboard/guardian';
      default: return '/dashboard/youth';
    }
  };

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

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Background Glow Effect */}
      <BackgroundGlow variant="default" />
      
      {/* Floating Header - positioned below system alert if present */}
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[var(--dark-800)]/95 backdrop-blur-lg shadow-xl border-b border-[var(--dark-600)]'
            : 'bg-transparent'
        }`}
        style={{ top: 'var(--system-alert-height, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image 
                src="/ua-icon-2026.svg" 
                alt="Ungdomsappen" 
                width={40} 
                height={40}
                className="w-10 h-10 group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-bold text-[var(--brand-light)] hidden sm:block font-heading">
                Ungdomsappen
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {/* CMS Header Items */}
              {headerItems.map((item) => (
                isExternalLink(item) ? (
                  <a
                    key={item.id}
                    href={getMenuItemHref(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)] transition-colors font-medium flex items-center gap-1"
                  >
                    {item.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={getMenuItemHref(item)}
                    className="text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)] transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </nav>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {!authLoading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--brand-light)]/60 text-sm">
                        Hej, {user.first_name}
                      </span>
                      <Link
                        href={getDashboardLink()}
                        className="px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all"
                      >
                        Min Dashboard
                      </Link>
                      <button
                        onClick={logout}
                        className="px-4 py-2.5 rounded-lg border border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-700)] hover:border-[var(--dark-400)] transition-all"
                      >
                        Logga ut
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/login"
                        className="px-4 py-2.5 rounded-lg border border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)] hover:border-[var(--dark-400)] transition-all"
                      >
                        Logga in
                      </Link>
                      <Link
                        href="/register/youth"
                        className="px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all"
                      >
                        Skapa konto
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors"
              aria-label={mobileMenuOpen ? 'Stäng meny' : 'Öppna meny'}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Stäng meny' : 'Öppna meny'}</span>
              <div className="relative w-6 h-5 flex flex-col justify-between">
                <span 
                  className={`block h-0.5 w-full bg-current transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? 'rotate-45 translate-y-[9px]' : ''
                  }`} 
                />
                <span 
                  className={`block h-0.5 w-full bg-current transition-all duration-300 ${
                    mobileMenuOpen ? 'opacity-0 scale-x-0' : ''
                  }`} 
                />
                <span 
                  className={`block h-0.5 w-full bg-current transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''
                  }`} 
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Full Screen Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div 
              className="absolute inset-0 bg-[var(--dark-900)]/95 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Menu Content */}
            <motion.div 
              className="relative h-full flex flex-col pt-20 pb-8 px-6 overflow-y-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {/* Navigation Links */}
              <nav className="flex-1">
                <div className="space-y-1">
                  {/* Home Link */}
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center justify-between py-4 border-b border-[var(--dark-700)]"
                  >
                    <span className="text-2xl font-bold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                      Hem
                    </span>
                    <ChevronRight className="w-6 h-6 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition-all" />
                  </Link>

                  {/* CMS Header Items */}
                  {headerItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                    >
                      {isExternalLink(item) ? (
                        <a
                          href={getMenuItemHref(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileMenuOpen(false)}
                          className="group flex items-center justify-between py-4 border-b border-[var(--dark-700)]"
                        >
                          <span className="text-2xl font-bold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                            {item.label}
                          </span>
                          <ExternalLink className="w-5 h-5 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                        </a>
                      ) : (
                        <Link
                          href={getMenuItemHref(item)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="group flex items-center justify-between py-4 border-b border-[var(--dark-700)]"
                        >
                          <span className="text-2xl font-bold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                            {item.label}
                          </span>
                          <ChevronRight className="w-6 h-6 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] group-hover:translate-x-1 transition-all" />
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </div>
              </nav>

              {/* User Section */}
              <motion.div 
                className="mt-8 pt-6 border-t border-[var(--dark-600)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {!authLoading && (
                  <>
                    {user ? (
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--dark-800)] border border-[var(--dark-600)]">
                          <div className="w-12 h-12 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center">
                            <User className="w-6 h-6 text-[var(--dark-900)]" />
                          </div>
                          <div>
                            <p className="text-[var(--brand-light)] font-semibold">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-[var(--brand-light)]/50 text-sm">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <Link
                          href={getDashboardLink()}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-center gap-3 w-full py-4 rounded-lg bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold text-lg"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          Min Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-3 w-full py-4 rounded-lg border-2 border-[var(--dark-500)] text-[var(--brand-light)] font-semibold text-lg hover:bg-[var(--dark-800)] transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
                          Logga ut
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Link
                          href="/register/youth"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-center w-full py-4 rounded-lg bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold text-lg"
                        >
                          Skapa konto
                        </Link>
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-center w-full py-4 rounded-lg border-2 border-[var(--dark-500)] text-[var(--brand-light)] font-semibold text-lg hover:bg-[var(--dark-800)] transition-colors"
                        >
                          Logga in
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </motion.div>

              {/* Theme Toggle for Mobile */}
              <motion.div 
                className="mt-6 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <ThemeToggle showLabel />
              </motion.div>

              {/* Footer Info */}
              <motion.div 
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-[var(--brand-light)]/30 text-sm">
                  © {new Date().getFullYear()} Ungdomsappen
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[var(--dark-800)] border-t border-[var(--dark-600)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image 
                  src="/ua-icon-2026.svg" 
                  alt="Ungdomsappen" 
                  width={40} 
                  height={40}
                  className="w-10 h-10"
                />
                <span className="text-xl font-bold text-[var(--brand-light)] font-heading">
                  Ungdomsappen
                </span>
              </div>
              <p className="text-[var(--brand-light)]/60 max-w-md">
                Plattformen som samlar aktiviteter, evenemang och fritidsgårdar för unga. 
                Hitta din gemenskap och utforska nya möjligheter.
              </p>
            </div>

            {/* Quick Links - Static + CMS Footer Items */}
            <div>
              <h4 className="text-[var(--brand-light)] font-semibold mb-4">Snabblänkar</h4>
              <ul className="space-y-2">
                {/* Static pricing link */}
                <li>
                  <Link 
                    href="/pricing" 
                    className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors"
                  >
                    Priser
                  </Link>
                </li>
                {/* Static contact link */}
                <li>
                  <Link 
                    href="/contact" 
                    className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors"
                  >
                    Kontakt
                  </Link>
                </li>
                {/* CMS Footer Items */}
                {footerItems.map((item) => (
                  <li key={item.id}>
                    {isExternalLink(item) ? (
                      <a
                        href={getMenuItemHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1"
                      >
                        {item.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link 
                        href={getMenuItemHref(item)} 
                        className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[var(--brand-light)] font-semibold mb-4">Kontakt</h4>
              <ul className="space-y-2 text-[var(--brand-light)]/60">
                <li>info@ungdomsappen.se</li>
                <li>Stockholm, Sverige</li>
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="mt-12 pt-8 border-t border-[var(--dark-600)]">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-[var(--brand-light)] font-bold mb-1">Håll dig uppdaterad</h3>
                <p className="text-[var(--brand-light)]/60 text-sm">
                  Få de senaste nyheterna och uppdateringarna.
                </p>
              </div>
              <div className="flex gap-2 max-w-md w-full md:w-auto">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Ange din e-post"
                  className="flex-1 md:w-64 px-4 py-2.5 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-sm text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                  required
                />
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold text-sm rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all whitespace-nowrap"
                >
                  Prenumerera
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 pt-8 border-t border-[var(--dark-600)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[var(--brand-light)]/40 text-sm">
              © {new Date().getFullYear()} Ungdomsappen. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Newsletter Modal */}
      <NewsletterModal
        isOpen={showNewsletterModal}
        onClose={() => {
          setShowNewsletterModal(false);
          setNewsletterEmail('');
        }}
        email={newsletterEmail}
      />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />
    </div>
  );
}
