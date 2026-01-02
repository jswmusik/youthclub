'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Package, TrendingUp } from 'lucide-react';

interface Props {
  data: { item__title: string; count: number }[];
}

export default function InventoryChart({ data }: Props) {
  const t = useTranslations('analyticsAdmin.inventory');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);
  
  const chartData = data.slice(0, 8);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  // Color gradient for bars - Top 3 get special colors, rest use purple (same as Members by Grade)
  const getBarColor = (index: number) => {
    if (index === 0) return 'from-[#FBBF24] to-[#F59E0B]'; // Gold for 1st
    if (index === 1) return 'from-[var(--brand-light)]/60 to-[var(--brand-light)]/40'; // Silver for 2nd
    if (index === 2) return 'from-[#FB923C] to-[#F97316]'; // Bronze for 3rd
    return 'from-[var(--brand-purple)] to-[#A78BFA]'; // Purple for rest (same as Members by Grade)
  };

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F97316]/20 flex items-center justify-center">
            <Package className="w-4 h-4 text-[#F97316]" />
          </div>
          <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
        </div>
        {chartData.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[var(--brand-green)]">
            <TrendingUp className="w-3 h-3" />
            <span>{t('total', { count: chartData.reduce((a, b) => a + b.count, 0) })}</span>
          </div>
        )}
      </div>
      
      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-[var(--brand-light)]/40">
          <Package className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">{t('noBorrowedItems')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const percentage = (item.count / maxCount) * 100;
            const barColor = getBarColor(index);
            
            return (
              <div 
                key={index}
                className="group"
                style={{
                  animationDelay: `${index * 80}ms`,
                  animation: isVisible ? 'slideIn 0.4s ease-out forwards' : 'none',
                  opacity: isVisible ? 1 : 0
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--brand-light)]/80 truncate max-w-[60%] group-hover:text-[var(--brand-light)] transition-colors">
                    {item.item__title}
                  </span>
                  <span className="text-sm font-bold text-[var(--brand-light)]">
                    {item.count}
                  </span>
                </div>
                <div className="h-6 bg-[var(--dark-600)] rounded-lg overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${barColor} rounded-lg transition-all duration-700 ease-out group-hover:brightness-110`}
                    style={{ 
                      width: isVisible ? `${percentage}%` : '0%',
                      transitionDelay: `${index * 80}ms`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Footer */}
      {chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--dark-600)] flex items-center justify-between">
          <span className="text-xs text-[var(--brand-light)]/40">
            {t('showingTop', { count: chartData.length })}
          </span>
          <span className="text-xs text-[var(--brand-light)]/40">
            {t('mostBorrowed', { item: '' })} <span className="text-[var(--brand-primary)] font-medium">{chartData[0]?.item__title}</span>
          </span>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateX(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
      `}</style>
    </div>
  );
}
