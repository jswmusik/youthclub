'use client';

import { ReactNode } from 'react';
import YouthFooter from './YouthFooter';

interface YouthLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

/**
 * Layout wrapper for youth dashboard pages.
 * Includes the footer by default.
 * 
 * Usage:
 * <YouthLayout>
 *   <div className="min-h-screen bg-[var(--dark-900)]">
 *     ... page content ...
 *   </div>
 * </YouthLayout>
 */
export default function YouthLayout({ children, showFooter = true }: YouthLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--dark-900)]">
      <div className="flex-1">
        {children}
      </div>
      {showFooter && <YouthFooter />}
    </div>
  );
}



