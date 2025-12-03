'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { questionnaireApi } from '../../../lib/questionnaire-api';

interface Props {
  questionnaireId: string;
  onDataLoaded?: () => void;
}

export default function QuestionnaireRunner({ questionnaireId, onDataLoaded }: Props) {
  const router = useRouter();
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
        setError('This questionnaire no longer exists. It may have been deleted.');
        setLoading(false);
        
        // Redirect to notifications page after showing message
        setTimeout(() => {
          router.push('/dashboard/youth/notifications');
        }, 3000);
      } else {
        // Other errors
        setError('Failed to load questionnaire. Please try again later.');
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
        alert("Failed to submit. Please try again.");
    } finally {
        setSubmitting(false);
    }
  };

  // --- Render Helpers ---

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  
  // Show error message if questionnaire doesn't exist
  if (error) {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Questionnaire Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting you back to notifications...</p>
          <button
            onClick={() => router.push('/dashboard/youth/notifications')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Notifications
          </button>
        </div>
      </div>
    );
  }
  
  if (isFinished) return <SuccessScreen rewardMessage={rewardMessage} router={router} />;
  
  // Safety check: Don't render if no data
  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        No questions available.
      </div>
    );
  }
  
  // For completed questionnaires, we show all questions, so skip visibleQuestions check
  if (!isCompleted && visibleQuestions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No questions available.
      </div>
    );
  }

  // If completed, show read-only view
  if (isCompleted) {
    // Show all questions (not just visible ones) for completed questionnaires
    const allQuestions = data.questions || [];
    
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Questionnaire Completed</h2>
              <p className="text-sm text-gray-600">You have already completed this questionnaire. Your answers are shown below.</p>
            </div>
          </div>
        </div>

        {/* Show all questions and answers */}
        <div className="space-y-6">
          {allQuestions.map((q: any, index: number) => {
            const answer = answers[q.id];
            return (
              <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{q.text}</h3>
                    {q.description && <p className="text-sm text-gray-500 mb-4">{q.description}</p>}
                    
                    {/* Answer Display */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {answer ? (
                        <ReadOnlyAnswer question={q} answer={answer} />
                      ) : (
                        <p className="text-gray-400 italic">No answer provided</p>
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
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header / Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Question {currentStepIndex + 1} of {visibleQuestions.length}</span>
            <span>{Math.round(progress)}% Completed</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{currentQ.text}</h2>
        {currentQ.description && <p className="text-gray-500 mb-6">{currentQ.description}</p>}


        <div className="flex-1 mt-4">
            <QuestionInput 
                question={currentQ} 
                value={answers[currentQ.id]} 
                onChange={(val) => handleAnswerChange(currentQ.id, val)} 
            />
        </div>

      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:static md:bg-transparent md:border-0 md:mt-8">
        <div className="max-w-2xl mx-auto flex gap-4">
            <button 
                onClick={handleBack}
                disabled={currentStepIndex === 0}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-0 transition-opacity"
            >
                Back
            </button>
            <button 
                onClick={handleNext}
                disabled={!answers[currentQ.id]} // Force answer? (Optional validation)
                className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
            >
                {currentStepIndex === visibleQuestions.length - 1 ? (submitting ? 'Sending...' : 'Finish') : 'Next'}
            </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function ReadOnlyAnswer({ question, answer }: { question: any, answer: any }) {
  if (question.question_type === 'RATING' && answer.rating_answer) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-blue-600">{answer.rating_answer}</span>
        <div className="flex gap-1">
          {[...Array(5)].map((_, idx) => (
            <svg 
              key={idx}
              className={`w-5 h-5 ${idx < answer.rating_answer ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
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
      return <p className="text-gray-800 font-medium">{Array.isArray(selectedTexts) ? selectedTexts.join(', ') : selectedTexts}</p>;
    }
  }
  
  if (answer.text_answer) {
    return <p className="text-gray-800 whitespace-pre-wrap">{answer.text_answer}</p>;
  }
  
  return <p className="text-gray-400 italic">No answer provided</p>;
}

function QuestionInput({ question, value, onChange }: { question: any, value: any, onChange: (v: any) => void }) {
    
    if (question.question_type === 'FREE_TEXT') {
        return (
            <textarea 
                className="w-full h-40 border border-gray-300 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Type your answer here..."
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
                            (value?.rating_answer || 0) >= star ? 'text-yellow-400' : 'text-gray-200'
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
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${
                                isSelected 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-medium text-lg">{opt.text}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                            }`}>
                                {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }

    return <div>Unknown Question Type</div>;
}

function SuccessScreen({ rewardMessage, router }: { rewardMessage: string | null, router: any }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-4xl">
                🎉
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
            <p className="text-gray-600 mb-8 max-w-md">
                Your answers have been submitted successfully. Your feedback helps us make the club better for everyone.
            </p>

            {rewardMessage && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 max-w-md w-full animate-bounce-short">
                    <h3 className="font-bold text-yellow-800 mb-1">🎁 Reward Earned!</h3>
                    <p className="text-yellow-700">{rewardMessage}</p>
                    <p className="text-xs text-yellow-600 mt-2">Check your profile wallet to redeem.</p>
                </div>
            )}

            <button 
                onClick={() => router.push('/dashboard/youth/questionnaires')}
                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors"
            >
                Back to Dashboard
            </button>
        </div>
    );
}

