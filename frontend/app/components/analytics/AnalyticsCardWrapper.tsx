'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isVisible: boolean;
  onToggle: () => void;
  sectionName: string;
}

/**
 * Wrapper component that adds visibility toggle to analytics cards.
 * When hidden, shows a collapsed placeholder with option to show.
 */
export default function AnalyticsCardWrapper({
  children,
  isVisible,
  onToggle,
  sectionName,
}: Props) {
  if (!isVisible) {
    // Show collapsed placeholder
    return (
      <button
        onClick={onToggle}
        className="w-full bg-[var(--dark-800)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] border-dashed p-4 flex items-center justify-center gap-3 hover:bg-[var(--dark-700)]/50 hover:border-[var(--dark-500)] transition-all group"
      >
        <EyeOff className="w-4 h-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-light)]/50" />
        <span className="text-sm text-[var(--brand-light)]/30 group-hover:text-[var(--brand-light)]/50">
          {sectionName} (hidden)
        </span>
        <span className="text-xs text-[var(--brand-light)]/20 group-hover:text-[var(--brand-primary)]">
          Click to show
        </span>
      </button>
    );
  }

  // Wrap children with visibility toggle button
  return (
    <div className="relative group/card">
      {/* Visibility toggle button - appears on hover */}
      <button
        onClick={onToggle}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 rounded-lg bg-[var(--dark-700)]/80 backdrop-blur-sm border border-[var(--dark-500)] flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-[var(--dark-600)] hover:border-[var(--brand-primary)]/50 transition-all"
        title={`Hide ${sectionName}`}
      >
        <Eye className="w-4 h-4 text-[var(--brand-light)]/70" />
      </button>
      
      {children}
    </div>
  );
}

