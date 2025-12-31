'use client';

import { useState, useEffect } from 'react';
import { X, Mail, User, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function NewsletterModal({ isOpen, onClose, email }: NewsletterModalProps) {
  const t = useTranslations('newsletter');
  
  const [formData, setFormData] = useState({
    email: email,
    first_name: '',
    last_name: '',
    consent_given: false,
    website: '', // Honeypot field
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update email when prop changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, email }));
  }, [email]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setError(null);
      setFormData(prev => ({
        ...prev,
        first_name: '',
        last_name: '',
        consent_given: false,
        website: '',
      }));
    }
  }, [isOpen]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/marketing/public/newsletter/subscribe/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
      } else {
        // Handle validation errors
        if (data.email) {
          setError(Array.isArray(data.email) ? data.email[0] : data.email);
        } else if (data.consent_given) {
          setError(Array.isArray(data.consent_given) ? data.consent_given[0] : data.consent_given);
        } else if (data.first_name) {
          setError(Array.isArray(data.first_name) ? data.first_name[0] : data.first_name);
        } else if (data.last_name) {
          setError(Array.isArray(data.last_name) ? data.last_name[0] : data.last_name);
        } else if (data.error) {
          setError(data.error);
        } else if (data.detail) {
          // Rate limit error
          setError(t('rateLimitError'));
        } else {
          setError(t('genericError'));
        }
      }
    } catch (err) {
      setError(t('networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[var(--dark-600)]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--brand-light)]">
                {t('modalTitle')}
              </h2>
              <p className="text-sm text-[var(--brand-light)]/60">
                {t('modalSubtitle')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            // Success state
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[var(--brand-green)]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[var(--brand-green)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">
                {t('successTitle')}
              </h3>
              <p className="text-[var(--brand-light)]/60 text-sm mb-6">
                {t('successMessage')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all"
              >
                {t('closeButton')}
              </button>
            </div>
          ) : (
            // Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-[var(--brand-red)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--brand-red)]">{error}</p>
                </div>
              )}
              
              {/* Email (pre-filled, read-only) */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-1.5">
                  {t('emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                    placeholder="din@email.se"
                    required
                  />
                </div>
              </div>
              
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-1.5">
                  {t('firstNameLabel')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                    placeholder={t('firstNamePlaceholder')}
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-1.5">
                  {t('lastNameLabel')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                    placeholder={t('lastNamePlaceholder')}
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              
              {/* Honeypot field - hidden from users, bots will fill it */}
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                tabIndex={-1}
                autoComplete="off"
              />
              
              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={formData.consent_given}
                    onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                    className="w-5 h-5 rounded border-2 border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 cursor-pointer"
                    required
                  />
                </div>
                <label htmlFor="consent" className="text-sm text-[var(--brand-light)]/70 cursor-pointer">
                  {t('consentText')}
                </label>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.consent_given}
                className="w-full mt-4 py-3.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('subscribeButton')
                )}
              </button>
              
              {/* Privacy note */}
              <p className="text-xs text-[var(--brand-light)]/40 text-center pt-2">
                {t('privacyNote')}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

