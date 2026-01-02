'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, ChevronDown, ChevronUp, Eye, EyeOff, Check, X } from 'lucide-react';
import { AnalyticsPreferences } from '@/lib/analytics-api';
import { useAnalyticsSections } from '@/hooks/useAnalyticsPreferences';

interface Props {
  preferences: AnalyticsPreferences;
  onToggle: (section: keyof AnalyticsPreferences) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  isMunicipality?: boolean;
}

export default function AnalyticsSettingsCard({
  preferences,
  onToggle,
  onShowAll,
  onHideAll,
  isMunicipality = false,
}: Props) {
  const t = useTranslations('analyticsAdmin.settings');
  const [isExpanded, setIsExpanded] = useState(false);
  const ANALYTICS_SECTIONS = useAnalyticsSections();

  // Filter sections based on admin type
  const sections = ANALYTICS_SECTIONS.filter(
    (section) => !section.municipalityOnly || isMunicipality
  );

  // Count visible sections
  const visibleCount = sections.filter((s) => preferences[s.key]).length;
  const totalCount = sections.length;

  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[var(--dark-700)]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--dark-600)] to-[var(--dark-500)] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[var(--brand-light)]/70" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
            <p className="text-xs text-[var(--brand-light)]/50">
              {t('sectionsVisible', { visible: visibleCount, total: totalCount })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick toggle indicator */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[var(--dark-700)] rounded-full">
            <Eye className="w-3 h-3 text-[var(--brand-light)]/50" />
            <span className="text-xs text-[var(--brand-light)]/50">{visibleCount}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/50" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/50" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[var(--dark-600)]">
          {/* Quick Actions */}
          <div className="flex items-center justify-between py-4 border-b border-[var(--dark-600)]">
            <span className="text-sm text-[var(--brand-light)]/70">{t('quickActions')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onShowAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand-green)] bg-[var(--brand-green)]/10 rounded-lg hover:bg-[var(--brand-green)]/20 transition-colors"
              >
                <Check className="w-3 h-3" />
                {t('showAll')}
              </button>
              <button
                onClick={onHideAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand-light)]/50 bg-[var(--dark-600)] rounded-lg hover:bg-[var(--dark-500)] transition-colors"
              >
                <X className="w-3 h-3" />
                {t('hideAll')}
              </button>
            </div>
          </div>

          {/* Section Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-4">
            {sections.map((section) => {
              const isVisible = preferences[section.key];
              
              return (
                <button
                  key={section.key}
                  onClick={() => onToggle(section.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isVisible
                      ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/20'
                      : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)] opacity-60'
                  }`}
                >
                  {/* Icon */}
                  <span className="text-lg flex-shrink-0">{section.icon}</span>
                  
                  {/* Label */}
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isVisible ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/50'
                    }`}>
                      {section.label}
                    </p>
                    <p className="text-[10px] text-[var(--brand-light)]/40 truncate">
                      {section.description}
                    </p>
                  </div>
                  
                  {/* Toggle indicator */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isVisible
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--dark-500)] text-[var(--brand-light)]/30'
                  }`}>
                    {isVisible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Help text */}
          <p className="text-xs text-[var(--brand-light)]/30 mt-4 text-center">
            {t('preferencesNote')}
          </p>
        </div>
      </div>
    </div>
  );
}

