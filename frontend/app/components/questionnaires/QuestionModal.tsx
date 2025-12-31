'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2, FileQuestion, ListChecks, Type, Star, CheckCircle } from 'lucide-react';

interface QuestionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (question: any) => void;
  initialData?: any;
  allQuestions: any[];
}

export default function QuestionModal({ isVisible, onClose, onSave, initialData, allQuestions }: QuestionModalProps) {
  const t = useTranslations('questionnairesAdmin.editor.questionModal');
  const [q, setQ] = useState<any>({
    text: '',
    question_type: 'FREE_TEXT',
    options: [],
    order: 0
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Load initial data when modal opens
  useEffect(() => {
    if (isVisible) {
      if (initialData) {
        setQ(JSON.parse(JSON.stringify(initialData)));
      } else {
        setQ({
          text: '',
          question_type: 'FREE_TEXT',
          options: [],
          order: allQuestions.length + 1
        });
      }
    }
  }, [isVisible, initialData, allQuestions.length]);

  if (!isVisible) return null;

  const handleOptionChange = (idx: number, val: string) => {
    const newOptions = [...q.options];
    newOptions[idx] = { ...newOptions[idx], text: val, value: val };
    setQ({ ...q, options: newOptions });
  };

  const addOption = () => {
    setQ({ ...q, options: [...(q.options || []), { text: '', value: '', order: (q.options?.length || 0) + 1 }] });
  };

  const removeOption = (idx: number) => {
    const newOptions = q.options.filter((_: any, i: number) => i !== idx);
    setQ({ ...q, options: newOptions });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    if (!q.text.trim()) {
      return;
    }
    if (['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (!q.options || q.options.length === 0)) {
      return;
    }
    onSave(q);
  };

  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const textareaClasses = (field: string) => `
    w-full px-4 py-3 rounded-xl resize-none min-h-[80px]
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl appearance-none cursor-pointer
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)]
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";

  const questionTypes = [
    { value: 'FREE_TEXT', label: t('types.freeText.label'), icon: Type, description: t('types.freeText.description') },
    { value: 'RATING', label: t('types.rating.label'), icon: Star, description: t('types.rating.description') },
    { value: 'SINGLE_CHOICE', label: t('types.singleChoice.label'), icon: CheckCircle, description: t('types.singleChoice.description') },
    { value: 'MULTI_CHOICE', label: t('types.multiChoice.label'), icon: ListChecks, description: t('types.multiChoice.description') },
  ];

  const isValid = q.text.trim() && !(['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (!q.options || q.options.length === 0));

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[var(--dark-800)] w-full max-w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-2xl border-t sm:border border-[var(--dark-600)] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-12 h-1 bg-[var(--dark-500)] rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                <FileQuestion className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--brand-light)]">
                  {initialData ? t('editTitle') : t('addTitle')}
                </h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Question Type Selector */}
          <div>
            <label className={labelClasses}>{t('questionType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {questionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = q.question_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setQ({ ...q, question_type: type.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-light)]'
                        : 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:border-[var(--brand-primary)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/50'}`} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-[var(--brand-light)]/40">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className={labelClasses}>{t('questionText')} <span className="text-[var(--brand-red)]">{t('required')}</span></label>
            <input
              type="text"
              required
              value={q.text}
              onChange={(e) => setQ({ ...q, text: e.target.value })}
              placeholder={t('questionPlaceholder')}
              className={inputClasses('text')}
              onFocus={() => setFocusedField('text')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClasses}>{t('description')}</label>
            <textarea
              value={q.description || ''}
              onChange={(e) => setQ({ ...q, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              className={textareaClasses('description')}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Options Builder (Only for Choice types) */}
          {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (
            <div className="bg-[var(--brand-purple)]/10 rounded-xl p-4 border border-[var(--brand-purple)]/30">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-[var(--brand-purple)]" />
                <span className="font-semibold text-sm text-[var(--brand-light)]">{t('options.title')}</span>
              </div>
              
              <div className="space-y-3">
                {q.options?.map((opt: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      className={`flex-1 h-10 px-3 rounded-lg bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-colors`}
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={t('options.placeholder')}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--brand-purple)]/50 text-[var(--brand-purple)] font-medium hover:bg-[var(--brand-purple)]/10 hover:border-[var(--brand-purple)] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('options.addOption')}
                </button>
                
                {(!q.options || q.options.length === 0) && (
                  <p className="text-xs text-[var(--brand-light)]/40 text-center py-2">
                    Add at least one option to continue
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-[var(--dark-600)] flex flex-col sm:flex-row justify-end gap-3 bg-[var(--dark-700)]/30">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all"
          >
            {t('buttons.cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!isValid}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('buttons.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
