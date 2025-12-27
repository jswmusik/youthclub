'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { questionnaireApi } from '../../../lib/questionnaire-api';
import { CheckCircle, AlertTriangle } from 'lucide-react';


interface Props {
  questionnaireId: string;
  onDataLoaded?: () => void;
  darkMode?: boolean;
}

export default function QuestionnaireRunner({ questionnaireId, onDataLoaded, darkMode = false }: Props) {
  const router = useRouter();
  const t = useTranslations('questionnaires');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({}); // Map: QuestionID -> Answer
  const [visibleQuestions, setVisibleQuestions] = useState<any[]>([]); // The calculated list of questions to show

  // Outcome
  const [isFinished, setIsFinished] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [questionnaireId]);

  const loadData = async () => {
    try {
      const res = await questionnaireApi.getFeedDetail(questionnaireId);
      const qData = res.data;
      
      // Check if questionnaire is already completed
      const completed = qData.is_completed || qData.response_status === 'COMPLETED';
      setIsCompleted(completed);
      
      // Sort questions just in case
      qData.questions.sort((a: any, b: any) => a.order - b.order);
      
      setData(qData);
      
      // Load existing answers if questionnaire was started or completed
      const existingAnswers: Record<number, any> = {};
      if (qData.existing_answers) {
        Object.keys(qData.existing_answers).forEach((questionId: string) => {
          const qId = parseInt(questionId);
          existingAnswers[qId] = qData.existing_answers[qId];
        });
        setAnswers(existingAnswers);
      }
      
      // Initial calculation: The first question is always visible
      // We will calculate the "Path" dynamically
      updateVisiblePath(existingAnswers, qData.questions);
      
      // Notify parent that data is loaded (this triggers when STARTED response is created)
      if (onDataLoaded && !completed) {
        onDataLoaded();
      }
      
      setLoading(false);
      
    } catch (err: any) {
      console.error('Failed to load questionnaire:', err);
      
      // Check if questionnaire was deleted (404) or unauthorized (401)
      if (err.response?.status === 404 || err.response?.status === 401) {
        // Questionnaire doesn't exist or was deleted
        setError(t('questionnaireDeleted'));
        setLoading(false);
        
        // Redirect to notifications page after showing message
        setTimeout(() => {
          router.push('/dashboard/youth/notifications');
        }, 3000);
      } else {
        // Other errors
        setError(t('failedToLoadQuestionnaire'));
        setLoading(false);
      }
    }
  };

  /**
   * Core Logic Engine:
   * Recalculates which questions should be visible based on current answers.
   * This handles the "Show Q2 only if Q1 = 'Yes'" requirement.
   */
  const updateVisiblePath = (currentAnswers: Record<number, any>, allQuestions: any[]) => {
    const visible: any[] = [];
    
    // Iterate through all questions in order
    for (const q of allQuestions) {
        // 1. Root questions (no parent) are always visible
        if (!q.parent_question) {
            visible.push(q);
            continue;
        }

        // 2. Child questions: Check logic
        const parentId = q.parent_question; // This is the ID or Order depending on backend serialization. Let's assume ID for robustness.
        // Wait! The backend serializer sends `parent_question` as an ID (ForeignKey).
        // But the `trigger_option` is also an ID.
        
        // Find the user's answer to the parent question
        // We need to find the *actual Question ID* of the parent. 
        // NOTE: If your backend serializer returns `parent_question` as the Question ID, this works directly.
        // If it returns order, we map it. Based on models, it returns ID.
        
        const parentAnswer = currentAnswers[parentId];
        
        if (!parentAnswer) {
            // Parent hasn't been answered yet (or wasn't visible), so this child is hidden
            continue;
        }
        
        // 3. Check Trigger Match
        // Depending on answer type (Single Choice usually)
        // answer structure: { selected_options: [id], ... }
        
        const triggerOptionId = q.trigger_option;
        
        if (triggerOptionId) {
             const selectedIds = parentAnswer.selected_options || [];
             if (selectedIds.includes(triggerOptionId)) {
                 visible.push(q);
             }
        }
    }
    
    setVisibleQuestions(visible);
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    // Don't allow changes if completed
    if (isCompleted) return;
    
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    // Recalculate path immediately so if they change a past answer, future steps update
    if (data) {
        updateVisiblePath(newAnswers, data.questions);
    }
    
    // Auto-save answers as user progresses (debounced)
    // Only auto-save if not completed
    if (data && !isCompleted) {
      autoSaveAnswers(newAnswers);
    }
  };
  
  // Auto-save answers with debouncing
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const autoSaveAnswers = async (currentAnswers: Record<number, any>) => {
    // Don't auto-save if questionnaire is completed
    if (isCompleted) {
      // Clear any pending timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check completion status before saving
      if (isCompleted) {
        return;
      }
      
      try {
        const answersArray = Object.keys(currentAnswers).map(qId => ({
          question_id: parseInt(qId),
          ...currentAnswers[parseInt(qId)]
        }));
        
        await questionnaireApi.saveAnswers(questionnaireId, answersArray);
        console.log('[QuestionnaireRunner] Auto-saved answers');
      } catch (err: any) {
        // Don't log errors for completed questionnaires (400 is expected)
        if (err.response?.status === 400) {
          // Check if it's because questionnaire is completed
          const errorMessage = err.response?.data?.detail || err.response?.data?.error || '';
          if (errorMessage.includes('completed') || errorMessage.includes('already')) {
            console.log('[QuestionnaireRunner] Auto-save skipped - questionnaire already completed');
            return;
          }
        }
        console.error('[QuestionnaireRunner] Failed to auto-save:', err);
        // Don't show error to user, just log it
      }
    }, 1000);
  };
  
  // Cleanup timeout on unmount or when completed
  React.useEffect(() => {
    if (isCompleted && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isCompleted]);

  const handleNext = () => {
    if (currentStepIndex < visibleQuestions.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        window.scrollTo(0, 0);
    } else {
        submitSurvey();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
        setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const submitSurvey = async () => {
    // Don't allow submission if already completed
    if (isCompleted) return;
    
    setSubmitting(true);
    try {
        // Format payload
        const payload = {
            questionnaire_id: data.id,
            answers: Object.keys(answers).map(qId => ({
                question_id: parseInt(qId),
                ...answers[parseInt(qId)]
            }))
        };

        const res = await questionnaireApi.submitResponse(payload);
        
        setIsFinished(true);
        setRewardMessage(res.data.reward_message);
        
        // Celebration! (Optional - only if canvas-confetti is installed)
        try {
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (e) {
            // Confetti not available, skip
        }
        
    } catch (err) {
        console.error(err);
        alert(t('failedToSubmit'));
    } finally {
        setSubmitting(false);
    }
  };

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className={`w-12 h-12 border-4 rounded-full animate-spin ${
          darkMode 
            ? 'border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]' 
            : 'border-[#4D4DA4]/20 border-t-[#4D4DA4]'
        }`} />
      </div>
    );
  }
  
  // Show error message if questionnaire doesn't exist
  if (error) {
    return (
      <div className="max-w-2xl mx-auto pb-20 px-4 sm:px-0">
        <div className={`p-8 rounded-xl sm:rounded-2xl text-center border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--brand-red)]/30' 
            : 'bg-white shadow-lg border-2 border-red-200'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            darkMode 
              ? 'bg-[var(--brand-red)]/20' 
              : 'bg-gradient-to-br from-red-100 to-red-200'
          }`}>
            <AlertTriangle className={`w-10 h-10 ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'}`} />
          </div>
          <h2 className={`text-2xl font-bold mb-2 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>{t('questionnaireNotFound')}</h2>
          <p className={`mb-6 font-semibold ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>{error}</p>
          <p className={`text-sm mb-6 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('redirectingToNotifications')}</p>
          <button
            onClick={() => router.push('/dashboard/youth/notifications')}
            className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${
              darkMode 
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-lg'
            }`}
          >
            {t('goToNotifications')}
          </button>
        </div>
      </div>
    );
  }
  
  if (isFinished) return <SuccessScreen rewardMessage={rewardMessage} router={router} darkMode={darkMode} />;
  
  // Safety check: Don't render if no data
  if (!data) {
    return (
      <div className={`p-8 text-center ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
        {t('noQuestionsAvailable')}
      </div>
    );
  }
  
  // For completed questionnaires, we show all questions, so skip visibleQuestions check
  if (!isCompleted && visibleQuestions.length === 0) {
    return (
      <div className={`p-8 text-center ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
        {t('noQuestionsAvailable')}
      </div>
    );
  }

  // If completed, show read-only view
  if (isCompleted) {
    // Show all questions (not just visible ones) for completed questionnaires
    const allQuestions = data.questions || [];
    
    return (
      <div className="max-w-2xl mx-auto pb-20 px-4 sm:px-0">
        <div className={`rounded-xl sm:rounded-2xl p-6 mb-6 border ${
          darkMode 
            ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
            : 'bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 border-2 border-[#10B981]/30 shadow-md'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              darkMode 
                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg'
            }`}>
              <CheckCircle className={`w-7 h-7 ${darkMode ? '' : 'text-white'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold font-heading ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
              }`}>{t('questionnaireCompleted')}</h2>
              <p className={`text-sm font-semibold ${
                darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
              }`}>{t('alreadyCompletedMessage')}</p>
            </div>
          </div>
        </div>

        {/* Show all questions and answers */}
        <div className="space-y-4">
          {allQuestions.map((q: any, index: number) => {
            const answer = answers[q.id];
            return (
              <div key={q.id} className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border transition-all ${
                darkMode 
                  ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30' 
                  : 'bg-white shadow-md border-2 border-[#4D4DA4]/10 hover:border-[#4D4DA4]/30'
              }`}>
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    darkMode 
                      ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                      : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] text-white shadow-sm'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg sm:text-xl font-bold mb-2 font-heading ${
                      darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                    }`}>{q.text}</h3>
                    {q.description && <p className={`text-sm mb-4 font-medium ${
                      darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                    }`}>{q.description}</p>}
                    
                    {/* Answer Display */}
                    <div className={`mt-4 p-4 rounded-xl border ${
                      darkMode 
                        ? 'bg-[var(--dark-600)] border-[var(--dark-500)]' 
                        : 'bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200'
                    }`}>
                      {answer ? (
                        <ReadOnlyAnswer question={q} answer={answer} darkMode={darkMode} />
                      ) : (
                        <p className={`italic font-medium ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('noAnswerProvided')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = visibleQuestions[currentStepIndex];
  // Calculate progress based on visible path
  const progress = ((currentStepIndex) / visibleQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4 sm:px-0">
      {/* Header / Progress */}
      <div className="mb-6 sm:mb-8">
        <div className={`flex justify-between text-xs sm:text-sm font-bold mb-3 ${
          darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
        }`}>
            <span>{t('questionOf', { current: currentStepIndex + 1, total: visibleQuestions.length })}</span>
            <span className={darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}>{t('percentCompleted', { percent: Math.round(progress) })}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${
          darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-200 shadow-inner'
        }`}>
            <div className={`h-full transition-all duration-300 rounded-full ${
              darkMode 
                ? 'bg-[var(--brand-primary)]' 
                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] shadow-sm'
            }`} style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Question Card */}
      <div className={`p-6 md:p-8 rounded-xl sm:rounded-2xl border min-h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        darkMode 
          ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
          : 'bg-white shadow-lg border-2 border-[#4D4DA4]/10'
      }`}>
        
        <h2 className={`text-xl md:text-2xl font-bold mb-3 font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
        }`}>{currentQ.text}</h2>
        {currentQ.description && <p className={`mb-6 font-medium ${
          darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
        }`}>{currentQ.description}</p>}


        <div className="flex-1 mt-4">
            <QuestionInput 
                question={currentQ} 
                value={answers[currentQ.id]} 
                onChange={(val) => handleAnswerChange(currentQ.id, val)}
                darkMode={darkMode}
            />
        </div>

      </div>

      {/* Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 border-t md:static md:bg-transparent md:border-0 md:mt-6 z-[60] ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)] md:shadow-none' 
          : 'bg-white border-gray-200 shadow-lg md:shadow-none'
      }`}>
        <div className="max-w-2xl mx-auto flex gap-3">
            <button 
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className={`flex-1 py-3 px-6 rounded-xl font-bold disabled:opacity-0 transition-all active:scale-95 ${
                  darkMode 
                    ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:border-[var(--brand-primary)] hover:text-[var(--brand-light)]' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#4D4DA4] hover:text-[#4D4DA4]'
                }`}
            >
                {t('back')}
            </button>
            <button 
                onClick={handleNext}
                disabled={!answers[currentQ.id]} // Force answer? (Optional validation)
                className={`flex-1 py-3 px-6 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 ${
                  darkMode 
                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                    : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-lg hover:shadow-xl'
                }`}
            >
                {currentStepIndex === visibleQuestions.length - 1 ? (submitting ? t('sending') : t('finish')) : t('next')}
            </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function ReadOnlyAnswer({ question, answer, darkMode = false }: { question: any, answer: any, darkMode?: boolean }) {
  const t = useTranslations('questionnaires');
  if (question.question_type === 'RATING' && answer.rating_answer) {
    return (
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-600'}`}>{answer.rating_answer}</span>
        <div className="flex gap-1">
          {[...Array(5)].map((_, idx) => (
            <svg 
              key={idx}
              className={`w-5 h-5 ${idx < answer.rating_answer ? 'text-yellow-400 fill-current' : darkMode ? 'text-[var(--dark-500)]' : 'text-gray-300'}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
    );
  }
  
  if (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'MULTI_CHOICE') {
    if (answer.selected_options && answer.selected_options.length > 0) {
      // Get option texts from question options
      const selectedTexts = question.options
        ?.filter((opt: any) => answer.selected_options.includes(opt.id))
        .map((opt: any) => opt.text) || answer.selected_options;
      return <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{Array.isArray(selectedTexts) ? selectedTexts.join(', ') : selectedTexts}</p>;
    }
  }
  
  if (answer.text_answer) {
    return <p className={`whitespace-pre-wrap ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{answer.text_answer}</p>;
  }
  
  return <p className={`italic ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('noAnswerProvided')}</p>;
}

function QuestionInput({ question, value, onChange, darkMode = false }: { question: any, value: any, onChange: (v: any) => void, darkMode?: boolean }) {
    const t = useTranslations('questionnaires');
    
    if (question.question_type === 'FREE_TEXT') {
        return (
            <textarea 
                className={`w-full h-40 rounded-xl p-4 text-lg outline-none resize-none transition-all ${
                  darkMode 
                    ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]' 
                    : 'border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder={t('typeAnswer')}
                value={value?.text_answer || ''}
                onChange={(e) => onChange({ text_answer: e.target.value })}
            />
        );
    }

    if (question.question_type === 'RATING') {
        return (
            <div className="flex gap-2 justify-center py-8">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onChange({ rating_answer: star })}
                        className={`text-4xl transition-transform hover:scale-110 ${
                            (value?.rating_answer || 0) >= star 
                              ? 'text-yellow-400' 
                              : darkMode ? 'text-[var(--dark-500)]' : 'text-gray-200'
                        }`}
                    >
                        ★
                    </button>
                ))}
            </div>
        );
    }

    if (['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(question.question_type)) {
        const isMulti = question.question_type === 'MULTI_CHOICE';
        const selectedIds = value?.selected_options || [];

        const toggleOption = (id: number) => {
            let newIds;
            if (isMulti) {
                if (selectedIds.includes(id)) {
                    newIds = selectedIds.filter((x: number) => x !== id);
                } else {
                    newIds = [...selectedIds, id];
                }
            } else {
                newIds = [id];
            }
            onChange({ selected_options: newIds });
        };

        return (
            <div className="space-y-3">
                {question.options.map((opt: any) => {
                    const isSelected = selectedIds.includes(opt.id);
                    return (
                        <button
                            key={opt.id}
                            onClick={() => toggleOption(opt.id)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group active:scale-95 ${
                                isSelected 
                                    ? darkMode
                                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-light)]' 
                                      : 'border-[#4D4DA4] bg-gradient-to-r from-[#4D4DA4]/10 to-[#4D4DA4]/5 text-[#4D4DA4] shadow-md'
                                    : darkMode
                                      ? 'border-[var(--dark-500)] text-[var(--brand-light)]/80 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--dark-600)]' 
                                      : 'border-gray-200 hover:border-[#4D4DA4]/50 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-bold text-base sm:text-lg">{opt.text}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? darkMode
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' 
                                    : 'border-[#4D4DA4] bg-[#4D4DA4] shadow-sm'
                                  : darkMode
                                    ? 'border-[var(--dark-400)]' 
                                    : 'border-gray-300'
                            }`}>
                                {isSelected && <span className={`text-xs font-bold ${darkMode ? 'text-[var(--dark-900)]' : 'text-white'}`}>✓</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }

    return <div>{t('unknownQuestionType')}</div>;
}

function SuccessScreen({ rewardMessage, router, darkMode = false }: { rewardMessage: string | null, router: any, darkMode?: boolean }) {
    const t = useTranslations('questionnaires');
    
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-6 text-5xl animate-bounce ${
              darkMode 
                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-br from-[#10B981] to-[#059669] shadow-xl'
            }`}>
                🎉
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-3 font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
            }`}>{t('thankYou')}</h1>
            <p className={`mb-8 max-w-md font-semibold text-base sm:text-lg ${
              darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
            }`}>
                {t('submissionSuccessMessage')}
            </p>

            {rewardMessage && (
                <div className={`rounded-2xl p-6 mb-8 max-w-md w-full border animate-bounce ${
                  darkMode 
                    ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                    : 'bg-gradient-to-r from-[#FF5485]/10 to-[#FF5485]/5 border-2 border-[#FF5485]/30 shadow-lg'
                }`}>
                    <h3 className={`font-bold mb-2 text-xl flex items-center justify-center gap-2 font-heading ${
                      darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                    }`}>
                        <span className="text-2xl">🎁</span> {t('rewardEarned')}
                    </h3>
                    <p className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{rewardMessage}</p>
                    <p className={`text-xs mt-2 font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('checkWalletToRedeem')}</p>
                </div>
            )}

            <button 
                onClick={() => router.push('/dashboard/youth/questionnaires')}
                className={`px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
                  darkMode 
                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                    : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-lg hover:shadow-xl'
                }`}
            >
                {t('backToQuestionnaires')}
            </button>
        </div>
    );
}
