'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Plus, Pencil, Trash2, ExternalLink, ArrowLeft,
  Loader2, Search, Building2, Image as ImageIcon, X,
  BarChart3, ChevronUp, ChevronDown, Eye, EyeOff, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import api from '@/lib/api';
import { useToast } from '../../../../../hooks/useToast';
import LanguageSelector, { LanguageBadge, type LanguageCode } from '../../../components/LanguageSelector';

interface Customer {
  id: number;
  name: string;
  logo: string;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  language: string | null;
  created_at: string;
  updated_at: string;
}

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

function CustomerCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function CustomerTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// Swipeable Card Component for mobile
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeableCard({ children, onEdit, onDelete }: SwipeableCardProps) {
  const t = useTranslations('marketingAdmin.customers');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = () => {
    if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); setCurrentX(0); }}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
        >
          <Pencil className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.edit')}</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); setCurrentX(0); }}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.delete')}</span>
        </button>
      </div>

      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {!isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const t = useTranslations('marketingAdmin.customers');
  const { success: showSuccess, error: showError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | LanguageCode>('all');
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formLogo, setFormLogo] = useState<File | null>(null);
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);
  const [formLanguage, setFormLanguage] = useState<LanguageCode | null>(null);

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const res = await api.get('/marketing/customers/');
      setCustomers(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      showError(t('toast.fetchError'));
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
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
    setFormLanguage(null); // null = all languages
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
    setFormLanguage(customer.language as LanguageCode | null);
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
      showError(t('toast.nameRequired'));
      return;
    }
    
    if (!editingCustomer && !formLogo) {
      showError(t('toast.logoRequired'));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('website_url', formWebsite || '');
      formData.append('is_active', formIsActive.toString());
      formData.append('display_order', formDisplayOrder.toString());
      
      // Language can be null (for all languages) or a specific language code
      if (formLanguage) {
        formData.append('language', formLanguage);
      } else {
        formData.append('language', ''); // Empty string for null
      }
      
      if (formLogo) {
        formData.append('logo', formLogo);
      }

      if (editingCustomer) {
        await api.patch(`/marketing/customers/${editingCustomer.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess(t('toast.customerUpdated'));
      } else {
        await api.post('/marketing/customers/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showSuccess(t('toast.customerCreated'));
      }

      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      console.error('Save error:', err);
      showError(err.response?.data?.detail || t('toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Delete customer
  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      await api.delete(`/marketing/customers/${customerToDelete.id}/`);
      showSuccess(t('toast.customerDeleted'));
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      showError(t('toast.deleteError'));
      setCustomerToDelete(null);
    }
  };

  // Toggle active status
  const toggleActive = async (customer: Customer) => {
    try {
      await api.patch(`/marketing/customers/${customer.id}/`, { 
        is_active: !customer.is_active 
      });
      fetchCustomers();
    } catch (err) {
      showError(t('toast.updateError'));
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && c.is_active) || 
      (statusFilter === 'inactive' && !c.is_active);
    const matchesLanguage = languageFilter === 'all' || 
      c.language === languageFilter || 
      (languageFilter === 'all' && c.language === null);
    return matchesSearch && matchesStatus && matchesLanguage;
  });

  // Analytics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const inactiveCustomers = customers.filter(c => !c.is_active).length;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Toast */}

        {/* Navigation Header */}
        <div className="flex items-center gap-4 px-4 sm:px-0 mb-6">
          <Link 
            href="/admin/super/marketing"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {!showSkeleton && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <button 
              onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
              </div>
              {analyticsExpanded ? (
                <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
              )}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-3 gap-3 sm:gap-4">
                {/* Total */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{totalCustomers}</div>
                </div>

                {/* Active */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                      <Eye className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.active')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{activeCustomers}</div>
                </div>

                {/* Inactive */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-red)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)] flex items-center justify-center">
                      <EyeOff className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.inactive')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{inactiveCustomers}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
          {/* Search */}
          <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder={t('search.placeholder')}
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 text-[var(--brand-light)] outline-none appearance-none cursor-pointer hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-colors"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1rem',
              paddingRight: '2.5rem'
            }}
          >
            <option value="all">{t('filter.all')}</option>
            <option value="active">{t('filter.active')}</option>
            <option value="inactive">{t('filter.inactive')}</option>
          </select>

          {/* Add Button */}
          <button
            onClick={openNewModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('buttons.addCustomer')}</span>
            <span className="sm:hidden">{t('buttons.add')}</span>
          </button>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && filteredCustomers.length > 0 && (
          <div className="px-4 sm:px-0">
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{filteredCustomers.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCustomers}</span> {t('statsBar.customers')}
            </p>
          </div>
        )}

        {/* Customers List */}
        {showSkeleton ? (
          <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col md:hidden">
              {[...Array(4)].map((_, i) => (
                <CustomerCardSkeleton key={i} />
              ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.customer')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.order')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <CustomerTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">
              {searchQuery || statusFilter !== 'all' ? t('emptyState.noResults') : t('emptyState.noCustomers')}
            </h3>
            <p className="text-[var(--brand-light)]/50 text-sm mb-6">
              {searchQuery || statusFilter !== 'all' ? t('emptyState.tryDifferent') : t('emptyState.addFirst')}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={openNewModal}
                className="px-6 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all"
              >
                {t('buttons.addCustomer')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: Swipeable Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredCustomers.map((customer) => (
                <SwipeableCard
                  key={customer.id}
                  onEdit={() => openEditModal(customer)}
                  onDelete={() => setCustomerToDelete(customer)}
                >
                  <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className={`w-16 h-16 rounded-xl bg-[var(--dark-600)] flex items-center justify-center p-2 flex-shrink-0 ${!customer.is_active ? 'opacity-50' : ''}`}>
                        {customer.logo ? (
                          <img
                            src={customer.logo}
                            alt={customer.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-[var(--brand-light)]/20" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold text-[var(--brand-light)] truncate ${!customer.is_active ? 'opacity-50' : ''}`}>
                          {customer.name}
                        </p>
                        {customer.website_url && (
                          <a
                            href={customer.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t('visitWebsite')}
                          </a>
                        )}
                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                          {t('displayOrder')}: {customer.display_order}
                        </p>
                      </div>

                      {/* Language and Status Badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {customer.language ? (
                          <LanguageBadge code={customer.language} size="sm" />
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-[var(--dark-600)] text-[var(--brand-light)]/50 rounded-full">All</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActive(customer); }}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            customer.is_active 
                              ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                              : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                          }`}
                        >
                          {customer.is_active ? t('status.active') : t('status.inactive')}
                        </button>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.customer')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Language</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.order')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      className={`border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors ${!customer.is_active ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] flex items-center justify-center p-2 flex-shrink-0">
                            {customer.logo ? (
                              <img
                                src={customer.logo}
                                alt={customer.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-[var(--brand-light)]/20" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--brand-light)] truncate">{customer.name}</p>
                            {customer.website_url && (
                              <a
                                href={customer.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {t('visitWebsite')}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.language ? (
                          <LanguageBadge code={customer.language} size="sm" />
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-[var(--dark-600)] text-[var(--brand-light)]/50 rounded-full">All languages</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(customer)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            customer.is_active 
                              ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/30' 
                              : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30'
                          }`}
                        >
                          {customer.is_active ? t('status.active') : t('status.inactive')}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]/70">{customer.display_order}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(customer)}
                            className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(customer)}
                            className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[var(--dark-600)] flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--brand-light)]">
                  {editingCustomer ? t('modal.editTitle') : t('modal.createTitle')}
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('modal.logo')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-[var(--dark-500)] rounded-xl p-4 text-center hover:border-[var(--brand-primary)]/50 transition-colors">
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
                          className="absolute top-0 right-0 p-1 bg-[var(--brand-red)] rounded-full text-white hover:bg-[var(--brand-red)]/80 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <ImageIcon className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-2" />
                        <p className="text-sm text-[var(--brand-light)]/60">
                          {t('modal.clickToUpload')}
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
                    {t('modal.logoHint')}
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('modal.name')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t('modal.namePlaceholder')}
                    className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('modal.website')}
                  </label>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder={t('modal.websitePlaceholder')}
                    className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                  />
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('modal.displayOrder')}
                  </label>
                  <input
                    type="number"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                  />
                  <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                    {t('modal.displayOrderHint')}
                  </p>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Language
                  </label>
                  <select
                    value={formLanguage || ''}
                    onChange={(e) => setFormLanguage(e.target.value ? e.target.value as LanguageCode : null)}
                    className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem',
                    }}
                  >
                    <option value="">🌐 All languages</option>
                    <option value="sv">🇸🇪 Svenska</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="da">🇩🇰 Dansk</option>
                    <option value="nb">🇳🇴 Norsk</option>
                    <option value="fi">🇫🇮 Suomi</option>
                    <option value="ar">🇸🇦 العربية</option>
                    <option value="so">🇸🇴 Soomaali</option>
                    <option value="prs">🇦🇫 دری</option>
                  </select>
                  <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                    Choose a specific language or leave as &quot;All&quot; to show on all language versions
                  </p>
                </div>

                {/* Active Toggle */}
                <div 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formIsActive 
                      ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/30' 
                      : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                  }`}
                  onClick={() => setFormIsActive(!formIsActive)}
                >
                  <div className="flex items-center gap-3">
                    {formIsActive ? (
                      <Eye className="w-5 h-5 text-[var(--brand-green)]" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-[var(--brand-light)]/50" />
                    )}
                    <div>
                      <span className="font-semibold text-[var(--brand-light)]">{t('modal.activeLabel')}</span>
                      <p className="text-xs text-[var(--brand-light)]/50">{t('modal.activeHint')}</p>
                    </div>
                  </div>
                  <div className={`relative w-12 h-6 rounded-full transition-colors ${
                    formIsActive ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                  }`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formIsActive ? 'left-7' : 'left-1'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[var(--dark-600)] flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 rounded-xl bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors font-medium"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-12 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('modal.saving')}
                    </>
                  ) : (
                    t('modal.save')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isVisible={customerToDelete !== null}
          onClose={() => setCustomerToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={t('deleteModal.title')}
          message={t('deleteModal.message', { name: customerToDelete?.name || '' })}
          confirmButtonText={t('deleteModal.confirm')}
          cancelButtonText={t('deleteModal.cancel')}
          variant="danger"
          darkMode={true}
        />
      </div>
    </div>
  );
}
