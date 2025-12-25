// frontend/app/(public)/components/KPITicker.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Calendar, MapPin, Package } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.208:8000/api';

interface KPIStats {
  members: number;
  events: number;
  checkins: number;
  borrowed: number;
  clubs: number;
}

// Animated counter component
function AnimatedCounter({ 
  value, 
  duration = 2000,
  suffix = '' 
}: { 
  value: number; 
  duration?: number;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateValue(0, value, duration);
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  const animateValue = (start: number, end: number, duration: number) => {
    const startTimestamp = performance.now();
    
    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(start + (end - start) * easeOutQuart);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('sv-SE');
  };

  return (
    <span ref={counterRef} className="tabular-nums">
      {formatNumber(displayValue)}{suffix}
    </span>
  );
}

export default function KPITicker() {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/marketing/public/kpi/`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch KPI stats:', error);
        // Set fallback stats for demo
        setStats({
          members: 25403,
          events: 1247,
          checkins: 89542,
          borrowed: 12890,
          clubs: 156,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const kpiItems = stats ? [
    {
      icon: Users,
      value: stats.members,
      label: 'Aktiva ungdomar',
      color: 'var(--brand-primary)',
    },
    {
      icon: Calendar,
      value: stats.events,
      label: 'Evenemang i år',
      color: 'var(--brand-purple)',
    },
    {
      icon: MapPin,
      value: stats.checkins,
      label: 'Besök totalt',
      color: 'var(--brand-sky)',
    },
    {
      icon: Package,
      value: stats.borrowed,
      label: 'Saker utlånade',
      color: 'var(--brand-green)',
    },
  ] : [];

  if (loading) {
    return (
      <section className="py-12 px-4 bg-[var(--dark-800)] border-y border-[var(--dark-600)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center animate-pulse">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--dark-600)]" />
                <div className="h-8 w-24 mx-auto mb-2 rounded bg-[var(--dark-600)]" />
                <div className="h-4 w-20 mx-auto rounded bg-[var(--dark-600)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 bg-[var(--dark-800)] border-y border-[var(--dark-600)] overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <p className="text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-wider mb-2">
            Plattformens puls
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
            Tillsammans skapar vi aktivitet
          </h2>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {kpiItems.map((item, index) => (
            <div
              key={index}
              className="group text-center p-6 rounded-2xl bg-[var(--dark-700)]/50 border border-[var(--dark-600)] hover:border-[var(--dark-500)] transition-all hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div 
                className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ 
                  backgroundColor: `${item.color}20`,
                }}
              >
                <item.icon 
                  className="w-7 h-7" 
                  style={{ color: item.color }}
                />
              </div>

              {/* Value */}
              <div 
                className="text-3xl sm:text-4xl font-bold mb-1 font-heading"
                style={{ color: item.color }}
              >
                <AnimatedCounter value={item.value} />
              </div>

              {/* Label */}
              <p className="text-[var(--brand-light)]/60 text-sm font-medium">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

