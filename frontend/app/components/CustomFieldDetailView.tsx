'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, FileText, Tag, Users, Building, ShieldCheck, 
  CheckCircle2, XCircle, AlertCircle, List, ToggleLeft, CheckSquare,
  Eye, EyeOff, Calendar, Info
} from 'lucide-react';
import api from '../../lib/api';

interface CustomFieldDetailProps {
  fieldId: string;
  basePath: string;
}

export default function CustomFieldDetailView({ fieldId, basePath }: CustomFieldDetailProps) {
  const t = useTranslations('customFields.detail');
  const searchParams = useSearchParams();
  const [field, setField] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (fieldId) {
        try {
          const [fieldRes, clubsRes] = await Promise.all([
            api.get(`/custom-fields/${fieldId}/`),
            api.get('/clubs/?page_size=1000').catch(() => ({ data: [] }))
          ]);
          setField(fieldRes.data);
          setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : clubsRes.data.results || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [fieldId]);

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

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'TEXT': return t('labels.text');
      case 'SINGLE_SELECT': return t('labels.singleSelect');
      case 'MULTI_SELECT': return t('labels.multiSelect');
      case 'BOOLEAN': return t('labels.boolean');
      default: return type.replace('_', ' ');
    }
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
        return { icon: Tag, bg: 'bg-[var(--dark-600)]', text: 'text-[var(--brand-light)]/60', border: 'border-[var(--dark-500)]' };
    }
  };

  // Resolve club names
  const getClubNames = () => {
    if (!field?.specific_clubs || field.specific_clubs.length === 0) return [];
    return field.specific_clubs.map((club: any) => {
      const clubId = typeof club === 'object' ? club.id : club;
      const clubData = clubs.find(c => c.id === clubId);
      return clubData?.name || (typeof club === 'object' ? club.name : club);
    });
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
  
  if (!field) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <Tag className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">{t('notFound')}</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            {t('returnToList')}
          </Link>
        </div>
      </div>
    );
  }

  const clubNames = getClubNames();
  const typeConfig = getFieldTypeConfig(field.field_type);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <Link 
            href={buildUrlWithParams(basePath)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> {t('backToList')}
          </Link>
          <Link href={buildUrlWithParams(`${basePath}/edit/${field.id}`)}>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-medium transition-all">
              <Edit className="h-4 w-4" />
              {t('editField')}
            </button>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Type Icon */}
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0 border ${typeConfig.border}`}>
                <TypeIcon className={`w-10 h-10 sm:w-12 sm:h-12 ${typeConfig.text}`} />
              </div>
              
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] break-words">
                    {field.name}
                  </h1>
                  {field.help_text && (
                    <p className="text-[var(--brand-light)]/60 mt-2 break-words">{field.help_text}</p>
                  )}
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    field.is_published 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]'
                  }`}>
                    {field.is_published ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {field.is_published ? t('labels.active') : t('labels.inactive')}
                  </span>
                  {field.required && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      <AlertCircle className="h-3 w-3" />
                      {t('labels.required')}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text} border ${typeConfig.border}`}>
                    <TypeIcon className="h-3 w-3" />
                    {getFieldTypeLabel(field.field_type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-700)] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${typeConfig.bg} flex items-center justify-center`}>
                <TypeIcon className={`w-5 h-5 ${typeConfig.text}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('labels.type')}</p>
                <p className={`text-sm font-semibold ${typeConfig.text}`}>{getFieldTypeLabel(field.field_type)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-700)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('labels.context')}</p>
                <p className="text-sm font-semibold text-purple-400">
                  {field.context === 'EVENT' ? t('labels.event') : t('labels.profile')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-700)] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${field.is_published ? 'bg-green-500/20' : 'bg-[var(--dark-600)]'} flex items-center justify-center`}>
                {field.is_published ? (
                  <Eye className="w-5 h-5 text-green-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-[var(--brand-light)]/40" />
                )}
              </div>
              <div>
                <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('labels.status')}</p>
                <p className={`text-sm font-semibold ${field.is_published ? 'text-green-400' : 'text-[var(--brand-light)]/60'}`}>
                  {field.is_published ? t('labels.active') : t('labels.inactive')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-700)] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${field.required ? 'bg-red-500/20' : 'bg-[var(--dark-600)]'} flex items-center justify-center`}>
                <AlertCircle className={`w-5 h-5 ${field.required ? 'text-red-400' : 'text-[var(--brand-light)]/40'}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('labels.required')}</p>
                <p className={`text-sm font-semibold ${field.required ? 'text-red-400' : 'text-[var(--brand-light)]/60'}`}>
                  {field.required ? t('labels.yes') : t('labels.no')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mx-4 sm:mx-0">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Field Details */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">{t('fieldDetails')}</h2>
                    <p className="text-sm text-[var(--brand-light)]/60">{t('configInfo')}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <TypeIcon className={`w-5 h-5 ${typeConfig.text}`} />
                      <div>
                        <p className="text-xs text-[var(--brand-light)]/50 font-medium uppercase">{t('labels.fieldType')}</p>
                        <p className="text-[var(--brand-light)] font-medium">{getFieldTypeLabel(field.field_type)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-xs text-[var(--brand-light)]/50 font-medium uppercase">{t('labels.context')}</p>
                        <p className="text-[var(--brand-light)] font-medium">
                          {field.context === 'EVENT' ? t('labels.eventBooking') : t('labels.userProfile')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl">
                    <div className="flex items-center gap-3">
                      {field.is_published ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[var(--brand-light)]/40" />
                      )}
                      <div>
                        <p className="text-xs text-[var(--brand-light)]/50 font-medium uppercase">{t('labels.status')}</p>
                        <p className={`font-medium ${field.is_published ? 'text-green-400' : 'text-[var(--brand-light)]/60'}`}>
                          {field.is_published ? t('labels.active') : t('labels.inactive')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 ${field.required ? 'text-red-400' : 'text-[var(--brand-light)]/40'}`} />
                      <div>
                        <p className="text-xs text-[var(--brand-light)]/50 font-medium uppercase">{t('labels.required')}</p>
                        <p className={`font-medium ${field.required ? 'text-red-400' : 'text-[var(--brand-light)]/60'}`}>
                          {field.required ? t('labels.yes') : t('labels.no')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Options Section */}
            {(field.field_type === 'SINGLE_SELECT' || field.field_type === 'MULTI_SELECT') && field.options && field.options.length > 0 && (
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <List className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--brand-light)]">{t('availableOptions')}</h2>
                      <p className="text-sm text-[var(--brand-light)]/60">
                        {field.options.length === 1 ? t('optionCount', { count: field.options.length }) : t('optionCountPlural', { count: field.options.length })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm font-medium border border-[var(--brand-primary)]/30"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Limited to Clubs Section */}
            {clubNames.length > 0 && (
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Building className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--brand-light)]">{t('limitedToClubs')}</h2>
                      <p className="text-sm text-[var(--brand-light)]/60">
                        {clubNames.length === 1 ? t('clubCount', { count: clubNames.length }) : t('clubCountPlural', { count: clubNames.length })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {clubNames.map((name: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/30"
                      >
                        <Building className="h-3 w-3" />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 px-4 sm:px-0">
            
            {/* Target Roles Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">{t('targetRoles')}</h2>
                    <p className="text-sm text-[var(--brand-light)]/60">{t('whoSeesField')}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {field.target_roles && field.target_roles.length > 0 ? (
                  <div className="space-y-2">
                    {field.target_roles.map((role: string) => (
                      <div 
                        key={role} 
                        className="flex items-center gap-3 p-3 bg-[var(--dark-700)] rounded-xl"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <Users className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-[var(--brand-light)] font-medium">
                          {role === 'YOUTH_MEMBER' ? t('labels.youthMembers') : t('labels.guardians')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--brand-light)]/40 italic">{t('noTargetRoles')}</p>
                )}
              </div>
            </div>

            {/* Owner Info Card */}
            {field.owner_role && (
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--brand-light)]">{t('owner')}</h2>
                      <p className="text-sm text-[var(--brand-light)]/60">{t('fieldCreator')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[var(--brand-light)] font-semibold">
                          {field.owner_role === 'SUPER_ADMIN' ? t('labels.superAdmin') : 
                           field.owner_role === 'MUNICIPALITY_ADMIN' ? t('labels.municipalityAdmin') : 
                           t('labels.clubAdmin')}
                        </p>
                        <p className="text-xs text-[var(--brand-light)]/50">{t('administrator')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Created Date (if available) */}
            {field.created_at && (
              <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-700)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[var(--brand-light)]/60" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--brand-light)]">{t('created')}</h2>
                      <p className="text-sm text-[var(--brand-light)]/60">
                        {new Date(field.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
