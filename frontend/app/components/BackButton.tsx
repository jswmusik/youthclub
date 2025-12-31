'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  translationKey?: string;
  className?: string;
}

export default function BackButton({ 
  href, 
  onClick,
  label, 
  translationKey = 'navigation.backToList',
  className = '' 
}: BackButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  
  // Try to get translation, fallback to label or default
  let displayLabel = label;
  try {
    if (!label) {
      displayLabel = t(translationKey);
    }
  } catch {
    displayLabel = label || 'Back';
  }

  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium";

  // If onClick is provided, use button; otherwise use Link
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${className}`}
      >
        <ArrowLeft className="h-4 w-4" /> {displayLabel}
      </button>
    );
  }

  if (!href) {
    console.warn('BackButton: href or onClick must be provided');
    return null;
  }

  return (
    <Link 
      href={href}
      className={`${baseClasses} ${className}`}
    >
      <ArrowLeft className="h-4 w-4" /> {displayLabel}
    </Link>
  );
}

