'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface CustomField {
  id: number;
  name: string;
  help_text: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
  required: boolean;
  is_published: boolean;
  target_roles: string[];
  specific_clubs: number[];
  owner_role?: string;
  club?: number | { id: number };
  municipality?: number | { id: number };
}

interface ClubOption {
  id: number;
  name: string;
}

interface CustomFieldManagerProps {
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function CustomFieldManager({ scope }: CustomFieldManagerProps) {
  const { user } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]); // For Muni Admin context
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Delete Modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    help_text: '',
    field_type: 'TEXT',
    options: [] as string[], // For select fields
    currentOptionInput: '', // Helper for adding options
    required: false,
    is_published: true,
    target_roles: [] as string[],
    specific_clubs: [] as number[],
    context: 'USER_PROFILE',
  });

  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchFields();
    if (scope === 'MUNICIPALITY') {
      fetchClubs();
    }
  }, [scope]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await api.get('/custom-fields/');
      const data = res.data.results || res.data;
      setFields(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch custom fields:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load custom fields';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      // Muni admin gets their clubs automatically via this endpoint due to permissions
      const res = await api.get('/clubs/'); 
      setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Form Helpers ---

  const resetForm = () => {
    setFormData({
      name: '', help_text: '', field_type: 'TEXT',
      options: [], currentOptionInput: '',
      required: false, is_published: true,
      target_roles: ['YOUTH_MEMBER'], // Default
      specific_clubs: [],
      context: 'USER_PROFILE',
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (field: CustomField) => {
    // Prevent editing read-only fields
    // Club admins can only edit their own club fields
    if (scope === 'CLUB' && user?.assigned_club) {
      const isOwnedByClubAdmin = field.owner_role === 'CLUB_ADMIN' && 
        (typeof field.club === 'object' ? field.club?.id : field.club) === (typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club);
      
      if (!isOwnedByClubAdmin) {
        setToast({ message: 'You can only edit fields assigned to your club.', type: 'error', isVisible: true });
        return;
      }
    }
    
    // Municipality admins can edit their own municipality fields and club fields in their municipality (not global super admin fields)
    if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
      const userMunicipalityId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
      const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
      
      // Check if it's a municipality field owned by this municipality
      const isOwnedByMunicipalityAdmin = field.owner_role === 'MUNICIPALITY_ADMIN' && 
        fieldMunicipalityId === userMunicipalityId;
      
      // Check if it's a club field that belongs to a club in this municipality
      let isClubFieldInMunicipality = false;
      if (field.owner_role === 'CLUB_ADMIN' && field.club) {
        const fieldClubId = typeof field.club === 'object' ? field.club.id : field.club;
        const clubInMunicipality = clubs.find(c => c.id === fieldClubId);
        isClubFieldInMunicipality = !!clubInMunicipality;
      }
      
      // Only allow editing if it's a municipality field or a club field in their municipality
      // Block global super admin fields
      if (field.owner_role === 'SUPER_ADMIN' || (!isOwnedByMunicipalityAdmin && !isClubFieldInMunicipality)) {
        setToast({ message: 'You can only edit fields assigned to your municipality or clubs in your municipality.', type: 'error', isVisible: true });
        return;
      }
    }
    
    setIsEditing(true);
    setEditId(field.id);
    setFormData({
      name: field.name,
      help_text: field.help_text || '',
      field_type: field.field_type,
      options: field.options || [],
      currentOptionInput: '',
      required: field.required,
      is_published: field.is_published,
      target_roles: field.target_roles || [],
      specific_clubs: field.specific_clubs || [],
      // @ts-ignore  -- field.context exists on API but might not be in TS interface yet
      context: field.context || 'USER_PROFILE',
    });
    setShowModal(true);
  };

  // Option Management (for Select fields)
  const addOption = () => {
    if (!formData.currentOptionInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, prev.currentOptionInput.trim()],
      currentOptionInput: ''
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Role Toggling
  const toggleRole = (role: string) => {
    setFormData(prev => {
      const roles = prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role];
      return { ...prev, target_roles: roles };
    });
  };

  // Club Toggling (Muni only)
  const toggleClub = (clubId: number) => {
    setFormData(prev => {
      const list = prev.specific_clubs.includes(clubId)
        ? prev.specific_clubs.filter(id => id !== clubId)
        : [...prev.specific_clubs, clubId];
      return { ...prev, specific_clubs: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if ((formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && formData.options.length === 0) {
      alert("Please add at least one option for the selection list.");
      return;
    }
    if (formData.target_roles.length === 0) {
      alert("Please select at least one target role (Youth or Guardian).");
      return;
    }

    const payload = {
      name: formData.name,
      help_text: formData.help_text,
      field_type: formData.field_type,
      options: formData.options,
      required: formData.required,
      is_published: formData.is_published,
      target_roles: formData.target_roles,
      specific_clubs: formData.specific_clubs,
      context: formData.context,
    };

    try {
      if (isEditing && editId) {
        await api.patch(`/custom-fields/${editId}/`, payload);
        setToast({ message: 'Field updated', type: 'success', isVisible: true });
      } else {
        await api.post('/custom-fields/', payload);
        setToast({ message: 'Field created', type: 'success', isVisible: true });
      }
      setShowModal(false);
      fetchFields();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed', type: 'error', isVisible: true });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    // Prevent deleting read-only fields
    // Club admins can only delete their own club fields
    if (scope === 'CLUB' && user?.assigned_club) {
      const fieldToDelete = fields.find(f => f.id === deleteId);
      if (fieldToDelete) {
        const isOwnedByClubAdmin = fieldToDelete.owner_role === 'CLUB_ADMIN' && 
          (typeof fieldToDelete.club === 'object' ? fieldToDelete.club?.id : fieldToDelete.club) === (typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club);
        
        if (!isOwnedByClubAdmin) {
          setToast({ message: 'You can only delete fields assigned to your club.', type: 'error', isVisible: true });
          setDeleteId(null);
          setShowDelete(false);
          return;
        }
      }
    }
    
    // Municipality admins can delete their own municipality fields and club fields in their municipality (not global super admin fields)
    if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
      const fieldToDelete = fields.find(f => f.id === deleteId);
      if (fieldToDelete) {
        const userMunicipalityId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
        const fieldMunicipalityId = typeof fieldToDelete.municipality === 'object' ? fieldToDelete.municipality?.id : fieldToDelete.municipality;
        
        // Check if it's a municipality field owned by this municipality
        const isOwnedByMunicipalityAdmin = fieldToDelete.owner_role === 'MUNICIPALITY_ADMIN' && 
          fieldMunicipalityId === userMunicipalityId;
        
        // Check if it's a club field that belongs to a club in this municipality
        let isClubFieldInMunicipality = false;
        if (fieldToDelete.owner_role === 'CLUB_ADMIN' && fieldToDelete.club) {
          const fieldClubId = typeof fieldToDelete.club === 'object' ? fieldToDelete.club.id : fieldToDelete.club;
          const clubInMunicipality = clubs.find(c => c.id === fieldClubId);
          isClubFieldInMunicipality = !!clubInMunicipality;
        }
        
        // Only allow deleting if it's a municipality field or a club field in their municipality
        // Block global super admin fields
        if (fieldToDelete.owner_role === 'SUPER_ADMIN' || (!isOwnedByMunicipalityAdmin && !isClubFieldInMunicipality)) {
          setToast({ message: 'You can only delete fields assigned to your municipality or clubs in your municipality.', type: 'error', isVisible: true });
          setDeleteId(null);
          setShowDelete(false);
          return;
        }
      }
    }
    
    try {
      await api.delete(`/custom-fields/${deleteId}/`);
      setToast({ message: 'Field deleted', type: 'success', isVisible: true });
      setDeleteId(null);
      setShowDelete(false);
      fetchFields();
    } catch (err) {
      setToast({ message: 'Delete failed', type: 'error', isVisible: true });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Registration Fields</h2>
          <p className="text-sm text-gray-500">Customize the data users provide during registration.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Field
        </button>
      </div>

      {/* LIST */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Label</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Req?</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
            ) : fields.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No custom fields created yet.</td></tr>
            ) : fields.map(field => {
              // For club admins, check if field belongs to their club
              const isOwnedByClubAdmin = scope === 'CLUB' && user?.assigned_club && 
                field.owner_role === 'CLUB_ADMIN' && 
                (typeof field.club === 'object' ? field.club?.id : field.club) === (typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club);
              
              // For municipality admins:
              // - Can edit their own municipality fields
              // - Can edit club fields that belong to clubs in their municipality
              // - Cannot edit global super admin fields
              let isOwnedByMunicipalityAdmin = false;
              let isClubFieldInMunicipality = false;
              
              if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
                const userMunicipalityId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
                
                // Check if it's a municipality field owned by this municipality
                isOwnedByMunicipalityAdmin = field.owner_role === 'MUNICIPALITY_ADMIN' && 
                  fieldMunicipalityId === userMunicipalityId;
                
                // Check if it's a club field that belongs to a club in this municipality
                if (field.owner_role === 'CLUB_ADMIN' && field.club) {
                  // We need to check if the club belongs to this municipality
                  // Since we have clubs loaded for municipality admins, we can check against that
                  const fieldClubId = typeof field.club === 'object' ? field.club.id : field.club;
                  const clubInMunicipality = clubs.find(c => c.id === fieldClubId);
                  // If the club is in our clubs list (which is filtered by municipality), it's editable
                  isClubFieldInMunicipality = !!clubInMunicipality;
                }
              }
              
              // Fields that are not owned by the admin should be greyed out and disabled
              // Club admins can only edit their club fields
              // Municipality admins can edit their municipality fields and club fields in their municipality (only global super admin fields are read-only)
              const isReadOnly = (scope === 'CLUB' && !isOwnedByClubAdmin) || 
                                 (scope === 'MUNICIPALITY' && field.owner_role === 'SUPER_ADMIN');
              
              return (
                <tr key={field.id} className={isReadOnly ? 'opacity-50 bg-gray-50' : ''}>
                  <td className={`px-6 py-4 font-medium ${isReadOnly ? 'text-gray-500' : 'text-gray-900'}`}>
                    {field.name}
                    {isReadOnly && <span className="ml-2 text-xs text-gray-400">(Read-only)</span>}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isReadOnly ? 'text-gray-400' : 'text-gray-600'}`}>
                    {field.field_type.replace('_', ' ')}
                  </td>
                  <td className={`px-6 py-4 text-sm flex gap-1 ${isReadOnly ? 'opacity-50' : ''}`}>
                    {field.target_roles.map(r => (
                      <span key={r} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                      </span>
                    ))}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isReadOnly ? 'text-gray-400' : ''}`}>
                    {field.required ? <span className="text-red-600 font-bold">Yes</span> : 'No'}
                  </td>
                  <td className={`px-6 py-4 ${isReadOnly ? 'opacity-50' : ''}`}>
                    {field.is_published 
                      ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Active</span>
                      : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Draft</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {isReadOnly ? (
                      <span className="text-gray-400 text-sm italic">Read-only</span>
                    ) : (
                      <>
                        <button onClick={() => handleOpenEdit(field)} className="text-blue-600 hover:underline text-sm font-bold">Edit</button>
                        <button onClick={() => { setDeleteId(field.id); setShowDelete(true); }} className="text-red-600 hover:underline text-sm">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Field' : 'Create Custom Field'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Field Label</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full border p-2 rounded" 
                    placeholder="e.g. T-Shirt Size"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Data Type</label>
                  <select 
                    className="w-full border p-2 rounded"
                    value={formData.field_type}
                    // @ts-ignore
                    onChange={e => setFormData({...formData, field_type: e.target.value})}
                  >
                    <option value="TEXT">Text (Free type)</option>
                    <option value="SINGLE_SELECT">Single Select (Dropdown)</option>
                    <option value="MULTI_SELECT">Multi Select (Checkboxes)</option>
                    <option value="BOOLEAN">Boolean (Yes/No Checkbox)</option>
                  </select>
                </div>
              </div>

              {/* NEW ROW: Usage Context */}
              <div>
                <label className="block text-sm font-bold mb-1">Used For</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="context"
                      value="USER_PROFILE"
                      checked={formData.context === 'USER_PROFILE'}
                      onChange={e => setFormData({...formData, context: e.target.value})}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="block font-bold text-gray-800">User Profile</span>
                      <span className="text-xs text-gray-500">Shown during registration/profile edit</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="context"
                      value="EVENT"
                      checked={formData.context === 'EVENT'}
                      onChange={e => setFormData({...formData, context: e.target.value})}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="block font-bold text-gray-800">Event Booking</span>
                      <span className="text-xs text-gray-500">Shown when booking an event ticket</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Help Text */}
              <div>
                <label className="block text-sm font-bold mb-1">Help Text (Optional)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded text-sm text-gray-600" 
                  placeholder="e.g. Please select the size for your team jersey"
                  value={formData.help_text}
                  onChange={e => setFormData({...formData, help_text: e.target.value})}
                />
              </div>

              {/* OPTIONS BUILDER (Only for Selects) */}
              {(formData.field_type === 'SINGLE_SELECT' || formData.field_type === 'MULTI_SELECT') && (
                <div className="bg-blue-50 p-4 rounded border border-blue-100">
                  <label className="block text-sm font-bold mb-2 text-blue-800">Options List</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      className="flex-1 border p-2 rounded text-sm"
                      placeholder="Type option and press Add..."
                      value={formData.currentOptionInput}
                      onChange={e => setFormData({...formData, currentOptionInput: e.target.value})}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    />
                    <button type="button" onClick={addOption} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Add</button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.options.map((opt, idx) => (
                      <span key={idx} className="bg-white border border-blue-200 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-2">
                        {opt}
                        <button type="button" onClick={() => removeOption(idx)} className="text-red-500 font-bold hover:text-red-700">×</button>
                      </span>
                    ))}
                    {formData.options.length === 0 && <span className="text-xs text-gray-500 italic">No options added yet.</span>}
                  </div>
                </div>
              )}

              {/* TARGET ROLES */}
              <div>
                <label className="block text-sm font-bold mb-2">Who should verify this?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.target_roles.includes('YOUTH_MEMBER')}
                      onChange={() => toggleRole('YOUTH_MEMBER')}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span>Youth Members</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.target_roles.includes('GUARDIAN')}
                      onChange={() => toggleRole('GUARDIAN')}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span>Guardians</span>
                  </label>
                </div>
              </div>

              {/* SETTINGS */}
              <div className="flex gap-6 bg-gray-50 p-3 rounded">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.required}
                    onChange={e => setFormData({...formData, required: e.target.checked})}
                    className="w-5 h-5 text-red-600"
                  />
                  <span className="font-medium">Required Field</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_published}
                    onChange={e => setFormData({...formData, is_published: e.target.checked})}
                    className="w-5 h-5 text-green-600"
                  />
                  <span className="font-medium">Published (Active)</span>
                </label>
              </div>

              {/* MUNICIPALITY SPECIFIC: LIMIT TO CLUBS */}
              {scope === 'MUNICIPALITY' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-bold mb-2">Limit to Specific Clubs (Optional)</label>
                  <p className="text-xs text-gray-500 mb-2">If no clubs are selected, this field applies to ALL clubs in your municipality.</p>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 grid grid-cols-2 gap-2">
                    {clubs.map(club => (
                      <label key={club.id} className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.specific_clubs.includes(club.id)}
                          onChange={() => toggleClub(club.id)}
                        />
                        {club.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Save Field</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal 
        isVisible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        itemName="this field"
        message="Deleting this field will remove all data users have entered for it. This cannot be undone."
      />

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}