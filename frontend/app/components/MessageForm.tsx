'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';

interface MessageFormProps {
  redirectPath: string;
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function MessageForm({ redirectPath }: MessageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    message_type: 'INFO',
    target_all: true,
    selected_roles: [] as string[],
    days_active: 7,
    is_sticky: false,
    external_link: ''
  });

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const list = prev.selected_roles.includes(role)
        ? prev.selected_roles.filter(r => r !== role)
        : [...prev.selected_roles, role];
      return { ...prev, selected_roles: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate that at least one role is selected if not targeting all
    if (!formData.target_all && formData.selected_roles.length === 0) {
      setToast({ message: 'Please select at least one role or select "All Roles".', type: 'error', isVisible: true });
      setLoading(false);
      return;
    }
    
    // Calculate Expiration
    const expires = new Date();
    expires.setDate(expires.getDate() + parseInt(formData.days_active.toString()));

    const payload: any = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      message_type: formData.message_type,
      target_roles: formData.target_all ? ['ALL'] : formData.selected_roles,
      is_sticky: formData.is_sticky,
      expires_at: expires.toISOString()
    };

    // Only include external_link if it has a value (don't send null or empty string)
    if (formData.external_link && formData.external_link.trim()) {
      payload.external_link = formData.external_link.trim();
    }

    try {
      await api.post('/messages/', payload);
      setToast({ message: 'System message created!', type: 'success', isVisible: true });
      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err: any) {
      console.error('Error creating message:', err);
      console.error('Error response:', err?.response?.data);
      console.error('Payload sent:', payload);
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.detail || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : 'Failed to create message.');
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create System Message</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Type</label>
            <select 
              className="w-full border p-2 rounded bg-white" 
              value={formData.message_type} 
              onChange={e => setFormData({...formData, message_type: e.target.value})}
            >
              <option value="INFO">Information (Blue)</option>
              <option value="IMPORTANT">Important (Orange)</option>
              <option value="WARNING">Warning (Red)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Duration (Days)</label>
            <input 
              type="number" min="1" max="365" 
              className="w-full border p-2 rounded" 
              value={formData.days_active} 
              onChange={e => setFormData({...formData, days_active: parseInt(e.target.value)})} 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">Title</label>
          <input 
            type="text" required 
            className="w-full border p-2 rounded" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">Message Body</label>
          <textarea 
            required rows={4} 
            className="w-full border p-2 rounded" 
            value={formData.message} 
            onChange={e => setFormData({...formData, message: e.target.value})} 
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">External Link (Optional)</label>
          <input 
            type="url" placeholder="https://..." 
            className="w-full border p-2 rounded" 
            value={formData.external_link} 
            onChange={e => setFormData({...formData, external_link: e.target.value})} 
          />
        </div>

        {/* Audience */}
        <div className="bg-gray-50 p-4 rounded border">
          <label className="block text-sm font-bold mb-2 text-gray-700">Target Audience</label>
          
          <div className="flex items-center mb-3">
            <input 
              type="checkbox" 
              checked={formData.target_all} 
              onChange={e => setFormData({...formData, target_all: e.target.checked})} 
              className="w-5 h-5 text-blue-600 mr-2" 
            />
            <span className="font-medium text-gray-900">All Roles</span>
          </div>
          
          {!formData.target_all && (
            <div className="grid grid-cols-2 gap-2 pl-7">
              {ROLES.map(role => (
                <label key={role.id} className="flex items-center text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mr-2 rounded text-blue-600"
                    checked={formData.selected_roles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Toggle */}
        <div className="flex items-center gap-3 bg-yellow-50 p-4 rounded border border-yellow-100">
          <input 
            type="checkbox" id="sticky" 
            checked={formData.is_sticky} 
            onChange={e => setFormData({...formData, is_sticky: e.target.checked})} 
            className="w-5 h-5 text-yellow-600"
          />
          <div>
            <label htmlFor="sticky" className="block text-sm font-bold text-gray-900 cursor-pointer">
              Sticky Message
            </label>
            <p className="text-xs text-gray-500">Reappears on refresh even if closed by user.</p>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button 
            type="button" 
            onClick={() => router.push(redirectPath)} 
            className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}