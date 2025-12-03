'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { questionnaireApi } from '../../../lib/questionnaire-api';

interface QuestionnaireCardProps {
  questionnaire: {
    id: string;
    questionnaire_id: number;
    title: string;
    description?: string;
    expiration_date?: string;
    has_rewards?: boolean;
    benefit_limit?: number;
    is_started?: boolean;
    progress?: number;
    answered_questions?: number;
    total_questions?: number;
  };
  onComplete?: () => void; // Callback when questionnaire is completed
}

export default function QuestionnaireCard({ questionnaire, onComplete }: QuestionnaireCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State for questionnaire runner
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [visibleQuestions, setVisibleQuestions] = useState<any[]>([]);
  
  // Outcome
  const [isFinished, setIsFinished] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  const expirationDate = questionnaire.expiration_date 
    ? new Date(questionnaire.expiration_date)
    : null;
  
  const isExpiringSoon = expirationDate && expirationDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const loadQuestionnaire = async () => {
    if (data) return; // Already loaded
    
    setLoading(true);
    try {
      const res = await questionnaireApi.getFeedDetail(questionnaire.questionnaire_id.toString());
      const qData = res.data;
      
      // Sort questions
      qData.questions.sort((a: any, b: any) => a.order - b.order);
      
      setData(qData);
      
      // Load existing answers if questionnaire was started before
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
    } catch (err) {
      console.error('Failed to load questionnaire:', err);
      alert('Failed to load questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setIsExpanded(true);
    loadQuestionnaire();
  };

  const updateVisiblePath = (currentAnswers: Record<number, any>, allQuestions: any[]) => {
    const visible: any[] = [];
    
    for (const q of allQuestions) {
      if (!q.parent_question) {
        visible.push(q);
        continue;
      }

      const parentId = q.parent_question;
      const parentAnswer = currentAnswers[parentId];
      
      if (!parentAnswer) {
        continue;
      }
      
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
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    if (data) {
      updateVisiblePath(newAnswers, data.questions);
    }
    
    // Auto-save answers as user progresses (debounced)
    if (data) {
      autoSaveAnswers(newAnswers);
    }
  };
  
  // Auto-save answers with debouncing
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const autoSaveAnswers = async (currentAnswers: Record<number, any>) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const answersArray = Object.keys(currentAnswers).map(qId => ({
          question_id: parseInt(qId),
          ...currentAnswers[parseInt(qId)]
        }));
        
        await questionnaireApi.saveAnswers(questionnaire.questionnaire_id.toString(), answersArray);
        console.log('[QuestionnaireCard] Auto-saved answers');
      } catch (err) {
        console.error('[QuestionnaireCard] Failed to auto-save:', err);
        // Don't show error to user, just log it
      }
    }, 1000);
  };
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleNext = () => {
    if (currentStepIndex < visibleQuestions.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
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
    setSubmitting(true);
    try {
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
      
      // Celebration!
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

      // Call onComplete callback if provided
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
      
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // If finished, show success state
  if (isFinished) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-green-200 overflow-hidden relative">
        {/* Decorative gradient border with stars */}
        <div className="h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-white text-xs">⭐</span>
            <span className="text-white text-xs">✨</span>
            <span className="text-white text-xs">⭐</span>
            <span className="text-white text-xs">✨</span>
            <span className="text-white text-xs">⭐</span>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Completed!</h3>
              <p className="text-sm text-gray-600">Thank you for your feedback</p>
            </div>
          </div>
          {rewardMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-yellow-800 mb-1">🎁 Reward Earned!</h4>
              <p className="text-yellow-700 text-sm">{rewardMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If expanded, show questionnaire runner
  if (isExpanded) {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden relative">
          {/* Decorative gradient border with stars */}
          <div className="h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <span className="text-white text-xs">⭐</span>
              <span className="text-white text-xs">✨</span>
              <span className="text-white text-xs">⭐</span>
              <span className="text-white text-xs">✨</span>
              <span className="text-white text-xs">⭐</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading questionnaire...</p>
            </div>
          </div>
        </div>
      );
    }

    if (!data || visibleQuestions.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md border border-red-200 overflow-hidden relative">
          {/* Decorative gradient border with stars */}
          <div className="h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <span className="text-white text-xs">⭐</span>
              <span className="text-white text-xs">✨</span>
              <span className="text-white text-xs">⭐</span>
              <span className="text-white text-xs">✨</span>
              <span className="text-white text-xs">⭐</span>
            </div>
          </div>
          <div className="p-6">
            <p className="text-red-600">Failed to load questionnaire.</p>
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Go back
            </button>
          </div>
        </div>
      );
    }

    const currentQ = visibleQuestions[currentStepIndex];
    const progress = ((currentStepIndex) / visibleQuestions.length) * 100;

    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden relative">
        {/* Decorative gradient border with stars */}
        <div className="h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span className="text-white text-xs">⭐</span>
            <span className="text-white text-xs">✨</span>
            <span className="text-white text-xs">⭐</span>
            <span className="text-white text-xs">✨</span>
            <span className="text-white text-xs">⭐</span>
          </div>
        </div>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{data.title}</h3>
              {data.description && (
                <p className="text-sm text-gray-600 mt-1">{data.description}</p>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Question {currentStepIndex + 1} of {visibleQuestions.length}</span>
              <span>{Math.round(progress)}% Completed</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{currentQ.text}</h2>
          {currentQ.description && (
            <p className="text-gray-500 mb-4">{currentQ.description}</p>
          )}


          {/* Question Input */}
          <div className="mb-6">
            <QuestionInput
              question={currentQ}
              value={answers[currentQ.id]}
              onChange={(val) => handleAnswerChange(currentQ.id, val)}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="flex-1 py-2 px-4 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[currentQ.id] || submitting}
              className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {currentStepIndex === visibleQuestions.length - 1 
                ? (submitting ? 'Submitting...' : 'Submit') 
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default collapsed state
  const isStarted = questionnaire.is_started || false;
  const progress = questionnaire.progress || 0;
  const answeredCount = questionnaire.answered_questions || 0;
  const totalCount = questionnaire.total_questions || 0;
  
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative">
      {/* Decorative gradient border with stars */}
      <div className="h-3 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-white text-xs">⭐</span>
          <span className="text-white text-xs">✨</span>
          <span className="text-white text-xs">⭐</span>
          <span className="text-white text-xs">✨</span>
          <span className="text-white text-xs">⭐</span>
        </div>
      </div>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 ${isStarted ? 'bg-orange-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center text-2xl`}>
              {isStarted ? '⏳' : '📋'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{questionnaire.title}</h3>
              <span className={`text-xs font-semibold uppercase tracking-wide ${isStarted ? 'text-orange-600' : 'text-blue-600'}`}>
                {isStarted ? 'In Progress' : 'New Survey'}
              </span>
            </div>
          </div>
          {questionnaire.has_rewards && (
            <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
              🎁 Reward
            </div>
          )}
        </div>

        {/* Description */}
        {questionnaire.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {questionnaire.description}
          </p>
        )}

        {/* Progress Bar (if started) */}
        {isStarted && totalCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span className="font-medium">Progress</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {answeredCount} of {totalCount} questions answered
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col">
            {isStarted && (
              <span className="text-xs text-orange-600 font-medium mb-1">In Progress</span>
            )}
            <div className="text-xs text-gray-500">
              {expirationDate ? (
                <span className={isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                  {isExpiringSoon ? 'Expiring Soon' : `Expires: ${expirationDate.toLocaleDateString()}`}
                </span>
              ) : (
                <span>No expiration</span>
              )}
            </div>
          </div>
          <button
            onClick={handleStart}
            className={`${isStarted ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors`}
          >
            {isStarted ? 'Continue Survey →' : 'Start Survey →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Input Component (same as QuestionnaireRunner)
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
