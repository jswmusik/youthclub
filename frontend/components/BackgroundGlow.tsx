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
 * Dark Mode: Glowing orbs that emit light against dark background
 * Light Mode: Soft gradient washes and floating shapes for depth
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
      {/* ========================================
          DARK MODE: Glowing orbs with pulsing effect
          ======================================== */}
      <div className="hidden dark:block">
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

      {/* ========================================
          LIGHT MODE: Soft gradient mesh + floating shapes
          ======================================== */}
      <div className="block dark:hidden">
        {/* Base gradient mesh - creates atmospheric depth */}
        <div 
          className="absolute inset-0 animate-light-glow-pulse"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 10% 20%, var(--glow-primary) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 90% 80%, var(--glow-secondary) 0%, transparent 50%),
              radial-gradient(ellipse 60% 70% at 5% 70%, var(--glow-tertiary) 0%, transparent 45%)
            `,
          }}
        />
        
        {/* Floating soft orb - top right */}
        <div 
          className="absolute top-[5%] right-[10%] w-[500px] h-[500px] rounded-full animate-light-glow-pulse"
          style={{ 
            background: `radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)`,
          }}
        />
        
        {/* Floating soft orb - bottom left */}
        <div 
          className="absolute bottom-[15%] left-[5%] w-[450px] h-[450px] rounded-full animate-light-glow-pulse-delayed"
          style={{ 
            background: `radial-gradient(circle, var(--glow-secondary) 0%, transparent 70%)`,
          }}
        />
        
        {/* Floating soft orb - center right */}
        <div 
          className="absolute top-[45%] right-[0%] w-[350px] h-[350px] rounded-full animate-light-glow-pulse"
          style={{ 
            background: `radial-gradient(circle, var(--glow-tertiary) 0%, transparent 70%)`,
            animationDelay: '3s',
          }}
        />

        {/* Extra accent orb - top center */}
        <div 
          className="absolute top-[25%] left-[40%] w-[300px] h-[300px] rounded-full animate-light-glow-pulse-delayed"
          style={{ 
            background: `radial-gradient(circle, var(--glow-primary) 0%, transparent 75%)`,
            animationDelay: '5s',
          }}
        />
        
        {/* Subtle grain texture for depth - very subtle */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
    </div>
  );
}

export default BackgroundGlow;
