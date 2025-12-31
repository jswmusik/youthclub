import toast, { ToastOptions } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

// Add animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-slide-in {
      from {
        transform: translateX(calc(100% + 2rem));
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes toast-slide-out {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(calc(100% + 2rem));
        opacity: 0;
      }
    }

    .animate-enter {
      animation: toast-slide-in 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
    }

    .animate-leave {
      animation: toast-slide-out 0.3s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

// Brand-themed toast styles
const toastStyles = {
  success: {
    icon: CheckCircle2,
    borderColor: 'border-[var(--brand-third)]',
    iconColor: 'text-[var(--brand-third)]',
    iconBg: 'bg-[var(--brand-third)]/20',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-[var(--brand-red)]',
    iconColor: 'text-[var(--brand-red)]',
    iconBg: 'bg-[var(--brand-red)]/20',
  },
  info: {
    icon: Info,
    borderColor: 'border-[var(--brand-blue)]',
    iconColor: 'text-[var(--brand-blue)]',
    iconBg: 'bg-[var(--brand-blue)]/20',
  },
  warning: {
    icon: AlertCircle,
    borderColor: 'border-[var(--brand-peach)]',
    iconColor: 'text-[var(--brand-peach)]',
    iconBg: 'bg-[var(--brand-peach)]/20',
  },
};

export function useToast() {
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    options?: ToastOptions
  ) => {
    const config = toastStyles[type];
    const Icon = config.icon;

    return toast.custom(
      (t) => (
        <div
          className={`
            ${t.visible ? 'animate-enter' : 'animate-leave'}
            max-w-md w-full bg-[var(--dark-700)] text-[var(--brand-light)] 
            shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5
            border-l-4 ${config.borderColor} border-y border-r border-[var(--dark-500)]
            overflow-hidden
          `}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>
              <div className="ml-0 flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--brand-light)]">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-[var(--dark-500)]">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                />
              </svg>
            </button>
          </div>
        </div>
      ),
      {
        duration: options?.duration || 4000,
        position: 'bottom-right',
        ...options,
      }
    );
  };

  return {
    toast: showToast,
    success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
    error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
    info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
    warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
    dismiss: toast.dismiss,
  };
}
