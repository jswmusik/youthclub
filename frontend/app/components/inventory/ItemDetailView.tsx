'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { inventoryApi, Item } from '@/lib/inventory-api';
import { getMediaUrl } from '@/app/utils';
import { 
  Package, Clock, Users, Calendar, Tag, ArrowLeft, Edit, History,
  AlertCircle, CheckCircle2, User, Building2, ChevronRight, FileText,
  Timer, Info, Eye, EyeOff
} from 'lucide-react';

interface ItemDetailViewProps {
  itemId: string;
  basePath: string;
}

export default function ItemDetailView({ itemId, basePath }: ItemDetailViewProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('inventoryAdmin.detail');
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getItem(itemId)
      .then(data => {
        setItem(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [itemId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const club = searchParams.get('club');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (club) params.set('club', club);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getStatusBadgeClasses = (status: string) => {
    switch(status) {
      case 'AVAILABLE':
        return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'BORROWED':
        return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'MAINTENANCE':
        return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      case 'MISSING':
        return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
      case 'HIDDEN':
        return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
      default:
        return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'AVAILABLE':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'BORROWED':
        return <User className="w-4 h-4" />;
      case 'MAINTENANCE':
        return <AlertCircle className="w-4 h-4" />;
      case 'MISSING':
        return <AlertCircle className="w-4 h-4" />;
      case 'HIDDEN':
        return <EyeOff className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return t('statusLabels.available');
      case 'BORROWED': return t('statusLabels.borrowed');
      case 'MAINTENANCE': return t('statusLabels.maintenance');
      case 'MISSING': return t('statusLabels.missing');
      case 'HIDDEN': return t('statusLabels.hidden');
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">{t('itemNotFound')}</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            {t('returnToInventory')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 sm:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToInventory')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link 
            href={`${basePath}/view/${item.id}/history?${searchParams.toString()}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('history')}</span>
          </Link>
          <Link 
            href={`${basePath}/edit/${item.id}?${searchParams.toString()}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Edit className="h-4 w-4" /> {t('edit')}
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner with Background Image */}
        <div 
          className="relative h-36 sm:h-48 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20"
          style={{
            backgroundImage: item.image ? `url(${getMediaUrl(item.image)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay for background images */}
          {item.image && <div className="absolute inset-0 bg-[var(--dark-900)]/50" />}
          
          {/* Decorative elements (only show if no background image) */}
          {!item.image && (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
            </div>
          )}
          
          {/* Status Badge - Top Right */}
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${getStatusBadgeClasses(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="text-sm font-semibold">{getStatusLabel(item.status)}</span>
          </div>

          {/* Club Badge - Top Left */}
          {item.club_name && (
            <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--dark-800)]/80 border border-[var(--dark-500)]">
              <span className="text-sm text-[var(--brand-light)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                {item.club_name}
              </span>
            </div>
          )}
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Item Image/Icon */}
            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.image ? (
                <img 
                  src={getMediaUrl(item.image) || item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Package className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {item.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {item.category_details && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                    <span>{item.category_details.icon}</span> {item.category_details.name}
                  </span>
                )}
                {item.queue_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]">
                    <Users className="w-3 h-3" /> {item.queue_count} {t('inQueue')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-6 px-0 sm:px-0">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-0 sm:space-y-6">
          
          {/* Quick Stats */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('quickStats')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center mx-auto mb-2">
                    <Timer className="w-5 h-5 text-[var(--brand-purple)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{item.max_borrow_duration}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('maxMinutes')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-[var(--brand-blue)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{item.queue_count || 0}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('inQueue')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="text-lg font-bold text-[var(--brand-light)]">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('created')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Card */}
          {item.description && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[var(--brand-purple)]" />
                  {t('description')}
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm sm:text-base text-[var(--brand-light)]/80 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          )}

          {/* Current Loan Card */}
          {item.active_loan && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <User className="h-5 w-5 text-[var(--brand-blue)]" />
                  {t('currentLoan')}
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {/* Borrower */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[var(--brand-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('borrower')}</div>
                    <div className="text-sm text-[var(--brand-light)] font-medium truncate">{item.active_loan.user_name}</div>
                  </div>
                  {item.active_loan.is_guest && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                      {t('guest')}
                    </span>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('dueDate')}</div>
                    <div className="text-sm text-[var(--brand-light)] font-medium">
                      {new Date(item.active_loan.due_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Internal Note Card */}
          {item.internal_note && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Info className="h-5 w-5 text-[var(--brand-peach)]" />
                  {t('internalNote')}
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--brand-light)]/80 whitespace-pre-wrap leading-relaxed">
                  {item.internal_note}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Package className="h-5 w-5 text-[var(--brand-primary)]" />
                {t('details')}
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {/* Max Borrow Duration */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-[var(--brand-purple)]" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('maxDuration')}</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">{item.max_borrow_duration} {t('minutes')}</div>
                </div>
              </div>

              {/* Queue */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-[var(--brand-blue)]" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('queue')}</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {item.queue_count > 0 ? (
                      <span className="text-[var(--brand-peach)]">{item.queue_count} {t('waiting')}</span>
                    ) : (
                      <span className="text-[var(--brand-light)]/50">{t('noQueue')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-[var(--brand-third)]" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('created')}</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          {item.tags_details && item.tags_details.length > 0 && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[var(--brand-peach)]" />
                  {t('tags')}
                </h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {item.tags_details.map(tag => (
                    <span 
                      key={tag.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30"
                    >
                      <span>{tag.icon}</span>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('status')}</h2>
            </div>
            <div className="p-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusBadgeClasses(item.status)}`}>
                {getStatusIcon(item.status)}
                {getStatusLabel(item.status)}
              </div>
              <p className="text-xs text-[var(--brand-light)]/50 mt-3">
                {item.status === 'AVAILABLE' && t('statusDescriptions.available')}
                {item.status === 'BORROWED' && t('statusDescriptions.borrowed')}
                {item.status === 'MAINTENANCE' && t('statusDescriptions.maintenance')}
                {item.status === 'MISSING' && t('statusDescriptions.missing')}
                {item.status === 'HIDDEN' && t('statusDescriptions.hidden')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
