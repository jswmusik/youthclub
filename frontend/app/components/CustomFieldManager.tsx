'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, BarChart3, ChevronUp, ChevronLeft, Eye, Edit, Trash2, X, 
  FileText, List, CheckSquare, ToggleLeft, Settings2
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

interface CustomField {
  id: number;
  name: string;
  help_text: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
  required: boolean;
  is_published: boolean;
  target_roles: string[];
  specific_clubs: number[];
  context?: 'USER_PROFILE' | 'EVENT';
  owner_role?: string;
  club?: number | { id: number };
  municipality?: number | { id: number };
}

interface CustomFieldManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
  showActions?: boolean;
}

function SwipeableCard({ children, onEdit, onDelete, onClick, showActions = true }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showActions) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !showActions) return;
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
    if (!showActions) return;
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

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
    setIsOpen(false);
    setCurrentX(0);
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
      {/* Action buttons (behind the card) */}
      {showActions && (
        <div className="absolute inset-y-0 right-0 flex items-stretch">
          <button
            onClick={handleEditClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-primary)] text-white transition-all active:bg-[var(--brand-primary)]/80"
          >
            <Edit className="w-5 h-5" />
            <span className="text-xs font-medium">Edit</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-red-600 text-white transition-all active:bg-red-700"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">Delete</span>
          </button>
        </div>
      )}

      {/* Swipeable card content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
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
        {/* Swipe hint indicator */}
        {showActions && !isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

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

function FieldCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
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

export default function CustomFieldManager({ basePath, scope }: CustomFieldManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [allFields, setAllFields] = useState<CustomField[]>([]);
  const [allFieldsForAnalytics, setAllFieldsForAnalytics] = useState<CustomField[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchAllFieldsForAnalytics();
    if (scope === 'MUNICIPALITY') {
      fetchClubs();
    }
  }, [scope]);

  useEffect(() => {
    fetchFields();
  }, [searchParams]);

  // Sync search input with URL param
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchInput(urlSearch);
  }, [searchParams]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const urlSearch = searchParams.get('search') || '';
      if (searchInput !== urlSearch) {
        updateUrl('search', searchInput);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs/');
      setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllFieldsForAnalytics = async () => {
    try {
      let allFields: CustomField[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;

      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());

        const res: any = await api.get(`/custom-fields/?${params.toString()}`);
        const responseData: any = res?.data;

        if (!responseData) break;

        let pageFields: CustomField[] = [];

        if (Array.isArray(responseData)) {
          pageFields = responseData;
          allFields = [...allFields, ...pageFields];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageFields = responseData.results;
          allFields = [...allFields, ...pageFields];

          if (page === 1) {
            setTotalCount(responseData.count || pageFields.length);
          }

          if (!responseData.next || pageFields.length === 0) break;
        } else {
          break;
        }

        page++;
      }

      setAllFieldsForAnalytics(allFields);
    } catch (err) {
      console.error('Failed to fetch all fields for analytics:', err);
    }
  };

  const fetchFields = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Get filters from URL
      const search = searchParams.get('search') || '';
      const fieldType = searchParams.get('field_type') || '';
      const context = searchParams.get('context') || '';
      const targetRole = searchParams.get('target_role') || '';
      const status = searchParams.get('status') || '';

      // Fetch ALL fields (backend doesn't support filtering, so we need all data for client-side filtering)
      let allFields: CustomField[] = [];
      let page = 1;
      const fetchPageSize = 100;
      const maxPages = 100;

      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', fetchPageSize.toString());

        const res: any = await api.get(`/custom-fields/?${params.toString()}`);
        const responseData: any = res?.data;

        if (!responseData) break;

        let pageFields: CustomField[] = [];

        if (Array.isArray(responseData)) {
          pageFields = responseData;
          allFields = [...allFields, ...pageFields];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageFields = responseData.results;
          allFields = [...allFields, ...pageFields];

          if (!responseData.next || pageFields.length === 0) break;
        } else {
          break;
        }

        page++;
      }

      // Apply ALL filters client-side (backend doesn't support these filters)
      let filteredFields = allFields;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredFields = filteredFields.filter(f => 
          f.name.toLowerCase().includes(searchLower) ||
          (f.help_text && f.help_text.toLowerCase().includes(searchLower))
        );
      }

      // Field type filter
      if (fieldType) {
        filteredFields = filteredFields.filter(f => f.field_type === fieldType);
      }

      // Context filter
      if (context) {
        filteredFields = filteredFields.filter(f => {
          const fieldContext = f.context || 'USER_PROFILE';
          return fieldContext === context;
        });
      }

      // Target role filter
      if (targetRole) {
        filteredFields = filteredFields.filter(f => f.target_roles.includes(targetRole));
      }

      // Status filter
      if (status) {
        filteredFields = filteredFields.filter(f => 
          status === 'active' ? f.is_published : !f.is_published
        );
      }

      // Set total count before pagination
      setTotalCount(filteredFields.length);

      // Apply pagination
      const currentPage = Number(searchParams.get('page')) || 1;
      const pageSize = 10;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedFields = filteredFields.slice(startIndex, endIndex);

      // Ensure minimum loading time for smooth skeleton display
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }

      setAllFields(paginatedFields);
    } catch (err: any) {
      console.error('Failed to fetch custom fields:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load custom fields';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setAllFields([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const fieldType = searchParams.get('field_type');
    const context = searchParams.get('context');
    const targetRole = searchParams.get('target_role');
    const status = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (fieldType) params.set('field_type', fieldType);
    if (context) params.set('context', context);
    if (targetRole) params.set('target_role', targetRole);
    if (status) params.set('status', status);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!fieldToDelete) return;
    try {
      await api.delete(`/custom-fields/${fieldToDelete.id}/`);
      setToast({ message: 'Field deleted successfully', type: 'success', isVisible: true });
      fetchFields();
      fetchAllFieldsForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete field', type: 'error', isVisible: true });
    } finally {
      setFieldToDelete(null);
    }
  };

  // Calculate analytics from allFieldsForAnalytics
  const analytics = {
    total_fields: allFieldsForAnalytics.length,
    text_fields: allFieldsForAnalytics.filter(f => f.field_type === 'TEXT').length,
    single_select_fields: allFieldsForAnalytics.filter(f => f.field_type === 'SINGLE_SELECT').length,
    multi_select_fields: allFieldsForAnalytics.filter(f => f.field_type === 'MULTI_SELECT').length,
    boolean_fields: allFieldsForAnalytics.filter(f => f.field_type === 'BOOLEAN').length,
  };

  // Pagination info
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedFields = allFields;

  // Check if field is editable by current user
  const isFieldEditable = (field: CustomField): boolean => {
    if (scope === 'CLUB' && user?.assigned_club) {
      const isOwnedByClubAdmin = field.owner_role === 'CLUB_ADMIN' && 
        (typeof field.club === 'object' ? field.club?.id : field.club) === (typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club);
      return isOwnedByClubAdmin;
    }
    
    if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
      const userMunicipalityId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
      const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
      
      const isOwnedByMunicipalityAdmin = field.owner_role === 'MUNICIPALITY_ADMIN' && 
        fieldMunicipalityId === userMunicipalityId;
      
      let isClubFieldInMunicipality = false;
      if (field.owner_role === 'CLUB_ADMIN' && field.club) {
        const fieldClubId = typeof field.club === 'object' ? field.club.id : field.club;
        const clubInMunicipality = clubs.find(c => c.id === fieldClubId);
        isClubFieldInMunicipality = !!clubInMunicipality;
      }
      
      return isOwnedByMunicipalityAdmin || isClubFieldInMunicipality;
    }
    
    return true; // Super admin can edit all
  };

  const getFieldTypeLabel = (type: string) => {
    return type.replace('_', ' ');
  };

  const getFieldTypeConfig = (type: string) => {
    switch (type) {
      case 'TEXT':
        return { icon: FileText, bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'SINGLE_SELECT':
        return { icon: List, bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
      case 'MULTI_SELECT':
        return { icon: CheckSquare, bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' };
      case 'BOOLEAN':
        return { icon: ToggleLeft, bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
      default:
        return { icon: FileText, bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };

  // Select styling
  const selectClasses = "h-10 w-full rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] px-3 text-sm text-[var(--brand-light)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center shadow-lg">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Custom Fields</h1>
              <p className="text-[var(--brand-light)]/60 text-sm">Manage custom fields and configurations</p>
            </div>
          </div>
          <Link href={`${basePath}/create`}>
            <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Add Field
            </button>
          </Link>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="font-semibold text-[var(--brand-light)]">Analytics Dashboard</span>
            </div>
            <ChevronUp className={`w-5 h-5 text-[var(--brand-light)]/60 transition-transform duration-300 ${analyticsExpanded ? '' : 'rotate-180'}`} />
          </button>
          
          {analyticsExpanded && (
            <div className="px-4 sm:px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Total Fields */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                      <Settings2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs text-[var(--brand-light)]/60 font-medium">Total Fields</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{analytics.total_fields}</div>
                </div>

                {/* Text Fields */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-blue-500/30 hover:border-blue-500/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs text-[var(--brand-light)]/60 font-medium">Text Fields</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{analytics.text_fields}</div>
                </div>

                {/* Single Select */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-green-500/30 hover:border-green-500/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <List className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-xs text-[var(--brand-light)]/60 font-medium">Single Select</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{analytics.single_select_fields}</div>
                </div>

                {/* Multi Select */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-pink-500/30 hover:border-pink-500/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-pink-400" />
                    </div>
                    <span className="text-xs text-[var(--brand-light)]/60 font-medium">Multi Select</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{analytics.multi_select_fields}</div>
                </div>

                {/* Boolean Fields */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/50 transition-all col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <ToggleLeft className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-[var(--brand-light)]/60 font-medium">Boolean Fields</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{analytics.boolean_fields}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Field Type */}
            <select
              value={searchParams.get('field_type') || ''}
              onChange={e => updateUrl('field_type', e.target.value)}
              className={selectClasses}
            >
              <option value="">All Types</option>
              <option value="TEXT">Text</option>
              <option value="SINGLE_SELECT">Single Select</option>
              <option value="MULTI_SELECT">Multi Select</option>
              <option value="BOOLEAN">Boolean</option>
            </select>

            {/* Target Role */}
            <select
              value={searchParams.get('target_role') || ''}
              onChange={e => updateUrl('target_role', e.target.value)}
              className={selectClasses}
            >
              <option value="">All Roles</option>
              <option value="YOUTH_MEMBER">Youth</option>
              <option value="GUARDIAN">Guardian</option>
            </select>

            {/* Status */}
            <select
              value={searchParams.get('status') || ''}
              onChange={e => updateUrl('status', e.target.value)}
              className={selectClasses}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Clear */}
            <button
              onClick={() => router.push(pathname)}
              className="h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/60">
            Showing <span className="text-[var(--brand-light)] font-medium">{paginatedFields.length}</span> of{' '}
            <span className="text-[var(--brand-light)] font-medium">{totalCount}</span> fields
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <>
            {/* Mobile Skeletons */}
            <div className="flex flex-col gap-3 md:hidden -mx-4 sm:-mx-6">
              {[...Array(5)].map((_, i) => (
                <FieldCardSkeleton key={i} />
              ))}
            </div>
            {/* Desktop Skeletons */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-700)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Field</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Roles</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <FieldTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : paginatedFields.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] p-12 sm:p-20 text-center -mx-4 sm:mx-0">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <Settings2 className="w-8 h-8 text-[var(--brand-light)]/40" />
            </div>
            <p className="text-[var(--brand-light)]/60 text-lg">No custom fields found</p>
            <p className="text-[var(--brand-light)]/40 text-sm mt-1">Try adjusting your filters or create a new field</p>
          </div>
        ) : (
          <>
            {/* MOBILE: Swipeable Cards */}
            <div className="flex flex-col gap-3 md:hidden -mx-4 sm:-mx-6">
              {paginatedFields.map(field => {
                const isEditable = isFieldEditable(field);
                const typeConfig = getFieldTypeConfig(field.field_type);
                const TypeIcon = typeConfig.icon;

                return (
                  <SwipeableCard
                    key={field.id}
                    onClick={() => router.push(buildUrlWithParams(`${basePath}/${field.id}`))}
                    onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${field.id}`))}
                    onDelete={() => setFieldToDelete(field)}
                    showActions={isEditable}
                  >
                    <div className={`p-4 border-y border-[var(--dark-600)] ${!isEditable ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className={`w-5 h-5 ${typeConfig.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[var(--brand-light)] truncate">{field.name}</h3>
                            {!isEditable && (
                              <span className="text-xs text-[var(--brand-light)]/40">(Read-only)</span>
                            )}
                          </div>
                          {field.help_text && (
                            <p className="text-sm text-[var(--brand-light)]/60 truncate mt-0.5">{field.help_text}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
                              {getFieldTypeLabel(field.field_type)}
                            </span>
                            {field.target_roles.map(r => (
                              <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--dark-600)] text-[var(--brand-light)]/70">
                                {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                              </span>
                            ))}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              field.is_published 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {field.is_published ? 'Active' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                );
              })}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-700)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Field</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Roles</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFields.map(field => {
                    const isEditable = isFieldEditable(field);
                    const typeConfig = getFieldTypeConfig(field.field_type);
                    const TypeIcon = typeConfig.icon;

                    return (
                      <tr 
                        key={field.id} 
                        className={`border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/50 transition-colors ${!isEditable ? 'opacity-60' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                              <TypeIcon className={`w-5 h-5 ${typeConfig.text}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--brand-light)]">{field.name}</span>
                                {!isEditable && (
                                  <span className="text-xs text-[var(--brand-light)]/40">(Read-only)</span>
                                )}
                              </div>
                              {field.help_text && (
                                <p className="text-sm text-[var(--brand-light)]/60 truncate max-w-md">{field.help_text}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
                            {getFieldTypeLabel(field.field_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {field.target_roles.map(r => (
                              <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--dark-600)] text-[var(--brand-light)]/70">
                                {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            field.is_published 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {field.is_published ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isEditable ? (
                            <div className="flex items-center justify-end gap-1">
                              <Link href={buildUrlWithParams(`${basePath}/${field.id}`)}>
                                <button className="p-2 rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </Link>
                              <Link href={buildUrlWithParams(`${basePath}/edit/${field.id}`)}>
                                <button className="p-2 rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-all">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </Link>
                              <button 
                                onClick={() => setFieldToDelete(field)}
                                className="p-2 rounded-lg text-[var(--brand-light)]/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--brand-light)]/40 italic">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] transition-all text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--brand-light)]/60">
                  Page <span className="text-[var(--brand-light)] font-medium">{currentPage}</span> of{' '}
                  <span className="text-[var(--brand-light)] font-medium">{totalPages}</span>
                </span>
                <button
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] transition-all text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteConfirmationModal 
        isVisible={!!fieldToDelete}
        onClose={() => setFieldToDelete(null)}
        onConfirm={handleDelete}
        itemName={fieldToDelete?.name || 'this field'}
        message="Deleting this field will remove all data users have entered for it. This cannot be undone."
        darkMode={true}
      />
      
      {/* Toast */}
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode={true} />
    </div>
  );
}
