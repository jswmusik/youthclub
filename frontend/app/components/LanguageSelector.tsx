'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { localeOptions, defaultLocale, type Locale } from '../../i18n/config';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline';
  showLabel?: boolean;
  darkMode?: boolean;
}

export default function LanguageSelector({ 
  variant = 'dropdown', 
  showLabel = false,
  darkMode = false 
}: LanguageSelectorProps) {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mark as hydrated after mount to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Use defaultLocale during SSR and initial hydration, then switch to actual locale
  const displayLocale = isHydrated ? locale : defaultLocale;
  
  // Find current locale option
  const currentLocale = localeOptions.find(opt => opt.code === displayLocale) || localeOptions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {localeOptions.map((option) => (
          <button
            key={option.code}
            onClick={() => handleSelect(option.code)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              displayLocale === option.code
                ? darkMode
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'bg-[#4D4DA4] text-white'
                : darkMode
                  ? 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{option.flag}</span>
            <span>{option.name}</span>
            {displayLocale === option.code && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
          darkMode
            ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Globe className="w-5 h-5" />
        <span className="text-lg">{currentLocale.flag}</span>
        {showLabel && <span className="text-sm font-medium">{currentLocale.name}</span>}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden ${
          darkMode
            ? 'bg-[var(--dark-600)] border border-[var(--dark-500)]'
            : 'bg-white border border-gray-200'
        }`}>
          {localeOptions.map((option) => (
            <button
              key={option.code}
              onClick={() => handleSelect(option.code)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                displayLocale === option.code
                  ? darkMode
                    ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                    : 'bg-[#4D4DA4]/10 text-[#4D4DA4]'
                  : darkMode
                    ? 'text-[var(--brand-light)] hover:bg-[var(--dark-500)]'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{option.flag}</span>
              <span className="flex-1 font-medium">{option.name}</span>
              {displayLocale === option.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

