'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ShieldCheck, 
  Mail, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface TwoFactorVerificationProps {
  email: string;
  maskedEmail?: string;
  expiresInMinutes?: number;
  reason?: string;
  onVerify: (code: string, trustDevice: boolean) => Promise<{ success: boolean; message: string }>;
  onResendCode: () => Promise<{ success: boolean; message: string }>;
  onCancel: () => void;
}

export default function TwoFactorVerification({
  email,
  maskedEmail,
  expiresInMinutes = 10,
  reason,
  onVerify,
  onResendCode,
  onCancel
}: TwoFactorVerificationProps) {
  const t = useTranslations('auth');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-send code on mount
  useEffect(() => {
    const sendInitialCode = async () => {
      setIsResending(true);
      const result = await onResendCode();
      setIsResending(false);
      if (result.success) {
        setCodeSent(true);
        setCountdown(60); // 60 second cooldown for resend
      } else {
        setError(result.message);
      }
    };
    sendInitialCode();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    if (codeSent && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [codeSent]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    
    setCode(newCode);
    
    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(d => !d);
    if (nextEmptyIndex === -1 && pastedData.length === 6) {
      handleVerify(pastedData);
    } else if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) {
      setError(t('2fa.enterAllDigits'));
      return;
    }

    setIsVerifying(true);
    setError('');
    
    const result = await onVerify(codeToVerify, trustDevice);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    
    setIsVerifying(false);
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    
    setIsResending(true);
    setError('');
    
    const result = await onResendCode();
    
    if (result.success) {
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
    
    setIsResending(false);
  };

  // Show success state
  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center animate-bounce-once">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--brand-light)]">
            {t('2fa.verificationSuccess')}
          </h2>
          <p className="text-[var(--brand-light)]/60 mt-2">
            {t('2fa.redirecting')}
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-[var(--brand-primary)]/20 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-[var(--brand-primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--brand-light)] font-heading">
          {t('2fa.title')}
        </h2>
        <p className="text-[var(--brand-light)]/60 mt-2">
          {t('2fa.subtitle')}
        </p>
      </div>

      {/* Email indicator */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--brand-primary)]/20 rounded-lg flex items-center justify-center">
          <Mail className="w-5 h-5 text-[var(--brand-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--brand-light)]/60">
            {t('2fa.codeSentTo')}
          </p>
          <p className="text-[var(--brand-light)] font-medium truncate">
            {maskedEmail || email}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] p-4 rounded-xl text-sm flex items-center gap-3 animate-shake">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Code input */}
      <div className="space-y-4">
        <label className="block text-sm font-bold text-[var(--brand-light)] text-center">
          {t('2fa.enterCode')}
        </label>
        <div className="flex justify-center gap-2 sm:gap-3">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isVerifying || !codeSent}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all outline-none disabled:opacity-50"
            />
          ))}
        </div>
        <p className="text-center text-sm text-[var(--brand-light)]/40">
          {t('2fa.codeExpiry', { minutes: expiresInMinutes })}
        </p>
      </div>

      {/* Trust device checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-colors">
        <input
          type="checkbox"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
          className="w-5 h-5 rounded border-[var(--dark-500)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] focus:ring-offset-0"
        />
        <div>
          <span className="text-sm font-medium text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
            {t('2fa.trustDevice')}
          </span>
          <p className="text-xs text-[var(--brand-light)]/40 mt-0.5">
            {t('2fa.trustDeviceDesc')}
          </p>
        </div>
      </label>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => handleVerify()}
          disabled={isVerifying || code.join('').length !== 6}
          className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/25"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('2fa.verifying')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>{t('2fa.verify')}</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('2fa.backToLogin')}</span>
          </button>

          <button
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
            className="flex items-center gap-2 text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>
              {countdown > 0 
                ? t('2fa.resendIn', { seconds: countdown })
                : t('2fa.resendCode')
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

