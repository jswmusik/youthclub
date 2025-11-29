'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import RichTextEditor from './RichTextEditor';

interface Tag { id: number; name: string; }

interface ArticleFormProps {
  initialData?: any;
  redirectPath: string;
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function ArticleForm({ initialData, redirectPath }: ArticleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    is_published: initialData?.is_published || false,
    is_hero: initialData?.is_hero || false,
    tags: initialData?.tags || [], // Array of IDs
    target_roles: initialData?.target_roles || ['ALL'],
  });

  // Files
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  useEffect(() => {
    // Fetch Tags for selection
    api.get('/news_tags/').then(res => {
      setTagsList(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHeroFile(e.target.files[0]);
      setHeroPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const toggleTag = (id: number) => {
    setFormData(prev => {
      const exists = prev.tags.includes(id);
      return { 
        ...prev, 
        tags: exists ? prev.tags.filter((t: number) => t !== id) : [...prev.tags, id] 
      };
    });
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      if (role === 'ALL') {
        // Toggle ALL: if on, turn off others. if off, turn on.
        return { ...prev, target_roles: prev.target_roles.includes('ALL') ? [] : ['ALL'] };
      }
      
      // If specific role selected, remove ALL
      let newRoles = prev.target_roles.filter((r: string) => r !== 'ALL');
      if (newRoles.includes(role)) {
        newRoles = newRoles.filter((r: string) => r !== role);
      } else {
        newRoles.push(role);
      }
      
      if (newRoles.length === 0) newRoles = ['ALL']; // Default back to ALL if empty
      
      return { ...prev, target_roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure at least one role is selected
      const rolesToSubmit = formData.target_roles.length > 0 ? formData.target_roles : ['ALL'];
      
      const data = new FormData();
      data.append('title', formData.title);
      data.append('excerpt', formData.excerpt);
      data.append('content', formData.content);
      data.append('target_roles_data', JSON.stringify(rolesToSubmit));
      data.append('is_published', formData.is_published.toString());
      data.append('is_hero', formData.is_hero.toString());
      
      // Arrays
      formData.tags.forEach((id: number) => data.append('tags', id.toString()));

      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/news/${initialData.id}/`, data, config);
        setToast({ message: 'Article updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/news/', data, config);
        setToast({ message: 'Article created!', type: 'success', isVisible: true });
      }

      // Preserve page parameter when redirecting
      const page = searchParams.get('page');
      const search = searchParams.get('search');
      const params = new URLSearchParams();
      if (page && page !== '1') params.set('page', page);
      if (search) params.set('search', search);
      const queryString = params.toString();
      const finalPath = queryString ? `${redirectPath}?${queryString}` : redirectPath;
      
      setTimeout(() => router.push(finalPath), 1000);

    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-5xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Article' : 'Create Article'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* LEFT: Content */}
            <div className="md:col-span-2 space-y-6">
                <div>
                    <label className="block text-sm font-bold mb-1">Title</label>
                    <input required type="text" className="w-full border p-3 rounded-lg text-lg font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1">Excerpt (Summary)</label>
                    <textarea required rows={3} className="w-full border p-3 rounded-lg" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1">Body Content</label>
                    <RichTextEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} />
                </div>
            </div>

            {/* RIGHT: Settings */}
            <div className="space-y-6">
                
                {/* Hero Image */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Hero Image</label>
                    <div className="space-y-3">
                        {heroPreview ? (
                            <img src={heroPreview} className="w-full h-32 object-cover rounded-lg shadow-sm" />
                        ) : (
                            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm font-bold">No Image</div>
                        )}
                        <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs w-full" />
                    </div>
                </div>

                {/* Status */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({...formData, is_published: e.target.checked})} className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-gray-700">Publish Article</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_hero} onChange={e => setFormData({...formData, is_hero: e.target.checked})} className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-gray-700">Set as Main Hero</span>
                    </label>
                    <p className="text-xs text-gray-500 pl-7">Setting this will remove Hero status from any other article.</p>
                </div>

                {/* Tags */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                        {tagsList.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`px-2 py-1 rounded text-xs font-bold border transition
                                    ${formData.tags.includes(tag.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}
                                `}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Targeting */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold mb-2">Target Audience</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded bg-white">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={formData.target_roles.includes('ALL')} onChange={() => toggleRole('ALL')} />
                            <span className="font-bold">Everyone</span>
                        </label>
                        {!formData.target_roles.includes('ALL') && ROLES.map(role => (
                            <label key={role.id} className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={formData.target_roles.includes(role.id)} 
                                    onChange={() => toggleRole(role.id)}
                                />
                                <span>{role.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

            </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-6">
            <button 
              type="button" 
              onClick={() => {
                const page = searchParams.get('page');
                const search = searchParams.get('search');
                const params = new URLSearchParams();
                if (page && page !== '1') params.set('page', page);
                if (search) params.set('search', search);
                const queryString = params.toString();
                const finalPath = queryString ? `${redirectPath}?${queryString}` : redirectPath;
                router.push(finalPath);
              }} 
              className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Article'}
            </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}