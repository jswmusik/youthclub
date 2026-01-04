// frontend/app/(public)/components/HeroSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { getMediaUrl } from '../../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

interface HeroSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_background: string | null;
  hero_video: string | null;
}

export default function HeroSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = useTranslations('public.hero');
  const [mounted, setMounted] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    hero_title: '',
    hero_subtitle: '',
    hero_cta_text: '',
    hero_background: null,
    hero_video: null,
  });
  
  // Video loading states
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const darkMode = !mounted || theme === 'dark';

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
            hero_video: data.hero_video,
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
      setLocationError(t('locationError.unavailable'));
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
            setLocationError(t('locationError.denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(t('locationError.unavailable'));
            break;
          case error.TIMEOUT:
            setLocationError(t('locationError.timeout'));
            break;
          default:
            setLocationError(t('locationError.unknown'));
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
  const videoUrl = getMediaUrl(heroSettings.hero_video);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video/Image or Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a12]">
        {/* Priority 1: Video Background */}
        {videoUrl && !videoError ? (
          <>
            {/* Video element */}
            <video
              autoPlay
              muted
              loop
              playsInline
              onLoadedData={() => setVideoLoaded(true)}
              onError={() => setVideoError(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                videoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
            </video>
            
            {/* Show fallback image while video loads */}
            {!videoLoaded && backgroundUrl && (
              <img 
                src={backgroundUrl} 
                alt="Hero background" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Dark gradient overlay for video - same as dark mode */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050211]/70 via-[#050211]/50 to-[#050211]" />
          </>
        ) : backgroundUrl ? (
          /* Priority 2: Image Background (fallback) */
          <>
            <img 
              src={backgroundUrl} 
              alt="Hero background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark gradient overlay for image - same as dark mode */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050211]/70 via-[#050211]/50 to-[#050211]" />
          </>
        ) : (
          /* Priority 3: Animated gradient orbs (no media) */
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-green)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-green)]"></span>
          </span>
          <span className="text-white/80 text-sm font-medium">
            {t('badge')}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-heading leading-tight">
          <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] bg-clip-text text-transparent">
            {heroSettings.hero_title || t('defaultTitle')}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          {heroSettings.hero_subtitle || t('defaultSubtitle')}
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            {/* Location Button */}
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationLoading}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                location
                  ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  ? t('searching')
                  : location 
                    ? t('locationFound')
                    : t('myLocation')}
              </span>
            </button>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-[var(--brand-primary)]/30"
            >
              {heroSettings.hero_cta_text || t('searchButton')}
            </button>
          </div>

          {/* Location Error */}
          {locationError && (
            <p className="mt-3 text-sm text-[var(--brand-coral)]">{locationError}</p>
          )}
        </form>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-20">
          {(['sport', 'music', 'gaming', 'art', 'dance'] as const).map((tag) => (
            <Link
              key={tag}
              href={`/events?search=${tag}`}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm hover:bg-white/20 hover:text-white transition-all"
            >
              {t(`quickTags.${tag}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Moved outside content div */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs uppercase tracking-wider">{t('scrollDown')}</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
