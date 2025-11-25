'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import Toast from '../../../components/Toast';

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function ManageMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  
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

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/messages/');
      setMessages(res.data.results || res.data);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to load messages';
      alert(`Error: ${errorMessage}`);
    }
  };

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
    
    const expires = new Date();
    expires.setDate(expires.getDate() + parseInt(formData.days_active.toString()));

    const payload = {
      title: formData.title,
      message: formData.message,
      message_type: formData.message_type,
      target_roles: formData.target_all ? ['ALL'] : formData.selected_roles,
      is_sticky: formData.is_sticky,
      external_link: formData.external_link || null,
      expires_at: expires.toISOString()
    };

    try {
      await api.post('/messages/', payload);
      setToast({
        message: 'System message created successfully!',
        type: 'success',
        isVisible: true,
      });
      setShowModal(false);
      fetchMessages();
      setFormData({ ...formData, title: '', message: '', external_link: '' });
    } catch (err) {
      setToast({
        message: 'Failed to create system message.',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const deleteMessage = async (id: number) => {
    if(!confirm("Delete this message?")) return;
    try {
      await api.delete(`/messages/${id}/`);
      setToast({
        message: 'System message deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      fetchMessages();
    } catch (err) {
      setToast({
        message: 'Failed to delete system message.',
        type: 'error',
        isVisible: true,
      });
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Messages</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + New Message
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Content</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Audience</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Settings</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages.map(msg => (
              <tr key={msg.id}>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white
                    ${msg.message_type === 'INFO' ? 'bg-blue-500' : 
                      msg.message_type === 'IMPORTANT' ? 'bg-orange-500' : 'bg-red-600'}`}>
                    {msg.message_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold">{msg.title}</div>
                  <div className="text-sm text-gray-600">{msg.message}</div>
                  {msg.external_link && <a href={msg.external_link} target="_blank" className="text-xs text-blue-500 underline">Link</a>}
                </td>
                <td className="px-6 py-4 text-sm">
                  {msg.target_roles.includes("ALL") ? "Everyone" : msg.target_roles.join(", ")}
                </td>
                <td className="px-6 py-4 text-sm">
                  {msg.is_sticky && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-2">Sticky</span>}
                  <span className="text-gray-500">Expires: {new Date(msg.expires_at).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button onClick={() => deleteMessage(msg.id)} className="text-red-600 font-bold text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create System Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Type</label>
                  <select className="w-full border p-2 rounded" 
                    value={formData.message_type} onChange={e => setFormData({...formData, message_type: e.target.value})}>
                    <option value="INFO">Information</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="WARNING">Warning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Duration (Days)</label>
                  <input type="number" min="1" max="365" className="w-full border p-2 rounded" 
                    value={formData.days_active} onChange={e => setFormData({...formData, days_active: parseInt(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input type="text" required className="w-full border p-2 rounded" 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Message Body</label>
                <textarea required rows={3} className="w-full border p-2 rounded" 
                  value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">External Link (Optional)</label>
                <input type="url" placeholder="https://..." className="w-full border p-2 rounded" 
                  value={formData.external_link} onChange={e => setFormData({...formData, external_link: e.target.value})} />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border">
                <input type="checkbox" id="sticky" checked={formData.is_sticky} 
                  onChange={e => setFormData({...formData, is_sticky: e.target.checked})} />
                <label htmlFor="sticky" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Make Sticky (Re-appears on refresh)
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Target Audience</label>
                <div className="flex items-center mb-2">
                  <input type="checkbox" checked={formData.target_all} 
                    onChange={e => setFormData({...formData, target_all: e.target.checked})} 
                    className="mr-2" />
                  <span>All Roles</span>
                </div>
                
                {!formData.target_all && (
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded border">
                    {ROLES.map(role => (
                      <label key={role.id} className="flex items-center text-sm">
                        <input type="checkbox" className="mr-2"
                          checked={formData.selected_roles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Send Message</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}