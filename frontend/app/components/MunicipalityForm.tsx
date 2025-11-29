'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

interface Option { id: number; name: string; }

interface MunicipalityFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function MunicipalityForm({ initialData, redirectPath }: MunicipalityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Option[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country: String(initialData?.country?.id ?? initialData?.country ?? ''), // ID - handles both object and ID
    municipality_code: initialData?.municipality_code || '',
    description: initialData?.description || '',
    terms_and_conditions: initialData?.terms_and_conditions || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website_link: initialData?.website_link || '',
    allow_self_registration: initialData?.allow_self_registration ?? true,
    
    // Social Media (Parsed from JSON if editing)
    facebook: '',
    instagram: ''
  });

  // Parse social media from initialData if exists
  useEffect(() => {
    if (initialData?.social_media) {
      let social = { facebook: '', instagram: '' };
      try {
        if (typeof initialData.social_media === 'string') {
          social = { ...social, ...JSON.parse(initialData.social_media) };
        } else if (typeof initialData.social_media === 'object') {
          social = { ...social, ...initialData.social_media };
        }
        setFormData(prev => ({
          ...prev,
          facebook: social.facebook || '',
          instagram: social.instagram || ''
        }));
      } catch (e) {
        console.error("Error parsing social media JSON", e);
      }
    }
  }, [initialData]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );
  
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  // Load Countries
  useEffect(() => {
    api.get('/countries/').then(res => {
      setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(preview);
      } else {
        setHeroFile(file);
        setHeroPreview(preview);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      
      // Standard Fields
      data.append('name', formData.name);
      data.append('country', formData.country.toString());
      data.append('municipality_code', formData.municipality_code);
      data.append('description', formData.description);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('website_link', formData.website_link);
      data.append('allow_self_registration', formData.allow_self_registration.toString());

      // Social Media JSON
      const socialMediaJson = JSON.stringify({
        facebook: formData.facebook,
        instagram: formData.instagram
      });
      data.append('social_media', socialMediaJson);
      
      // Files
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/municipalities/${initialData.id}/`, data, config);
        setToast({ message: 'Municipality updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/municipalities/', data, config);
        setToast({ message: 'Municipality created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Operation failed. Check inputs.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-5xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {initialData ? 'Edit Municipality' : 'New Municipality'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. BASIC INFO */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Municipality Name</label>
                    <input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Country</label>
                    <select required className="w-full border p-2 rounded" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}>
                        <option value="">Select Country...</option>
                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Municipality Code</label>
                    <input type="text" className="w-full border p-2 rounded" value={formData.municipality_code} onChange={e => setFormData({...formData, municipality_code: e.target.value})} />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded border hover:bg-gray-100 w-full">
                        <input type="checkbox" checked={formData.allow_self_registration} onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})} className="text-blue-600 h-5 w-5" />
                        <span className="text-sm font-bold text-gray-700">Allow Self Registration</span>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Description</label>
                <textarea required rows={3} className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
        </section>

        {/* 2. BRANDING */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Avatar */}
                <div className="bg-gray-50 p-4 rounded border">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Avatar / Logo</label>
                    <div className="flex items-center gap-4">
                        {avatarPreview ? (
                            <img src={avatarPreview} className="w-16 h-16 object-contain bg-white rounded border" />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                        )}
                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'avatar')} className="text-sm w-full" />
                    </div>
                </div>

                {/* Hero */}
                <div className="bg-gray-50 p-4 rounded border">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Hero Image</label>
                    <div className="space-y-2">
                        {heroPreview ? (
                            <img src={heroPreview} className="w-full h-24 object-cover rounded border" />
                        ) : (
                            <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Hero Image</div>
                        )}
                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'hero')} className="text-sm w-full" />
                    </div>
                </div>
            </div>
        </section>

        {/* 3. CONTACT & SOCIALS */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Contact & Socials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input type="url" placeholder="Website URL" className="border p-2 rounded" value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="Facebook URL" className="border p-2 rounded" value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} />
                <input type="text" placeholder="Instagram URL" className="border p-2 rounded" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} />
            </div>
        </section>

        {/* 4. TERMS */}
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Legal</h3>
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Terms & Conditions</label>
                <textarea required rows={4} className="w-full border p-2 rounded" value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} />
            </div>
        </section>

        {/* FOOTER */}
        <div className="flex justify-end gap-4 border-t pt-6">
          <button type="button" onClick={() => router.push(redirectPath)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg">
            {loading ? 'Saving...' : 'Save Municipality'}
          </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}