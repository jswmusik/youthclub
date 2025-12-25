'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inventoryApi, ItemCategory } from '@/lib/inventory-api';
import { 
  ArrowLeft, Plus, Trash2, Layers, BarChart3, ChevronUp, ChevronDown,
  Package, Sparkles
} from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
}

function SwipeableCard({ children, onDelete }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    setCurrentX(Math.max(0, Math.min(diff, 80)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentX > 40) {
      setIsOpen(true);
      setCurrentX(80);
    } else {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const closeSwipe = () => {
    setIsOpen(false);
    setCurrentX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete Action */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 bg-[var(--brand-red)] flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          closeSwipe();
        }}
      >
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      
      {/* Main Content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${isOpen ? 80 : currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => isOpen && closeSwipe()}
      >
        {children}
      </div>
    </div>
  );
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

function CategoryCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    </div>
  );
}

function CategoryTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-9 w-9 rounded-xl ml-auto" /></td>
    </tr>
  );
}

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  useEffect(() => {
    loadCats();
  }, []);

  const loadCats = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const data = await inventoryApi.getCategories();
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load categories", err);
      setCategories([]);
      setToast({ message: 'Failed to load categories', type: 'error', isVisible: true });
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createCategory({ name: newName, icon: newIcon });
      setNewName('');
      setNewIcon('');
      setToast({ message: 'Category created successfully', type: 'success', isVisible: true });
      loadCats();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to create category';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await inventoryApi.deleteCategory(categoryToDelete);
      setToast({ message: 'Category deleted successfully', type: 'success', isVisible: true });
      setCategoryToDelete(null);
      loadCats();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to delete category';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4 px-4 sm:px-0 mb-6">
          <Link 
            href="/admin/super/inventory"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Item Categories</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Define broad categories like 'Gaming', 'Sports'.</p>
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
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</h3>
              </div>
              {analyticsExpanded ? (
                <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
              )}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                
                {/* Total Categories */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                      <Layers className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{categories.length}</div>
                </div>

                {/* With Icons */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-peach)] flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">With Icons</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-purple)]">
                    {categories.filter(c => c.icon).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Form */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Create New Category</h2>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-0 w-full">
                <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2 block">
                  Category Name <span className="text-[var(--brand-red)]">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Board Games"
                  className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                  required
                />
              </div>
              <div className="w-full sm:w-24">
                <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2 block">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={newIcon}
                  onChange={e => setNewIcon(e.target.value)}
                  placeholder="🎲"
                  className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors text-center text-xl"
                  maxLength={2}
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto h-12 px-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </form>
          </div>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && categories.length > 0 && (
          <div className="px-4 sm:px-0">
            <p className="text-sm text-[var(--brand-light)]/50">
              Showing <span className="text-[var(--brand-primary)] font-semibold">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
        )}

        {/* Categories List */}
        {showSkeleton ? (
          <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col md:hidden">
              {[...Array(4)].map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70 w-20">Icon</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Name</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <CategoryTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : categories.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No categories yet</h3>
            <p className="text-[var(--brand-light)]/50 text-sm">Create your first category above.</p>
          </div>
        ) : (
          <>
            {/* Mobile: Swipeable Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {categories.map(cat => (
                <SwipeableCard
                  key={cat.id}
                  onDelete={() => setCategoryToDelete(cat.id)}
                >
                  <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] flex items-center justify-center text-2xl flex-shrink-0">
                        {cat.icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[var(--brand-light)] truncate">{cat.name}</p>
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
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70 w-20">Icon</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Name</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center text-xl">
                          {cat.icon || '📦'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-[var(--brand-light)]">{cat.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setCategoryToDelete(cat.id)}
                          className="w-9 h-9 rounded-xl bg-[var(--brand-red)]/10 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-colors inline-flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isVisible={categoryToDelete !== null}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Category"
          message={`Are you sure you want to delete "${categories.find(c => c.id === categoryToDelete)?.name}"? This action cannot be undone.`}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          variant="danger"
          darkMode={true}
        />

        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast({ ...toast, isVisible: false })}
          darkMode
        />
      </div>
    </div>
  );
}
