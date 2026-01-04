'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SelfDeletionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  adminName?: string;
  darkMode?: boolean;
}

export default function SelfDeletionModal({
  isVisible,
  onClose,
  onConfirm,
  adminName,
  darkMode = true,
}: SelfDeletionModalProps) {
  const t = useTranslations('adminManager.deleteSelfModal');
  const [isMounted, setIsMounted] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const requiredText = 'radera';
  const isConfirmed = confirmationText.toLowerCase() === requiredText;

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setConfirmationText('');
    }
  }, [isVisible]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible || !isMounted) return null;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 ${
        darkMode ? 'bg-black/70' : 'bg-black/60'
      }`}
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className={`w-full max-w-md p-6 transform transition-all duration-200 ${
          darkMode 
            ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-500)]' 
            : 'bg-white rounded-2xl shadow-2xl border border-gray-100'
        }`}
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            darkMode 
              ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-red)]/20 border-2 border-[var(--brand-red)]/30`}>
          <AlertTriangle className="w-8 h-8 text-[var(--brand-red)]" />
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold text-center mb-3 tracking-tight font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#121213]'
        }`}>
          {t('title')}
        </h2>

        {/* Message */}
        <p className={`text-center mb-4 leading-relaxed text-sm ${
          darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
        }`}>
          {t('message', { name: adminName || 'din administratör' })}
        </p>

        <p className={`text-center mb-6 leading-relaxed text-sm font-semibold ${
          darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'
        }`}>
          {t('warning')}
        </p>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'
          }`}>
            {t('confirmationLabel')}
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={requiredText}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
              darkMode
                ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-red)] focus:ring-2 focus:ring-[var(--brand-red)]/20'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            } ${
              confirmationText && !isConfirmed
                ? 'border-[var(--brand-red)]'
                : ''
            }`}
            autoFocus
          />
          {confirmationText && !isConfirmed && (
            <p className="mt-2 text-sm text-[var(--brand-red)]">
              {t('confirmationMismatch')}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-600)] hover:bg-[var(--dark-500)] border border-[var(--dark-400)]' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isConfirmed
                ? 'bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/80 text-white'
                : 'bg-[var(--brand-red)]/50 text-white/50'
            }`}
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

