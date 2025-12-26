'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

interface HeatmapProps {
  data: { weekday: number; hour: number; count: number }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Color scale for heatmap cells
function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return 'bg-[var(--dark-600)]';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  
  if (intensity < 0.2) return 'bg-[var(--brand-primary)]/20';
  if (intensity < 0.4) return 'bg-[var(--brand-primary)]/40';
  if (intensity < 0.6) return 'bg-[var(--brand-primary)]/60';
  if (intensity < 0.8) return 'bg-[var(--brand-primary)]/80';
  return 'bg-[var(--brand-primary)]';
}

interface TooltipData {
  day: string;
  hour: number;
  count: number;
  x: number;
  y: number;
}

export default function HeatmapChart({ data }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  let maxCount = 0;
  
  data.forEach(d => {
    const key = `${d.weekday}-${d.hour}`;
    dataMap.set(key, d.count);
    if (d.count > maxCount) maxCount = d.count;
  });
  
  const handleCellHover = (e: React.MouseEvent, day: number, hour: number, count: number) => {
    if (!containerRef.current) return;
    
    const cellRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the container
    setTooltip({
      day: DAYS[day - 1],
      hour,
      count,
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top
    });
  };
  
  return (
    <div 
      ref={containerRef}
      className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6 transition-all duration-500 relative ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-[var(--brand-blue)]" />
        </div>
        <h3 className="font-semibold text-[var(--brand-light)]">Peak Traffic Hours</h3>
      </div>
      
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex pl-12 mb-1">
            {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
              <div 
                key={hour} 
                className="flex-1 text-center text-xs text-[var(--brand-light)]/40"
                style={{ minWidth: '12px' }}
              >
                {hour}:00
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <div key={day} className="flex items-center gap-2">
                {/* Day label */}
                <div className="w-10 text-xs font-medium text-[var(--brand-light)]/60 text-right">
                  {DAYS[day - 1]}
                </div>
                
                {/* Hour cells */}
                <div className="flex-1 flex gap-0.5">
                  {HOURS.map(hour => {
                    const key = `${day}-${hour}`;
                    const count = dataMap.get(key) || 0;
                    const colorClass = getHeatColor(count, maxCount);
                    
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-6 sm:h-8 rounded-sm ${colorClass} hover:ring-2 hover:ring-[var(--brand-primary)] hover:ring-offset-1 hover:ring-offset-[var(--dark-800)] transition-all cursor-pointer`}
                        style={{
                          animationDelay: `${(day * 24 + hour) * 5}ms`,
                          animation: isVisible ? 'fadeIn 0.3s ease-out forwards' : 'none',
                          opacity: isVisible ? 1 : 0
                        }}
                        onMouseEnter={(e) => handleCellHover(e, day, hour, count)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--dark-600)]">
        <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/50">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-[var(--dark-600)]" />
            <div className="w-4 h-4 rounded-sm bg-[var(--brand-primary)]/20" />
            <div className="w-4 h-4 rounded-sm bg-[var(--brand-primary)]/40" />
            <div className="w-4 h-4 rounded-sm bg-[var(--brand-primary)]/60" />
            <div className="w-4 h-4 rounded-sm bg-[var(--brand-primary)]/80" />
            <div className="w-4 h-4 rounded-sm bg-[var(--brand-primary)]" />
          </div>
          <span>More</span>
        </div>
        <span className="text-xs text-[var(--brand-light)]/40">
          Max: {maxCount} visits
        </span>
      </div>
      
      {/* Tooltip - positioned relative to container */}
      {tooltip && (
        <div 
          className="absolute z-50 px-3 py-2 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg shadow-xl pointer-events-none"
          style={{ 
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="text-sm font-medium text-[var(--brand-light)]">
            {tooltip.day} at {tooltip.hour}:00
          </p>
          <p className="text-sm text-[var(--brand-primary)] font-bold">
            {tooltip.count} {tooltip.count === 1 ? 'visit' : 'visits'}
          </p>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
