// frontend/app/admin/super/seo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Target, Map, MapPinned, FileSearch, Link2, TrendingUp,
  Plus, ArrowRight, Sparkles, Globe, Eye, FileText, Loader2
} from 'lucide-react';
import { seoApi } from '@/lib/seo-api';
import { useToast } from '@/hooks/useToast';

interface DashboardStats {
  totalKeywords: number;
  totalLocations: number;
  totalLandingPages: number;
  publishedLandingPages: number;
  totalArticles: number;
  publishedArticles: number;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

export default function SEODashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await seoApi.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch SEO stats:', err);
        error('Kunde inte ladda SEO-statistik');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickActions = [
    { 
      title: 'Lägg till nyckelord', 
      description: 'Lägg till nya sökord att optimera för',
      href: '/admin/super/seo/keywords',
      icon: Target,
      color: 'var(--brand-primary)'
    },
    { 
      title: 'Skapa lokal sida', 
      description: 'Generera en landningssida för en kommun',
      href: '/admin/super/seo/local-pages',
      icon: MapPinned,
      color: 'var(--brand-blue)'
    },
    { 
      title: 'Skriv artikel', 
      description: 'Skapa en ny SEO-optimerad artikel',
      href: '/admin/super/seo/articles',
      icon: FileSearch,
      color: 'var(--brand-green)'
    },
    { 
      title: 'Utforska platser', 
      description: 'Se alla svenska kommuner och städer',
      href: '/admin/super/seo/locations',
      icon: Map,
      color: 'var(--brand-purple)'
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Search className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">SEO-verktyg</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">
              Hantera nyckelord, lokala landningssidor och SEO-artiklar
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-4 sm:px-0">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Target className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Nyckelord</span>
                <div className="text-2xl font-bold text-[var(--brand-primary)]">{stats?.totalKeywords || 0}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <Map className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Platser</span>
                <div className="text-2xl font-bold text-[var(--brand-blue)]">{stats?.totalLocations || 0}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <MapPinned className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Lokala sidor</span>
                <div className="text-2xl font-bold text-[var(--brand-green)]">{stats?.totalLandingPages || 0}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                    <Eye className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Publicerade sidor</span>
                <div className="text-2xl font-bold text-[var(--brand-peach)]">{stats?.publishedLandingPages || 0}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                    <FileSearch className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Artiklar</span>
                <div className="text-2xl font-bold text-[var(--brand-purple)]">{stats?.totalArticles || 0}</div>
              </div>

              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-light)]/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-500)] flex items-center justify-center">
                    <Globe className="h-5 w-5 text-[var(--brand-light)]" />
                  </div>
                </div>
                <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Publicerade artiklar</span>
                <div className="text-2xl font-bold text-[var(--brand-light)]">{stats?.publishedArticles || 0}</div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">Snabbåtgärder</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-5 hover:border-[var(--brand-primary)]/50 transition-all group cursor-pointer h-full">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <action.icon className="h-6 w-6" style={{ color: action.color }} />
                  </div>
                  <h3 className="font-semibold text-[var(--brand-light)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-[var(--brand-light)]/50">{action.description}</p>
                  <div className="mt-3 flex items-center text-sm text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Gå till <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="px-4 sm:px-0">
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-[var(--brand-purple)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand-light)] mb-2">Hur SEO-verktyget fungerar</h3>
                <div className="text-sm text-[var(--brand-light)]/70 space-y-2">
                  <p>
                    <strong className="text-[var(--brand-light)]">1. Lägg till nyckelord</strong> - Börja med att lägga till de sökord du vill ranka för. 
                    Du kan manuellt lägga till dem eller importera från SEO-verktyg senare.
                  </p>
                  <p>
                    <strong className="text-[var(--brand-light)]">2. Skapa lokala sidor</strong> - Generera AI-assisterade landningssidor för Sveriges kommuner. 
                    Sidorna fylls automatiskt med dynamiskt innehåll som närliggande fritidsgårdar och evenemang.
                  </p>
                  <p>
                    <strong className="text-[var(--brand-light)]">3. Skriv artiklar</strong> - Skapa SEO-optimerade artiklar riktade mot olika målgrupper 
                    (ungdomar, vårdnadshavare, kommuner). AI hjälper till att skriva utkast som du sedan granskar och publicerar.
                  </p>
                  <p>
                    <strong className="text-[var(--brand-light)]">4. Publicera manuellt</strong> - Du har full kontroll. Inget publiceras automatiskt - 
                    du granskar alltid innehållet innan det går live.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">Alla SEO-verktyg</h2>
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden divide-y divide-[var(--dark-600)]">
            <Link href="/admin/super/seo/keywords" className="flex items-center justify-between p-4 hover:bg-[var(--dark-700)] transition-colors">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-[var(--brand-primary)]" />
                <div>
                  <span className="font-medium text-[var(--brand-light)]">Nyckelord</span>
                  <p className="text-sm text-[var(--brand-light)]/50">Hantera sökord och spåra ranking</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--brand-light)]/40" />
            </Link>
            
            <Link href="/admin/super/seo/locations" className="flex items-center justify-between p-4 hover:bg-[var(--dark-700)] transition-colors">
              <div className="flex items-center gap-3">
                <Map className="h-5 w-5 text-[var(--brand-blue)]" />
                <div>
                  <span className="font-medium text-[var(--brand-light)]">Svenska platser</span>
                  <p className="text-sm text-[var(--brand-light)]/50">289 kommuner och städer</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--brand-light)]/40" />
            </Link>
            
            <Link href="/admin/super/seo/local-pages" className="flex items-center justify-between p-4 hover:bg-[var(--dark-700)] transition-colors">
              <div className="flex items-center gap-3">
                <MapPinned className="h-5 w-5 text-[var(--brand-green)]" />
                <div>
                  <span className="font-medium text-[var(--brand-light)]">Lokala landningssidor</span>
                  <p className="text-sm text-[var(--brand-light)]/50">Kommun- och stadsspecifika sidor</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--brand-light)]/40" />
            </Link>
            
            <Link href="/admin/super/seo/articles" className="flex items-center justify-between p-4 hover:bg-[var(--dark-700)] transition-colors">
              <div className="flex items-center gap-3">
                <FileSearch className="h-5 w-5 text-[var(--brand-purple)]" />
                <div>
                  <span className="font-medium text-[var(--brand-light)]">SEO-artiklar</span>
                  <p className="text-sm text-[var(--brand-light)]/50">Nyckelordsoptimerade artiklar</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--brand-light)]/40" />
            </Link>
            
            <Link href="/admin/super/seo/links" className="flex items-center justify-between p-4 hover:bg-[var(--dark-700)] transition-colors">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-[var(--brand-peach)]" />
                <div>
                  <span className="font-medium text-[var(--brand-light)]">Interna länkar</span>
                  <p className="text-sm text-[var(--brand-light)]/50">Hantera länkstrategi</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--brand-light)]/40" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



