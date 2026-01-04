// frontend/app/admin/super/seo/keywords/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Target, Plus, Pencil, Trash2, Search, X, Loader2,
  TrendingUp, TrendingDown, Minus, Filter, ArrowLeft,
  Sparkles, FileText, Newspaper, ExternalLink, CheckCircle
} from 'lucide-react';
import { seoApi } from '@/lib/seo-api';
import { Keyword } from '@/types/seo';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';

function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

const INTENT_OPTIONS = [
  { value: 'INFORMATIONAL', label: 'Informationellt', color: 'var(--brand-blue)' },
  { value: 'NAVIGATIONAL', label: 'Navigerande', color: 'var(--brand-purple)' },
  { value: 'TRANSACTIONAL', label: 'Transaktionellt', color: 'var(--brand-green)' },
  { value: 'LOCAL', label: 'Lokalt', color: 'var(--brand-peach)' },
];

const AUDIENCE_OPTIONS = [
  { value: 'YOUTH', label: 'Ungdomar' },
  { value: 'GUARDIAN', label: 'Vårdnadshavare' },
  { value: 'MUNICIPALITY', label: 'Kommuner' },
  { value: 'GENERAL', label: 'Allmänt' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv', color: 'var(--brand-green)' },
  { value: 'PAUSED', label: 'Pausad', color: 'var(--brand-peach)' },
  { value: 'ARCHIVED', label: 'Arkiverad', color: 'var(--brand-light)' },
];

export default function KeywordsPage() {
  const router = useRouter();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [intentFilter, setIntentFilter] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<string>('');
  const [keywordToDelete, setKeywordToDelete] = useState<Keyword | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPage, setGeneratingPage] = useState<number | null>(null);
  const [generatingArticle, setGeneratingArticle] = useState<number | null>(null);
  const { success, error } = useToast();
  
  const [form, setForm] = useState({
    keyword: '',
    search_volume: '',
    difficulty: '',
    intent: 'INFORMATIONAL',
    status: 'ACTIVE',
    target_audience: 'GENERAL',
  });

  const fetchKeywords = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (intentFilter) params.intent = intentFilter;
      if (audienceFilter) params.target_audience = audienceFilter;
      if (searchInput) params.search = searchInput;
      
      const data = await seoApi.getKeywords(params);
      setKeywords(data.results || []);
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
      error('Kunde inte ladda nyckelord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, [statusFilter, intentFilter, audienceFilter]);

  const handleSearch = () => {
    setLoading(true);
    fetchKeywords();
  };

  const handleSave = async () => {
    if (!form.keyword.trim()) {
      error('Ange ett nyckelord');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        keyword: form.keyword,
        search_volume: form.search_volume ? parseInt(form.search_volume) : null,
        difficulty: form.difficulty ? parseInt(form.difficulty) : null,
        intent: form.intent,
        status: form.status,
        target_audience: form.target_audience,
      };
      
      if (editingKeyword) {
        await seoApi.updateKeyword(editingKeyword.id, data);
        success('Nyckelord uppdaterat');
      } else {
        await seoApi.createKeyword(data);
        success('Nyckelord skapat');
      }
      
      resetForm();
      fetchKeywords();
    } catch (err) {
      console.error('Failed to save keyword:', err);
      error('Kunde inte spara nyckelord');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!keywordToDelete) return;
    try {
      await seoApi.deleteKeyword(keywordToDelete.id);
      success('Nyckelord raderat');
      fetchKeywords();
    } catch (err) {
      error('Kunde inte radera nyckelord');
    } finally {
      setKeywordToDelete(null);
    }
  };

  const handleGeneratePage = async (keyword: Keyword) => {
    setGeneratingPage(keyword.id);
    try {
      const result = await seoApi.generatePageFromKeyword(keyword.id);
      if (result.success) {
        success(`Sida skapad för "${keyword.keyword}"! Status: Granskning`);
        fetchKeywords();
        // Optionally navigate to the created page
        // router.push(result.admin_url);
      } else {
        error(result.error || 'Kunde inte skapa sida');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Kunde inte skapa sida';
      error(errorMsg);
    } finally {
      setGeneratingPage(null);
    }
  };

  const handleGenerateArticle = async (keyword: Keyword) => {
    setGeneratingArticle(keyword.id);
    try {
      const result = await seoApi.generateArticleFromKeyword(keyword.id);
      if (result.success) {
        success(`Artikel skapad för "${keyword.keyword}"! Status: Granskning`);
        fetchKeywords();
      } else {
        error(result.error || 'Kunde inte skapa artikel');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Kunde inte skapa artikel';
      error(errorMsg);
    } finally {
      setGeneratingArticle(null);
    }
  };

  const startEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setForm({
      keyword: keyword.keyword,
      search_volume: keyword.search_volume?.toString() || '',
      difficulty: keyword.difficulty?.toString() || '',
      intent: keyword.intent,
      status: keyword.status,
      target_audience: keyword.target_audience,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingKeyword(null);
    setForm({
      keyword: '',
      search_volume: '',
      difficulty: '',
      intent: 'INFORMATIONAL',
      status: 'ACTIVE',
      target_audience: 'GENERAL',
    });
  };

  const getIntentStyle = (intent: string) => {
    const option = INTENT_OPTIONS.find(o => o.value === intent);
    return option ? { backgroundColor: `${option.color}20`, color: option.color } : {};
  };

  const getStatusStyle = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? { backgroundColor: `${option.color}20`, color: option.color } : {};
  };

  const filteredKeywords = keywords.filter(k =>
    (k.keyword || '').toLowerCase().includes(searchInput.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <Link href="/admin/super/seo" className="inline-flex items-center text-sm text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka till SEO
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Target className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Nyckelord</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">
              Hantera sökord du vill ranka för
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all"
          >
            <Plus className="w-4 h-4" />
            Lägg till nyckelord
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Totalt</span>
            <div className="text-2xl font-bold text-[var(--brand-primary)]">{keywords.length}</div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Aktiva</span>
            <div className="text-2xl font-bold text-[var(--brand-green)]">
              {keywords.filter(k => k.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Lokala</span>
            <div className="text-2xl font-bold text-[var(--brand-peach)]">
              {keywords.filter(k => k.intent === 'LOCAL').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Med ranking</span>
            <div className="text-2xl font-bold text-[var(--brand-blue)]">
              {keywords.filter(k => k.current_ranking).length}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
              <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
              <input 
                type="text"
                placeholder="Sök nyckelord..."
                className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              {searchInput && (
                <button 
                  onClick={() => { setSearchInput(''); handleSearch(); }}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg px-3 py-2 text-sm text-[var(--brand-light)] outline-none"
            >
              <option value="">Alla status</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={intentFilter}
              onChange={e => setIntentFilter(e.target.value)}
              className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg px-3 py-2 text-sm text-[var(--brand-light)] outline-none"
            >
              <option value="">Alla intent</option>
              {INTENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={audienceFilter}
              onChange={e => setAudienceFilter(e.target.value)}
              className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg px-3 py-2 text-sm text-[var(--brand-light)] outline-none"
            >
              <option value="">Alla målgrupper</option>
              {AUDIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Keywords List */}
        {loading ? (
          <div className="space-y-3 px-4 sm:px-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : filteredKeywords.length === 0 ? (
          <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] mx-4 sm:mx-0">
            <Target className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <p className="text-[var(--brand-light)]/50 mb-2">
              {searchInput ? 'Inga nyckelord matchade sökningen' : 'Inga nyckelord ännu'}
            </p>
            {!searchInput && (
              <button
                onClick={() => setShowForm(true)}
                className="text-[var(--brand-primary)] hover:underline text-sm font-medium"
              >
                Lägg till ditt första nyckelord
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 px-4 sm:px-0">
            {filteredKeywords.map((keyword) => (
              <div
                key={keyword.id}
                className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 hover:border-[var(--dark-500)] transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--brand-light)]">{keyword.keyword}</h3>
                      <span 
                        className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={getStatusStyle(keyword.status)}
                      >
                        {STATUS_OPTIONS.find(o => o.value === keyword.status)?.label}
                      </span>
                      <span 
                        className="px-2 py-0.5 text-xs rounded-full font-medium"
                        style={getIntentStyle(keyword.intent)}
                      >
                        {INTENT_OPTIONS.find(o => o.value === keyword.intent)?.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--brand-light)]/50">
                      {keyword.search_volume && (
                        <span>Sökvolym: <strong className="text-[var(--brand-light)]">{keyword.search_volume.toLocaleString()}</strong></span>
                      )}
                      {keyword.difficulty && (
                        <span>Svårighet: <strong className="text-[var(--brand-light)]">{keyword.difficulty}/100</strong></span>
                      )}
                      {keyword.current_ranking && (
                        <span className="flex items-center gap-1">
                          Position: <strong className="text-[var(--brand-green)]">#{keyword.current_ranking}</strong>
                        </span>
                      )}
                      <span>Målgrupp: {AUDIENCE_OPTIONS.find(o => o.value === keyword.target_audience)?.label}</span>
                      {keyword.detected_location_name && (
                        <span className="flex items-center gap-1 text-[var(--brand-peach)]">
                          📍 {keyword.detected_location_name}
                        </span>
                      )}
                      {keyword.content_status && keyword.content_status !== 'No content' && (
                        <span className="text-[var(--brand-green)]">
                          ✓ {keyword.content_status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Generate Page Button - for LOCAL keywords without existing page */}
                    {(keyword.intent === 'LOCAL' || keyword.intent === 'TRANSACTIONAL') && !keyword.has_content && (
                      <button
                        onClick={() => handleGeneratePage(keyword)}
                        disabled={generatingPage === keyword.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
                        title="Skapa landningssida med AI"
                      >
                        {generatingPage === keyword.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Skapa sida</span>
                      </button>
                    )}
                    
                    {/* Generate Article Button - for INFORMATIONAL keywords without existing article */}
                    {keyword.intent === 'INFORMATIONAL' && !keyword.has_content && (
                      <button
                        onClick={() => handleGenerateArticle(keyword)}
                        disabled={generatingArticle === keyword.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-blue)] text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
                        title="Skapa artikel med AI"
                      >
                        {generatingArticle === keyword.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Newspaper className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Skapa artikel</span>
                      </button>
                    )}
                    
                    {/* Show link to existing content */}
                    {keyword.generated_page_slug && (
                      <Link
                        href={`/admin/super/seo/local-pages`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand-green)]/20 text-[var(--brand-green)] text-sm font-medium hover:bg-[var(--brand-green)]/30 transition-all"
                        title="Visa skapad sida"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Sida skapad</span>
                      </Link>
                    )}
                    
                    {keyword.generated_article_slug && (
                      <Link
                        href={`/admin/super/seo/articles`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand-green)]/20 text-[var(--brand-green)] text-sm font-medium hover:bg-[var(--brand-green)]/30 transition-all"
                        title="Visa skapad artikel"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Artikel skapad</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={() => startEdit(keyword)}
                      className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setKeywordToDelete(keyword)}
                      className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-md border border-[var(--dark-600)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                  {editingKeyword ? 'Redigera nyckelord' : 'Lägg till nyckelord'}
                </h3>
                <button 
                  onClick={resetForm}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Nyckelord *</label>
                  <input
                    type="text"
                    value={form.keyword}
                    onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="t.ex. fritidsgård stockholm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Sökvolym</label>
                    <input
                      type="number"
                      value={form.search_volume}
                      onChange={(e) => setForm({ ...form, search_volume: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Svårighet (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.difficulty}
                      onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Sökintent</label>
                  <select
                    value={form.intent}
                    onChange={(e) => setForm({ ...form, intent: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                  >
                    {INTENT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Målgrupp</label>
                  <select
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                  >
                    {AUDIENCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-xl transition-all font-medium"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.keyword.trim()}
                  className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingKeyword ? 'Spara ändringar' : 'Lägg till'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmationModal
          isVisible={!!keywordToDelete}
          onClose={() => setKeywordToDelete(null)}
          onConfirm={handleDelete}
          title="Radera nyckelord"
          message={`Är du säker på att du vill radera "${keywordToDelete?.keyword}"?`}
          confirmButtonText="Radera"
          cancelButtonText="Avbryt"
          variant="danger"
          darkMode={true}
        />
      </div>
    </div>
  );
}

