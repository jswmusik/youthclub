// frontend/app/(public)/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Floating Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[var(--dark-800)]/95 backdrop-blur-lg shadow-xl border-b border-[var(--dark-600)]'
            : 'bg-transparent'
        }`}
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
              <Link 
                href="/#events" 
                className="text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)] transition-colors font-medium"
              >
                Aktiviteter
              </Link>
              <Link 
                href="/#about" 
                className="text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)] transition-colors font-medium"
              >
                Om oss
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {!authLoading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-4">
                      <span className="text-[var(--brand-light)]/70 text-sm">
                        Hej, {user.first_name}
                      </span>
                      <Link
                        href={getDashboardLink()}
                        className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg hover:shadow-[var(--brand-primary)]/30"
                      >
                        Min Dashboard
                      </Link>
                      <button
                        onClick={logout}
                        className="px-4 py-2 rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-700)] transition-all"
                      >
                        Logga ut
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/login"
                        className="px-4 py-2 rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
                      >
                        Logga in
                      </Link>
                      <Link
                        href="/register/youth"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-[var(--brand-primary)]/30"
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
              className="md:hidden p-2 rounded-lg text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--dark-800)] border-t border-[var(--dark-600)]">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/#events"
                className="block py-2 text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Aktiviteter
              </Link>
              <Link
                href="/#about"
                className="block py-2 text-[var(--brand-light)]/80 hover:text-[var(--brand-primary)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Om oss
              </Link>
              <div className="pt-4 border-t border-[var(--dark-600)] space-y-3">
                {!authLoading && (
                  <>
                    {user ? (
                      <>
                        <Link
                          href={getDashboardLink()}
                          className="block w-full py-3 text-center rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Min Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full py-3 text-center rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)]"
                        >
                          Logga ut
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="block w-full py-3 text-center rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)]"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Logga in
                        </Link>
                        <Link
                          href="/register/youth"
                          className="block w-full py-3 text-center rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Skapa konto
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

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

            {/* Links */}
            <div>
              <h4 className="text-[var(--brand-light)] font-semibold mb-4">Snabblänkar</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/#events" className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors">
                    Aktiviteter
                  </Link>
                </li>
                <li>
                  <Link href="/register/youth" className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors">
                    Skapa konto
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors">
                    Logga in
                  </Link>
                </li>
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

          <div className="mt-12 pt-8 border-t border-[var(--dark-600)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[var(--brand-light)]/40 text-sm">
              © {new Date().getFullYear()} Ungdomsappen. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] text-sm transition-colors">
                Integritetspolicy
              </Link>
              <Link href="#" className="text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] text-sm transition-colors">
                Användarvillkor
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

