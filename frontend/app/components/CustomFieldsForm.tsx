'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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
  value?: any; // Value is included when fetching via applicable_for_user
}

interface CustomFieldsFormProps {
  targetRole: 'YOUTH_MEMBER' | 'GUARDIAN';
  context?: 'USER_PROFILE' | 'EVENT';
  values: Record<number, any>; // field_id -> value
  onChange: (fieldId: number, value: any) => void;
  userId?: number | null; // ID of the user being edited (for fetching applicable fields)
  userMunicipalityId?: number | null;
  userClubId?: number | null;
}

export interface CustomFieldsFormRef {
  validate: () => { valid: boolean; invalidFieldName?: string };
}

const CustomFieldsForm = forwardRef<CustomFieldsFormRef, CustomFieldsFormProps>(({
  targetRole,
  context = 'USER_PROFILE',
  values,
  onChange,
  userId,
  userMunicipalityId,
  userClubId,
}, ref) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  // Expose validate method to parent
  useImperativeHandle(ref, () => ({
    validate: () => {
      for (const field of fields) {
        if (field.required) {
          const value = values[field.id];
          
          if (field.field_type === 'MULTI_SELECT') {
            if (!value || !Array.isArray(value) || value.length === 0) {
              return { valid: false, invalidFieldName: field.name };
            }
          } else if (field.field_type === 'BOOLEAN') {
            // Boolean: false is valid
          } else {
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
              return { valid: false, invalidFieldName: field.name };
            }
          }
        }
      }
      return { valid: true };
    }
  }), [fields, values]);

  useEffect(() => {
    // For new user creation: only fetch if userClubId is provided (club selected)
    // For editing existing user: 
    //   - If userClubId is provided (preferred_club selected/changed), fetch based on that club
    //   - Otherwise, fetch using applicable_for_user (uses user's saved club)
    if (userId && userClubId) {
      // Editing with a club selected - fetch based on the selected club (may have changed)
      fetchFields();
    } else if (userId && !userClubId) {
      // Editing but no club selected - fetch using applicable_for_user (uses saved club)
      fetchFields();
    } else if (!userId && userClubId) {
      // Creating new user with club selected
      fetchFields();
    } else {
      // No club selected for new user - don't show fields yet
      setFields([]);
      setLoading(false);
    }
  }, [targetRole, context, userId, userMunicipalityId, userClubId]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      let applicableFields: CustomField[] = [];
      
      // If userId is provided but userClubId is also provided, it means the user changed the club
      // In this case, fetch fields based on the new club selection (not the saved one)
      // Otherwise, if only userId is provided, use applicable_for_user (uses saved club)
      if (userId && userClubId) {
        // User is editing and has selected/changed preferred_club - fetch based on new club
        try {
          const clubRes = await api.get(`/clubs/${userClubId}/`);
          const club = clubRes.data;
          const clubMunicipalityId = typeof club.municipality === 'object' ? club.municipality?.id : club.municipality;

          // Fetch all fields (backend filters by admin scope)
          const res = await api.get('/custom-fields/');
          const allFields = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);

          // Filter to show only:
          // - Global fields (owner_role = SUPER_ADMIN, no municipality/club)
          // - Municipality fields for the club's municipality
          // - Club fields for the selected club
          applicableFields = allFields.filter((field: any) => {
            // Must match context
            if (field.context !== context) return false;

            // Must target this role (or "ALL")
            const targetRoles = Array.isArray(field.target_roles) ? field.target_roles : [];
            if (!targetRoles.includes('ALL') && !targetRoles.includes(targetRole)) return false;

            // Check if field is applicable to this club/municipality
            const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
            const fieldClubId = typeof field.club === 'object' ? field.club?.id : field.club;

            // Global fields (no municipality, no club)
            if (field.owner_role === 'SUPER_ADMIN' && !fieldMunicipalityId && !fieldClubId) {
              return true;
            }

            // Municipality fields for this municipality
            if (field.owner_role === 'MUNICIPALITY_ADMIN' && fieldMunicipalityId === clubMunicipalityId) {
              // Check if field applies to this club (specific_clubs empty or includes this club)
              if (!field.specific_clubs || field.specific_clubs.length === 0) {
                return true; // Applies to all clubs in municipality
              }
              // Check if this club is in specific_clubs
              const specificClubIds = field.specific_clubs.map((c: any) => typeof c === 'object' ? c.id : c);
              return specificClubIds.includes(userClubId);
            }

            // Club fields for this club
            if (field.owner_role === 'CLUB_ADMIN' && fieldClubId === userClubId) {
              return true;
            }

            return false;
          });

          // For editing, we need to preserve existing values for fields that still exist
          // Fetch existing values from the user
          try {
            const userRes = await api.get(`/users/${userId}/`);
            const customFieldValuesData = userRes.data.custom_field_values || [];
            // customFieldValuesData is a list: [{field: field_id, value: value}, ...]
            // Update parent state with existing values
            customFieldValuesData.forEach((cfv: any) => {
              const fieldId = typeof cfv.field === 'object' ? cfv.field.id : Number(cfv.field);
              // Only set if this field is still applicable
              if (applicableFields.some((f: any) => f.id === fieldId)) {
                const valueToSet = cfv.value !== null && cfv.value !== undefined ? cfv.value : '';
                onChange(fieldId, valueToSet);
              }
            });
          } catch (err) {
            console.error('Failed to load existing custom field values:', err);
          }
        } catch (err) {
          console.error('Failed to fetch club details:', err);
          setFields([]);
          setLoading(false);
          return;
        }
      } else if (userId && !userClubId) {
        // User is editing but no club selected - use applicable_for_user (uses saved club)
        const res = await api.get(`/custom-fields/applicable_for_user/?user_id=${userId}`);
        applicableFields = Array.isArray(res.data) ? res.data : [];
        
        // Extract values from fields and update parent component
        // The applicable_for_user endpoint returns fields with embedded values
        // We sync these with the parent's values state so they're available for saving
        applicableFields.forEach((field: any) => {
          // field.value is included by CustomFieldUserViewSerializer
          // Update parent state for each field (including null/empty, so they're in sync)
          // Use empty string for null/undefined to ensure form fields work correctly
          const valueToSet = field.value !== null && field.value !== undefined ? field.value : '';
          onChange(field.id, valueToSet);
        });
      } else if (userClubId) {
        // For new user creation with club selected: fetch club details to get municipality
        // Then fetch fields applicable to that club and municipality
        try {
          const clubRes = await api.get(`/clubs/${userClubId}/`);
          const club = clubRes.data;
          const clubMunicipalityId = typeof club.municipality === 'object' ? club.municipality?.id : club.municipality;
          
          // Fetch all fields (backend filters by admin scope)
          const res = await api.get('/custom-fields/');
          const allFields = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);
          
          // Filter to show only:
          // - Global fields (owner_role = SUPER_ADMIN, no municipality/club)
          // - Municipality fields for the club's municipality
          // - Club fields for the selected club
          applicableFields = allFields.filter((field: any) => {
            // Must match context
            if (field.context !== context) return false;
            
            // Must target this role (or "ALL")
            const targetRoles = Array.isArray(field.target_roles) ? field.target_roles : [];
            if (!targetRoles.includes('ALL') && !targetRoles.includes(targetRole)) return false;
            
            // Check if field is applicable to this club/municipality
            const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
            const fieldClubId = typeof field.club === 'object' ? field.club?.id : field.club;
            
            // Global fields (no municipality, no club)
            if (field.owner_role === 'SUPER_ADMIN' && !fieldMunicipalityId && !fieldClubId) {
              return true;
            }
            
            // Municipality fields for this municipality
            if (field.owner_role === 'MUNICIPALITY_ADMIN' && fieldMunicipalityId === clubMunicipalityId) {
              // Check if field applies to this club (specific_clubs empty or includes this club)
              if (!field.specific_clubs || field.specific_clubs.length === 0) {
                return true; // Applies to all clubs in municipality
              }
              // Check if this club is in specific_clubs
              const specificClubIds = field.specific_clubs.map((c: any) => typeof c === 'object' ? c.id : c);
              return specificClubIds.includes(userClubId);
            }
            
            // Club fields for this club
            if (field.owner_role === 'CLUB_ADMIN' && fieldClubId === userClubId) {
              return true;
            }
            
            return false;
          });
        } catch (err) {
          console.error('Failed to fetch club details:', err);
          setFields([]);
          setLoading(false);
          return;
        }
      } else if (userMunicipalityId && userClubId) {
        // Municipality admin creating/editing user with club selected
        // Fetch club details to get municipality
        try {
          const clubRes = await api.get(`/clubs/${userClubId}/`);
          const club = clubRes.data;
          const clubMunicipalityId = typeof club.municipality === 'object' ? club.municipality?.id : club.municipality;

          // Fetch all fields (backend filters by admin scope)
          const res = await api.get('/custom-fields/');
          const allFields = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);

          // Filter to show only:
          // - Global fields (owner_role = SUPER_ADMIN, no municipality/club)
          // - Municipality fields for the club's municipality
          // - Club fields for the selected club
          applicableFields = allFields.filter((field: any) => {
            // Must match context
            if (field.context !== context) return false;

            // Must target this role (or "ALL")
            const targetRoles = Array.isArray(field.target_roles) ? field.target_roles : [];
            if (!targetRoles.includes('ALL') && !targetRoles.includes(targetRole)) return false;

            // Check if field is applicable to this club/municipality
            const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
            const fieldClubId = typeof field.club === 'object' ? field.club?.id : field.club;

            // Global fields (no municipality, no club)
            if (field.owner_role === 'SUPER_ADMIN' && !fieldMunicipalityId && !fieldClubId) {
              return true;
            }

            // Municipality fields for this municipality
            if (field.owner_role === 'MUNICIPALITY_ADMIN' && fieldMunicipalityId === clubMunicipalityId) {
              // Check if field applies to this club (specific_clubs empty or includes this club)
              if (!field.specific_clubs || field.specific_clubs.length === 0) {
                return true; // Applies to all clubs in municipality
              }
              // Check if this club is in specific_clubs
              const specificClubIds = field.specific_clubs.map((c: any) => typeof c === 'object' ? c.id : c);
              return specificClubIds.includes(userClubId);
            }

            // Club fields for this club
            if (field.owner_role === 'CLUB_ADMIN' && fieldClubId === userClubId) {
              return true;
            }

            return false;
          });

          // For editing, preserve existing values
          if (userId) {
            try {
              const userRes = await api.get(`/users/${userId}/`);
              const customFieldValuesData = userRes.data.custom_field_values || [];
              customFieldValuesData.forEach((cfv: any) => {
                const fieldId = typeof cfv.field === 'object' ? cfv.field.id : Number(cfv.field);
                if (applicableFields.some((f: any) => f.id === fieldId)) {
                  const valueToSet = cfv.value !== null && cfv.value !== undefined ? cfv.value : '';
                  onChange(fieldId, valueToSet);
                }
              });
            } catch (err) {
              console.error('Failed to load existing custom field values:', err);
            }
          }
        } catch (err) {
          console.error('Failed to fetch club details:', err);
          setFields([]);
          setLoading(false);
          return;
        }
      } else if (userMunicipalityId && !userClubId) {
        // Municipality admin creating user in their municipality (no club selected yet)
        // Don't show fields until club is selected
        setFields([]);
        setLoading(false);
        return;
      } else {
        // No club or municipality selected for new user - don't fetch fields
        setFields([]);
        setLoading(false);
        return;
      }
      
      setFields(applicableFields);
    } catch (err) {
      console.error('Failed to fetch custom fields:', err);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: number, value: any) => {
    onChange(fieldId, value);
  };

  // For new user creation: only show if club is selected (or if municipality admin creating user in their municipality)
  // For editing: always show (userId is provided)
  if (!userId && !userClubId && !userMunicipalityId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-[var(--brand-light)]/50">
          <div className="w-5 h-5 border-2 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          <span className="text-sm">Loading custom fields...</span>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[var(--brand-light)]/50">No custom fields available for this configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        // Prioritize values prop (which gets updated when user types) over field.value (from API)
        // This ensures the input is controlled by the parent state, not the API response
        let fieldValue: any = values[field.id] !== undefined ? values[field.id] : ((field as any).value !== undefined ? (field as any).value : '');
        if (fieldValue === null || fieldValue === undefined) {
          fieldValue = '';
        }
        // For MULTI_SELECT, ensure it's an array
        if (field.field_type === 'MULTI_SELECT' && !Array.isArray(fieldValue)) {
          fieldValue = [];
        }
        const isRequired = field.required;

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-[var(--brand-light)]">
              {field.name}
              {isRequired && <span className="text-[var(--brand-red)] ml-1">*</span>}
            </label>
            {field.help_text && (
              <p className="text-xs text-[var(--brand-light)]/50 mb-2">{field.help_text}</p>
            )}

            {field.field_type === 'TEXT' && (
              <input
                type="text"
                className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={isRequired}
                placeholder={`Enter ${field.name.toLowerCase()}...`}
              />
            )}

            {field.field_type === 'SINGLE_SELECT' && (
              <div className="relative">
                <select
                  className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] appearance-none cursor-pointer"
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  required={isRequired}
                >
                  <option value="" className="bg-[var(--dark-700)] text-[var(--brand-light)]/50">Select an option...</option>
                  {field.options.map((option, idx) => (
                    <option key={idx} value={option} className="bg-[var(--dark-700)] text-[var(--brand-light)]">
                      {option}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[var(--brand-light)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {field.field_type === 'MULTI_SELECT' && (
              <div className="space-y-2 p-4 bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)]">
                {field.options.map((option, idx) => {
                  const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
                  const isChecked = selectedValues.includes(option);
                  return (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer group py-1">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' 
                          : 'border-[var(--dark-500)] group-hover:border-[var(--brand-primary)]/50'
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-[var(--dark-900)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...selectedValues, option]
                            : selectedValues.filter((v) => v !== option);
                          handleFieldChange(field.id, newValues);
                        }}
                        className="sr-only"
                      />
                      <span className={`text-sm transition-colors ${isChecked ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/70 group-hover:text-[var(--brand-light)]'}`}>
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {field.field_type === 'BOOLEAN' && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-12 h-7 rounded-full p-1 transition-all ${
                  fieldValue 
                    ? 'bg-[var(--brand-primary)]' 
                    : 'bg-[var(--dark-600)] group-hover:bg-[var(--dark-500)]'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    fieldValue ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <input
                  type="checkbox"
                  checked={!!fieldValue}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  className="sr-only"
                />
                <span className={`text-sm transition-colors ${fieldValue ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/70'}`}>
                  {fieldValue ? 'Yes' : 'No'}
                </span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
});

CustomFieldsForm.displayName = 'CustomFieldsForm';

export default CustomFieldsForm;

