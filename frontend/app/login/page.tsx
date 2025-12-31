'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Sparkles, Users, Calendar, Gift, ArrowRight, Eye, EyeOff, Home } from 'lucide-react';
import TwoFactorVerification from '../components/TwoFactorVerification';
import AuthNavigation from '../components/AuthNavigation';

export default function LoginPage() {
  const { login, twoFactorState, initiate2FA, verify2FA, cancel2FA } = useAuth();
  const t = useTranslations('auth');
  const tLanding = useTranslations('landing');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, rememberMe);
      
      if (!result.success && !result.requires2FA) {
        setError(t('invalidCredentials'));
      }
      // If requires2FA, the twoFactorState will be set and UI will switch
      
    } catch (err) {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (code: string, trustDevice: boolean) => {
    return await verify2FA(code, trustDevice);
  };

  const handleResendCode = async () => {
    return await initiate2FA();
  };

  const handleCancel2FA = () => {
    cancel2FA();
    setPassword(''); // Clear password for security
  };

  // Show 2FA verification if required
  if (twoFactorState?.required) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)]">
        <AuthNavigation />
        <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Side - Same branding */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/login-hero.jpg"
              alt="Youth having fun together"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/70 to-[var(--dark-900)]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--dark-900)]/80 to-transparent" />
          </div>
          
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
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
            
            <div className="space-y-8">
              <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight font-heading">
                  {tLanding('heroTitle')}
                  <span className="block text-[var(--brand-primary)]">{tLanding('heroTitleHighlight')}</span>
                </h1>
                <p className="mt-6 text-lg xl:text-xl text-white/70 max-w-lg leading-relaxed">
                  {t('2fa.securityMessage')}
                </p>
              </div>
            </div>
            
            <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-white/40 text-sm">
                © {new Date().getFullYear()} Ungdomsappen. {tCommon('allRightsReserved')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Right Side - 2FA Verification */}
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
            
            <TwoFactorVerification
              email={twoFactorState.email}
              maskedEmail={twoFactorState.maskedEmail}
              expiresInMinutes={twoFactorState.expiresInMinutes}
              reason={twoFactorState.reason}
              onVerify={handleVerify2FA}
              onResendCode={handleResendCode}
              onCancel={handleCancel2FA}
            />
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <AuthNavigation />
      <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left Side - Branding & Features */}
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
                {tLanding('heroDescription')}
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className={`grid grid-cols-2 gap-4 max-w-lg transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <FeatureCard 
                icon={<Users className="w-5 h-5" />}
                title={tLanding('joinGroups')}
                description={tLanding('joinGroupsDesc')}
                color="var(--brand-primary)"
              />
              <FeatureCard 
                icon={<Calendar className="w-5 h-5" />}
                title={tLanding('eventsTitle')}
                description={tLanding('eventsDesc')}
                color="var(--brand-purple)"
              />
              <FeatureCard 
                icon={<Gift className="w-5 h-5" />}
                title={tLanding('rewardsTitle')}
                description={tLanding('rewardsDesc')}
                color="var(--brand-third)"
              />
              <FeatureCard 
                icon={<Sparkles className="w-5 h-5" />}
                title={tLanding('activitiesTitle')}
                description={tLanding('activitiesDesc')}
                color="var(--brand-peach)"
              />
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
      
      {/* Right Side - Login Form */}
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
          
          {/* Welcome Text */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
              {t('welcomeBack')}
            </h2>
            <p className="mt-2 text-[var(--brand-light)]/60">
              {t('signInToContinue')}
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
          
          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-[var(--brand-light)]">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                placeholder={t('emailPlaceholder')}
              />
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-[var(--brand-light)]">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 px-4 pr-12 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                  placeholder={t('passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] focus:ring-offset-0"
                />
                <span className="text-sm text-[var(--brand-light)]/60 group-hover:text-[var(--brand-light)] transition-colors">
                  {t('rememberMe')}
                </span>
              </label>
              <a 
                href="/forgot-password" 
                className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors font-medium"
              >
                {t('forgotPassword')}
              </a>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/25"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                  <span>{t('signingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('login')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--dark-600)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-[var(--dark-900)] text-[var(--brand-light)]/40 text-sm">
                {t('newToApp')}
              </span>
            </div>
          </div>
          
          {/* Sign Up Link */}
          <Link
            href="/register/youth"
            className="w-full h-14 border-2 border-[var(--dark-500)] hover:border-[var(--brand-primary)] text-[var(--brand-light)] hover:text-[var(--brand-primary)] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <span>{t('createAccount')}</span>
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </Link>
          
          {/* Mobile Footer */}
          <p className="lg:hidden text-center text-[var(--brand-light)]/40 text-xs mt-8">
            © {new Date().getFullYear()} Ungdomsappen. {tCommon('allRightsReserved')}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, color }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 group cursor-default">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <h3 className="font-bold text-white text-sm">{title}</h3>
      <p className="text-white/50 text-xs mt-1">{description}</p>
    </div>
  );
}
