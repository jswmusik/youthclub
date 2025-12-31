'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Settings, ToggleLeft, ListFilter } from 'lucide-react';
import api from '../../lib/api';

interface CustomField {
  id: number;
  name: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
}

interface CustomRuleBuilderProps {
  currentRules: Record<string, any>;
  onChange: (rules: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function CustomRuleBuilder({ currentRules, onChange, darkMode = true }: CustomRuleBuilderProps) {
  const t = useTranslations('groupsAdmin.form.customRuleBuilder');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedBool, setSelectedBool] = useState<string>('true');

  useEffect(() => {
    api.get('/custom-fields/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      const filteredFields = (data || []).filter(
        (field: CustomField) => 
          field.field_type === 'BOOLEAN' || 
          field.field_type === 'SINGLE_SELECT' || 
          field.field_type === 'MULTI_SELECT'
      );
      setFields(filteredFields);
      setLoading(false);
    });
  }, []);

  const handleAddRule = () => {
    if (!selectedFieldId) return;
    
    const field = fields.find(f => f.id.toString() === selectedFieldId);
    if (!field) return;

    let val: any = selectedValue;
    if (field.field_type === 'BOOLEAN') {
      val = selectedBool === 'true';
    }

    onChange({
      ...currentRules,
      [selectedFieldId]: val
    });

    setSelectedValue('');
    setSelectedBool('true');
    setSelectedFieldId('');
  };

  const removeRule = (id: string) => {
    const newRules = { ...currentRules };
    delete newRules[id];
    onChange(newRules);
  };

  // Dark mode styles
  const bgColor = darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-50';
  const borderColor = darkMode ? 'border-[var(--dark-500)]' : 'border-gray-200';
  const textColor = darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900';
  const textMuted = darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]' : 'bg-white border-gray-300 text-gray-900';

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-4 ${textMuted}`}>
        <div className={`w-4 h-4 border-2 ${darkMode ? 'border-[var(--dark-500)] border-t-[var(--brand-primary)]' : 'border-gray-300 border-t-indigo-600'} rounded-full animate-spin`} />
        <span className="text-sm">{t('loading')}</span>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className={`flex items-center gap-3 py-4 ${textMuted}`}>
        <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'} flex items-center justify-center`}>
          <Settings className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{t('noFieldsAvailable')}</p>
          <p className={`text-xs ${textMuted}`}>{t('noFieldsAvailableHint')}</p>
        </div>
      </div>
    );
  }

  const selectedField = fields.find(f => f.id.toString() === selectedFieldId);

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'BOOLEAN': return <ToggleLeft className="w-4 h-4" />;
      case 'SINGLE_SELECT':
      case 'MULTI_SELECT': return <ListFilter className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Rule Creator */}
      <div className={`${bgColor} p-4 rounded-xl border ${borderColor}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Select Field */}
          <div className="flex-1 min-w-0">
            <label className={`block text-xs font-semibold ${textMuted} mb-2`}>{t('field')}</label>
            <select 
              className={`w-full h-10 px-3 rounded-xl border-2 ${inputBg} text-sm outline-none transition-all focus:border-[var(--brand-primary)] appearance-none cursor-pointer`}
              value={selectedFieldId}
              onChange={e => { setSelectedFieldId(e.target.value); setSelectedValue(''); }}
              style={{
                backgroundImage: darkMode 
                  ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                  : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="">{t('selectField')}</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Input Value */}
          <div className="flex-1 min-w-0">
            <label className={`block text-xs font-semibold ${textMuted} mb-2`}>{t('condition')}</label>
            
            {!selectedField && (
              <input 
                disabled 
                className={`w-full h-10 px-3 rounded-xl border-2 ${darkMode ? 'bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]/30' : 'bg-gray-100 border-gray-200 text-gray-400'} text-sm cursor-not-allowed`}
                placeholder={t('selectFieldFirst')} 
              />
            )}

            {selectedField && selectedField.field_type === 'BOOLEAN' && (
              <select 
                className={`w-full h-10 px-3 rounded-xl border-2 ${inputBg} text-sm outline-none transition-all focus:border-[var(--brand-primary)] appearance-none cursor-pointer`}
                value={selectedBool} 
                onChange={e => setSelectedBool(e.target.value)}
                style={{
                  backgroundImage: darkMode 
                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="true">{t('booleanYes')}</option>
                <option value="false">{t('booleanNo')}</option>
              </select>
            )}

            {selectedField && (selectedField.field_type === 'SINGLE_SELECT' || selectedField.field_type === 'MULTI_SELECT') && (
              <select 
                className={`w-full h-10 px-3 rounded-xl border-2 ${inputBg} text-sm outline-none transition-all focus:border-[var(--brand-primary)] appearance-none cursor-pointer`}
                value={selectedValue} 
                onChange={e => setSelectedValue(e.target.value)}
                style={{
                  backgroundImage: darkMode 
                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="">{t('selectOption')}</option>
                {selectedField.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>

          {/* Add Button */}
          <div className="flex items-end">
            <button 
              type="button" 
              onClick={handleAddRule}
              disabled={!selectedFieldId || (selectedField?.field_type !== 'BOOLEAN' && !selectedValue)}
              className={`h-10 px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                darkMode 
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 disabled:bg-[var(--dark-500)] disabled:text-[var(--brand-light)]/30'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500'
              } disabled:cursor-not-allowed`}
            >
              <Plus className="w-4 h-4" />
              {t('add')}
            </button>
          </div>
        </div>
      </div>

      {/* Active Rules List */}
      {Object.keys(currentRules).length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-semibold ${textMuted}`}>{t('activeRules')} ({Object.keys(currentRules).length})</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(currentRules).map(([id, val]) => {
              const field = fields.find(f => f.id.toString() === id);
              const fieldName = field?.name || `Field #${id}`;
              let displayVal = val.toString();
              if (typeof val === 'boolean') displayVal = val ? t('yes') : t('no');

              return (
                <span 
                  key={id} 
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                    darkMode 
                      ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  <span className={darkMode ? 'text-[var(--brand-light)]/50' : 'text-blue-500'}>
                    {getFieldIcon(field?.field_type || '')}
                  </span>
                  <span>
                    <span className="font-semibold">{fieldName}</span>
                    <span className={darkMode ? 'text-[var(--brand-light)]/50 mx-1' : 'text-blue-400 mx-1'}>=</span>
                    <span>{displayVal}</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => removeRule(id)} 
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      darkMode 
                        ? 'hover:bg-[var(--brand-red)]/20 hover:text-[var(--brand-red)]'
                        : 'hover:bg-red-100 hover:text-red-600'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(currentRules).length === 0 && (
        <div className={`text-center py-3 ${textMuted}`}>
          <p className="text-xs">{t('noRulesAdded')}</p>
        </div>
      )}
    </div>
  );
}
