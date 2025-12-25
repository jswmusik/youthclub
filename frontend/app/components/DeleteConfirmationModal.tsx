'use client';

import { Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  darkMode?: boolean;
}

export default function DeleteConfirmationModal({
  isVisible,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmButtonText = 'Delete',
  cancelButtonText = 'Cancel',
  isLoading = false,
  darkMode = false,
}: DeleteConfirmationModalProps) {
  if (!isVisible) return null;

  const defaultTitle = title || 'Confirm Deletion';
  const defaultMessage = message || (itemName 
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : 'Are you sure you want to delete this item? This action cannot be undone.');

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

  return (
    <div
      className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${
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
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${
          darkMode ? 'bg-red-500/20 border-2 border-red-500/30' : 'bg-red-100'
        }`}>
          <Trash2 className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold text-center mb-3 tracking-tight ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#121213]'
        }`}>
          {defaultTitle}
        </h2>

        {/* Message */}
        <p className={`text-center mb-6 leading-relaxed text-sm ${
          darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
        }`}>
          {defaultMessage}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-600)] hover:bg-[var(--dark-500)] border border-[var(--dark-400)]' 
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              darkMode 
                ? 'text-white bg-red-500 hover:bg-red-600' 
                : 'text-white bg-red-600 hover:bg-red-700 shadow-sm'
            }`}
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
                <span>Deleting...</span>
              </>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
