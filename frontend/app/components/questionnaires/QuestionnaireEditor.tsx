'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { questionnaireApi, Questionnaire } from '../../../lib/questionnaire-api';
import QuestionnaireSettings from './QuestionnaireSettings';
import QuestionModal from './QuestionModal';
import Toast from '../Toast';

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

  if (loading && initialId && !formData.title) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">
                {initialId ? 'Edit Questionnaire' : 'New Questionnaire'}
            </h1>
            <p className="text-gray-500 text-sm">
                {formData.status === 'PUBLISHED' ? '🔴 Live' : 'Draft Mode'}
            </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => {
                  // Preserve page parameter if it exists
                  const pageParam = searchParams.get('page');
                  const redirectUrl = pageParam ? `${basePath}?page=${pageParam}` : basePath;
                  router.push(redirectUrl);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50"
            >
                {loading ? 'Saving...' : 'Save Changes'}
            </button>
            {formData.status === 'DRAFT' && initialId && (
                <button 
                    onClick={handlePublish}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Publishing...' : 'Publish'}
                </button>
            )}
            {formData.status === 'PUBLISHED' && initialId && (
                <button 
                    onClick={handleUnpublish}
                    disabled={loading}
                    className="px-6 py-2 bg-yellow-600 text-white rounded font-bold hover:bg-yellow-700 disabled:opacity-50"
                >
                    {loading ? 'Unpublishing...' : 'Unpublish'}
                </button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`pb-2 px-4 font-medium ${activeTab === 'SETTINGS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Settings & Targeting
        </button>
        <button
            onClick={() => setActiveTab('QUESTIONS')}
            className={`pb-2 px-4 font-medium ${activeTab === 'QUESTIONS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
            Questions Builder ({formData.questions?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'SETTINGS' ? (
        <QuestionnaireSettings data={formData} onChange={setFormData} scope={scope} />
      ) : (
        <div className="max-w-4xl mx-auto">
            {/* Empty State */}
            {(!formData.questions || formData.questions.length === 0) && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 mb-4">No questions added yet.</p>
                    <button 
                        onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        + Add First Question
                    </button>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {formData.questions?.map((q: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex gap-4 items-start group">
                        <div className="flex flex-col gap-1 pt-1">
                            <button onClick={() => moveQuestion(idx, 'up')} className="text-gray-400 hover:text-blue-600 disabled:opacity-0" disabled={idx === 0}>▲</button>
                            <span className="font-bold text-gray-400 text-center w-6">{idx + 1}</span>
                            <button onClick={() => moveQuestion(idx, 'down')} className="text-gray-400 hover:text-blue-600 disabled:opacity-0" disabled={idx === (formData.questions?.length || 0) - 1}>▼</button>
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{q.text}</h3>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setEditingQuestionIndex(idx); setShowModal(true); }}
                                        className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => deleteQuestion(idx)}
                                        className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wide">{q.question_type.replace('_', ' ')}</span>
                                {q.parent_question && (
                                    <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                        ↳ Logic: Dependent on Q{q.parent_question}
                                    </span>
                                )}
                            </div>
                            
                            {/* Preview Options */}
                            {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (
                                <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-1">
                                    {q.options?.map((opt: any, i: number) => (
                                        <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full border border-gray-400"></span>
                                            {opt.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Button (Bottom) */}
            {formData.questions && formData.questions.length > 0 && (
                <button 
                    onClick={() => { setEditingQuestionIndex(null); setShowModal(true); }}
                    className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                    + Add Next Question
                </button>
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

