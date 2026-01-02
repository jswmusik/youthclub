'use client';

import { Clock, ShieldCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface TrialBannerProps {
  daysRemaining: number;
  clubName?: string;
  onDismiss?: () => void;
  dismissable?: boolean;
}

export default function TrialBanner({ 
  daysRemaining, 
  clubName, 
  onDismiss,
  dismissable = true 
}: TrialBannerProps) {
  const t = useTranslations('verification');
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed) return null;
  
  const isUrgent = daysRemaining <= 3;
  const isLastDay = daysRemaining <= 1;
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  return (
    <div className={`
      relative px-4 py-3 rounded-xl border flex items-center gap-3 transition-all
      ${isLastDay 
        ? 'bg-[var(--brand-red)]/15 border-[var(--brand-red)]/40 text-[var(--brand-red)]' 
        : isUrgent 
          ? 'bg-[var(--brand-yellow)]/15 border-[var(--brand-yellow)]/40 text-[var(--brand-yellow)]'
          : 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
      }
    `}>
      <div className={`
        flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
        ${isLastDay 
          ? 'bg-[var(--brand-red)]/20' 
          : isUrgent 
            ? 'bg-[var(--brand-yellow)]/20'
            : 'bg-[var(--brand-primary)]/20'
        }
      `}>
        <Clock className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          {isLastDay 
            ? t('lastDayWarning')
            : t('trialDaysRemaining', { days: daysRemaining })
          }
        </p>
        <p className="text-xs opacity-80 mt-0.5">
          {t('getVerifiedMessage', { clubName: clubName || t('yourClubDefault') })}
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <ShieldCheck className="w-5 h-5 opacity-60" />
        
        {dismissable && (
          <button
            onClick={handleDismiss}
            className={`
              p-1.5 rounded-lg transition-colors ml-1
              ${isLastDay 
                ? 'hover:bg-[var(--brand-red)]/20' 
                : isUrgent 
                  ? 'hover:bg-[var(--brand-yellow)]/20'
                  : 'hover:bg-[var(--brand-primary)]/20'
              }
            `}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

