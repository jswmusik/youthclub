'use client';

interface SuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
  darkMode?: boolean;
}

export default function SuccessModal({
  isVisible,
  onClose,
  title = 'Success!',
  message,
  buttonText = 'Continue',
  darkMode = false,
}: SuccessModalProps) {
  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
        darkMode ? 'bg-black/70' : 'bg-black/60'
      }`}
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className={`w-full max-w-md overflow-hidden ${
          darkMode 
            ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-500)]' 
            : 'bg-white rounded-2xl shadow-xl'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header with success icon */}
        <div className={`p-6 text-center ${
          darkMode 
            ? 'bg-[var(--brand-green)]/10 border-b border-[var(--brand-green)]/20' 
            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
        }`}>
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            darkMode 
              ? 'bg-[var(--brand-green)]/20 border-2 border-[var(--brand-green)]/40' 
              : 'bg-white/20'
          }`}>
            <svg className={`w-10 h-10 ${darkMode ? 'text-[var(--brand-green)]' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-white'
          }`}>{title}</h2>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className={`text-center leading-relaxed ${
            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
          }`}>
            {message}
          </p>
        </div>

        {/* Button */}
        <div className={`p-6 pt-0 ${darkMode ? 'pb-6' : ''}`}>
          <button
            onClick={onClose}
            className={`w-full font-bold py-3 rounded-xl transition-colors ${
              darkMode 
                ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
            }`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

