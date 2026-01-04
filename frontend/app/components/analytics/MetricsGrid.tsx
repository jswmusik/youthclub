'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrafficMetrics, InventoryMetrics } from '@/lib/analytics-api';
import { Users, Clock, ArrowRightLeft, Package, UserCheck, UsersRound } from 'lucide-react';

interface Props {
  totalMembers: number;
  traffic: TrafficMetrics;
  inventory: InventoryMetrics;
  network?: { nomad_percentage: number };
}

// Animated counter component
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (value - startValue) * easeOut);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return (
    <span>
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  subtitleHighlight?: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  delay?: number;
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  suffix = '', 
  subtitle, 
  subtitleHighlight,
  gradientFrom, 
  gradientTo,
  accentColor,
  delay = 0 
}: MetricCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <div 
      className={`
        bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] 
        hover:border-[${accentColor}]/50 transition-all duration-300 group
        transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      style={{ 
        transitionDelay: `${delay}ms`,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
          style={{ 
            backgroundColor: accentColor,
            boxShadow: `0 4px 14px ${accentColor}33` 
          }}
        >
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/60 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-1" style={{ color: accentColor }}>
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
      {subtitle && (
        <div className="text-xs text-[var(--brand-light)]/40 flex items-center gap-1">
          {subtitle}
          {subtitleHighlight && (
            <span className="text-[var(--brand-red)] font-medium">{subtitleHighlight}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function MetricsGrid({ totalMembers, traffic, inventory, network }: Props) {
  const t = useTranslations('analyticsAdmin.metrics');
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      
      {/* 1. Total Members */}
      <MetricCard
        icon={<UsersRound className="w-5 h-5 text-[var(--dark-900)]" />}
        label={t('members')}
        value={totalMembers}
        subtitle={t('basedOnFilters')}
        gradientFrom="from-[var(--brand-primary)]"
        gradientTo="to-[var(--brand-purple)]"
        accentColor="var(--brand-primary)"
        delay={0}
      />

      {/* 2. Total Traffic */}
      <MetricCard
        icon={<Users className="w-5 h-5 text-[var(--dark-900)]" />}
        label={t('visits')}
        value={traffic.total_visits}
        subtitle={t('uniqueYouths', { count: traffic.unique_visitors })}
        gradientFrom="from-[var(--brand-blue)]"
        gradientTo="to-[#38BDF8]"
        accentColor="var(--brand-blue)"
        delay={50}
      />

      {/* 3. Average Stay Duration */}
      <MetricCard
        icon={<Clock className="w-5 h-5 text-[var(--dark-900)]" />}
        label={t('avgStay')}
        value={traffic.avg_duration_minutes}
        suffix="m"
        subtitle={t('medianTime')}
        gradientFrom="from-[var(--brand-green)]"
        gradientTo="to-[var(--brand-third)]"
        accentColor="var(--brand-green)"
        delay={100}
      />

      {/* 4. Retention Rate */}
      <MetricCard
        icon={<UserCheck className="w-5 h-5 text-[var(--dark-900)]" />}
        label={t('retention')}
        value={traffic.retention_rate}
        suffix="%"
        subtitle={t('returnedFromPrev')}
        gradientFrom="from-[var(--brand-purple)]"
        gradientTo="to-[#A78BFA]"
        accentColor="var(--brand-purple)"
        delay={150}
      />

      {/* 5. Inventory or Nomad Metric */}
      <MetricCard
        icon={network ? <ArrowRightLeft className="w-5 h-5 text-[var(--dark-900)]" /> : <Package className="w-5 h-5 text-[var(--dark-900)]" />}
        label={network ? t('nomads') : t('loans')}
        value={network ? network.nomad_percentage : inventory.total_loans}
        suffix={network ? '%' : ''}
        subtitle={network ? t('visitMultipleClubs') : t('itemsBorrowed')}
        subtitleHighlight={!network && inventory.dust_collectors && inventory.dust_collectors > 0 ? t('unused', { count: inventory.dust_collectors }) : undefined}
        gradientFrom="from-[#F97316]"
        gradientTo="to-[#FB923C]"
        accentColor="#F97316"
        delay={200}
      />

    </div>
  );
}
