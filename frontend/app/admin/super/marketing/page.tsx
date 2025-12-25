// frontend/app/admin/super/marketing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Quote, Plus, Pencil, Trash2, Star, 
  Save, X, Eye, EyeOff, Loader2 
} from 'lucide-react';
import api from '../../../../lib/api';

interface Testimonial {
  id: number;
  author_name: string;
  author_role: string;
  quote: string;
  rating: number;
  is_active: boolean;
  created_at: string;
}

interface SEOSettings {
  page_title: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'seo' | 'testimonials'>('seo');
  
  // SEO State
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    page_title: 'Ungdomsappen - Hitta aktiviteter nära dig',
    meta_description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    og_image: null,
  });
  const [seoLoading, setSeoLoading] = useState(true);
  const [seoSaving, setSeoSaving] = useState(false);
  
  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    author_name: '',
    author_role: 'Ungdom',
    quote: '',
    rating: 5,
    is_active: true,
  });
  const [testimonialSaving, setTestimonialSaving] = useState(false);

  // Fetch SEO settings
  useEffect(() => {
    const fetchSEO = async () => {
      try {
        const res = await api.get('/marketing/public/seo-settings/');
        if (res.data) {
          setSeoSettings(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch SEO settings:', error);
      } finally {
        setSeoLoading(false);
      }
    };
    fetchSEO();
  }, []);

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await api.get('/marketing/testimonials/');
        const data = res.data.results || res.data;
        setTestimonials(data);
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
      } finally {
        setTestimonialsLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Save SEO settings
  const handleSaveSEO = async () => {
    setSeoSaving(true);
    try {
      // Note: You might need to create/update endpoint for admin SEO settings
      // For now, we'll show a success message
      alert('SEO-inställningar sparade! (Backend endpoint behövs)');
    } catch (error) {
      console.error('Failed to save SEO settings:', error);
      alert('Kunde inte spara inställningar');
    } finally {
      setSeoSaving(false);
    }
  };

  // Save testimonial
  const handleSaveTestimonial = async () => {
    setTestimonialSaving(true);
    try {
      if (editingTestimonial) {
        await api.patch(`/marketing/testimonials/${editingTestimonial.id}/`, testimonialForm);
        setTestimonials(prev => 
          prev.map(t => t.id === editingTestimonial.id ? { ...t, ...testimonialForm } : t)
        );
      } else {
        const res = await api.post('/marketing/testimonials/', testimonialForm);
        setTestimonials(prev => [res.data, ...prev]);
      }
      resetTestimonialForm();
    } catch (error) {
      console.error('Failed to save testimonial:', error);
      alert('Kunde inte spara omdöme');
    } finally {
      setTestimonialSaving(false);
    }
  };

  // Delete testimonial
  const handleDeleteTestimonial = async (id: number) => {
    if (!confirm('Är du säker på att du vill ta bort detta omdöme?')) return;
    
    try {
      await api.delete(`/marketing/testimonials/${id}/`);
      setTestimonials(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      alert('Kunde inte ta bort omdöme');
    }
  };

  // Toggle testimonial active status
  const handleToggleActive = async (testimonial: Testimonial) => {
    try {
      await api.patch(`/marketing/testimonials/${testimonial.id}/`, {
        is_active: !testimonial.is_active,
      });
      setTestimonials(prev => 
        prev.map(t => t.id === testimonial.id ? { ...t, is_active: !t.is_active } : t)
      );
    } catch (error) {
      console.error('Failed to toggle testimonial:', error);
    }
  };

  const resetTestimonialForm = () => {
    setShowTestimonialForm(false);
    setEditingTestimonial(null);
    setTestimonialForm({
      author_name: '',
      author_role: 'Ungdom',
      quote: '',
      rating: 5,
      is_active: true,
    });
  };

  const startEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      author_name: testimonial.author_name,
      author_role: testimonial.author_role,
      quote: testimonial.quote,
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setShowTestimonialForm(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Marknadsföring</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'seo'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 inline-block mr-2" />
          SEO-inställningar
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'testimonials'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Quote className="w-4 h-4 inline-block mr-2" />
          Omdömen
        </button>
      </div>

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Startsidans SEO
          </h2>
          
          {seoLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sidtitel
                </label>
                <input
                  type="text"
                  value={seoSettings.page_title}
                  onChange={(e) => setSeoSettings({ ...seoSettings, page_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ungdomsappen - Hitta aktiviteter nära dig"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta-beskrivning
                </label>
                <textarea
                  value={seoSettings.meta_description}
                  onChange={(e) => setSeoSettings({ ...seoSettings, meta_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Upptäck aktiviteter, evenemang och fritidsgårdar nära dig..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nyckelord (kommaseparerade)
                </label>
                <input
                  type="text"
                  value={seoSettings.keywords}
                  onChange={(e) => setSeoSettings({ ...seoSettings, keywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="ungdomsappen, fritidsgård, aktiviteter, ungdom"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Open Graph (Sociala medier)</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OG Titel
                    </label>
                    <input
                      type="text"
                      value={seoSettings.og_title}
                      onChange={(e) => setSeoSettings({ ...seoSettings, og_title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Lämna tom för att använda sidtiteln"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OG Beskrivning
                    </label>
                    <textarea
                      value={seoSettings.og_description}
                      onChange={(e) => setSeoSettings({ ...seoSettings, og_description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Lämna tom för att använda meta-beskrivningen"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveSEO}
                  disabled={seoSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {seoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Spara
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Testimonials Tab */}
      {activeTab === 'testimonials' && (
        <div className="space-y-6">
          {/* Add Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowTestimonialForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Lägg till omdöme
            </button>
          </div>

          {/* Form Modal */}
          {showTestimonialForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingTestimonial ? 'Redigera omdöme' : 'Nytt omdöme'}
                  </h3>
                  <button onClick={resetTestimonialForm} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                    <input
                      type="text"
                      value={testimonialForm.author_name}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, author_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Emma Andersson"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roll</label>
                    <input
                      type="text"
                      value={testimonialForm.author_role}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, author_role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Ungdom, 16 år"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Omdöme</label>
                    <textarea
                      value={testimonialForm.quote}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Skriv omdömet här..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Betyg</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                          className="p-1"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= testimonialForm.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={testimonialForm.is_active}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Visa på startsidan
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={resetTestimonialForm}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleSaveTestimonial}
                    disabled={testimonialSaving || !testimonialForm.author_name || !testimonialForm.quote}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {testimonialSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Spara
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Testimonials List */}
          {testimonialsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Quote className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Inga omdömen ännu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className={`bg-white rounded-xl border p-6 ${
                    testimonial.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{testimonial.author_name}</span>
                        <span className="text-sm text-gray-500">• {testimonial.author_role}</span>
                        {!testimonial.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                            Dold
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= testimonial.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(testimonial)}
                        className={`p-2 rounded-lg ${
                          testimonial.is_active 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={testimonial.is_active ? 'Dölj' : 'Visa'}
                      >
                        {testimonial.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => startEditTestimonial(testimonial)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

