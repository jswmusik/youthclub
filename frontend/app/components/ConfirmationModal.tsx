'use client';

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
}: ConfirmationModalProps) {
  if (!isVisible) return null;

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

  // Variant styles
  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    warning: {
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    success: {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      confirmBg: 'bg-green-600 hover:bg-green-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-200"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Icon */}
        <div className={`flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full ${styles.iconBg}`}>
          <div className={styles.iconColor}>
            {styles.icon}
          </div>
        </div>

        {/* Title */}
        {title && (
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
            {title}
          </h2>
        )}

        {/* Message */}
        {message && (
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            {message}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-white ${styles.confirmBg} rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
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
}

