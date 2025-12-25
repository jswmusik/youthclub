'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import YouthRegistrationWizard from '@/app/components/YouthRegistrationWizard';
import { Users, Calendar, Gift, ArrowLeft, Star } from 'lucide-react';

export default function YouthRegisterPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex">
      {/* Left Side - Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 relative overflow-hidden">
        {/* Hero Image Background */}
        <div className="absolute inset-0">
          <Image
            src="/register-hero.jpg"
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
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full">
          {/* Logo */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <Image
              src="/ua-logo-2026.svg"
              alt="Ungdomsappen"
              width={140}
              height={50}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          
          {/* Hero Content */}
          <div className="space-y-6">
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight font-heading">
                Join the
                <span className="block text-[var(--brand-primary)]">Community</span>
              </h1>
              <p className="mt-4 text-base text-white/70 leading-relaxed">
                Create your account and start exploring events, earning rewards, and connecting with your local youth club.
              </p>
            </div>
            
            {/* Benefits List */}
            <div className={`space-y-3 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <BenefitItem icon={<Users className="w-4 h-4" />} text="Connect with friends" color="var(--brand-primary)" />
              <BenefitItem icon={<Calendar className="w-4 h-4" />} text="Discover local events" color="var(--brand-purple)" />
              <BenefitItem icon={<Gift className="w-4 h-4" />} text="Earn awesome rewards" color="var(--brand-third)" />
              <BenefitItem icon={<Star className="w-4 h-4" />} text="Track your activities" color="var(--brand-peach)" />
            </div>
          </div>
          
          {/* Footer */}
          <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-white/40 text-xs">
              © {new Date().getFullYear()} Ungdomsappen
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
          <Link href="/login" className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <Image
            src="/ua-icon-2026.svg"
            alt="Ungdomsappen"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12">
          <div className={`w-full max-w-2xl transition-all duration-700 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <Image
                src="/ua-logo-2026.svg"
                alt="Ungdomsappen"
                width={120}
                height={38}
                className="object-contain mx-auto mb-4 brightness-0 invert"
                priority
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
                Join the Club
              </h1>
              <p className="text-[var(--brand-light)]/60 mt-2 text-sm sm:text-base">
                Create your account to sign up for events and earn rewards.
              </p>
            </div>
            
            {/* Wizard */}
            <YouthRegistrationWizard />
            
            {/* Login Link */}
            <div className="text-center mt-6 sm:mt-8">
              <p className="text-[var(--brand-light)]/60 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-bold transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Benefit Item Component
function BenefitItem({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <span className="text-white/80 text-sm font-medium">{text}</span>
    </div>
  );
}
