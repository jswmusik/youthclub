'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Mail, Send, CheckCircle, AlertCircle, Building2, User, 
  MessageSquare, Loader2
} from 'lucide-react';
import { API_URL } from '@/lib/api';

interface ContactContent {
  hero_title: string;
  hero_subtitle: string;
  contact_email: string;
  response_time_text: string;
  form_title: string;
  form_description: string;
  success_title: string;
  success_message: string;
  info_title: string;
  info_content: string;
}

interface FormData {
  name: string;
  email: string;
  organization: string;
  subject: string;
  message: string;
}

export default function ContactPageClient() {
  const t = useTranslations('contactPage');
  const [content, setContent] = useState<ContactContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    organization: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch(`${API_URL}/cms/contact-content/public/`);
      if (res.ok) {
        const data = await res.json();
        setContent(data);
      }
    } catch (error) {
      console.error('Failed to fetch contact content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/cms/contact-submissions/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          organization: '',
          subject: '',
          message: '',
        });
      } else {
        const data = await res.json();
        setError(data.detail || t('form.errorMessage'));
      }
    } catch (err) {
      setError(t('form.errorMessage'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--brand-purple)]/5 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6"
          >
            <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-medium text-[var(--brand-primary)]">
              {content?.contact_email || 'support@ungdomsappen.se'}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--brand-light)] mb-6 tracking-tight"
          >
            {content?.hero_title || t('hero.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-[var(--brand-light)]/60 max-w-2xl mx-auto"
          >
            {content?.hero_subtitle || t('hero.subtitle')}
          </motion.p>

          {content?.response_time_text && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-[var(--brand-light)]/40 mt-4"
            >
              {content.response_time_text}
            </motion.p>
          )}
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="relative pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-8 sm:p-10"
          >
            {submitted ? (
              // Success State
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-4">
                  {content?.success_title || t('success.title')}
                </h2>
                <p className="text-[var(--brand-light)]/60 mb-8">
                  {content?.success_message || t('success.message')}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-3 rounded-xl bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
                >
                  {t('success.sendAnother')}
                </button>
              </div>
            ) : (
              // Form
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-2">
                    {content?.form_title || t('form.title')}
                  </h2>
                  <p className="text-[var(--brand-light)]/60">
                    {content?.form_description || t('form.description')}
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name & Email Row */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-[var(--brand-light)]">
                        {t('form.name')} *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={t('form.namePlaceholder')}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-[var(--brand-light)]">
                        {t('form.email')} *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={t('form.emailPlaceholder')}
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization */}
                  <div className="space-y-2">
                    <label htmlFor="organization" className="block text-sm font-medium text-[var(--brand-light)]">
                      {t('form.organization')}
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                      <input
                        type="text"
                        id="organization"
                        name="organization"
                        value={formData.organization}
                        onChange={handleInputChange}
                        placeholder={t('form.organizationPlaceholder')}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <label htmlFor="subject" className="block text-sm font-medium text-[var(--brand-light)]">
                      {t('form.subject')} *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      <option value="">{t('form.subjectPlaceholder')}</option>
                      <option value="general">{t('form.subjects.general')}</option>
                      <option value="demo">{t('form.subjects.demo')}</option>
                      <option value="pricing">{t('form.subjects.pricing')}</option>
                      <option value="support">{t('form.subjects.support')}</option>
                      <option value="partnership">{t('form.subjects.partnership')}</option>
                      <option value="other">{t('form.subjects.other')}</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label htmlFor="message" className="block text-sm font-medium text-[var(--brand-light)]">
                      {t('form.message')} *
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-[var(--brand-light)]/40" />
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder={t('form.messagePlaceholder')}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 focus:outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('form.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {t('form.submit')}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>

          {/* Additional Info */}
          {content?.info_content && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 text-center"
            >
              {content.info_title && (
                <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">
                  {content.info_title}
                </h3>
              )}
              <p className="text-[var(--brand-light)]/60 whitespace-pre-line">
                {content.info_content}
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

