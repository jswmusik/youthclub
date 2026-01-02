'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardList, Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import { QuestionnaireMetrics } from '@/lib/analytics-api';

interface Props {
  data: QuestionnaireMetrics;
}

export default function QuestionnaireAnalyticsCard({ data }: Props) {
  const t = useTranslations('analyticsAdmin.questionnaire');
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState({
    completed: 0,
    started: 0,
    notParticipated: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate the donut chart segments
  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedValues({
        completed: data.participation.completed_pct * easeOut,
        started: data.participation.started_pct * easeOut,
        notParticipated: data.participation.not_participated_pct * easeOut,
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isVisible, data.participation]);

  // Calculate donut chart segments
  const completedAngle = (animatedValues.completed / 100) * 360;
  const startedAngle = (animatedValues.started / 100) * 360;
  const notParticipatedAngle = (animatedValues.notParticipated / 100) * 360;

  // SVG donut chart helper
  const createArc = (startAngle: number, endAngle: number, radius: number = 40, strokeWidth: number = 12) => {
    const centerX = 50;
    const centerY = 50;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Gender colors
  const genderColors = {
    male: '#3B82F6',     // Blue
    female: '#EC4899',   // Pink
    other: '#A78BFA',    // Purple
  };

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
            <p className="text-xs text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--brand-light)]">{data.total_questionnaires}</p>
          <p className="text-xs text-[var(--brand-light)]/50">{t('questionnaires')}</p>
        </div>
      </div>

      {data.total_questionnaires === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-[var(--brand-light)]/40">
          <ClipboardList className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm">{t('noQuestionnaires')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participation Donut Chart */}
          <div>
            <h4 className="text-sm font-medium text-[var(--brand-light)]/70 mb-4">{t('participationRate')}</h4>
            <div className="flex items-center gap-6">
              {/* Donut Chart */}
              <div className="relative w-[120px] h-[120px] flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="var(--dark-600)"
                    strokeWidth="12"
                  />
                  
                  {/* Completed segment (Green) */}
                  {completedAngle > 0 && (
                    <path
                      d={createArc(0, completedAngle)}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  )}
                  
                  {/* Started segment (Yellow) */}
                  {startedAngle > 0 && (
                    <path
                      d={createArc(completedAngle, completedAngle + startedAngle)}
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  )}
                  
                  {/* Not Participated segment (Gray) */}
                  {notParticipatedAngle > 0 && completedAngle + startedAngle < 359 && (
                    <path
                      d={createArc(completedAngle + startedAngle, completedAngle + startedAngle + notParticipatedAngle)}
                      fill="none"
                      stroke="var(--dark-500)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  )}
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-[var(--brand-light)]">
                    {data.total_responses}
                  </span>
                  <span className="text-[10px] text-[var(--brand-light)]/50">{t('responses')}</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-[#10B981]" />
                    <span className="text-xs text-[var(--brand-light)]/70">{t('completed')}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.participation.completed_pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#FBBF24]" />
                    <span className="text-xs text-[var(--brand-light)]/70">{t('started')}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.participation.started_pct}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--dark-500)]" />
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-[var(--dark-500)]" />
                    <span className="text-xs text-[var(--brand-light)]/70">{t('noResponse')}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--brand-light)] ml-auto">
                    {data.participation.not_participated_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gender Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-[var(--brand-light)]/70 mb-4">{t('participantGender')}</h4>
            <div className="space-y-3">
              {/* Male */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--brand-light)]/70">{t('male')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)]">
                    {data.gender_breakdown.male_count} ({data.gender_breakdown.male_pct}%)
                  </span>
                </div>
                <div className="h-3 bg-[var(--dark-600)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: isVisible ? `${data.gender_breakdown.male_pct}%` : '0%',
                      backgroundColor: genderColors.male,
                    }}
                  />
                </div>
              </div>

              {/* Female */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--brand-light)]/70">{t('female')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)]">
                    {data.gender_breakdown.female_count} ({data.gender_breakdown.female_pct}%)
                  </span>
                </div>
                <div className="h-3 bg-[var(--dark-600)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: isVisible ? `${data.gender_breakdown.female_pct}%` : '0%',
                      backgroundColor: genderColors.female,
                      transitionDelay: '100ms',
                    }}
                  />
                </div>
              </div>

              {/* Other */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--brand-light)]/70">{t('other')}</span>
                  <span className="text-xs font-bold text-[var(--brand-light)]">
                    {data.gender_breakdown.other_count} ({data.gender_breakdown.other_pct}%)
                  </span>
                </div>
                <div className="h-3 bg-[var(--dark-600)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: isVisible ? `${data.gender_breakdown.other_pct}%` : '0%',
                      backgroundColor: genderColors.other,
                      transitionDelay: '200ms',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Total eligible */}
            <div className="mt-4 pt-4 border-t border-[var(--dark-600)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--brand-light)]/50 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t('totalEligible')}
                </span>
                <span className="text-[var(--brand-light)] font-medium">{data.total_eligible}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

