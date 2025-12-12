'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Plus, ChevronUp, ChevronDown, Edit, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { questionnaireApi, Questionnaire } from '../../../lib/questionnaire-api';
import QuestionnaireSettings from './QuestionnaireSettings';
import QuestionModal from './QuestionModal';
import Toast from '../Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  initialId?: string; // If present, we are editing
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function QuestionnaireEditor({ initialId, basePath, scope }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'QUESTIONS'>('SETTINGS');
  const [loading, setLoading] = useState(false);
  
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
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Load Data if Edit Mode
  useEffect(() => {
    if (initialId) {
      setLoading(true);
      questionnaireApi.get(initialId)
        .then(res => {
            // Ensure questions have IDs for logic mapping
            setFormData(res.data);
        })
        .catch(err => {
            console.error(err);
            setToast({ message: 'Failed to load questionnaire', type: 'error', isVisible: true });
        })
        .finally(() => setLoading(false));
    }
  }, [initialId]);

  const handlePublish = async () => {
    if (!initialId) return;
    setLoading(true);
    try {
      // Include scheduled_publish_date if it's set, so backend can handle scheduling logic
      const updateData: any = { status: 'PUBLISHED' };
      if (formData.scheduled_publish_date) {
        updateData.scheduled_publish_date = formData.scheduled_publish_date;
      }
      
      await questionnaireApi.update(initialId, updateData);
      setFormData({ ...formData, status: 'PUBLISHED' });
      
      // Show appropriate message based on scheduling
      const scheduledDate = formData.scheduled_publish_date ? new Date(formData.scheduled_publish_date) : null;
      const isScheduled = scheduledDate && scheduledDate > new Date();
      
      setToast({ 
        message: isScheduled 
          ? `Questionnaire scheduled to publish on ${scheduledDate.toLocaleString()}`
          : 'Questionnaire published successfully', 
        type: 'success', 
        isVisible: true 
      });
      
      // Redirect to questionnaire list page after a short delay to show the toast
      setTimeout(() => {
        // Preserve page parameter if it exists
        const pageParam = searchParams.get('page');
        const redirectUrl = pageParam ? `${basePath}?page=${pageParam}` : basePath;
        router.push(redirectUrl);
      }, 1000);
    } catch (err: any) {
      console.error('Publish error:', err);
      setToast({ 
        message: err.response?.data?.detail || 'Failed to publish questionnaire', 
        type: 'error', 
        isVisible: true 
      });
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
      setToast({ message: 'Questionnaire unpublished successfully', type: 'success', isVisible: true });
    } catch (err: any) {
      console.error('Unpublish error:', err);
      setToast({ 
        message: err.response?.data?.detail || 'Failed to unpublish questionnaire', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        // Validate required fields
        if (!formData.title) {
            setToast({ message: 'Title is required', type: 'error', isVisible: true });
            setLoading(false);
            return;
        }
        if (!formData.expiration_date) {
            setToast({ message: 'Expiration date is required', type: 'error', isVisible: true });
            setLoading(false);
            return;
        }

        // Prepare data to send
        const dataToSend: any = { ...formData };
        
        // Remove fields that are set automatically by the backend
        delete dataToSend.admin_level;
        delete dataToSend.created_by;
        delete dataToSend.created_at;
        delete dataToSend.updated_at;
        
        // Ensure rewards is always an array of numbers
        if (dataToSend.rewards) {
            dataToSend.rewards = Array.isArray(dataToSend.rewards) 
                ? dataToSend.rewards.map((r: any) => typeof r === 'string' ? parseInt(r) : r).filter((r: any) => !isNaN(r))
                : [];
        } else {
            dataToSend.rewards = [];
        }
        
        // Remove start_date - it's auto-set by backend when publishing
        delete dataToSend.start_date;
        
        // Clean up questions: remove image, parent_question, trigger_option fields
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
        
        // Convert scheduled_publish_date to ISO format if it's a string from datetime-local input
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
        
        // Convert expiration_date to ISO format
        if (dataToSend.expiration_date) {
            if (typeof dataToSend.expiration_date === 'string') {
                const hasTimezone = dataToSend.expiration_date.endsWith('Z') || 
                                  /[+-]\d{2}:\d{2}$/.test(dataToSend.expiration_date) ||
                                  /[+-]\d{4}$/.test(dataToSend.expiration_date);
                
                if (!hasTimezone) {
                    const date = new Date(dataToSend.expiration_date);
                    if (isNaN(date.getTime())) {
                        console.error('Invalid expiration_date:', dataToSend.expiration_date);
                        setToast({ message: 'Invalid expiration date format', type: 'error', isVisible: true });
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
            setToast({ message: 'Saved successfully', type: 'success', isVisible: true });
        } else {
            const res = await questionnaireApi.create(dataToSend);
            setToast({ message: 'Created successfully', type: 'success', isVisible: true });
            // Preserve page parameter if it exists
            const pageParam = searchParams.get('page');
            const redirectUrl = pageParam ? `${basePath}/edit/${res.data.id}?page=${pageParam}` : `${basePath}/edit/${res.data.id}`;
            router.push(redirectUrl);
        }
        } catch (err: any) {
            console.error('Save error:', err);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);
            console.error('Error headers:', err.response?.headers);
            console.error('Form data being sent:', formData);
            
            // Show more detailed error message
            let errorMessage = 'Failed to save. Check all required fields.';
            
            if (err.response?.data) {
                const errorData = err.response.data;
                
                // Handle different error formats
                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (typeof errorData === 'object') {
                    // DRF validation errors are usually in this format:
                    // { "field_name": ["error message"] }
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
            
            console.error('Parsed error message:', errorMessage);
            
            setToast({ 
                message: errorMessage.length > 150 
                    ? 'Failed to save. Check console for details.' 
                    : errorMessage, 
                type: 'error', 
                isVisible: true 
            });
        } finally {
            setLoading(false);
        }
    };

  const handleQuestionSave = (question: any) => {
    const newQuestions = [...(formData.questions || [])];
    
    if (editingQuestionIndex !== null) {
        // Update existing
        newQuestions[editingQuestionIndex] = question;
    } else {
        // Add new
        newQuestions.push({ ...question, order: newQuestions.length + 1 });
    }
    
    setFormData({ ...formData, questions: newQuestions });
    setShowModal(false);
    setEditingQuestionIndex(null);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = [...(formData.questions || [])];
    newQuestions.splice(index, 1);
    // Re-index orders
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

  if (loading && initialId && !formData.title) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href={basePath}>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">
              {initialId ? 'Edit Questionnaire' : 'Create New Questionnaire'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {formData.status === 'PUBLISHED' ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              ) : (
                'Draft Mode'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-shrink-0">
          <Button 
            type="button"
            variant="ghost" 
            onClick={() => {
              const pageParam = searchParams.get('page');
              const redirectUrl = pageParam ? `${basePath}?page=${pageParam}` : basePath;
              router.push(redirectUrl);
            }}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2 flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Changes'}</span>
            <span className="sm:hidden">{loading ? 'Saving...' : 'Save'}</span>
          </Button>
          {formData.status === 'DRAFT' && initialId && (
            <Button 
              onClick={handlePublish}
              disabled={loading}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 gap-2 flex-1 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">{loading ? 'Publishing...' : 'Publish'}</span>
              <span className="sm:hidden">{loading ? '...' : 'Publish'}</span>
            </Button>
          )}
          {formData.status === 'PUBLISHED' && initialId && (
            <Button 
              onClick={handleUnpublish}
              disabled={loading}
              variant="outline"
              className="border-yellow-600 text-yellow-600 hover:bg-yellow-50 gap-2 flex-1 sm:flex-none"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{loading ? 'Unpublishing...' : 'Unpublish'}</span>
              <span className="sm:hidden">{loading ? '...' : 'Unpublish'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={cn(
            "px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap flex-shrink-0",
            activeTab === 'SETTINGS' 
              ? 'text-[#4D4DA4]' 
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Settings & Targeting
          {activeTab === 'SETTINGS' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4D4DA4]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('QUESTIONS')}
          className={cn(
            "px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap flex-shrink-0",
            activeTab === 'QUESTIONS' 
              ? 'text-[#4D4DA4]' 
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Questions ({formData.questions?.length || 0})
          {activeTab === 'QUESTIONS' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4D4DA4]" />
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'SETTINGS' ? (
        <QuestionnaireSettings data={formData} onChange={setFormData} scope={scope} />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Empty State */}
          {(!formData.questions || formData.questions.length === 0) && (
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="py-12 sm:py-20 text-center">
                <p className="text-gray-500 mb-4">No questions added yet.</p>
                <Button 
                  onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
                  className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Questions List */}
          <div className="space-y-3 sm:space-y-4">
            {formData.questions?.map((q: any, idx: number) => (
              <Card key={idx} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    {/* Order Controls */}
                    <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-[#4D4DA4] disabled:opacity-0"
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBEBFE] flex items-center justify-center">
                        <span className="font-bold text-[#4D4DA4] text-xs sm:text-sm">{idx + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-[#4D4DA4] disabled:opacity-0"
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === (formData.questions?.length || 0) - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h3 className="font-semibold text-[#121213] text-base sm:text-lg break-words">{q.text}</h3>
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingQuestionIndex(idx); setShowModal(true); }}
                            className="text-gray-600 hover:text-[#4D4DA4] hover:bg-[#EBEBFE] h-8 px-2 sm:px-3"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(idx)}
                            className="text-gray-600 hover:text-red-600 hover:bg-red-50 h-8 px-2 sm:px-3"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap mb-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {q.question_type.replace('_', ' ')}
                        </Badge>
                        {q.parent_question && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            ↳ Logic: Dependent on Q{q.parent_question}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Preview Options */}
                      {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && q.options && q.options.length > 0 && (
                        <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-[#EBEBFE] space-y-2">
                          {q.options.map((opt: any, i: number) => (
                            <div key={i} className="text-xs sm:text-sm text-gray-700 flex items-center gap-2 break-words">
                              <span className="w-2 h-2 rounded-full bg-[#4D4DA4] flex-shrink-0"></span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Button */}
          {formData.questions && formData.questions.length > 0 && (
            <Button 
              onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
              variant="outline"
              className="w-full py-4 sm:py-6 border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#4D4DA4] hover:text-[#4D4DA4] hover:bg-[#EBEBFE]/30 transition-colors gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Next Question
            </Button>
          )}
        </div>
      )}

      {/* Modal */}
      <QuestionModal 
        isVisible={showModal} 
        onClose={() => setShowModal(false)}
        onSave={handleQuestionSave}
        initialData={editingQuestionIndex !== null ? formData.questions?.[editingQuestionIndex] : null}
        allQuestions={formData.questions || []}
      />
      
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
