// frontend/app/(public)/components/CTASection.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Smartphone, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CTASection() {
  const t = useTranslations('public.cta');
  
  const featureKeys = ['free', 'findNearby', 'oneClick', 'recommendations'] as const;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-[var(--dark-900)] to-[var(--dark-800)] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[var(--brand-primary)]/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-[var(--brand-purple)]/10 blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-800)] rounded-3xl p-8 sm:p-12 lg:p-16 border border-[var(--dark-600)] text-center relative overflow-hidden">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[var(--brand-primary)]/20 via-[var(--brand-purple)]/20 to-[var(--brand-primary)]/20 opacity-50" style={{ padding: '1px' }}>
            <div className="w-full h-full bg-[var(--dark-700)] rounded-3xl" />
          </div>
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center shadow-2xl shadow-[var(--brand-primary)]/30">
              <Smartphone className="w-10 h-10 text-gray-900" />
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--brand-light)] mb-6 font-heading leading-tight">
              {t('title')}
            </h2>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[var(--brand-light)]/60 max-w-2xl mx-auto mb-8">
              {t('subtitle')}
            </p>

            {/* Features List */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {featureKeys.map((key) => (
                <div 
                  key={key}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--dark-600)]/50 border border-[var(--dark-500)]"
                >
                  <CheckCircle className="w-4 h-4 text-[var(--brand-green)]" />
                  <span className="text-sm text-[var(--brand-light)]/80">{t(`features.${key}`)}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register/youth"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-gray-900 font-bold text-lg hover:opacity-90 transition-all shadow-xl hover:shadow-[var(--brand-primary)]/30"
              >
                {t('createAccount')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)] font-semibold text-lg hover:bg-[var(--dark-600)] transition-all"
              >
                {t('login')}
              </Link>
            </div>

            {/* Trust Badge */}
            <p className="mt-8 text-sm text-[var(--brand-light)]/40">
              {t('trustBadge')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

