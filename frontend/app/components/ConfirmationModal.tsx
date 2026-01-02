'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  darkMode?: boolean;
}

export default function ConfirmationModal({
  isVisible,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isLoading = false,
  variant = 'info',
  darkMode = false,
}: ConfirmationModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  // Variant styles with brand colors - light mode
  const lightVariantStyles = {
    danger: {
      iconBg: 'bg-[#EBEBFE]',
      iconColor: 'text-[#EF4444]',
      confirmBg: 'bg-[#EF4444] hover:bg-[#EF4444]/90 text-white',
    },
    warning: {
      iconBg: 'bg-[#EBEBFE]',
      iconColor: 'text-[#EF4444]',
      confirmBg: 'bg-[#EF4444] hover:bg-[#EF4444]/90 text-white',
    },
    info: {
      iconBg: 'bg-[#EBEBFE]',
      iconColor: 'text-[#4D4DA4]',
      confirmBg: 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] hover:from-[#3D3D94] hover:to-[#5D5DC4] text-white shadow-lg shadow-[#4D4DA4]/30',
    },
    success: {
      iconBg: 'bg-[#EBEBFE]',
      iconColor: 'text-[#10B981]',
      confirmBg: 'bg-[#10B981] hover:bg-[#10B981]/90 text-white',
    },
  };

  // Variant styles with brand colors - dark mode
  const darkVariantStyles = {
    danger: {
      iconBg: 'bg-[var(--brand-red)]/20',
      iconColor: 'text-[var(--brand-red)]',
      confirmBg: 'bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/80 text-white',
    },
    warning: {
      iconBg: 'bg-[var(--brand-peach)]/20',
      iconColor: 'text-[var(--brand-peach)]',
      confirmBg: 'bg-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/80 text-[var(--dark-900)]',
    },
    info: {
      iconBg: 'bg-[var(--brand-purple)]/20',
      iconColor: 'text-[var(--brand-purple)]',
      confirmBg: 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]',
    },
    success: {
      iconBg: 'bg-[var(--brand-green)]/20',
      iconColor: 'text-[var(--brand-green)]',
      confirmBg: 'bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/80 text-[var(--dark-900)]',
    },
  };

  const variantIcons = {
    danger: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const styles = darkMode ? darkVariantStyles[variant] : lightVariantStyles[variant];

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
        {/* Icon */}
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${styles.iconBg} ${
          darkMode ? 'border-2 border-current/20' : ''
        }`}>
          <div className={styles.iconColor}>
            {variantIcons[variant]}
          </div>
        </div>

        {/* Title */}
        {title && (
          <h2 className={`text-xl font-bold text-center mb-3 tracking-tight font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#121213]'
          }`}>
            {title}
          </h2>
        )}

        {/* Message */}
        {message && (
          <p className={`text-center mb-6 leading-relaxed text-sm ${
            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
          }`}>
            {message}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-600)] hover:bg-[var(--dark-500)] border border-[var(--dark-400)]' 
                : 'text-gray-700 bg-[#EBEBFE] hover:bg-[#EBEBFE]/80 border border-[#EBEBFE]'
            }`}
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 ${styles.confirmBg} rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

