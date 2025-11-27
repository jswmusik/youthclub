'use client';

import { useState, useEffect } from 'react';
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
      return value ? 'Yes' : 'No';
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
    return null;
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Additional Information</h2>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.id}>
            <p className="text-sm text-gray-500 font-bold uppercase mb-1">{field.name}</p>
            <p className="text-gray-900 font-medium">{formatValue(field, field.value)}</p>
            {field.help_text && (
              <p className="text-xs text-gray-400 mt-0.5">{field.help_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

