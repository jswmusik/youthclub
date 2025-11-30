'use client';

interface SuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

export default function SuccessModal({
  isVisible,
  onClose,
  title = 'Success!',
  message,
  buttonText = 'Continue',
}: SuccessModalProps) {
  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header with success icon */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-700 text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* Button */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

