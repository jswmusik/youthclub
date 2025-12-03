'use client';

import { useState, useEffect } from 'react';

interface QuestionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (question: any) => void;
  initialData?: any;
  allQuestions: any[];
}

export default function QuestionModal({ isVisible, onClose, onSave, initialData, allQuestions }: QuestionModalProps) {
  const [q, setQ] = useState<any>({
    text: '',
    question_type: 'FREE_TEXT',
    options: [],
    order: 0
  });

  // Load initial data when modal opens
  useEffect(() => {
    if (isVisible) {
      if (initialData) {
        setQ(JSON.parse(JSON.stringify(initialData))); // Deep copy
      } else {
        // Reset for new question
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 flex-1 space-y-4">
          
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Question Type</label>
            <select
              className="w-full border rounded p-2 bg-gray-50"
              value={q.question_type}
              onChange={(e) => setQ({ ...q, question_type: e.target.value })}
            >
              <option value="FREE_TEXT">Free Text</option>
              <option value="RATING">Star Rating (1-5)</option>
              <option value="SINGLE_CHOICE">Single Choice</option>
              <option value="MULTI_CHOICE">Multiple Choice</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Question Text</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={q.text}
              onChange={(e) => setQ({ ...q, text: e.target.value })}
              placeholder="e.g. How satisfied are you with..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              className="w-full border rounded p-2"
              value={q.description || ''}
              onChange={(e) => setQ({ ...q, description: e.target.value })}
              placeholder="Helper text for the user..."
            />
          </div>

          {/* Options Builder (Only for Choice types) */}
          {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">Answer Options</label>
              <div className="space-y-2">
                {q.options?.map((opt: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border rounded p-2 text-sm"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                    />
                    <button 
                        onClick={() => removeOption(idx)}
                        className="text-red-500 hover:bg-red-100 p-2 rounded"
                    >
                        🗑️
                    </button>
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button 
            onClick={() => onSave(q)} 
            className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
          >
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
}

