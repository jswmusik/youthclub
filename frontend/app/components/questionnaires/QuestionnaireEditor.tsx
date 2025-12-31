'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Plus, ChevronUp, ChevronDown, Edit, Trash2, 
  CheckCircle2, Clock, ClipboardList, Settings, Users, Gift, 
  FileQuestion, Lightbulb, Send, Eye, EyeOff
} from 'lucide-react';
import { questionnaireApi, Questionnaire } from '../../../lib/questionnaire-api';
import QuestionnaireSettings from './QuestionnaireSettings';
import QuestionModal from './QuestionModal';
import { useToast } from '../../../hooks/useToast';

interface Props {
  initialId?: string;
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function QuestionnaireEditor({ initialId, basePath, scope }: Props) {
  const t = useTranslations('questionnairesAdmin.editor');
  const router = useRouter();
  const searchParams = useSearchParams();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'QUESTIONS'>('SETTINGS');
  const [loading, setLoading] = useState(false);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Questionnaire>>({
    title: '',
    description: '',
    status: 'DRAFT',
    questions: [],
    rewards: [],
    target_audience: 'YOUTH'
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const { success, error, info, warning } = useToast();

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Load Data if Edit Mode
  useEffect(() => {
    if (initialId) {
      setLoading(true);
      questionnaireApi.get(initialId)
        .then(res => {
            setFormData(res.data);
        })
        .catch(err => {
            console.error(err);
            error(t('toasts.loadFailed'));
        })
        .finally(() => setLoading(false));
    }
  }, [initialId]);

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    const requiredFields = [formData.title, formData.expiration_date];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

  const completionPercent = calculateCompletion();

  // Scroll tracking for fixed progress bar
  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    const mainElement = document.querySelector('main');
    const headerHeight = mainElement ? 0 : 64;
    setIsProgressFixed(rect.top < headerHeight);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const handlePublish = async () => {
    if (!initialId) return;
    setLoading(true);
    try {
      const updateData: any = { status: 'PUBLISHED' };
      if (formData.scheduled_publish_date) {
        updateData.scheduled_publish_date = formData.scheduled_publish_date;
      }
      
      await questionnaireApi.update(initialId, updateData);
      setFormData({ ...formData, status: 'PUBLISHED' });
      
      const scheduledDate = formData.scheduled_publish_date ? new Date(formData.scheduled_publish_date) : null;
      const isScheduled = scheduledDate && scheduledDate > new Date();
      
      success(isScheduled ? t('toasts.scheduledSuccess') : t('toasts.publishSuccess'));
      
      setTimeout(() => {
        const pageParam = searchParams.get('page');
        const redirectUrl = pageParam ? `${basePath}?page=${pageParam}` : basePath;
        router.push(redirectUrl);
      }, 1000);
    } catch (err: any) {
      console.error('Publish error:', err);
      error(err.response?.data?.detail || t('toasts.publishFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!initialId) return;
    setLoading(true);
    try {
      await questionnaireApi.update(initialId, { status: 'DRAFT' });
      setFormData({ ...formData, status: 'DRAFT' });
      success(t('toasts.unpublishSuccess'));
    } catch (err: any) {
      console.error('Unpublish error:', err);
      error(err.response?.data?.detail || t('toasts.unpublishFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        if (!formData.title) {
            error('Title is required');
            setLoading(false);
            return;
        }
        if (!formData.expiration_date) {
            error(t('toasts.expirationRequired'));
            setLoading(false);
            return;
        }

        const dataToSend: any = { ...formData };
        
        delete dataToSend.admin_level;
        delete dataToSend.created_by;
        delete dataToSend.created_at;
        delete dataToSend.updated_at;
        
        if (dataToSend.rewards) {
            dataToSend.rewards = Array.isArray(dataToSend.rewards) 
                ? dataToSend.rewards.map((r: any) => typeof r === 'string' ? parseInt(r) : r).filter((r: any) => !isNaN(r))
                : [];
        } else {
            dataToSend.rewards = [];
        }
        
        delete dataToSend.start_date;
        
        if (dataToSend.questions) {
            dataToSend.questions = dataToSend.questions.map((q: any) => {
                const cleanQ: any = {
                    text: q.text,
                    question_type: q.question_type,
                    order: q.order,
                };
                if (q.description) cleanQ.description = q.description;
                if (q.id) cleanQ.id = q.id;
                if (q.options && q.options.length > 0) {
                    cleanQ.options = q.options.map((opt: any) => ({
                        text: opt.text,
                        value: opt.value || opt.text,
                        order: opt.order || 0,
                        ...(opt.id && { id: opt.id })
                    }));
                }
                return cleanQ;
            });
        }
        
        if (dataToSend.scheduled_publish_date && dataToSend.scheduled_publish_date !== '' && dataToSend.scheduled_publish_date !== 'null') {
            if (typeof dataToSend.scheduled_publish_date === 'string') {
                if (!dataToSend.scheduled_publish_date.includes('Z') && !dataToSend.scheduled_publish_date.includes('+')) {
                    dataToSend.scheduled_publish_date = new Date(dataToSend.scheduled_publish_date).toISOString();
                }
            } else if (dataToSend.scheduled_publish_date instanceof Date) {
                dataToSend.scheduled_publish_date = dataToSend.scheduled_publish_date.toISOString();
            }
        } else {
            dataToSend.scheduled_publish_date = null;
        }
        
        if (dataToSend.expiration_date) {
            if (typeof dataToSend.expiration_date === 'string') {
                const hasTimezone = dataToSend.expiration_date.endsWith('Z') || 
                                  /[+-]\d{2}:\d{2}$/.test(dataToSend.expiration_date) ||
                                  /[+-]\d{4}$/.test(dataToSend.expiration_date);
                
                if (!hasTimezone) {
                    const date = new Date(dataToSend.expiration_date);
                    if (isNaN(date.getTime())) {
                        console.error('Invalid expiration_date:', dataToSend.expiration_date);
                        error(t('toasts.invalidExpiration'));
                        setLoading(false);
                        return;
                    }
                    dataToSend.expiration_date = date.toISOString();
                }
            } else if (dataToSend.expiration_date instanceof Date) {
                dataToSend.expiration_date = dataToSend.expiration_date.toISOString();
            }
        }
        
        if (initialId) {
            await questionnaireApi.update(initialId, dataToSend);
            success(t('toasts.updateSuccess'));
        } else {
            const res = await questionnaireApi.create(dataToSend);
            success(t('toasts.createSuccess'));
            const pageParam = searchParams.get('page');
            const redirectUrl = pageParam ? `${basePath}/edit/${res.data.id}?page=${pageParam}` : `${basePath}/edit/${res.data.id}`;
            router.push(redirectUrl);
        }
        } catch (err: any) {
            console.error('Save error:', err);
            
            let errorMessage = t('toasts.saveFailed');
            
            if (err.response?.data) {
                const errorData = err.response.data;
                
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (typeof errorData === 'object') {
                    const errorFields = Object.keys(errorData);
                    if (errorFields.length > 0) {
                        const messages = errorFields.map(field => {
                            const fieldErrors = Array.isArray(errorData[field]) 
                                ? errorData[field].join(', ') 
                                : String(errorData[field]);
                            return `${field}: ${fieldErrors}`;
                        });
                        errorMessage = messages.join(' | ');
                    } else {
                        errorMessage = JSON.stringify(errorData);
                    }
                }
            }
            
            error(errorMessage.length > 150 
                    ? 'Failed to save. Check console for details.' 
                    : errorMessage);
        } finally {
            setLoading(false);
        }
    };

  const handleQuestionSave = (question: any) => {
    const newQuestions = [...(formData.questions || [])];
    
    if (editingQuestionIndex !== null) {
        newQuestions[editingQuestionIndex] = question;
    } else {
        newQuestions.push({ ...question, order: newQuestions.length + 1 });
    }
    
    setFormData({ ...formData, questions: newQuestions });
    setShowModal(false);
    setEditingQuestionIndex(null);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = [...(formData.questions || [])];
    newQuestions.splice(index, 1);
    const reindexed = newQuestions.map((q, i) => ({ ...q, order: i + 1 }));
    setFormData({ ...formData, questions: reindexed });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...(formData.questions || [])];
    if (direction === 'up' && index > 0) {
        [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
    } else if (direction === 'down' && index < newQuestions.length - 1) {
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    }
    const reindexed = newQuestions.map((q, i) => ({ ...q, order: i + 1 }));
    setFormData({ ...formData, questions: reindexed });
  };

  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'SINGLE_CHOICE': 'Single Choice',
      'MULTI_CHOICE': 'Multiple Choice',
      'TEXT': 'Text Answer',
      'RATING': 'Rating Scale',
      'YES_NO': 'Yes / No'
    };
    return types[type] || type;
  };

  if (loading && initialId && !formData.title) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
        <ClipboardList className="w-6 h-6 text-white" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading questionnaire...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={basePath}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialId ? t('editTitle') : t('createTitle')}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1 flex items-center gap-2">
              {formData.status === 'PUBLISHED' ? (
                <>
                  <span className="w-2 h-2 bg-[var(--brand-green)] rounded-full animate-pulse"></span>
                  <span className="text-[var(--brand-green)]">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-[var(--brand-yellow)] rounded-full"></span>
                  <span>{t('draftMode')}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
          <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">{t('requiredFields')}</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to save!</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress */}
        {isMounted && createPortal(
          <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">{t('requiredFields')}</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'SETTINGS' 
                  ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white shadow-lg' 
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t('tabs.settings')}</span>
              <span className="sm:hidden">{t('tabs.settings')}</span>
            </button>
            <button
              onClick={() => setActiveTab('QUESTIONS')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'QUESTIONS' 
                  ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white shadow-lg' 
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>{t('tabs.questions')}</span>
              {formData.questions && formData.questions.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'QUESTIONS' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                }`}>
                  {formData.questions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'SETTINGS' ? (
          <QuestionnaireSettings data={formData} onChange={setFormData} scope={scope} />
        ) : (
          <div className="space-y-6">
            {/* Empty State */}
            {(!formData.questions || formData.questions.length === 0) && (
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="p-12 sm:p-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                    <FileQuestion className="w-8 h-8 text-[var(--brand-light)]/30" />
                  </div>
                  <p className="text-[var(--brand-light)]/50 mb-6">{t('questionsEmpty.title')}</p>
                  <button 
                    onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    {t('buttons.addFirstQuestion')}
                  </button>
                </div>
              </div>
            )}

            {/* Questions List */}
            {formData.questions && formData.questions.length > 0 && (
              <div className="space-y-4">
                {formData.questions.map((q: any, idx: number) => (
                  <div key={idx} className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden hover:border-[var(--brand-primary)]/30 transition-all">
                    <div className="p-4 sm:p-6">
                      <div className="flex gap-3 sm:gap-4 items-start">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
                          <button
                            onClick={() => moveQuestion(idx, 'up')}
                            disabled={idx === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] transition-all disabled:opacity-0 disabled:pointer-events-none"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <span className="font-bold text-white text-sm">{idx + 1}</span>
                          </div>
                          <button
                            onClick={() => moveQuestion(idx, 'down')}
                            disabled={idx === (formData.questions?.length || 0) - 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--brand-light)]/40 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] transition-all disabled:opacity-0 disabled:pointer-events-none"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Question Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                            <h3 className="font-semibold text-[var(--brand-light)] text-base sm:text-lg break-words">{q.text}</h3>
                            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => { setEditingQuestionIndex(idx); setShowModal(true); }}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] transition-all flex items-center gap-1.5"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => deleteQuestion(idx)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all flex items-center gap-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap mb-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                              {getQuestionTypeLabel(q.question_type)}
                            </span>
                            {q.parent_question && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                                ↳ Depends on Q{q.parent_question}
                              </span>
                            )}
                          </div>
                          
                          {/* Preview Options */}
                          {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && q.options && q.options.length > 0 && (
                            <div className="mt-3 pl-4 border-l-2 border-[var(--brand-purple)]/30 space-y-2">
                              {q.options.map((opt: any, i: number) => (
                                <div key={i} className="text-sm text-[var(--brand-light)]/60 flex items-center gap-2 break-words">
                                  <span className="w-2 h-2 rounded-full bg-[var(--brand-purple)] flex-shrink-0"></span>
                                  <span>{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Question Button */}
            {formData.questions && formData.questions.length > 0 && (
              <button 
                onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
                className="w-full py-5 sm:py-6 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-2 border-dashed border-[var(--dark-500)] text-[var(--brand-light)]/50 font-medium hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)]/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t('buttons.addQuestion')}
              </button>
            )}
          </div>
        )}

        {/* Quick Tips Card */}
        <div className="mt-6 sm:mt-8 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 flex items-center justify-center border border-[var(--brand-primary)]/30">
                <Lightbulb className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('tips.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('tips.title')}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--brand-light)]/70">{t('tips.tip1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--brand-light)]/70">{t('tips.tip2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--brand-light)]/70">{t('tips.tip3')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-green)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--brand-light)]/70">{t('tips.tip3')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 py-8">
          <button
            type="button"
            onClick={() => {
              const pageParam = searchParams.get('page');
              const redirectUrl = pageParam ? `${basePath}?page=${pageParam}` : basePath;
              router.push(redirectUrl);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? `${t('buttons.saveDraft')}...` : t('buttons.saveDraft')}
          </button>
          
          {formData.status === 'DRAFT' && initialId && (
            <button 
              onClick={handlePublish}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-[var(--brand-green)] text-[var(--dark-900)] hover:bg-[var(--brand-green)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? `${t('buttons.publish')}...` : t('buttons.publish')}
            </button>
          )}
          
          {formData.status === 'PUBLISHED' && initialId && (
            <button 
              onClick={handleUnpublish}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-[var(--brand-yellow)] text-[var(--dark-900)] hover:bg-[var(--brand-yellow)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4" />
              {loading ? `${t('buttons.unpublish')}...` : t('buttons.unpublish')}
            </button>
          )}
        </div>

        {/* Modal */}
        <QuestionModal 
          isVisible={showModal} 
          onClose={() => setShowModal(false)}
          onSave={handleQuestionSave}
          initialData={editingQuestionIndex !== null ? formData.questions?.[editingQuestionIndex] : null}
          allQuestions={formData.questions || []}
        />
        
        </div>
    </div>
  );
}
