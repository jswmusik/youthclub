'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Club } from '@/types/organization';
import { sanitizeAndStripColors } from '@/lib/sanitize';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ClubPoliciesProps {
  club: Club;
  darkMode?: boolean;
}

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string | null | undefined;
  fallbackText: string;
  darkMode: boolean;
  defaultOpen?: boolean;
}

function AccordionSection({ title, icon, content, fallbackText, darkMode, defaultOpen = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasContent = content && content.trim().length > 0;

  return (
    <div className={`rounded-xl border overflow-hidden ${
      darkMode 
        ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
        : 'bg-white shadow-sm border-[#4D4DA4]/10'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-6 flex items-center justify-between text-left transition-colors ${
          darkMode 
            ? 'hover:bg-[var(--dark-700)]' 
            : 'hover:bg-gray-50'
        }`}
      >
        <h3 className={`text-lg font-bold flex items-center font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>
          {icon}
          {title}
        </h3>
        <div className={`ml-4 flex-shrink-0 ${
          darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-400'
        }`}>
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className={`px-6 pb-6 border-t ${
          darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'
        }`}>
          {hasContent ? (
            <div 
              className={`prose prose-sm max-w-none pt-4 rich-text-content ${
                darkMode ? 'prose-invert' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizeAndStripColors(content) }}
            />
          ) : (
            <p className={`pt-4 ${
              darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
            }`}>
              {fallbackText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClubPolicies({ club, darkMode = false }: ClubPoliciesProps) {
  const t = useTranslations('club.policies');
  
  return (
    <div className="flex flex-col gap-4 px-4 sm:px-0 max-w-4xl mx-auto">
      <AccordionSection
        title={t('clubPolicies')}
        icon={
          <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        content={club.club_policies}
        fallbackText={t('noPolicies')}
        darkMode={darkMode}
      />

      <AccordionSection
        title={t('termsAndConditions')}
        icon={
          <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        content={club.terms_and_conditions}
        fallbackText={t('standardTerms')}
        darkMode={darkMode}
      />
    </div>
  );
}
