'use client';

import { ChildLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';
import { useTranslations } from 'next-intl';
import { X, Mail, User, AlertCircle, CheckCircle, GraduationCap, Calendar, Star, Shield } from 'lucide-react';

interface ModalProps {
  link: ChildLink | null;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export default function ChildDetailModal({ link, isOpen, onClose, darkMode = false }: ModalProps) {
  const t = useTranslations('children');
  const tProfile = useTranslations('profile');
  
  if (!isOpen || !link) return null;

  const { status, youth_first_name, youth_last_name, youth_email, youth_grade, youth_avatar, is_primary_guardian, relationship_type, created_at, verified_at } = link;
  const isActive = status === 'ACTIVE';
  const isPending = status === 'PENDING';
  
  const getRelationshipLabel = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'mother') return t('relationshipTypes.mother');
    if (typeLower === 'father') return t('relationshipTypes.father');
    if (typeLower === 'guardian') return t('relationshipTypes.guardian');
    if (typeLower === 'sibling') return t('relationshipTypes.sibling');
    return t('relationshipTypes.other');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
        darkMode ? 'bg-black/70' : 'bg-black/50'
      }`}
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className={`w-full max-w-md overflow-hidden ${
          darkMode 
            ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-500)]' 
            : 'bg-white rounded-3xl shadow-2xl'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        
        {/* Header */}
        <div className={`p-8 text-center relative ${
          darkMode 
            ? 'bg-gradient-to-br from-[var(--brand-secondary)] via-[var(--brand-purple)] to-[var(--brand-primary)]' 
            : 'bg-gradient-to-br from-[#4D4DA4] via-[#6D6DD4] to-[var(--brand-primary)]'
        }`}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Primary Badge */}
          {is_primary_guardian && isActive && (
            <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-white/20 text-white">
              <Star className="w-3 h-3 fill-current" />
              {t('primaryChild')}
            </div>
          )}
          
          <div className={`w-28 h-28 mx-auto rounded-2xl p-1.5 mb-4 ${
            darkMode ? 'bg-[var(--dark-800)]' : 'bg-white shadow-xl'
          }`}>
            {youth_avatar ? (
              <img 
                src={getMediaUrl(youth_avatar)} 
                className="w-full h-full rounded-xl object-cover"
                alt="Avatar" 
              />
            ) : (
              <div className={`w-full h-full rounded-xl flex items-center justify-center font-bold text-3xl ${
                darkMode 
                  ? 'bg-[var(--dark-600)] text-[var(--brand-purple)]' 
                  : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[var(--brand-primary)]/10 text-[#4D4DA4]'
              }`}>
                {youth_first_name?.[0] || ''}{youth_last_name?.[0] || ''}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-1 font-heading text-white">{youth_first_name} {youth_last_name}</h2>
          <p className="text-white/90 text-sm font-semibold capitalize flex items-center justify-center gap-1.5">
            <User className="w-4 h-4" />
            {tProfile('youth')}
          </p>
        </div>

        {/* Content */}
        <div className={`p-6 space-y-5 ${darkMode ? 'bg-[var(--dark-800)]' : ''}`}>
          {isPending && (
            <div className={`p-4 rounded-xl text-sm flex gap-3 items-start ${
              darkMode 
                ? 'bg-[var(--brand-peach)]/10 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{t('pendingApproval')}</p>
            </div>
          )}

          {isActive && (
            <div className={`p-4 rounded-xl text-sm flex gap-3 items-center ${
              darkMode 
                ? 'bg-[var(--brand-third)]/10 text-[var(--brand-third)] border border-[var(--brand-third)]/30' 
                : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p className="font-bold">{t('active')}</p>
            </div>
          )}

          <div className="space-y-4">
            <InfoRow 
              icon={<Mail className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />} 
              label={t('email')} 
              value={youth_email || t('notProvided')} 
              darkMode={darkMode}
            />
            
            {youth_grade && (
              <InfoRow 
                icon={<GraduationCap className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />} 
                label={t('grade')} 
                value={String(youth_grade)} 
                darkMode={darkMode}
              />
            )}
            
            <InfoRow 
              icon={<Shield className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-500'}`} />}
              label={t('yourRelationship')} 
              value={getRelationshipLabel(relationship_type)} 
              darkMode={darkMode}
            />
            
            <InfoRow 
              icon={<Calendar className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />}
              label={t('connectedSince')} 
              value={formatDate(created_at)} 
              darkMode={darkMode}
            />
            
            {verified_at && (
              <InfoRow 
                icon={<CheckCircle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-500'}`} />}
                label={t('verifiedAt')} 
                value={formatDate(verified_at)} 
                darkMode={darkMode}
              />
            )}
          </div>
        </div>

        <div className={`p-6 border-t flex justify-end gap-2 ${
          darkMode 
            ? 'border-[var(--dark-500)] bg-[var(--dark-700)]' 
            : 'border-[#4D4DA4]/10 bg-gradient-to-br from-gray-50 to-white'
        }`}>
          <button 
            onClick={onClose} 
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              darkMode 
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md shadow-[#4D4DA4]/20'
            }`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

const InfoRow = ({ icon, label, value, darkMode = false }: { icon: React.ReactNode, label: string, value: string, darkMode?: boolean }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl ${
    darkMode 
      ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]' 
      : 'bg-gradient-to-r from-gray-50 to-white border border-[#4D4DA4]/10'
  }`}>
    <div className="flex items-center gap-3">
      {icon}
      <span className={`text-sm font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{label}</span>
    </div>
    <span className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{value}</span>
  </div>
);

