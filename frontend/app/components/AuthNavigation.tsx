'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Home, LogIn, UserPlus, Menu, X } from 'lucide-react';

export default function AuthNavigation() {
  const t = useTranslations('authNav');
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const darkMode = !mounted || theme === 'dark';

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname?.startsWith('/register');

  if (!mounted) return null;

  return (
    <>
      {/* Desktop Navigation - Fixed at top, respects system alert height */}
      <nav 
        className="fixed left-0 right-0 z-50 bg-[var(--dark-900)]/80 backdrop-blur-lg border-b border-[var(--dark-700)]"
        style={{ top: 'var(--system-alert-height, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src={darkMode ? "/ua-icon-2026.svg" : "/ua-logo.svg"}
                alt="Ungdomsappen"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className={`text-lg font-bold group-hover:text-[var(--brand-primary)] transition-colors hidden sm:block ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
              }`}>
                Ungdomsappen
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
              >
                <Home className="w-4 h-4" />
                <span>{t('home')}</span>
              </Link>
              
              {/* On login page: show "Create account" button */}
              {isLoginPage && (
                <Link
                  href="/register/youth"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--brand-primary)] text-gray-900 font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('createAccount')}</span>
                </Link>
              )}
              
              {/* On register page: show "Login" button */}
              {isRegisterPage && (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--brand-primary)] text-gray-900 font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('login')}</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--dark-700)] bg-[var(--dark-800)]">
            <div className="px-4 py-3 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
              >
                <Home className="w-5 h-5" />
                <span>{t('home')}</span>
              </Link>
              
              {/* On login page: show "Create account" button */}
              {isLoginPage && (
                <Link
                  href="/register/youth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--brand-primary)] text-gray-900 font-semibold shadow-md"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>{t('createAccount')}</span>
                </Link>
              )}
              
              {/* On register page: show "Login" button */}
              {isRegisterPage && (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--brand-primary)] text-gray-900 font-semibold shadow-md"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{t('login')}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      
      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  );
}

