'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle, Loader2, Lock, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tLanding = useTranslations('landing');
  
  const uid = params.uid as string;
  const token = params.token as string;
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 'weak', color: 'var(--brand-red)', label: t('passwordWeak') };
    if (strength <= 4) return { level: 'medium', color: 'var(--brand-third)', label: t('passwordMedium') };
    return { level: 'strong', color: 'var(--brand-green)', label: t('passwordStrong') };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      // Use Djoser's password reset confirm endpoint
      await api.post('/auth/users/reset_password_confirm/', {
        uid,
        token,
        new_password: newPassword,
        re_new_password: confirmPassword,
      });
      
      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific error messages
      if (err.response?.data?.token) {
        setError(t('resetLinkExpired'));
      } else if (err.response?.data?.new_password) {
        const passwordErrors = err.response.data.new_password;
        setError(Array.isArray(passwordErrors) ? passwordErrors[0] : passwordErrors);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else {
        setError(t('resetPasswordError'));
      }
    } finally {
      setIsLoading(false);
    }
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
                {t('createNewPassword')}
                <span className="block text-[var(--brand-primary)]">{t('secureYourAccount')}</span>
              </h1>
              <p className="mt-6 text-lg xl:text-xl text-white/70 max-w-lg leading-relaxed">
                {t('chooseStrongPassword')}
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
      
      {/* Right Side - Reset Password Form */}
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
          
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center lg:text-left mb-8">
                <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4">
                  <Lock className="w-8 h-8 text-[var(--brand-primary)]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
                  {t('setNewPassword')}
                </h2>
                <p className="mt-2 text-[var(--brand-light)]/60">
                  {t('enterNewPasswordBelow')}
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
                {/* New Password Field */}
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-sm font-bold text-[var(--brand-light)]">
                    {t('newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-14 px-4 pr-12 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                      placeholder={t('enterNewPassword')}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: 
                                (passwordStrength.level === 'weak' && level === 1) ||
                                (passwordStrength.level === 'medium' && level <= 2) ||
                                (passwordStrength.level === 'strong')
                                  ? passwordStrength.color
                                  : 'var(--dark-500)'
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--brand-light)]">
                    {t('confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full h-14 px-4 pr-12 bg-[var(--dark-700)] border rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 transition-all outline-none ${
                        confirmPassword && !passwordsMatch 
                          ? 'border-[var(--brand-red)] focus:border-[var(--brand-red)] focus:ring-[var(--brand-red)]/20' 
                          : confirmPassword && passwordsMatch 
                            ? 'border-[var(--brand-green)] focus:border-[var(--brand-green)] focus:ring-[var(--brand-green)]/20'
                            : 'border-[var(--dark-500)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20'
                      }`}
                      placeholder={t('confirmNewPassword')}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-[var(--brand-green)]' : 'text-[var(--brand-red)]'}`}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          {t('passwordsMatch')}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          {t('passwordsDoNotMatch')}
                        </>
                      )}
                    </p>
                  )}
                </div>
                
                {/* Password Requirements */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4">
                  <p className="text-sm font-medium text-[var(--brand-light)] mb-2">{t('passwordRequirements')}</p>
                  <ul className="text-xs text-[var(--brand-light)]/60 space-y-1">
                    <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-[var(--brand-green)]' : ''}`}>
                      {newPassword.length >= 8 ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
                      {t('passwordMinLength')}
                    </li>
                    <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-[var(--brand-green)]' : ''}`}>
                      {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
                      {t('passwordMixedCase')}
                    </li>
                    <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-[var(--brand-green)]' : ''}`}>
                      {/[0-9]/.test(newPassword) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
                      {t('passwordNumber')}
                    </li>
                  </ul>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword || !passwordsMatch || newPassword.length < 8}
                  className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/25"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('resetting')}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>{t('resetPassword')}</span>
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
                {t('passwordResetSuccess')}
              </h2>
              
              <p className="text-[var(--brand-light)]/60 mb-8">
                {t('passwordResetSuccessMessage')}
              </p>
              
              <p className="text-[var(--brand-light)]/40 text-sm mb-8">
                {t('redirectingToLogin')}
              </p>
              
              <Link
                href="/login"
                className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>{t('goToLogin')}</span>
              </Link>
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

