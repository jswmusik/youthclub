'use client';

import React, { useState, useEffect } from 'react';
import { Users, GraduationCap } from 'lucide-react';

interface Props {
  genderData: { legal_gender: string | null; count: number }[];
  gradeData: { grade: number; count: number }[];
}

const GENDER_COLORS = {
  MALE: { color: 'var(--brand-blue)', label: 'Boys', icon: '♂' },
  FEMALE: { color: '#EC4899', label: 'Girls', icon: '♀' },
  OTHER: { color: 'var(--brand-green)', label: 'Other', icon: '○' },
};

export default function DemographicCharts({ genderData, gradeData }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredGender, setHoveredGender] = useState<string | null>(null);
  const [hoveredGrade, setHoveredGrade] = useState<number | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Process gender data
  const totalGender = genderData.reduce((acc, d) => acc + d.count, 0);
  const formattedGenderData = genderData.map(d => {
    const key = d.legal_gender || 'OTHER';
    const config = GENDER_COLORS[key as keyof typeof GENDER_COLORS] || GENDER_COLORS.OTHER;
    return {
      key,
      value: d.count,
      percentage: totalGender > 0 ? Math.round((d.count / totalGender) * 100) : 0,
      ...config
    };
  });

  // Process grade data
  const maxGrade = Math.max(...gradeData.map(d => d.count), 1);

  // Calculate donut chart segments
  let cumulativePercent = 0;
  const segments = formattedGenderData.map(d => {
    const start = cumulativePercent;
    cumulativePercent += d.percentage;
    return { ...d, start, end: cumulativePercent };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      
      {/* Gender Distribution - Donut Chart */}
      <div className={`bg-[var(--dark-800)] p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#EC4899]/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#EC4899]" />
          </div>
          <h3 className="font-semibold text-[var(--brand-light)]">Gender Balance</h3>
        </div>
        
        {totalGender === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-[var(--brand-light)]/40">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No gender data available</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {segments.map((segment, i) => {
                  const radius = 35;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((segment.start / 100) * circumference);
                  const isHovered = hoveredGender === segment.key;
                  
                  return (
                    <circle
                      key={segment.key}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={isHovered ? 14 : 12}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        opacity: hoveredGender && !isHovered ? 0.4 : 1,
                        filter: isHovered ? 'brightness(1.2)' : 'none'
                      }}
                      onMouseEnter={() => setHoveredGender(segment.key)}
                      onMouseLeave={() => setHoveredGender(null)}
                    />
                  );
                })}
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--brand-light)]">
                  {hoveredGender 
                    ? formattedGenderData.find(d => d.key === hoveredGender)?.percentage || 0
                    : totalGender}
                </span>
                <span className="text-xs text-[var(--brand-light)]/50">
                  {hoveredGender 
                    ? '%'
                    : 'total'}
                </span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-row sm:flex-col gap-3 sm:gap-2 flex-wrap justify-center">
              {formattedGenderData.map(d => (
                <div 
                  key={d.key}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    hoveredGender === d.key ? 'bg-[var(--dark-600)]' : ''
                  }`}
                  onMouseEnter={() => setHoveredGender(d.key)}
                  onMouseLeave={() => setHoveredGender(null)}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-sm text-[var(--brand-light)]/80">{d.label}</span>
                  <span className="text-sm font-bold text-[var(--brand-light)]">
                    {d.value}
                  </span>
                  <span className="text-xs text-[var(--brand-light)]/40">
                    ({d.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grade Distribution - Bar Chart */}
      <div className={`bg-[var(--dark-800)] p-4 sm:p-6 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] transition-all duration-500 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-[var(--brand-purple)]" />
          </div>
          <h3 className="font-semibold text-[var(--brand-light)]">Members by Grade</h3>
        </div>
        
        {gradeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-[var(--brand-light)]/40">
            <GraduationCap className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No grade data available</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-[180px]">
            {gradeData.map((d, index) => {
              const heightPercent = (d.count / maxGrade) * 100;
              const isHovered = hoveredGrade === d.grade;
              // Calculate actual pixel height (180px container - some padding for labels)
              const barMaxHeight = 140; // Leave space for value label above
              const barHeight = Math.max((heightPercent / 100) * barMaxHeight, 8);
              
              return (
                <div 
                  key={d.grade}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  onMouseEnter={() => setHoveredGrade(d.grade)}
                  onMouseLeave={() => setHoveredGrade(null)}
                >
                  {/* Value label */}
                  <span className={`text-xs font-bold mb-1 transition-all ${
                    isHovered ? 'text-[var(--brand-purple)]' : 'text-[var(--brand-light)]/60'
                  }`}>
                    {d.count}
                  </span>
                  
                  {/* Bar */}
                  <div 
                    className={`w-full bg-gradient-to-t from-[var(--brand-purple)] to-[#A78BFA] rounded-t-md transition-all duration-500 cursor-pointer ${
                      isHovered ? 'brightness-125' : ''
                    }`}
                    style={{ 
                      height: isVisible ? `${barHeight}px` : '0px',
                      transitionDelay: `${index * 50}ms`,
                      opacity: hoveredGrade !== null && !isHovered ? 0.5 : 1,
                      minHeight: isVisible ? '8px' : '0px'
                    }}
                  />
                  
                  {/* Grade label */}
                  <span className={`text-xs mt-1 transition-all ${
                    isHovered ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/50'
                  }`}>
                    {d.grade}th
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Summary */}
        {gradeData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--dark-600)] flex items-center justify-between text-xs text-[var(--brand-light)]/40">
            <span>Total: {gradeData.reduce((a, b) => a + b.count, 0)} members</span>
            <span>
              Peak: <span className="text-[var(--brand-purple)] font-medium">
                {gradeData.reduce((max, d) => d.count > max.count ? d : max, gradeData[0])?.grade}th grade
              </span>
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
