'use client';

import { X, Building2, Mail, Phone, MapPin, Clock, ShieldX, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ClubInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  municipality_name: string | null;
}

interface VerificationRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubInfo: ClubInfo | null;
  blockReason: 'not_verified' | 'trial_expired' | 'no_club';
}

export default function VerificationRequiredModal({
  isOpen,
  onClose,
  clubInfo,
  blockReason,
}: VerificationRequiredModalProps) {
  const t = useTranslations('verification');
  
  if (!isOpen) return null;

  const getIcon = () => {
    switch (blockReason) {
      case 'trial_expired':
        return <Clock className="w-8 h-8 text-[var(--brand-yellow)]" />;
      case 'no_club':
        return <HelpCircle className="w-8 h-8 text-[var(--brand-light)]/70" />;
      default:
        return <ShieldX className="w-8 h-8 text-[var(--brand-primary)]" />;
    }
  };

  const getIconBgColor = () => {
    switch (blockReason) {
      case 'trial_expired':
        return 'bg-[var(--brand-yellow)]/20 border-[var(--brand-yellow)]/30';
      case 'no_club':
        return 'bg-[var(--dark-600)] border-[var(--dark-500)]';
      default:
        return 'bg-[var(--brand-primary)]/20 border-[var(--brand-primary)]/30';
    }
  };

  const getTitle = () => {
    switch (blockReason) {
      case 'trial_expired':
        return t('trialExpiredTitle');
      case 'no_club':
        return t('noClubTitle');
      default:
        return t('verificationRequiredTitle');
    }
  };

  const getDescription = () => {
    switch (blockReason) {
      case 'trial_expired':
        return t('trialExpiredDescription');
      case 'no_club':
        return t('noClubDescription');
      default:
        return t('verificationRequiredDescription');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-[var(--brand-primary)]/10 to-transparent">
          <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full border ${getIconBgColor()}`}>
            {getIcon()}
          </div>
          
          <h2 className="text-xl font-bold text-center text-[var(--brand-light)]">
            {getTitle()}
          </h2>
          
          <p className="mt-2 text-sm text-center text-[var(--brand-light)]/70 leading-relaxed">
            {getDescription()}
          </p>
        </div>
        
        {/* Club Info */}
        {clubInfo && blockReason !== 'no_club' && (
          <div className="px-6 pb-2">
            <p className="text-xs uppercase tracking-wider text-[var(--brand-light)]/50 mb-3 font-medium">
              {t('yourClub')}
            </p>
            <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30">
                  <Building2 className="w-6 h-6 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--brand-light)]">{clubInfo.name}</p>
                  {clubInfo.municipality_name && (
                    <p className="text-xs text-[var(--brand-light)]/50">{clubInfo.municipality_name}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2.5 text-sm">
                {clubInfo.email && (
                  <a 
                    href={`mailto:${clubInfo.email}`}
                    className="flex items-center gap-3 text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--dark-600)] group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="truncate">{clubInfo.email}</span>
                  </a>
                )}
                {clubInfo.phone && (
                  <a 
                    href={`tel:${clubInfo.phone}`}
                    className="flex items-center gap-3 text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--dark-600)] group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span>{clubInfo.phone}</span>
                  </a>
                )}
                {clubInfo.address && (
                  <div className="flex items-center gap-3 text-[var(--brand-light)]/70">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--dark-600)]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>{clubInfo.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No club message */}
        {blockReason === 'no_club' && (
          <div className="px-6 pb-2">
            <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
              <p className="text-sm text-[var(--brand-light)]/70 text-center">
                {t('noClubHelp')}
              </p>
            </div>
          </div>
        )}
        
        {/* Help text */}
        <div className="px-6 py-4">
          <p className="text-sm text-center text-[var(--brand-light)]/60 leading-relaxed">
            {blockReason === 'no_club' ? t('contactSupportMessage') : t('contactClubMessage')}
          </p>
        </div>
        
        {/* Action */}
        <div className="p-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-colors"
          >
            {t('understood')}
          </button>
        </div>
      </div>
    </div>
  );
}

