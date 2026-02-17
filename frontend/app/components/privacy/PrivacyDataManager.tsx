'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Loader2,
  X
} from 'lucide-react';

interface PrivacyDataManagerProps {
  darkMode?: boolean;
}

export default function PrivacyDataManager({ darkMode = true }: PrivacyDataManagerProps) {
  const t = useTranslations('privacy');
  const { success, error, info } = useToast();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<any[]>([]);
  const [availableConsents, setAvailableConsents] = useState<any[]>([]);
  const [exportRequest, setExportRequest] = useState<any>(null);
  const [deletionRequest, setDeletionRequest] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>('consents');
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConsent, setModalConsent] = useState<any>(null);
  
  // Club/Municipality data
  const [clubData, setClubData] = useState<any>(null);
  const [municipalityData, setMunicipalityData] = useState<any>(null);

  // Fetch data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [consentsRes, availableRes, exportRes, deletionRes, auditRes] = await Promise.all([
        api.get('/gdpr/my-consents/').catch(() => ({ data: { results: [] } })),
        api.get('/gdpr/consent-types/').catch(() => ({ data: { results: [] } })),
        api.get('/gdpr/exports/').catch(() => ({ data: { results: [] } })),
        api.get('/gdpr/deletion-requests/my-request/').catch(() => ({ data: { has_request: false } })),
        api.get('/audit/logs/my_activity/').catch(() => ({ data: [] }))
      ]);

      setConsents(consentsRes.data.results || []);
      setAvailableConsents(availableRes.data.results || []);
      setExportRequest(exportRes.data.results?.[0] || null);
      setDeletionRequest(deletionRes.data.has_request ? deletionRes.data.deletion_request : null);
      setAuditLogs(auditRes.data || []);
      
      // Fetch club and municipality data if user has preferred_club
      const clubId = typeof user?.preferred_club === 'object' ? user?.preferred_club?.id : user?.preferred_club;
      if (clubId) {
        try {
          const clubRes = await api.get(`/clubs/${clubId}/`);
          setClubData(clubRes.data);
          console.log('Club data loaded:', clubRes.data);
          
          if (clubRes.data.municipality) {
            const muniRes = await api.get(`/municipalities/${clubRes.data.municipality}/`);
            setMunicipalityData(muniRes.data);
            console.log('Municipality data loaded:', muniRes.data);
          }
        } catch (err: any) {
          console.error('Failed to fetch club/municipality data:', err);
          console.error('Error details:', err.response?.data);
          // This is non-critical, so we continue without this data
        }
      }
    } catch (err) {
      console.error('Failed to fetch privacy data:', err);
      error('Failed to load privacy data');
    } finally {
      setInitialLoading(false);
    }
  };

  // Consent Actions
  const handleGiveConsent = async (consentCode: string) => {
    try {
      setLoading(true);
      await api.post('/gdpr/my-consents/give/', { consent_code: consentCode });
      success('Consent given successfully');
      fetchAllData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to give consent');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async (consentCode: string) => {
    if (!confirm('Are you sure you want to withdraw this consent?')) return;
    
    try {
      setLoading(true);
      await api.post('/gdpr/my-consents/withdraw/', { 
        consent_code: consentCode,
        reason: 'User requested withdrawal'
      });
      success('Consent withdrawn successfully');
      fetchAllData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to withdraw consent');
    } finally {
      setLoading(false);
    }
  };

  // Data Export Actions
  const handleRequestExport = async () => {
    try {
      setLoading(true);
      await api.post('/gdpr/exports/request-export/');
      success('Data export requested! You will receive an email when ready.');
      fetchAllData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to request export');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!exportRequest?.id) return;
    
    try {
      const response = await api.get(`/gdpr/exports/${exportRequest.id}/download/`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `my_data_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      success('Data exported successfully');
    } catch (err) {
      error('Failed to download export');
    }
  };

  // Account Deletion Actions
  const handleRequestDeletion = async () => {
    if (!confirm('⚠️ Are you sure? This will schedule your account for deletion in 30 days.')) return;
    
    try {
      setLoading(true);
      await api.post('/gdpr/deletion-requests/request-deletion/', {
        deletion_type: 'anonymize',
        reason: 'User requested deletion',
        confirm: true
      });
      success('Deletion requested. You have 30 days to cancel.');
      fetchAllData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to request deletion');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setLoading(true);
      await api.post('/gdpr/deletion-requests/cancel-deletion/', {
        reason: 'User changed mind'
      });
      success('Deletion cancelled. Your account is safe!');
      fetchAllData();
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to cancel deletion');
    } finally {
      setLoading(false);
    }
  };

  // UI Helpers
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const hasConsent = (code: string) => {
    return consents.some(c => c.consent_type_code === code && c.is_active);
  };
  
  const openConsentModal = (consent: any) => {
    setModalConsent(consent);
    setModalOpen(true);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consents Section */}
      <CollapsibleSection
        title={t('consents.title')}
        icon={<CheckCircle className="w-5 h-5" />}
        isExpanded={expandedSection === 'consents'}
        onToggle={() => toggleSection('consents')}
        darkMode={darkMode}
      >
        <div className="space-y-3">
          {availableConsents.length > 0 ? (
            availableConsents.map(consent => {
              const hasIt = hasConsent(consent.code);
              return (
                <div
                  key={consent.id}
                  className={`p-4 rounded-xl border ${
                    darkMode
                      ? 'bg-[var(--dark-700)] border-[var(--dark-600)]'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => openConsentModal(consent)}
                      className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {consent.name}
                        </h4>
                        {consent.is_required && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                            {t('consents.required')}
                          </span>
                        )}
                        {hasIt && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <Eye className="w-4 h-4 text-[var(--brand-primary)]" />
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {consent.description}
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`}>
                        {t('consents.clickToRead')}
                      </p>
                    </button>
                    <button
                      onClick={() => hasIt ? handleWithdrawConsent(consent.code) : handleGiveConsent(consent.code)}
                      disabled={loading || consent.is_required}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasIt
                          ? darkMode
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : hasIt ? t('consents.withdraw') : t('consents.giveConsent')}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {t('consents.noConsentTypes')}
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Data Export Section */}
      <CollapsibleSection
        title={t('export.title')}
        icon={<Download className="w-5 h-5" />}
        isExpanded={expandedSection === 'export'}
        onToggle={() => toggleSection('export')}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          {exportRequest ? (
            <div className={`p-4 rounded-xl border ${
              darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('export.status')}: <span className="text-[var(--brand-primary)]">{exportRequest.status}</span>
                  </span>
                </div>
                {exportRequest.status === 'completed' && (
                  <button
                    onClick={handleDownloadExport}
                    className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-primary)]/90 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('export.download')}
                  </button>
                )}
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('export.requested')}: {new Date(exportRequest.requested_at).toLocaleString()}
              </p>
              {exportRequest.expires_at && exportRequest.status === 'completed' && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('export.expires')}: {new Date(exportRequest.expires_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={handleRequestExport}
              disabled={loading}
              className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('export.requestExport')}
            </button>
          )}
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
            {t('export.exportInfo')}
          </p>
        </div>
      </CollapsibleSection>

      {/* Account Deletion Section */}
      <CollapsibleSection
        title={t('deletion.title')}
        icon={<Trash2 className="w-5 h-5" />}
        isExpanded={expandedSection === 'deletion'}
        onToggle={() => toggleSection('deletion')}
        darkMode={darkMode}
        warning
      >
        <div className="space-y-4">
          {deletionRequest ? (
            <div className={`p-4 rounded-xl border-2 border-yellow-500/50 ${
              darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-500 mb-1">{t('deletion.scheduled')}</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('deletion.willBeDeleted')}{' '}
                    {new Date(deletionRequest.scheduled_deletion_date).toLocaleDateString()}
                    <br />
                    <span className="font-medium">
                      {deletionRequest.days_until_deletion} {t('deletion.daysRemaining')}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelDeletion}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('deletion.cancelDeletion')}
              </button>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-xl ${
                darkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('deletion.warning')}
                </p>
              </div>
              <button
                onClick={handleRequestDeletion}
                disabled={loading}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('deletion.requestDeletion')}
              </button>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Activity Log Section */}
      <CollapsibleSection
        title={t('activity.title')}
        icon={<History className="w-5 h-5" />}
        isExpanded={expandedSection === 'activity'}
        onToggle={() => toggleSection('activity')}
        darkMode={darkMode}
      >
        <div className="space-y-2">
          {auditLogs.length > 0 ? (
            auditLogs.map((log, index) => (
              <div
                key={log.id || index}
                className={`p-3 rounded-lg ${
                  darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {log.action_display || log.action}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.object_repr && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {log.object_repr}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {t('activity.noActivity')}
            </p>
          )}
        </div>
      </CollapsibleSection>
      
      {/* Consent Modal */}
      {modalOpen && modalConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70"
            onClick={() => setModalOpen(false)}
          />
          <div 
            className={`relative max-w-3xl w-full max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden ${
              darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {modalConsent.name}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  darkMode ? 'hover:bg-[var(--dark-600)] text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {/* Consent Text */}
                <div className="prose prose-sm max-w-none">
                  <h4 className={`font-bold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {modalConsent.name}
                  </h4>
                  <div className="whitespace-pre-line text-sm">
                    {modalConsent.consent_text || modalConsent.description}
                  </div>
                  
                  {modalConsent.legal_basis && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'
                    }`}>
                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('consents.legalBasis')}:
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {modalConsent.legal_basis}
                      </p>
                    </div>
                  )}
                  
                  {modalConsent.document_url && (
                    <a
                      href={modalConsent.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-primary)] hover:underline text-sm block mt-2"
                    >
                      {t('consents.viewFullDocument')}
                    </a>
                  )}
                </div>
                
                {/* Municipality Policies (if Terms of Service) */}
                {modalConsent.code === 'terms_of_service' && municipalityData?.terms_and_conditions && (
                  <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
                    <h4 className={`font-bold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {municipalityData.name} - {t('consents.localPolicies')}
                    </h4>
                    <div 
                      className="whitespace-pre-line text-sm"
                      dangerouslySetInnerHTML={{ __html: municipalityData.terms_and_conditions }}
                    />
                  </div>
                )}
                
                {/* Club Policies (if Terms of Service) */}
                {modalConsent.code === 'terms_of_service' && clubData?.club_policies && (
                  <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
                    <h4 className={`font-bold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {clubData.name} - {t('consents.houseRules')}
                    </h4>
                    <div 
                      className="whitespace-pre-line text-sm"
                      dangerouslySetInnerHTML={{ __html: clubData.club_policies }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className={`px-6 py-4 border-t ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setModalOpen(false)}
                className="w-full px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary)]/90 transition-all"
              >
                {t('consents.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  children, 
  darkMode,
  warning = false
}: any) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        darkMode
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]'
          : 'bg-white border-gray-200'
      } ${warning ? 'border-red-500/30' : ''}`}
    >
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between ${
          darkMode ? 'hover:bg-[var(--dark-700)]' : 'hover:bg-gray-50'
        } transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div className={warning ? 'text-red-500' : 'text-[var(--brand-primary)]'}>
            {icon}
          </div>
          <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className={`px-6 py-4 border-t ${
          darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'
        }`}>
          {children}
        </div>
      )}
    </div>
  );
}

