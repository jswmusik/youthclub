'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { 
  Check, Sparkles, Zap, Shield, Users, ChevronDown, 
  ArrowRight, Building2, Star, MessageCircle
} from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Feature {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  monthly_price_sek: number;
  features_details: Feature[];
  is_public: boolean;
  is_active: boolean;
}

interface PricingContent {
  hero_title: string;
  hero_subtitle: string;
  hero_tagline: string;
  cta_title: string;
  cta_description: string;
  cta_button_text: string;
  cta_button_url: string;
  trust_section_title: string;
  trust_section_description: string;
  trust_stat_municipalities: string;
  trust_stat_active_users: string;
  trust_stat_satisfaction: string;
  trust_stat_uptime: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export default function PricingPageClient() {
  const t = useTranslations('pricingPage');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [content, setContent] = useState<PricingContent | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, contentRes, faqsRes] = await Promise.all([
        fetch(`${API_URL}/licensing/plans/public/`),
        fetch(`${API_URL}/cms/pricing-content/public/`),
        fetch(`${API_URL}/cms/pricing-faqs/public/`)
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setContent(contentData);
      }

      if (faqsRes.ok) {
        const faqsData = await faqsRes.json();
        setFaqs(faqsData);
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureDisplayName = (feature: Feature) => {
    // Try to get translation, fall back to feature name
    try {
      return t(`features.${feature.slug}`);
    } catch {
      return feature.name;
    }
  };

  // Calculate yearly price (no discount - just multiply by 12)
  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12);
  };

  const getDisplayPrice = (plan: Plan) => {
    if (billingPeriod === 'yearly') {
      return getYearlyPrice(plan.monthly_price_sek);
    }
    return plan.monthly_price_sek;
  };

  // Determine if a plan is "popular" (middle tier or has most features)
  const getPopularPlanId = () => {
    if (plans.length === 0) return null;
    if (plans.length === 1) return plans[0].id;
    // Return the middle plan or the one with most features
    const sortedByFeatures = [...plans].sort((a, b) => 
      (b.features_details?.length || 0) - (a.features_details?.length || 0)
    );
    return sortedByFeatures[Math.floor(sortedByFeatures.length / 2)]?.id;
  };

