'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getMediaUrl } from '../app/utils';

interface OptimizedImageProps {
  /** 
   * Image source - can be:
   * - Relative path from Django (e.g., '/media/users/avatar.webp')
   * - Full URL (e.g., 'http://example.com/image.jpg')
   * - null/undefined (will show fallback)
   */
  src: string | null | undefined;
  
  /** Alt text for accessibility */
  alt: string;
  
  /** Width in pixels (required unless fill=true) */
  width?: number;
  
  /** Height in pixels (required unless fill=true) */
  height?: number;
  
  /** 
   * Fill mode - image fills its parent container.
   * Parent must have position: relative and defined dimensions.
   */
  fill?: boolean;
  
  /** Tailwind/CSS classes */
  className?: string;
  
  /** Load this image with high priority (above the fold) */
  priority?: boolean;
  
  /** 
   * Responsive sizes hint for the browser.
   * Example: "(max-width: 768px) 100vw, 50vw"
   */
  sizes?: string;
  
  /** Fallback image when src is null or fails to load */
  fallback?: string;
  
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * OptimizedImage Component
 * 
 * A wrapper around Next.js Image component that:
 * - Automatically converts Django media URLs to full URLs
 * - Handles loading errors with fallback images
 * - Supports SVGs (which Next.js Image doesn't optimize well)
 * - Provides consistent sizing and lazy loading
 * 
 * @example
 * // Basic usage
 * <OptimizedImage src={user.avatar} alt="Profile" width={100} height={100} />
 * 
 * @example
 * // Fill mode (parent needs position: relative)
 * <div className="relative w-full h-64">
 *   <OptimizedImage src={event.cover_image} alt="Event" fill />
 * </div>
 * 
 * @example
 * // With priority for above-the-fold images
 * <OptimizedImage src={hero.image} alt="Hero" width={1200} height={600} priority />
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  sizes = '100vw',
  fallback = '/placeholder.svg',
  objectFit = 'cover',
  onClick,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the full URL for the image
  const imageUrl = src ? getMediaUrl(src) : null;
  const displayUrl = hasError || !imageUrl ? fallback : imageUrl;
  
  // Handle SVGs separately - Next.js Image doesn't optimize them well
  // and they may have issues with remotePatterns
  const isSvg = displayUrl?.toLowerCase().endsWith('.svg');
  
  if (isSvg) {
    return (
      <img
        src={displayUrl || fallback}
        alt={alt}
        className={className}
        onClick={onClick}
        style={{
          objectFit,
          ...(fill ? { 
            position: 'absolute',
            width: '100%', 
            height: '100%',
            top: 0,
            left: 0,
          } : { 
            width: width ? `${width}px` : undefined, 
            height: height ? `${height}px` : undefined,
          }),
        }}
        onError={() => setHasError(true)}
      />
    );
  }

  // For fill mode
  if (fill) {
    return (
      <Image
        src={displayUrl || fallback}
        alt={alt}
        fill
        className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
        priority={priority}
        sizes={sizes}
        style={{ objectFit }}
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
        onClick={onClick}
      />
    );
  }

  // For fixed dimensions
  return (
    <Image
      src={displayUrl || fallback}
      alt={alt}
      width={width || 400}
      height={height || 400}
      className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
      priority={priority}
      sizes={sizes}
      style={{ objectFit }}
      onError={() => setHasError(true)}
      onLoad={() => setIsLoading(false)}
      onClick={onClick}
    />
  );
}

/**
 * Avatar variant with circular styling
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className = '',
  fallback = '/placeholder.svg',
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      objectFit="cover"
      fallback={fallback}
      priority={priority}
    />
  );
}

/**
 * Hero/Banner image variant
 */
export function HeroImage({
  src,
  alt,
  className = '',
  priority = true,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative w-full h-64 md:h-80 lg:h-96 ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className="rounded-xl"
      />
    </div>
  );
}

/**
 * Card thumbnail variant
 */
export function ThumbnailImage({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-video',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspectRatio?: string;
}) {
  return (
    <div className={`relative w-full ${aspectRatio} ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="rounded-lg"
      />
    </div>
  );
}





