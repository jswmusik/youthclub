'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { learningApi } from '@/lib/learning-api';
import { LearningCategory } from '@/types/learning';
import { 
  ArrowLeft, Plus, Trash2, FolderOpen, BarChart3, ChevronUp, ChevronDown,
  BookOpen
} from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../../hooks/useToast';

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
      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-9 w-9 rounded-xl ml-auto" /></td>
    </tr>
  );
}

export default function KnowledgeCategoriesPage() {
  const t = useTranslations('knowledgeAdmin.categories');
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const { success, error, info, warning } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const res = await learningApi.getCategories();
      const data = Array.isArray(res.data) ? res.data : ((res.data as any).results || []);
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
      setCategories([]);
      error(t('toast.failedToLoad'));
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
    if (!newName.trim()) return;
    
    try {
      await learningApi.createCategory(newName);
      setNewName('');
      success(t('toast.categoryCreated'));
      loadCategories();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || t('toast.failedToCreate');
      error(errorMsg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await learningApi.deleteCategory(categoryToDelete);
      success(t('toast.categoryDeleted'));
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || t('toast.failedToDelete');
      error(errorMsg);
      setCategoryToDelete(null);
    }
  };

  // Calculate categories with courses (assuming course_count field exists)
  const categoriesWithCourses = categories.filter(c => (c as any).course_count > 0).length;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4 px-4 sm:px-0 mb-6">
          <Link 
            href="/admin/super/knowledge/courses"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-[var(--dark-900)]" />
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
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
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
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{categories.length}</div>
                </div>

                {/* With Courses */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.withCourses')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-purple)]">
                    {categoriesWithCourses}
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
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('createForm.title')}</h2>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-0 w-full">
                <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2 block">
                  {t('createForm.categoryName')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={t('createForm.categoryNamePlaceholder')}
                  className="w-full h-12 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto h-12 px-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20"
              >
                <Plus className="h-4 w-4" />
                {t('createForm.addCategory')}
              </button>
            </form>
          </div>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && categories.length > 0 && (
          <div className="px-4 sm:px-0">
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{categories.length}</span> {categories.length === 1 ? t('statsBar.category') : t('statsBar.categories')}
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
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.name')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.courses')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
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
              <FolderOpen className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noCategoriesYet')}</h3>
            <p className="text-[var(--brand-light)]/50 text-sm">{t('emptyState.createFirstCategory')}</p>
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
                      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-6 h-6 text-[var(--dark-900)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[var(--brand-light)] truncate">{cat.name}</p>
                        <p className="text-sm text-[var(--brand-light)]/50">
                          {(cat as any).course_count || 0} {t('tableHeaders.courses').toLowerCase()}
                        </p>
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
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.name')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.courses')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-[var(--dark-900)]" />
                          </div>
                          <span className="text-sm font-semibold text-[var(--brand-light)]">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]/70">{(cat as any).course_count || 0}</span>
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
          title={t('modals.deleteCategory.title')}
          message={t('modals.deleteCategory.message', { name: categories.find(c => c.id === categoryToDelete)?.name || '' })}
          confirmButtonText={t('modals.deleteCategory.confirm')}
          cancelButtonText={t('modals.deleteCategory.cancel')}
          variant="danger"
          darkMode={true}
        />

        {/* Toast Notification */}
      </div>
    </div>
  );
}
