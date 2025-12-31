'use client';

import { ChildLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';
import { useTranslations } from 'next-intl';
import { User, Trash2, Star, Check, X, GraduationCap } from 'lucide-react';

interface ChildCardProps {
  link: ChildLink;
  onView: (link: ChildLink) => void;
  onRemove: (link: ChildLink) => void;
  onApprove?: (link: ChildLink) => void;
  onReject?: (link: ChildLink) => void;
  onSetPrimary?: (link: ChildLink) => void;
  darkMode?: boolean;
}

export default function ChildCard({ 
  link, 
  onView, 
  onRemove, 
  onApprove, 
  onReject, 
  onSetPrimary,
  darkMode = false 
}: ChildCardProps) {
  const t = useTranslations('children');
  const tProfile = useTranslations('profile');
  const { status, is_primary_guardian, youth_first_name, youth_last_name, youth_email, youth_grade, youth_avatar } = link;
  
  const isPending = status === 'PENDING';
  const isActive = status === 'ACTIVE';
  const isRejected = status === 'REJECTED';
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('active');
      case 'PENDING':
        return t('pending');
      case 'REJECTED':
        return t('rejected');
      default:
        return status;
    }
  };
  
  // Status Badge Colors
  const statusStyles = darkMode ? {
    ACTIVE: 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30',
    PENDING: 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30',
    REJECTED: 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30',
  } : {
    ACTIVE: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
    PENDING: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white',
    REJECTED: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
  };

  return (
    <div className={`p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${
      darkMode 
        ? 'bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
        : 'bg-white rounded-2xl shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-lg hover:border-[#4D4DA4]/30'
    } ${isPending ? (darkMode ? 'ring-2 ring-[var(--brand-peach)]/30' : 'ring-2 ring-amber-200') : ''}`}>
      
      {/* Primary Badge */}
      {is_primary_guardian && isActive && (
        <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
          darkMode 
            ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
            : 'bg-gradient-to-r from-[#4D4DA4]/10 to-[#6D6DD4]/10 text-[#4D4DA4]'
        }`}>
          <Star className="w-3 h-3 fill-current" />
          {t('primaryChild')}
        </div>
      )}
      
      {/* Top Row: Avatar & Status */}
      <div className="flex justify-between items-start">
        <div className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 ${
          darkMode 
            ? 'bg-[var(--dark-600)] border-2 border-[var(--dark-400)]' 
            : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[#FF5485]/10 border-2 border-[#4D4DA4]/20 shadow-sm'
        }`}>
          {youth_avatar ? (
            <img 
              src={getMediaUrl(youth_avatar)} 
              alt={youth_first_name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center font-bold text-2xl ${
              darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'
            }`}>
              {youth_first_name?.[0] || ''}{youth_last_name?.[0] || ''}
            </div>
          )}
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${statusStyles[status] || (darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60' : 'bg-gray-100')}`}>
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Info */}
      <div>
        <h3 className={`font-bold text-xl mb-1 truncate font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
        }`}>
          {youth_first_name} {youth_last_name}
        </h3>
        <p className={`text-sm font-bold capitalize mb-2 flex items-center gap-1 ${
          darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
        }`}>
          <User className="w-4 h-4" />
          {tProfile('youth')}
        </p>
        {youth_grade && (
          <p className={`text-xs flex items-center gap-1 mb-2 ${
            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
          }`}>
            <GraduationCap className="w-3 h-3" />
            {t('grade')}: {youth_grade}
          </p>
        )}
        <p className={`text-xs truncate px-2 py-1 rounded-lg ${
          darkMode 
            ? 'text-[var(--brand-light)]/60 bg-[var(--dark-600)]' 
            : 'text-gray-600 bg-gray-50'
        }`}>{youth_email}</p>
      </div>

      {/* Pending Actions */}
      {isPending && onApprove && onReject && (
        <div className={`p-3 rounded-xl text-center ${
          darkMode 
            ? 'bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30' 
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className={`text-xs font-medium mb-3 ${
            darkMode ? 'text-[var(--brand-peach)]' : 'text-amber-700'
          }`}>
            {t('pendingApproval')}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => onApprove(link)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                darkMode 
                  ? 'bg-[var(--brand-third)] text-[var(--dark-900)] hover:bg-[var(--brand-third)]/80' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md'
              }`}
            >
              <Check className="w-4 h-4" />
              {t('approve')}
            </button>
            <button 
              onClick={() => onReject(link)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                darkMode 
                  ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/80 hover:bg-[var(--brand-red)]/20 hover:text-[var(--brand-red)]' 
                  : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
              {t('reject')}
            </button>
          </div>
        </div>
      )}

      {/* Actions for Active/Rejected */}
      {!isPending && (
        <div className="flex gap-2 mt-auto pt-2">
          <button 
            onClick={() => onView(link)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              darkMode 
                ? 'bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)]/80 text-[var(--brand-light)]' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md shadow-[#4D4DA4]/20'
            }`}
          >
            {t('viewDetails')}
          </button>
          
          {/* Set Primary Button (only for active connections) */}
          {isActive && onSetPrimary && (
            <button 
              onClick={() => onSetPrimary(link)}
              className={`w-11 flex items-center justify-center rounded-xl transition-colors ${
                is_primary_guardian
                  ? darkMode 
                    ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                    : 'bg-[#4D4DA4]/10 text-[#4D4DA4]'
                  : darkMode 
                    ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:bg-[var(--brand-primary)]/20 hover:text-[var(--brand-primary)]' 
                    : 'bg-gray-100 text-gray-500 hover:bg-[#4D4DA4]/10 hover:text-[#4D4DA4]'
              }`}
              title={is_primary_guardian ? t('removePrimary') : t('setPrimary')}
            >
              <Star className={`w-5 h-5 ${is_primary_guardian ? 'fill-current' : ''}`} />
            </button>
          )}
          
          <button 
            onClick={() => onRemove(link)}
            className={`w-11 flex items-center justify-center rounded-xl transition-colors ${
              darkMode 
                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:bg-[var(--brand-red)]/20 hover:text-[var(--brand-red)]' 
                : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
            }`}
            title={t('removeChild')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

