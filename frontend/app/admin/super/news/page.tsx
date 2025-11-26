'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import RichTextEditor from '../../../components/RichTextEditor';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

// --- TYPES ---
interface Tag { id: number; name: string; }
interface Article {
  id: number;
  title: string;
  excerpt: string;
  author_name: string;
  is_published: boolean;
  is_hero: boolean;
  published_at: string;
  tags_details: Tag[];
  hero_image: string;
  content?: string; // Full content
  target_roles: string[];
  tags: number[]; // IDs for editing
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function ManageNewsPage() {
  // --- STATE ---
  const [articles, setArticles] = useState<Article[]>([]);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '', type: 'success', isVisible: false,
  });
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>(['ALL']); // Default to ALL
  const [isPublished, setIsPublished] = useState(false);
  const [isHero, setIsHero] = useState(false);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [newsRes, tagsRes] = await Promise.all([
        api.get('/news/'), // Get news
        api.get('/news_tags/') // Get tags for dropdown
      ]);
      setArticles(Array.isArray(newsRes.data) ? newsRes.data : newsRes.data.results);
      setTagsList(Array.isArray(tagsRes.data) ? tagsRes.data : tagsRes.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (article: Article) => {
    setIsEditing(true);
    setEditId(article.id);
    
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setContent(article.content || ''); // Content might not be in list view if you optimize query, but for now it likely is
    setSelectedTags(article.tags || []); 
    setTargetRoles(article.target_roles || ['ALL']);
    setIsPublished(article.is_published);
    setIsHero(article.is_hero);
    
    setHeroFile(null);
    setHeroPreview(article.hero_image ? getMediaUrl(article.hero_image) : null);
    
    setShowModal(true);
  };

  const resetForm = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setSelectedTags([]);
    setTargetRoles(['ALL']);
    setIsPublished(false);
    setIsHero(false);
    setHeroFile(null);
    setHeroPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHeroFile(e.target.files[0]);
      setHeroPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleRole = (role: string) => {
    if (role === 'ALL') {
      // If 'ALL' is already selected, unselect it (allow user to choose specific roles)
      if (targetRoles.includes('ALL')) {
        setTargetRoles([]);
      } else {
        // If 'ALL' is not selected, select it and clear other roles
        setTargetRoles(['ALL']);
      }
      return;
    }
    
    // For specific roles: if 'ALL' is selected, unselect it first
    let newRoles = targetRoles.includes('ALL') ? [] : [...targetRoles];
    
    // Toggle the specific role
    if (newRoles.includes(role)) {
      newRoles = newRoles.filter(r => r !== role);
    } else {
      newRoles.push(role);
    }
    
    // If no roles are selected, default back to 'ALL'
    if (newRoles.length === 0) {
      newRoles = ['ALL'];
    }
    
    setTargetRoles(newRoles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure at least one role is selected
    const rolesToSubmit = targetRoles.length > 0 ? targetRoles : ['ALL'];
    
    const data = new FormData();
    data.append('title', title);
    data.append('excerpt', excerpt);
    data.append('content', content);
    data.append('target_roles_data', JSON.stringify(rolesToSubmit));
    data.append('is_published', isPublished.toString());
    data.append('is_hero', isHero.toString());
    
    selectedTags.forEach(id => data.append('tags', id.toString()));
    
    if (heroFile) data.append('hero_image', heroFile);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      if (isEditing && editId) {
        await api.patch(`/news/${editId}/`, data, config);
        setToast({ message: 'News updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/news/', data, config);
        setToast({ message: 'News created!', type: 'success', isVisible: true });
      }
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to save news.', type: 'error', isVisible: true });
    }
  };

  const handleDeleteClick = (article: Article) => {
    setArticleToDelete({ id: article.id, title: article.title });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/news/${articleToDelete.id}/`);
      setToast({ message: 'Deleted.', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setArticleToDelete(null);
      fetchData();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">News Management</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Create Article
        </button>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Article</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.hero_image && (
                        <img src={getMediaUrl(item.hero_image) || ''} alt="Hero" className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{item.excerpt}</div>
                        {item.is_hero && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded font-bold">HERO</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.is_published 
                      ? <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">Published</span>
                      : <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-bold">Draft</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.author_name}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => handleOpenEdit(item)} className="text-blue-600 font-bold">Edit</button>
                    <button onClick={() => handleDeleteClick(item)} className="text-red-600 font-bold">Delete</button>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Article' : 'Create Article'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 text-xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Main Content */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Title</label>
                    <input required type="text" className="w-full border p-2 rounded font-bold text-lg" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Excerpt (Summary)</label>
                    <textarea required rows={2} className="w-full border p-2 rounded text-sm" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Body Content</label>
                    <RichTextEditor value={content} onChange={setContent} />
                  </div>
                </div>

                {/* RIGHT COLUMN: Settings */}
                <div className="space-y-6 bg-gray-50 p-4 rounded-lg h-fit">
                  
                  {/* Hero Image */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Hero Image</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm w-full" />
                    {heroPreview && <img src={heroPreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded border" />}
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-gray-700">Publish Article</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isHero} onChange={e => setIsHero(e.target.checked)} className="w-5 h-5 text-yellow-500" />
                      <span className="font-bold text-gray-700">Set as Main Hero</span>
                    </label>
                    <p className="text-xs text-gray-500 pl-7">Setting this will remove Hero status from any other article.</p>
                  </div>

                  {/* Targeting */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Target Audience</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded bg-white">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={targetRoles.includes('ALL')} onChange={() => toggleRole('ALL')} />
                        <span className="font-bold">Everyone</span>
                      </label>
                      {!targetRoles.includes('ALL') && ROLES.map(role => (
                        <label key={role.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={targetRoles.includes(role.id)} onChange={() => toggleRole(role.id)} />
                          <span>{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tagsList.map(tag => (
                        <button 
                          key={tag.id} 
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2 py-1 rounded text-xs font-bold border transition
                            ${selectedTags.includes(tag.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}
                          `}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </form>

            <div className="p-6 border-t flex justify-end gap-4">
              <button onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
              <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setArticleToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        itemName={articleToDelete?.title}
        isLoading={isDeleting}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}