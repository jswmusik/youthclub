// frontend/app/admin/components/LanguageSelector.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';

// Language configuration matching backend
export const LANGUAGES = [
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'nb', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
  { code: 'prs', name: 'دری', flag: '🇦🇫' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  label?: string;
  showLabel?: boolean;
  className?: string;
  /** If true, shows as a prominent selector bar instead of dropdown */
  variant?: 'dropdown' | 'tabs' | 'pills';
  /** Which languages to show (defaults to all) */
  availableLanguages?: LanguageCode[];
}

export default function LanguageSelector({
  value,
  onChange,
  label = 'Content Language',
  showLabel = true,
  className = '',
  variant = 'pills',
  availableLanguages,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = availableLanguages 
    ? LANGUAGES.filter(l => availableLanguages.includes(l.code))
    : LANGUAGES;

  const selectedLanguage = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pills variant - horizontal buttons
  if (variant === 'pills') {
    return (
      <div className={`${className}`}>
        {showLabel && (
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-medium text-[var(--brand-light)]/70">{label}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onChange(lang.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                value === lang.code
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] shadow-lg shadow-[var(--brand-primary)]/20'
                  : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] border border-[var(--dark-600)]'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
              {value === lang.code && <Check className="w-4 h-4 ml-1" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Tabs variant - underlined tabs
  if (variant === 'tabs') {
    return (
      <div className={`${className}`}>
        {showLabel && (
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-medium text-[var(--brand-light)]/70">{label}</span>
          </div>
        )}
        <div className="flex border-b border-[var(--dark-600)]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onChange(lang.code)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2 -mb-px ${
                value === lang.code
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:border-[var(--dark-500)]'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {showLabel && (
        <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{selectedLanguage.flag}</span>
          <span className="font-medium">{selectedLanguage.name}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--brand-light)]/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--dark-800)] border border-[var(--dark-600)] rounded-xl shadow-xl overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                value === lang.code
                  ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
              {value === lang.code && <Check className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Badge component for showing language in lists
export function LanguageBadge({ code, size = 'sm' }: { code: string; size?: 'sm' | 'md' }) {
  const lang = LANGUAGES.find(l => l.code === code);
  if (!lang) return null;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span className={`inline-flex items-center ${sizeClasses} bg-[var(--dark-700)] text-[var(--brand-light)]/70 rounded-full border border-[var(--dark-600)]`}>
      <span>{lang.flag}</span>
      <span>{lang.code.toUpperCase()}</span>
    </span>
  );
}

// Admin Language Selector - a simpler interface for admin pages
interface AdminLanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  languages?: string[];
  variant?: 'dropdown' | 'tabs' | 'pills';
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function AdminLanguageSelector({
  currentLanguage,
  onLanguageChange,
  languages,
  variant = 'dropdown',
  className = '',
  showLabel = false,
  label = 'Content Language',
}: AdminLanguageSelectorProps) {
  // Filter LANGUAGES to only include the ones specified, or use all
  const availableLanguages = languages 
    ? LANGUAGES.filter(l => languages.includes(l.code))
    : LANGUAGES;

  return (
    <LanguageSelector
      value={currentLanguage as LanguageCode}
      onChange={(lang) => onLanguageChange(lang)}
      variant={variant}
      className={className}
      showLabel={showLabel}
      label={label}
      availableLanguages={availableLanguages.map(l => l.code)}
    />
  );
}

