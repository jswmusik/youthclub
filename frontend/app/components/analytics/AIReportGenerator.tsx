'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Sparkles, 
  FileText, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Download,
  AlertCircle,
  Bot,
  X,
  Languages,
  Check,
  Wand2
} from 'lucide-react';
import { 
  analyticsApi, 
  AnalyticsFilter, 
  AIReportType, 
  AILanguage, 
  AIProvider,
  AIProvidersResponse,
  AnalyticsPreferences
} from '@/lib/analytics-api';
import ReactMarkdown from 'react-markdown';

interface Props {
  filters: AnalyticsFilter;
  className?: string;
  visibleSections?: AnalyticsPreferences;  // Optional: Only report on visible sections
}

const selectArrowStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem'
};

export default function AIReportGenerator({ filters, className = '', visibleSections }: Props) {
  const t = useTranslations('analyticsAdmin.ai');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [statusMessage, setStatusMessage] = useState('');
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [userRequest, setUserRequest] = useState('');
  const [reportType, setReportType] = useState<AIReportType>('summary');
  const [language, setLanguage] = useState<AILanguage>('en');
  const [provider, setProvider] = useState<AIProvider | undefined>(undefined);
  
  const [providersInfo, setProvidersInfo] = useState<AIProvidersResponse | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const REPORT_TYPES: { value: AIReportType; label: string; description: string }[] = [
    { value: 'summary', label: t('quickSummary'), description: t('quickSummaryDesc') },
    { value: 'monthly', label: t('monthlyReport'), description: t('monthlyReportDesc') },
    { value: 'trend', label: t('trendAnalysis'), description: t('trendAnalysisDesc') },
  ];

  const LANGUAGES: { value: AILanguage; label: string; flag: string }[] = [
    { value: 'en', label: t('english'), flag: '🇬🇧' },
    { value: 'sv', label: t('swedish'), flag: '🇸🇪' },
    { value: 'no', label: t('norwegian'), flag: '🇳🇴' },
  ];

  const EXAMPLE_PROMPTS = [
    t('examplePrompt1'),
    t('examplePrompt2'),
    t('examplePrompt3'),
  ];

  const STATUS_MESSAGES = [
    { text: t('analyzingData'), duration: 2000 },
    { text: t('processingMetrics'), duration: 2500 },
    { text: t('generatingInsights'), duration: 3000 },
    { text: t('writingRecommendations'), duration: 3500 },
    { text: t('finalizingReport'), duration: 4000 },
  ];
  
  useEffect(() => {
    if (isLoading) {
      let messageIndex = 0;
      setStatusMessage(STATUS_MESSAGES[0].text);
      
      const cycleMessages = () => {
        messageIndex = (messageIndex + 1) % STATUS_MESSAGES.length;
        setStatusMessage(STATUS_MESSAGES[messageIndex].text);
      };
      
      statusIntervalRef.current = setInterval(cycleMessages, 2500);
      
      return () => {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
        }
      };
    } else {
      setStatusMessage('');
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    }
  }, [isLoading]);
  
  useEffect(() => {
    const checkProviders = async () => {
      setLoadingProviders(true);
      try {
        const info = await analyticsApi.getAIProviders();
        setProvidersInfo(info);
        if (info.default_provider) {
          setProvider(info.default_provider);
        }
      } catch (err) {
        console.error('Failed to check AI providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    };
    
    if (isExpanded && !providersInfo) {
      checkProviders();
    }
  }, [isExpanded, providersInfo]);
  
  const handleGenerate = async () => {
    if (!userRequest.trim()) {
      setError(t('enterRequest'));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setReport(null);
    
    try {
      const result = await analyticsApi.generateAIReport({
        user_request: userRequest,
        report_type: reportType,
        language,
        provider,
        filters,
        visible_sections: visibleSections,  // Pass visibility preferences to AI
      });
      
      if (result.success) {
        setReport(result.report);
      } else {
        setError(t('failedToGenerate'));
      }
    } catch (err: any) {
      console.error('AI report error:', err);
      setError(err.response?.data?.error || t('failedToGenerateRetry'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = async () => {
    if (report) {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDownload = () => {
    if (report) {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handleExampleClick = (example: string) => {
    setUserRequest(example);
  };
  
  const isConfigured = providersInfo?.is_configured ?? false;
  
  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--dark-700)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center shadow-lg shadow-[var(--brand-purple)]/20">
            <Sparkles className="w-5 h-5 text-[var(--dark-900)]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[var(--brand-light)]">{t('title')}</h3>
            <p className="text-xs text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConfigured && providersInfo && (
            <span className="text-xs text-[#F97316] bg-[#F97316]/10 px-2 py-1 rounded-full border border-[#F97316]/30">
              {t('notConfigured')}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/50" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/50" />
          )}
        </div>
      </button>
      
      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1200px]' : 'max-h-0'}`}>
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--dark-600)]">
          {/* Not configured warning */}
          {!loadingProviders && !isConfigured && (
            <div className="mt-4 bg-[#F97316]/10 border border-[#F97316]/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#F97316] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#F97316]">{t('notConfiguredTitle')}</p>
                <p className="text-xs text-[#F97316]/80 mt-1">
                  {t('notConfiguredMessage', {
                    anthropicKey: 'ANTHROPIC_API_KEY',
                    openaiKey: 'OPENAI_API_KEY'
                  })}
                </p>
              </div>
            </div>
          )}
          
          {/* Form */}
          {(isConfigured || loadingProviders) && (
            <>
              {/* User Request Input */}
              <div className="mt-4">
                <label className="text-xs font-medium text-[var(--brand-light)]/60 mb-2 block">
                  {t('whatToKnow')}
                </label>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={t('placeholder')}
                  className="w-full p-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm placeholder-[var(--brand-light)]/30 resize-none focus:border-[var(--brand-primary)] outline-none transition-colors"
                  rows={3}
                  disabled={isLoading}
                />
                
                {/* Example prompts */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example)}
                      className="text-xs text-[var(--brand-purple)] bg-[var(--brand-purple)]/10 hover:bg-[var(--brand-purple)]/20 px-2 py-1 rounded-full transition-colors border border-[var(--brand-purple)]/30"
                      disabled={isLoading}
                    >
                      {example.length > 35 ? example.slice(0, 35) + '...' : example}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Options Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Report Type */}
                <div>
                  <label className="text-xs font-medium text-[var(--brand-light)]/60 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {t('reportType')}
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as AIReportType)}
                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                    style={selectArrowStyle}
                    disabled={isLoading}
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--brand-light)]/40 mt-1">
                    {REPORT_TYPES.find(t => t.value === reportType)?.description}
                  </p>
                </div>
                
                {/* Language */}
                <div>
                  <label className="text-xs font-medium text-[var(--brand-light)]/60 mb-1.5 flex items-center gap-1.5">
                    <Languages className="w-3 h-3" />
                    {t('language')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as AILanguage)}
                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                    style={selectArrowStyle}
                    disabled={isLoading}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Provider */}
                <div>
                  <label className="text-xs font-medium text-[var(--brand-light)]/60 mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3 h-3" />
                    {t('aiModel')}
                  </label>
                  <select
                    value={provider || ''}
                    onChange={(e) => setProvider(e.target.value as AIProvider)}
                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer disabled:opacity-50"
                    style={selectArrowStyle}
                    disabled={isLoading || !providersInfo?.available_providers.length}
                  >
                    {providersInfo?.available_providers.map((p) => (
                      <option key={p} value={p}>
                        {p === 'anthropic' ? t('claudeAnthropic') : t('gpt4OpenAI')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading || !userRequest.trim()}
                className="w-full py-3 bg-gradient-to-r from-[var(--brand-purple)] to-[#A78BFA] text-white rounded-xl font-semibold hover:from-[var(--brand-purple)]/90 hover:to-[#A78BFA]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-purple)]/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    {t('generateReport')}
                  </>
                )}
              </button>
              
              {/* Loading Status */}
              {isLoading && (
                <div className="bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full border-2 border-[var(--brand-purple)]/30 border-t-[var(--brand-purple)] animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--brand-purple)]">{statusMessage}</p>
                      <p className="text-xs text-[var(--brand-purple)]/60 mt-0.5">{t('mayTake')}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--brand-red)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--brand-red)]">{error}</p>
                </div>
              )}
              
              {/* Generated Report */}
              {report && (
                <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] overflow-hidden">
                  {/* Report Header */}
                  <div className="px-4 py-3 border-b border-[var(--dark-500)] flex items-center justify-between bg-[var(--dark-600)]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--brand-purple)]" />
                      <span className="text-sm font-medium text-[var(--brand-light)]">{t('generatedReport')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="p-1.5 text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-500)] rounded-lg transition-colors flex items-center gap-1"
                        title={t('copyToClipboard')}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-[var(--brand-green)]" />
                            <span className="text-xs text-[var(--brand-green)]">{t('copied')}</span>
                          </>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-1.5 text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-500)] rounded-lg transition-colors"
                        title={t('downloadMarkdown')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReport(null)}
                        className="p-1.5 text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-lg transition-colors"
                        title={t('clearReport')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Report Content */}
                  <div className="p-4 prose prose-sm prose-invert max-w-none overflow-auto max-h-[500px] 
                    prose-headings:text-[var(--brand-light)] 
                    prose-p:text-[var(--brand-light)]/80 
                    prose-strong:text-[var(--brand-primary)]
                    prose-li:text-[var(--brand-light)]/80
                    prose-a:text-[var(--brand-blue)]">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
