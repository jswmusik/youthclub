'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, ExternalLink,
  Loader2, Search, Building2, Image as ImageIcon, X
} from 'lucide-react';
import Toast, { ToastState, initialToastState, showToast } from '@/app/components/Toast';
import api from '@/lib/api';

interface Customer {
  id: number;
  name: string;
  logo: string;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function CustomersPage() {
  const [toast, setToast] = useState<ToastState>(initialToastState);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formLogo, setFormLogo] = useState<File | null>(null);
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/marketing/customers/');
      setCustomers(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      showToast(setToast, 'Kunde inte hämta kunder', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Open modal for new customer
  const openNewModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormWebsite('');
    setFormIsActive(true);
    setFormDisplayOrder(customers.length);
    setFormLogo(null);
    setFormLogoPreview(null);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormWebsite(customer.website_url || '');
    setFormIsActive(customer.is_active);
    setFormDisplayOrder(customer.display_order);
    setFormLogo(null);
    setFormLogoPreview(customer.logo);
    setShowModal(true);
  };

  // Handle logo file change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save customer
  const handleSave = async () => {
    if (!formName.trim()) {
      showToast(setToast, 'Namn krävs', 'error');
      return;
    }
    
    if (!editingCustomer && !formLogo) {
      showToast(setToast, 'Logotyp krävs för nya kunder', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('website_url', formWebsite || '');
      formData.append('is_active', formIsActive.toString());
      formData.append('display_order', formDisplayOrder.toString());
      
      if (formLogo) {
        formData.append('logo', formLogo);
      }

      if (editingCustomer) {
        await api.patch(`/marketing/customers/${editingCustomer.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/marketing/customers/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      showToast(setToast, editingCustomer ? 'Kund uppdaterad' : 'Ny kund skapad', 'success');
      setShowModal(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Save error:', error);
      showToast(setToast, error.response?.data?.detail || 'Kunde inte spara', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete customer
  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Är du säker på att du vill ta bort "${customer.name}"?`)) return;

    try {
      await api.delete(`/marketing/customers/${customer.id}/`);
      showToast(setToast, 'Kund har tagits bort', 'success');
      fetchCustomers();
    } catch (error) {
      showToast(setToast, 'Kunde inte ta bort', 'error');
    }
  };

  // Toggle active status
  const toggleActive = async (customer: Customer) => {
    try {
      await api.patch(`/marketing/customers/${customer.id}/`, { 
        is_active: !customer.is_active 
      });
      fetchCustomers();
    } catch (error) {
      showToast(setToast, 'Kunde inte uppdatera', 'error');
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(initialToastState)}
        darkMode={true}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-light)]">Kunder & Partners</h1>
          <p className="text-[var(--brand-light)]/60 mt-1">
            Hantera kundlogotyper som visas på startsidan
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Lägg till kund
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sök kunder..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--dark-800)] border border-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-700)]">
          <Building2 className="w-16 h-16 mx-auto text-[var(--brand-light)]/20 mb-4" />
          <h3 className="text-xl font-semibold text-[var(--brand-light)] mb-2">
            {searchQuery ? 'Inga kunder hittades' : 'Inga kunder ännu'}
          </h3>
          <p className="text-[var(--brand-light)]/60 mb-6">
            {searchQuery ? 'Prova att ändra din sökning' : 'Lägg till din första kund för att visa på startsidan'}
          </p>
          {!searchQuery && (
            <button
              onClick={openNewModal}
              className="px-6 py-3 bg-[var(--dark-700)] text-[var(--brand-light)] rounded-xl hover:bg-[var(--dark-600)] transition-colors"
            >
              Lägg till kund
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className={`bg-[var(--dark-800)] rounded-xl border ${
                customer.is_active 
                  ? 'border-[var(--dark-700)]' 
                  : 'border-[var(--dark-700)]/50 opacity-60'
              } overflow-hidden group`}
            >
              {/* Logo Preview */}
              <div className="relative h-32 bg-[var(--dark-700)] flex items-center justify-center p-4">
                {customer.logo ? (
                  <img
                    src={customer.logo}
                    alt={customer.name}
                    className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-[var(--brand-light)]/20" />
                )}
                
                {/* Active Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                  customer.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-[var(--brand-light)] truncate">
                  {customer.name}
                </h3>
                {customer.website_url && (
                  <a
                    href={customer.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Besök webbplats
                  </a>
                )}
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                  Ordning: {customer.display_order}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => toggleActive(customer)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    customer.is_active
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {customer.is_active ? 'Inaktivera' : 'Aktivera'}
                </button>
                <button
                  onClick={() => openEditModal(customer)}
                  className="p-2 rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(customer)}
                  className="p-2 rounded-lg bg-[var(--dark-700)] text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-700)] w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--dark-700)]">
              <h2 className="text-xl font-bold text-[var(--brand-light)]">
                {editingCustomer ? 'Redigera kund' : 'Lägg till kund'}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  Logotyp *
                </label>
                <div className="relative border-2 border-dashed border-[var(--dark-600)] rounded-xl p-4 text-center">
                  {formLogoPreview ? (
                    <div className="relative">
                      <img
                        src={formLogoPreview}
                        alt="Preview"
                        className="max-h-32 mx-auto object-contain"
                      />
                      <button
                        onClick={() => {
                          setFormLogo(null);
                          setFormLogoPreview(editingCustomer?.logo || null);
                        }}
                        className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <ImageIcon className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-2" />
                      <p className="text-sm text-[var(--brand-light)]/60">
                        Klicka för att ladda upp logotyp
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                  Rekommenderat: PNG med transparent bakgrund
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  Namn *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Företagsnamn"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  Webbplats (valfritt)
                </label>
                <input
                  type="url"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  Visningsordning
                </label>
                <input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                  Lägre nummer visas först
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--brand-light)]/70">
                  Aktiv (visas på startsidan)
                </label>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formIsActive ? 'bg-[var(--brand-primary)]' : 'bg-[var(--dark-600)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formIsActive ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--dark-700)] flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
