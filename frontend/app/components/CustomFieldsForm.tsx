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

export default function CustomFieldsForm({
  targetRole,
  context = 'USER_PROFILE',
  values,
  onChange,
  userId,
  userMunicipalityId,
  userClubId,
}: CustomFieldsFormProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

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
    return <div className="text-sm text-gray-500">Loading custom fields...</div>;
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800">Additional Information</h3>
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
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700">
              {field.name}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help_text && (
              <p className="text-xs text-gray-500 mb-1">{field.help_text}</p>
            )}

            {field.field_type === 'TEXT' && (
              <input
                type="text"
                className="w-full border rounded-lg p-2 text-sm"
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={isRequired}
              />
            )}

            {field.field_type === 'SINGLE_SELECT' && (
              <select
                className="w-full border rounded-lg p-2 text-sm"
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={isRequired}
              >
                <option value="">Select...</option>
                {field.options.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.field_type === 'MULTI_SELECT' && (
              <div className="space-y-2">
                {field.options.map((option, idx) => {
                  const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
                  const isChecked = selectedValues.includes(option);
                  return (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...selectedValues, option]
                            : selectedValues.filter((v) => v !== option);
                          handleFieldChange(field.id, newValues);
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {field.field_type === 'BOOLEAN' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!fieldValue}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

