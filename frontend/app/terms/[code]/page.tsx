'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import api from '../../../lib/api';
import { FileText, ArrowLeft, Calendar, Shield } from 'lucide-react';

interface ConsentDocument {
  id: number;
  code: string;
  name: string;
  description: string;
  consent_text: string;
  version: string;
  is_required: boolean;
  legal_basis: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
  translations: Array<{
    language: string;
    name: string;
    description: string;
    consent_text: string;
  }>;
}

export default function TermsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('terms');
  
  const [document, setDocument] = useState<ConsentDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const code = params.code as string;
    
    api.get(`/gdpr/consent-types/${code}/`)
      .then(res => {
        setDocument(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch document:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.code]);

  const getTranslatedContent = (doc: ConsentDocument) => {
    const translation = doc.translations.find(t => t.language === locale);
    if (translation) {
      return {
        name: translation.name,
        description: translation.description,
        consent_text: translation.consent_text
      };
    }
    return {
      name: doc.name,
      description: doc.description,
      consent_text: doc.consent_text
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--dark-900)] via-[var(--dark-800)] to-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">
            {t('loading') || 'Loading document...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--dark-900)] via-[var(--dark-800)] to-[var(--dark-900)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <FileText className="w-16 h-16 text-[var(--brand-light)]/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--brand-light)] mb-2">
            {t('notFound') || 'Document Not Found'}
          </h1>
          <p className="text-[var(--brand-light)]/60 mb-6">
            {t('notFoundDesc') || 'The document you are looking for does not exist or has been removed.'}
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-[var(--brand-primary)]/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('goBack') || 'Go Back'}
          </button>
        </div>
      </div>
    );
  }

  const translated = getTranslatedContent(document);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--dark-900)] via-[var(--dark-800)] to-[var(--dark-900)]">
      {/* Header */}
      <div className="border-b border-[var(--dark-600)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back') || 'Back'}
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[var(--brand-primary)]/10 rounded-xl">
              <FileText className="w-8 h-8 text-[var(--brand-primary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--brand-light)] mb-2">
                {translated.name}
              </h1>
              <p className="text-[var(--brand-light)]/60 mb-4">
                {translated.description}
              </p>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
                  <Calendar className="w-4 h-4" />
                  <span>{t('version') || 'Version'}: {document.version}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
                  <Shield className="w-4 h-4" />
                  <span>{document.legal_basis}</span>
                </div>
                {document.is_required && (
                  <span className="px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-xs font-semibold">
                    {t('required') || 'Required'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-8">
          <div className="prose prose-invert max-w-none">
            <div className="text-[var(--brand-light)]/90 leading-relaxed whitespace-pre-line">
              {translated.consent_text}
            </div>
          </div>

          {document.document_url && (
            <div className="mt-8 pt-8 border-t border-[var(--dark-600)]">
              <a
                href={document.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[var(--brand-primary)] hover:underline"
              >
                {t('viewExternal') || 'View external document'} →
              </a>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-8 pt-8 border-t border-[var(--dark-600)] text-sm text-[var(--brand-light)]/40">
            <p>
              {t('lastUpdated') || 'Last updated'}: {new Date(document.updated_at).toLocaleDateString(locale)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


