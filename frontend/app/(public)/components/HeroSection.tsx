// frontend/app/(public)/components/HeroSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMediaUrl } from '../../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

interface HeroSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_background: string | null;
}

export default function HeroSection() {
  const router = useRouter();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    hero_title: 'Hitta aktiviteter nära dig',
    hero_subtitle: 'Upptäck evenemang, fritidsgårdar och aktiviteter i ditt område. Ungdomsappen samlar allt på ett ställe.',
    hero_cta_text: 'Sök',
    hero_background: null,
  });

  // Fetch hero settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/marketing/public/seo-settings/`);
        if (res.ok) {
          const data = await res.json();
          setHeroSettings({
            hero_title: data.hero_title || heroSettings.hero_title,
            hero_subtitle: data.hero_subtitle || heroSettings.hero_subtitle,
            hero_cta_text: data.hero_cta_text || heroSettings.hero_cta_text,
            hero_background: data.hero_background,
          });
        }
      } catch (error) {
        console.error('Failed to fetch hero settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation stöds inte av din webbläsare');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Platsåtkomst nekad');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Platsinformation otillgänglig');
            break;
          case error.TIMEOUT:
            setLocationError('Begäran tog för lång tid');
            break;
          default:
            setLocationError('Ett okänt fel uppstod');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (location) {
      params.set('lat', location.lat.toString());
      params.set('lng', location.lng.toString());
    }
    router.push(`/events?${params.toString()}`);
  };

  const backgroundUrl = getMediaUrl(heroSettings.hero_background);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image or Animated Background */}
      <div className="absolute inset-0 bg-[var(--dark-900)]">
        {backgroundUrl ? (
          <>
            <img 
              src={backgroundUrl} 
              alt="Hero background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-900)]/70 via-[var(--dark-900)]/50 to-[var(--dark-900)]" />
          </>
        ) : (
          <>
            {/* Gradient Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--brand-primary)]/20 blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[var(--brand-purple)]/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-[var(--brand-sky)]/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
          </>
        )}
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--brand-light) 1px, transparent 1px), linear-gradient(90deg, var(--brand-light) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--dark-700)]/80 backdrop-blur-sm border border-[var(--dark-500)] mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-green)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-green)]"></span>
          </span>
          <span className="text-[var(--brand-light)]/80 text-sm font-medium">
            Nya aktiviteter varje dag
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--brand-light)] mb-6 font-heading leading-tight">
          {heroSettings.hero_title.includes('nära') ? (
            <>
              {heroSettings.hero_title.split('nära')[0]}
              <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] bg-clip-text text-transparent">
                nära{heroSettings.hero_title.split('nära')[1]}
              </span>
            </>
          ) : (
            <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] bg-clip-text text-transparent">
              {heroSettings.hero_title}
            </span>
          )}
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-[var(--brand-light)]/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          {heroSettings.hero_subtitle}
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-[var(--dark-700)]/90 backdrop-blur-sm border border-[var(--dark-500)] shadow-2xl">
            {/* Location Button */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationLoading}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                location
                  ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]'
                  : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
              }`}
            >
              {locationLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : location ? (
                <Navigation className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              <span className="text-sm font-medium whitespace-nowrap">
                {locationLoading 
                  ? 'Söker...' 
                  : location 
                    ? 'Plats hittad' 
                    : 'Min plats'}
              </span>
            </button>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök aktiviteter, evenemang..."
                className="w-full pl-12 pr-4 py-3 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-[var(--brand-primary)]/30"
            >
              {heroSettings.hero_cta_text}
            </button>
          </div>

          {/* Location Error */}
          {locationError && (
            <p className="mt-3 text-sm text-[var(--brand-coral)]">{locationError}</p>
          )}
        </form>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-20">
          {['Sport', 'Musik', 'Gaming', 'Konst', 'Dans'].map((tag) => (
            <Link
              key={tag}
              href={`/events?search=${tag.toLowerCase()}`}
              className="px-4 py-2 rounded-full bg-[var(--dark-700)]/50 backdrop-blur-sm border border-[var(--dark-500)] text-[var(--brand-light)]/70 text-sm hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Moved outside content div */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-2 text-[var(--brand-light)]/40">
          <span className="text-xs uppercase tracking-wider">Scrolla ner</span>
          <div className="w-6 h-10 rounded-full border-2 border-[var(--brand-light)]/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-[var(--brand-light)]/40 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
