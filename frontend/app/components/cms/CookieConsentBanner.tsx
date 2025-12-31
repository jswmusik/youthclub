'use client';

import { useState, useEffect } from 'react';
import { cmsApi } from '@/lib/cms-api';
import { sanitizeHtml } from '@/lib/sanitize';
import { CookieConsent } from '@/types/cms';
import { X, Cookie, Settings, Check, Shield, BarChart3 } from 'lucide-react';

export default function CookieConsentBanner() {
  const [policy, setPolicy] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const cookies = await cmsApi.getCookies();
        const latest = cookies.find(c => c.is_active);
        if (!latest) return;
        
        setPolicy(latest);
        const acceptedVersion = localStorage.getItem('cookie_consent_version');
        
        if (acceptedVersion !== latest.version) {
          // Small delay for better UX
          setTimeout(() => setShowBanner(true), 1000);
        }
      } catch (e) {
        console.error("Cookie fetch error", e);
      }
    }
    check();
  }, []);

  const handleAcceptAll = () => {
    if (policy) {
      localStorage.setItem('cookie_consent_version', policy.version);
      localStorage.setItem('cookie_analytics', 'true');
    }
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    if (policy) {
      localStorage.setItem('cookie_consent_version', policy.version);
      localStorage.setItem('cookie_analytics', analyticsEnabled ? 'true' : 'false');
    }
    setShowBanner(false);
    setShowModal(false);
  };

  const handleDecline = () => {
    if (policy) {
      localStorage.setItem('cookie_consent_version', policy.version);
      localStorage.setItem('cookie_analytics', 'false');
    }
    setShowBanner(false);
  };

  if (!policy || !showBanner) return null;

  return (
    <>
      {/* Banner */}
      <div 
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] max-w-md transition-all duration-500 ${
          showBanner ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="bg-[var(--dark-800)]/95 backdrop-blur-xl rounded-2xl border border-[var(--dark-500)] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dark-600)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Cookie className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-[var(--brand-light)]">{policy.title}</h3>
            </div>
            <button 
              onClick={handleDecline}
              className="p-2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-sm text-[var(--brand-light)]/70 leading-relaxed">
              {policy.description}
            </p>
          </div>
          
          {/* Actions */}
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
            <button 
              onClick={handleAcceptAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-all text-sm"
            >
              <Check className="w-4 h-4" />
              Acceptera alla
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] font-medium hover:bg-[var(--dark-600)] transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              Inställningar
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Cookie-inställningar</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Hantera dina preferenser</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Policy Text */}
              {policy.policy_text && (
                <div 
                  className="cms-content text-sm text-[var(--brand-light)]/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.policy_text) }} 
                />
              )}
              
              {/* Cookie Options */}
              <div className="space-y-4 pt-4 border-t border-[var(--dark-600)]">
                <h3 className="text-sm font-semibold text-[var(--brand-light)] uppercase tracking-wider">
                  Cookie-kategorier
                </h3>
                
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-[var(--brand-green)]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--brand-light)]">Nödvändiga cookies</h4>
                      <p className="text-sm text-[var(--brand-light)]/60 mt-1">
                        Krävs för att webbplatsen ska fungera korrekt. Kan inte inaktiveras.
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <div className="w-12 h-7 bg-[var(--brand-green)] rounded-full flex items-center justify-end px-1 opacity-60 cursor-not-allowed">
                      <div className="w-5 h-5 bg-white rounded-full shadow" />
                    </div>
                  </div>
                </div>
                
                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-[var(--brand-blue)]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--brand-light)]">Analys-cookies</h4>
                      <p className="text-sm text-[var(--brand-light)]/60 mt-1">
                        Hjälper oss att förstå hur besökare använder webbplatsen för att förbättra upplevelsen.
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                      className={`w-12 h-7 rounded-full flex items-center px-1 transition-all ${
                        analyticsEnabled 
                          ? 'bg-[var(--brand-primary)] justify-end' 
                          : 'bg-[var(--dark-500)] justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full shadow transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-900)]/50 flex-shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)] transition-all text-sm"
              >
                Avbryt
              </button>
              <button 
                onClick={handleSavePreferences}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-all text-sm"
              >
                Spara inställningar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
