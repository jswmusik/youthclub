'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import api from '../../lib/api';

interface CustomField {
  id: number;
  name: string;
  help_text: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
  required: boolean;
  context: 'USER_PROFILE' | 'EVENT';
  target_roles: string[];
  value?: any;
}

interface CustomFieldsDisplayProps {
  userId: number;
  targetRole: 'YOUTH_MEMBER' | 'GUARDIAN';
  context?: 'USER_PROFILE' | 'EVENT';
}

export default function CustomFieldsDisplay({
  userId,
  targetRole,
  context = 'USER_PROFILE',
}: CustomFieldsDisplayProps) {
  const t = useTranslations('customFieldsDisplay');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, [userId, targetRole, context]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      // Fetch all custom fields - the backend will filter based on admin's scope
      const res = await api.get('/custom-fields/');
      const allFields = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);
      
      // Filter by context and target role
      const applicableFields = allFields.filter((field: CustomField) => {
        // Must match context
        if (field.context !== context) return false;
        
        // Must target this role (or "ALL")
        const targetRoles = Array.isArray(field.target_roles) ? field.target_roles : [];
        if (!targetRoles.includes('ALL') && !targetRoles.includes(targetRole)) return false;
        
        return true;
      });

      // Fetch values for this user
      const userRes = await api.get(`/users/${userId}/`);
      const customFieldValuesData = userRes.data.custom_field_values || [];
      const valuesMap: Record<number, any> = {};
      customFieldValuesData.forEach((cfv: any) => {
        valuesMap[cfv.field] = cfv.value;
      });

      // Attach values to fields
      const fieldsWithValues = applicableFields.map((field: CustomField) => ({
        ...field,
        value: valuesMap[field.id],
      }));

      // Only show fields that have values
      setFields(fieldsWithValues.filter((field) => field.value !== null && field.value !== undefined && field.value !== ''));
    } catch (err) {
      console.error('Failed to fetch custom fields:', err);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (field: CustomField, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (field.field_type === 'BOOLEAN') {
      return value ? t('yes') : t('no');
    }
    
    if (field.field_type === 'MULTI_SELECT') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 border-2 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-6 text-[var(--brand-light)]/40">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm italic">{t('noAdditionalInfo')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => (
        <div 
          key={field.id} 
          className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]"
        >
          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">
            {field.name}
          </div>
          <div className="text-sm text-[var(--brand-light)] font-medium">
            {formatValue(field, field.value)}
          </div>
          {field.help_text && (
            <p className="text-xs text-[var(--brand-light)]/30 mt-1">{field.help_text}</p>
          )}
        </div>
      ))}
    </div>
  );
}
