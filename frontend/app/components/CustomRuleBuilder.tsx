'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface CustomField {
  id: number;
  name: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
}

interface CustomRuleBuilderProps {
  currentRules: Record<string, any>; // { "1": "Value", "2": true }
  onChange: (rules: Record<string, any>) => void;
}

export default function CustomRuleBuilder({ currentRules, onChange }: CustomRuleBuilderProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  // New Rule State
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedBool, setSelectedBool] = useState<string>('true');

  useEffect(() => {
    // Fetch fields available to this admin
    api.get('/custom-fields/').then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setFields(data || []);
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

    // Reset input
    setSelectedValue('');
    setSelectedBool('true');
    setSelectedFieldId('');
  };

  const removeRule = (id: string) => {
    const newRules = { ...currentRules };
    delete newRules[id];
    onChange(newRules);
  };

  if (loading) return <div className="text-sm text-gray-500">Loading fields...</div>;
  if (fields.length === 0) return <div className="text-sm text-gray-400 italic">No custom fields defined.</div>;

  const selectedField = fields.find(f => f.id.toString() === selectedFieldId);

  return (
    <div className="space-y-4">
      
      {/* 1. Rule Creator */}
      <div className="flex flex-wrap gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
        
        {/* Select Field */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">Field</label>
          <select 
            className="w-full border p-2 rounded text-sm"
            value={selectedFieldId}
            onChange={e => { setSelectedFieldId(e.target.value); setSelectedValue(''); }}
          >
            <option value="">Select Field...</option>
            {fields.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Input Value (Changes based on Type) */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">Condition (Must Match)</label>
          
          {!selectedField && <input disabled className="w-full border p-2 rounded text-sm bg-gray-100" placeholder="Select field first" />}

          {selectedField && selectedField.field_type === 'BOOLEAN' && (
            <select className="w-full border p-2 rounded text-sm" value={selectedBool} onChange={e => setSelectedBool(e.target.value)}>
              <option value="true">Yes (Checked)</option>
              <option value="false">No (Unchecked)</option>
            </select>
          )}

          {selectedField && (selectedField.field_type === 'SINGLE_SELECT' || selectedField.field_type === 'MULTI_SELECT') && (
            <select className="w-full border p-2 rounded text-sm" value={selectedValue} onChange={e => setSelectedValue(e.target.value)}>
              <option value="">Select Option...</option>
              {selectedField.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}

          {selectedField && selectedField.field_type === 'TEXT' && (
            <input 
              type="text" 
              className="w-full border p-2 rounded text-sm" 
              placeholder="Type value..."
              value={selectedValue}
              onChange={e => setSelectedValue(e.target.value)}
            />
          )}
        </div>

        {/* Add Button */}
        <button 
          type="button" 
          onClick={handleAddRule}
          disabled={!selectedFieldId}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 h-[38px]"
        >
          Add Rule
        </button>
      </div>

      {/* 2. Active Rules List */}
      {Object.keys(currentRules).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(currentRules).map(([id, val]) => {
            const fieldName = fields.find(f => f.id.toString() === id)?.name || `Field #${id}`;
            let displayVal = val.toString();
            if (typeof val === 'boolean') displayVal = val ? 'Yes' : 'No';

            return (
              <span key={id} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <span><b>{fieldName}</b> = {displayVal}</span>
                <button type="button" onClick={() => removeRule(id)} className="hover:text-red-600 font-bold">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}