'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <Card 
        className="bg-white w-full max-w-2xl shadow-2xl border border-gray-100 rounded-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-200"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-gray-100 bg-gradient-to-r from-[#EBEBFE]/30 to-white">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold text-[#121213] mb-1">
              {initialData ? 'Edit Question' : 'Add Question'}
            </CardTitle>
            <p className="text-sm text-gray-500">Configure your question settings and options</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Question Type */}
          <div className="space-y-2">
            <Label>Question Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <div className="space-y-2">
            <Label>Question Text <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              required
              value={q.text}
              onChange={(e) => setQ({ ...q, text: e.target.value })}
              placeholder="e.g. How satisfied are you with..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={q.description || ''}
              onChange={(e) => setQ({ ...q, description: e.target.value })}
              placeholder="Helper text for the user..."
            />
          </div>

          {/* Options Builder (Only for Choice types) */}
          {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (
            <Card className="bg-[#EBEBFE]/30 border border-[#4D4DA4]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#4D4DA4]">Answer Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {q.options?.map((opt: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      className="flex-1"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  className="w-full border-dashed border-[#4D4DA4]/30 text-[#4D4DA4] hover:bg-[#EBEBFE] hover:border-[#4D4DA4] gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
                {(!q.options || q.options.length === 0) && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Add at least one option to continue
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        </CardContent>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <Button 
            variant="ghost" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2"
            disabled={!q.text.trim() || (['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.question_type) && (!q.options || q.options.length === 0))}
          >
            Save Question
          </Button>
        </div>
      </Card>
    </div>
  );
}