  const popularPlanId = getPopularPlanId();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--brand-light)]/60">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {content?.hero_tagline && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              <span className="text-sm font-medium text-[var(--brand-primary)]">
                {content.hero_tagline}
              </span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--brand-light)] mb-6 tracking-tight"
          >
            {content?.hero_title || t('heroTitleFallback')}
          </motion.h1>

          {content?.hero_subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-[var(--brand-light)]/60 max-w-2xl mx-auto mb-10"
            >
              {content.hero_subtitle}
            </motion.p>
          )}

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-3 p-1.5 rounded-full bg-[var(--dark-800)] border border-[var(--dark-600)]"
          >
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
              }`}
            >
              {t('billingToggle.monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
              }`}
            >
              {t('billingToggle.yearly')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          {plans.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-[var(--brand-light)]/20 mx-auto mb-4" />
              <p className="text-[var(--brand-light)]/60 text-lg">
                {t('plans.noPlans')}
              </p>
            </div>
          ) : (
            <div className={`grid gap-8 ${
              plans.length === 1 ? 'max-w-md mx-auto' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' :
              plans.length === 3 ? 'lg:grid-cols-3' :
              'lg:grid-cols-2 xl:grid-cols-4'
            }`}>
              {plans.map((plan, index) => {
                const isPopular = plan.id === popularPlanId;
                
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className={`relative group ${isPopular ? 'lg:-mt-4 lg:mb-4' : ''}`}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] text-sm font-semibold shadow-lg">
                          <Star className="w-4 h-4" />
                          {t('plans.mostPopular')}
                        </div>
                      </div>
                    )}

                    <div className={`h-full rounded-2xl border transition-all duration-300 ${
                      isPopular
                        ? 'bg-gradient-to-b from-[var(--dark-700)] to-[var(--dark-800)] border-[var(--brand-primary)]/40 shadow-xl shadow-[var(--brand-primary)]/10'
                        : 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--dark-500)]'
                    }`}>
                      <div className="p-8">
                        {/* Plan Header */}
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold text-[var(--brand-light)] mb-2">
                            {plan.name}
                          </h3>
                          {plan.description && (
                            <p className="text-[var(--brand-light)]/50 text-sm line-clamp-2">
                              {plan.description}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mb-8">
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-[var(--brand-light)]">
                              {getDisplayPrice(plan).toLocaleString()}
                            </span>
                            <span className="text-[var(--brand-light)]/50">SEK</span>
                          </div>
                          <p className="text-sm text-[var(--brand-light)]/40 mt-1">
                            {billingPeriod === 'yearly' ? t('plans.perYear') : t('plans.perMonth')}
                          </p>
                        </div>

                        {/* CTA Button */}
                        <Link
                          href={content?.cta_button_url || '/contact'}
                          className={`block w-full py-4 px-6 rounded-xl text-center font-semibold transition-all ${
                            isPopular
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 shadow-lg shadow-[var(--brand-primary)]/25'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                          }`}
                        >
                          {t('plans.getStarted')}
                          <ArrowRight className="inline-block w-4 h-4 ml-2" />
                        </Link>

                        {/* Features */}
                        <div className="mt-8 pt-8 border-t border-[var(--dark-600)]">
                          <p className="text-sm font-medium text-[var(--brand-light)]/70 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
                            {t('plans.featuresIncluded', { count: plan.features_details?.length || 0 })}
                          </p>
                          <ul className="space-y-3">
                            {plan.features_details?.map((feature) => (
                              <li key={feature.id} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Check className="w-3 h-3 text-green-400" />
                                </div>
                                <span className="text-[var(--brand-light)]/80 text-sm">
                                  {getFeatureDisplayName(feature)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      {(content?.trust_section_title || content?.trust_section_description) && (
        <section className="relative py-20 px-4 bg-[var(--dark-800)]/50">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{t('trust.badge')}</span>
              </div>
              
              {content?.trust_section_title && (
                <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] mb-4">
                  {content.trust_section_title}
                </h2>
              )}
              
              {content?.trust_section_description && (
                <p className="text-lg text-[var(--brand-light)]/60 max-w-2xl mx-auto">
                  {content.trust_section_description}
                </p>
              )}

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
                {[
                  { icon: Building2, label: t('trust.municipalities'), value: content?.trust_stat_municipalities || '50+' },
                  { icon: Users, label: t('trust.activeUsers'), value: content?.trust_stat_active_users || '100K+' },
                  { icon: Star, label: t('trust.satisfaction'), value: content?.trust_stat_satisfaction || '4.9/5' },
                  { icon: Shield, label: t('trust.uptime'), value: content?.trust_stat_uptime || '99.9%' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="text-center"
                  >
                    <stat.icon className="w-8 h-8 text-[var(--brand-primary)] mx-auto mb-3" />
                    <div className="text-2xl font-bold text-[var(--brand-light)]">{stat.value}</div>
                    <div className="text-sm text-[var(--brand-light)]/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="relative py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/20 mb-6">
                <MessageCircle className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="text-sm font-medium text-[var(--brand-purple)]">{t('faq.badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)]">
                {t('faq.title')}
              </h2>
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.05 * index }}
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full text-left p-6 rounded-xl bg-[var(--dark-800)] border border-[var(--dark-600)] hover:border-[var(--dark-500)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-[var(--brand-light)]">
                        {faq.question}
                      </h3>
                      <ChevronDown 
                        className={`w-5 h-5 text-[var(--brand-light)]/40 transition-transform ${
                          openFaqIndex === index ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                    <AnimatePresence>
                      {openFaqIndex === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-4 text-[var(--brand-light)]/60 leading-relaxed">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {(content?.cta_title || content?.cta_description) && (
        <section className="relative py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl overflow-hidden"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-sky)]" />
              
              {/* Content */}
              <div className="relative p-12 sm:p-16 text-center">
                {content?.cta_title && (
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    {content.cta_title}
                  </h2>
                )}
                
                {content?.cta_description && (
                  <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                    {content.cta_description}
                  </p>
                )}

                {content?.cta_button_text && content?.cta_button_url && (
                  <Link
                    href={content.cta_button_url}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[var(--dark-900)] font-semibold hover:bg-white/90 transition-all shadow-xl"
                  >
                    {content.cta_button_text}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}

