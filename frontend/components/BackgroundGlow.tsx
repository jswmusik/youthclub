'use client';

interface BackgroundGlowProps {
  variant?: 'default' | 'admin' | 'youth' | 'guardian';
}

/**
 * BackgroundGlow - A fixed ambient glow effect component
 * 
 * Creates a subtle, layered glow effect that stays fixed in the viewport
 * as the user scrolls, adding depth and visual interest to the UI.
 * 
 * Variants:
 * - default: Brand primary, purple, sky (for public pages)
 * - admin: Purple, primary, sky (for admin dashboards)
 * - youth: Primary, sky, purple (for youth member pages)
 * - guardian: Sky, primary, purple (for guardian pages)
 */
export function BackgroundGlow({ variant = 'default' }: BackgroundGlowProps) {
  // Different color schemes per section for visual distinction
  const colorSchemes = {
    default: {
      primary: 'var(--brand-primary)',
      secondary: 'var(--brand-purple)',
      tertiary: 'var(--brand-sky)',
    },
    admin: {
      primary: 'var(--brand-purple)',
      secondary: 'var(--brand-primary)',
      tertiary: 'var(--brand-sky)',
    },
    youth: {
      primary: 'var(--brand-primary)',
      secondary: 'var(--brand-sky)',
      tertiary: 'var(--brand-purple)',
    },
    guardian: {
      primary: 'var(--brand-sky)',
      secondary: 'var(--brand-primary)',
      tertiary: 'var(--brand-purple)',
    },
  };

  const colors = colorSchemes[variant];

  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Primary glow - top left area */}
      <div 
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-glow-pulse"
        style={{ 
          backgroundColor: colors.primary,
          opacity: 0.05,
        }}
      />
      {/* Secondary glow - bottom right area */}
      <div 
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-glow-pulse-delayed"
        style={{ 
          backgroundColor: colors.secondary,
          opacity: 0.05,
        }}
      />
      {/* Tertiary glow - left side, mid height */}
      <div 
        className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full blur-[80px] animate-glow-pulse"
        style={{ 
          backgroundColor: colors.tertiary,
          opacity: 0.05,
          animationDelay: '2s',
        }}
      />
    </div>
  );
}

export default BackgroundGlow;



