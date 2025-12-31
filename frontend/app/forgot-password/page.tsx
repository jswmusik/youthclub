'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Mail, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tLanding = useTranslations('landing');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use Djoser's password reset endpoint
      await api.post('/auth/users/reset_password/', { email });
      setIsSubmitted(true);
    } catch (err: any) {
      // Don't reveal if email exists or not (security)
      // Always show success message
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Mask email for display
  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = localPart.substring(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Hero Image Background */}
        <div className="absolute inset-0">
          <Image
            src="/login-hero.jpg"
            alt="Youth having fun together"
            fill
            className="object-cover"
            priority
          />
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/70 to-[var(--dark-900)]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--dark-900)]/80 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Image
              src="/ua-logo-2026.svg"
              alt="Ungdomsappen"
              width={180}
              height={60}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          
          {/* Hero Content */}
          <div className="space-y-8">
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight font-heading">
                {tLanding('heroTitle')}
                <span className="block text-[var(--brand-primary)]">{tLanding('heroTitleHighlight')}</span>
              </h1>
              <p className="mt-6 text-lg xl:text-xl text-white/70 max-w-lg leading-relaxed">
                {t('forgotPasswordDescription')}
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Ungdomsappen. {tCommon('allRightsReserved')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className={`w-full max-w-md transition-all duration-700 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/ua-logo-2026.svg"
              alt="Ungdomsappen"
              width={140}
              height={50}
              className="object-contain"
              priority
            />
          </div>
          
          {/* Back to Login Link */}
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{t('backToLogin')}</span>
          </Link>
          
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center lg:text-left mb-8">
                <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4">
                  <KeyRound className="w-8 h-8 text-[var(--brand-primary)]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
                  {t('forgotPassword')}
                </h2>
                <p className="mt-2 text-[var(--brand-light)]/60">
                  {t('forgotPasswordInstructions')}
                </p>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] p-4 rounded-xl text-sm flex items-center gap-3 animate-shake">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-red)]/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-bold text-[var(--brand-light)]">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/25"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('sending')}</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>{t('sendResetLink')}</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 bg-[var(--brand-green)]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in-50 duration-500">
                <CheckCircle className="w-10 h-10 text-[var(--brand-green)]" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading mb-4">
                {t('checkYourEmail')}
              </h2>
              
              <p className="text-[var(--brand-light)]/60 mb-2">
                {t('resetLinkSent')}
              </p>
              
              <p className="text-[var(--brand-primary)] font-medium mb-8">
                {maskEmail(email)}
              </p>
              
              <div className="bg-[var(--dark-700)] rounded-xl p-4 mb-8 text-left">
                <p className="text-[var(--brand-light)]/80 text-sm">
                  <span className="font-bold text-[var(--brand-light)]">{t('didntReceiveEmail')}</span>
                  <br />
                  {t('checkSpamFolder')}
                </p>
              </div>
              
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span>{t('backToLogin')}</span>
                </Link>
                
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  className="w-full h-14 border-2 border-[var(--dark-500)] hover:border-[var(--brand-primary)] text-[var(--brand-light)] hover:text-[var(--brand-primary)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {t('tryDifferentEmail')}
                </button>
              </div>
            </div>
          )}
          
          {/* Mobile Footer */}
          <p className="lg:hidden text-center text-[var(--brand-light)]/40 text-xs mt-8">
            © {new Date().getFullYear()} Ungdomsappen. {tCommon('allRightsReserved')}
          </p>
        </div>
      </div>
    </div>
  );
}

