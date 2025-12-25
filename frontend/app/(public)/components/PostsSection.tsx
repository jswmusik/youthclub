// frontend/app/(public)/components/PostsSection.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, MapPin, Eye, ArrowRight, Loader2, Building2, Clock } from 'lucide-react';
import { getMediaUrl } from '../../utils';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.208:8000/api';

interface PublicPost {
  id: number;
  title: string;
  content: string;
  image: string | null;
  post_type: string;
  club_name: string | null;
  club_slug: string | null;
  club_avatar: string | null;
  municipality_name: string | null;
  municipality_slug: string | null;
  published_at: string;
  view_count: number;
  distance: number | null;
}

export default function PostsSection() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Try to get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Location denied or unavailable, fetch without location
          fetchPosts();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fetchPosts();
    }
  }, []);

  // Fetch posts when location changes
  useEffect(() => {
    if (userLocation) {
      fetchPosts(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  const fetchPosts = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      let url = `${API_URL}/public/posts/?limit=6`;
      if (lat && lng) {
        url += `&lat=${lat}&lng=${lng}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format distance for display
  const formatDistance = (distance: number | null): string => {
    if (distance === null) return '';
    // Convert from degrees to approximate km (rough approximation)
    const km = distance * 111; // 1 degree ≈ 111 km
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Strip HTML tags for display
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '');
  };

  if (loading) {
    return (
      <section className="py-20 px-4 bg-[var(--dark-900)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  return (
    <section className="py-20 px-4 bg-[var(--dark-900)]">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-sky)] to-[var(--brand-blue)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
                Senaste nytt
              </h2>
            </div>
            <p className="text-[var(--brand-light)]/60 max-w-lg">
              Nyheter och uppdateringar från fritidsgårdar {userLocation ? 'nära dig' : 'i hela Sverige'}
            </p>
          </div>
          
          <Link 
            href="/posts"
            className="flex items-center gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-medium transition-colors group"
          >
            Se alla nyheter
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden hover:border-[var(--dark-500)] transition-all hover:shadow-lg hover:shadow-[var(--dark-900)]"
            >
              {/* Image */}
              {post.image && (
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={getMediaUrl(post.image) || ''}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-transparent to-transparent" />
                  
                  {/* Distance Badge */}
                  {post.distance !== null && userLocation && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dark-900)]/80 backdrop-blur-sm text-xs font-medium text-[var(--brand-light)]">
                      <MapPin className="w-3 h-3 text-[var(--brand-primary)]" />
                      {formatDistance(post.distance)}
                    </div>
                  )}
                </div>
              )}
              
              {/* Content */}
              <div className="p-5">
                {/* Club Info */}
                {post.club_name && (
                  <div className="flex items-center gap-2 mb-3">
                    {post.club_avatar ? (
                      <img
                        src={getMediaUrl(post.club_avatar) || ''}
                        alt={post.club_name}
                        className="w-6 h-6 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-[var(--dark-600)] flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-[var(--brand-light)]/50" />
                      </div>
                    )}
                    <span className="text-sm text-[var(--brand-light)]/60 truncate">
                      {post.club_name}
                    </span>
                  </div>
                )}
                
                {/* Title */}
                <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
                  {post.title}
                </h3>
                
                {/* Excerpt */}
                <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2 mb-4">
                  {stripHtml(post.content)}
                </p>
                
                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-[var(--brand-light)]/40">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(post.published_at), { 
                        addSuffix: true, 
                        locale: sv 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{post.view_count}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View More Link (Mobile) */}
        <div className="mt-8 text-center sm:hidden">
          <Link 
            href="/posts"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] font-medium hover:bg-[var(--dark-600)] transition-all"
          >
            Se alla nyheter
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

