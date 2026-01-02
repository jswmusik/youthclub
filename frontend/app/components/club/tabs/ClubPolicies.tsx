import React from 'react';
import { useTranslations } from 'next-intl';
import { Club } from '@/types/organization';

interface ClubPoliciesProps {
  club: Club;
  darkMode?: boolean;
}

export default function ClubPolicies({ club, darkMode = false }: ClubPoliciesProps) {
  const t = useTranslations('club.policies');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-0">
      <div className={`rounded-xl p-6 border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white shadow-sm border-[#4D4DA4]/10'
      }`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>
          <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('clubPolicies')}
        </h3>
        <div className={`prose prose-sm max-w-none whitespace-pre-line ${
          darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
        }`}>
          {club.club_policies || t('noPolicies')}
        </div>
      </div>

      <div className={`rounded-xl p-6 border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white shadow-sm border-[#4D4DA4]/10'
      }`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>
          <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('termsAndConditions')}
        </h3>
        <div className={`prose prose-sm max-w-none whitespace-pre-line ${
          darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
        }`}>
          {club.terms_and_conditions || t('standardTerms')}
        </div>
      </div>
    </div>
  );
}
