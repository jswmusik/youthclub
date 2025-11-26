'use client';

import { useState, useEffect } from 'react';
import api from '../../../../../lib/api';
import Toast from '../../../../components/Toast';
import DeleteConfirmationModal from '../../../../components/DeleteConfirmationModal';

interface NewsTag {
  id: number;
  name: string;
  slug: string;
}

export default function ManageNewsTagsPage() {
  const [tags, setTags] = useState<NewsTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/news_tags/');
      // API returns either array or paginated object. Handle both.
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setTags(data || []);
    } catch (err) {
      console.error("Failed to fetch tags", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug when Name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Simple slugify: lowercase, replace spaces with dashes, remove non-alphanumeric
    const generatedSlug = val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/news_tags/', { name, slug });
      setToast({ message: 'Tag created successfully!', type: 'success', isVisible: true });
      setShowModal(false);
      setName('');
      setSlug('');
      fetchTags();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to create tag. Name or Slug might be duplicate.', type: 'error', isVisible: true });
    }
  };

  const handleDeleteClick = (tag: NewsTag) => {
    setTagToDelete({ id: tag.id, name: tag.name });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/news_tags/${tagToDelete.id}/`);
      setToast({ message: 'Tag deleted.', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setTagToDelete(null);
      fetchTags();
    } catch (err) {
      setToast({ message: 'Failed to delete tag.', type: 'error', isVisible: true });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">News Tags</h1>
          <p className="text-gray-500 text-sm">Categories for filtering news articles.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
        >
          + Create Tag
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tags...</div>
        ) : tags.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tags found. Create one to get started.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Slug (URL)</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    <span className="bg-gray-100 px-2 py-1 rounded">{tag.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {tag.slug}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteClick(tag)} className="text-red-600 hover:text-red-800 font-bold text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Create New Tag</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Tag Name</label>
                <input 
                  required 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                  placeholder="e.g. Summer Events"
                  value={name} 
                  onChange={handleNameChange} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Slug</label>
                <input 
                  required 
                  type="text" 
                  className="w-full border p-2 rounded bg-gray-100 text-gray-600" 
                  placeholder="e.g. summer-events"
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Used in the URL. Auto-generated, but editable.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setTagToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        itemName={tagToDelete?.name}
        message={tagToDelete ? `Are you sure you want to delete "${tagToDelete.name}"? It will be removed from all news articles. This action cannot be undone.` : undefined}
        isLoading={isDeleting}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}