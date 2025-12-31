'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  ArrowLeft, MessageSquare, Edit, Mail, Phone, Calendar as CalendarIcon, 
  User, Users, ShieldCheck, ChevronRight, Clock, FileText, CheckCircle2,
  XCircle, AlertCircle, Eye, Loader2, Trash2
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import QuickMessageModal from './messenger/QuickMessageModal';
import { verifyGuardianRelationship, rejectGuardianRelationship, resetGuardianRelationship } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import ConfirmationModal from './ConfirmationModal';

interface GuardianDetailProps {
  userId: string;
  basePath: string;
}

export default function GuardianDetailView({ userId, basePath }: GuardianDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('guardianDetail');
  const tGenders = useTranslations('youthManager.genders');
  const tStatuses = useTranslations('guardianManager.statuses');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [youthList, setYouthList] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [uRes, yRes] = await Promise.all([
            api.get(`/users/${userId}/`),
            api.get('/users/list_youth/')
        ]);
        setUser(uRes.data);
        setYouthList(Array.isArray(yRes.data) ? yRes.data : []);
        
        if (uRes.data?.role === 'GUARDIAN') {
          try {
            const relRes = await api.get(`/admin/guardian-relationships/?guardian=${userId}`);
            const relData = relRes.data.results || relRes.data || [];
            setRelationships(Array.isArray(relData) ? relData : []);
          } catch (relErr) {
            console.error('Error fetching relationships:', relErr);
          }
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    if (userId) load();
  }, [userId]);

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const handleSendMessage = () => {
    setShowMessageModal(true);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const municipality = searchParams.get('municipality');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (municipality) params.set('municipality', municipality);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'PENDING': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'UNVERIFIED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getStatusLabel = (status: string) => {
    return tStatuses(status as any) || status;
  };

  const getGenderLabel = (gender: string) => {
    if (gender === 'MALE') return tGenders('MALE');
    if (gender === 'FEMALE') return tGenders('FEMALE');
    if (gender === 'OTHER') return tGenders('OTHER');
    return gender;
  };

  const getRelationshipStatusClasses = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'PENDING': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
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

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">{t('userNotFound')}</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            {t('returnToList')}
          </Link>
        </div>
      </div>
    );
  }

  // Build connected youth list from multiple sources
  let connectedYouth: any[] = [];
  
  if (Array.isArray(user.youth_members) && user.youth_members.length > 0) {
    if (typeof user.youth_members[0] === 'object' && user.youth_members[0] !== null && 'first_name' in user.youth_members[0]) {
      connectedYouth = user.youth_members;
    } else {
      const youthFromIds = user.youth_members
        .map((id: number) => {
          const youth = youthList.find((y: any) => y.id === id);
          if (youth) {
            const relationship = relationships.find((r: any) => r.guardian === parseInt(userId) && r.youth === id);
            return {
              ...youth,
              relationship_id: relationship?.id,
              relationship_type: relationship?.relationship_type || 'GUARDIAN',
              status: relationship?.status || 'PENDING',
              is_primary_guardian: relationship?.is_primary_guardian || false,
            };
          }
          return null;
        })
        .filter(Boolean);
      connectedYouth = youthFromIds;
    }
  }
  
  if (connectedYouth.length === 0 && relationships.length > 0) {
    connectedYouth = relationships.map((rel: any) => {
      const youthId = rel.youth || rel.youth_id;
      const youth = youthList.find((y: any) => y.id === youthId);
      if (youth) {
        return {
          ...youth,
          relationship_id: rel.id,
          relationship_type: rel.relationship_type || 'GUARDIAN',
          status: rel.status || 'PENDING',
          is_primary_guardian: rel.is_primary_guardian || false,
          verified_at: rel.verified_at,
          created_at: rel.created_at,
        };
      }
      return {
        id: youthId,
        first_name: rel.youth_first_name || 'Unknown',
        last_name: rel.youth_last_name || '',
        email: rel.youth_email || '',
        grade: rel.youth_grade || null,
        relationship_id: rel.id,
        relationship_type: rel.relationship_type || 'GUARDIAN',
        status: rel.status || 'PENDING',
        is_primary_guardian: rel.is_primary_guardian || false,
        verified_at: rel.verified_at,
        created_at: rel.created_at,
      };
    });
  }

  return (
    <div className="space-y-0 sm:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToList')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleSendMessage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t('message')}</span>
          </button>
          <Link 
            href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}
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
            backgroundImage: user.background_image ? `url(${getMediaUrl(user.background_image)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay for background images */}
          {user.background_image && <div className="absolute inset-0 bg-[var(--dark-900)]/50" />}
          
          {/* Decorative elements (only show if no background image) */}
          {!user.background_image && (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
            </div>
          )}
          
          {/* Verification Status Badge - Top Right */}
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${getStatusBadgeClasses(user.verification_status)}`}>
            {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-4 h-4" />}
            <span className="text-sm font-semibold">{getStatusLabel(user.verification_status)}</span>
          </div>

          {/* Role Badge - Top Left */}
          <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--dark-800)]/80 border border-[var(--dark-500)]">
            <span className="text-sm text-[var(--brand-light)] font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              {t('role')}
            </span>
          </div>
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img 
                  src={getMediaUrl(user.avatar) || ''} 
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {getInitials(user.first_name, user.last_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {user.first_name} {user.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone_number && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-third)]/20 text-[var(--brand-third)]">
                    <Phone className="w-3 h-3" /> {user.phone_number}
                  </span>
                )}
                {user.legal_gender && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                    <User className="w-3 h-3" /> {getGenderLabel(user.legal_gender)}
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
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('quickStats.title')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-[var(--brand-purple)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{connectedYouth.length}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('quickStats.youth')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-[var(--brand-blue)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--brand-light)]">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : t('quickStats.never')}
                  </div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('quickStats.lastLogin')}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-2">
                    <CalendarIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--brand-light)]">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">{t('quickStats.joined')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('contactInfo.title')}</h2>
            </div>
            <div className="p-6 space-y-3">
              {/* Email */}
              <a 
                href={`mailto:${user.email}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[var(--brand-blue)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('contactInfo.email')}</div>
                  <div className="text-sm text-[var(--brand-light)] truncate">{user.email}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
              </a>

              {/* Phone */}
              {user.phone_number ? (
                <a 
                  href={`tel:${user.phone_number}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('contactInfo.phone')}</div>
                    <div className="text-sm text-[var(--brand-light)]">{user.phone_number}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[var(--brand-light)]/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('contactInfo.phone')}</div>
                    <div className="text-sm text-[var(--brand-light)]/40 italic">{t('contactInfo.notProvided')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('personalDetails.title')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legal Gender */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('personalDetails.legalGender')}</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.legal_gender ? getGenderLabel(user.legal_gender) : <span className="text-[var(--brand-light)]/40 italic">{t('personalDetails.notSet')}</span>}
                  </div>
                </div>

                {/* Last Login */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t('personalDetails.lastLogin')}
                  </div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : <span className="text-[var(--brand-light)]/40 italic">{t('quickStats.never')}</span>}
                  </div>
                </div>

                {/* Date Joined */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> {t('personalDetails.dateJoined')}
                  </div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {t('personalDetails.verification')}
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                    {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-3 h-3" />}
                    {getStatusLabel(user.verification_status)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('additionalInfo.title')}</h2>
            </div>
            <div className="p-6">
              <CustomFieldsDisplay userId={user.id} targetRole="GUARDIAN" context="USER_PROFILE" />
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Connected Youth Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--brand-purple)]" />
                {t('connectedYouth.title')}
                <span className="ml-auto text-sm font-normal text-[var(--brand-light)]/50">({connectedYouth.length})</span>
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {connectedYouth.length > 0 ? (
                connectedYouth.map((y: any) => {
                  const relationshipId = y.relationship_id;
                  const status = y.status || 'PENDING';
                  const relationshipType = y.relationship_type || 'GUARDIAN';
                  const isPrimary = y.is_primary_guardian || false;
                  
                  return (
                    <div 
                      key={y.id} 
                      className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {getInitials(y.first_name, y.last_name)}
                          </span>
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--brand-light)] text-sm truncate">{y.first_name} {y.last_name}</p>
                          <p className="text-xs text-[var(--brand-light)]/50 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {y.email}
                          </p>
                        </div>
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 capitalize">
                          {relationshipType.toLowerCase()}
                        </span>
                        {isPrimary && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                            {t('connectedYouth.primary')}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getRelationshipStatusClasses(status)}`}>
                          {status}
                        </span>
                        {y.grade && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30">
                            <User className="w-3 h-3" /> {t('connectedYouth.grade', { grade: y.grade })}
                          </span>
                        )}
                      </div>
                      
                      {/* Relationship Actions */}
                      {relationshipId && (
                        <RelationshipActions 
                          relationshipId={relationshipId} 
                          currentStatus={status} 
                          onUpdate={() => window.location.reload()} 
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">{t('connectedYouth.noYouthConnected')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('verificationStatus.title')}</h2>
            </div>
            <div className="p-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-4 h-4" />}
                {getStatusLabel(user.verification_status)}
              </div>
              <p className="text-xs text-[var(--brand-light)]/50 mt-3">
                {user.verification_status === 'VERIFIED' && t('verificationStatus.verified')}
                {user.verification_status === 'PENDING' && t('verificationStatus.pending')}
                {user.verification_status === 'UNVERIFIED' && t('verificationStatus.unverified')}
              </p>
            </div>
          </div>

          {/* ID Document History Card - Shows all uploaded verification documents */}
          <IdDocumentHistoryCard
            userId={user.id}
            onReviewComplete={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Quick Message Modal */}
      {user && (
        <QuickMessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          recipientId={parseInt(userId)}
          recipientName={`${user.first_name} ${user.last_name}`}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

// Relationship Actions Component
function RelationshipActions({ relationshipId, currentStatus, onUpdate }: { relationshipId: number; currentStatus: string; onUpdate: () => void }) {
  const t = useTranslations('guardianDetail.relationshipActions');
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyGuardianRelationship(relationshipId);
      success(t('toast.verified'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      error(err.response?.data?.detail || err.response?.data?.error || t('toast.verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(t('rejectConfirm'))) return;
    setLoading(true);
    try {
      await rejectGuardianRelationship(relationshipId);
      success(t('toast.rejected'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      error(err.response?.data?.detail || err.response?.data?.error || t('toast.rejectFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    setShowResetModal(false);
    setLoading(true);
    try {
      await resetGuardianRelationship(relationshipId);
      success(t('toast.reset'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      error(err.response?.data?.detail || err.response?.data?.error || t('toast.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 pt-3 border-t border-[var(--dark-500)]">
        {currentStatus === 'PENDING' && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/80 text-white transition-colors disabled:opacity-50"
            >
              {loading ? t('processing') : t('verify')}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/80 text-white transition-colors disabled:opacity-50"
            >
              {loading ? t('processing') : t('reject')}
            </button>
          </>
        )}
        {currentStatus === 'ACTIVE' && (
          <button
            onClick={handleResetClick}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)]/30 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30 transition-colors disabled:opacity-50"
          >
            {loading ? t('processing') : t('resetToPending')}
          </button>
        )}
        {currentStatus === 'REJECTED' && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/80 text-white transition-colors disabled:opacity-50"
            >
              {loading ? t('processing') : t('approve')}
            </button>
            <button
              onClick={handleResetClick}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] transition-colors disabled:opacity-50"
            >
              {loading ? t('processing') : t('reset')}
            </button>
          </>
        )}
      </div>
      <ConfirmationModal
        isVisible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
        title={t('resetTitle')}
        message={t('resetMessage')}
        confirmButtonText={t('resetConfirm')}
        cancelButtonText={t('cancel')}
        isLoading={loading}
        variant="warning"
        darkMode={true}
      />
      </>
  );
}

// ID Document History Card Component (for viewing all uploads)
interface IdDocumentUpload {
  id: number;
  document: string;
  document_url: string;
  document_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  rejection_reason: string;
  admin_notes: string;
}

function IdDocumentHistoryCard({ userId, onReviewComplete }: { userId: number; onReviewComplete: () => void }) {
  const t = useTranslations('guardianDetail.idDocuments');
  const [uploads, setUploads] = useState<IdDocumentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<IdDocumentUpload | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showImageModal, setShowImageModal] = useState<IdDocumentUpload | null>(null);
  const { success, error, info, warning } = useToast();

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${userId}/id_document_history/`);
      setUploads(res.data.uploads || []);
    } catch (err) {
      console.error('Error fetching ID document history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'PASSPORT': return t('documentTypes.passport');
      case 'ID_CARD': return t('documentTypes.idCard');
      case 'DRIVERS_LICENSE': return t('documentTypes.driversLicense');
      default: return t('documentTypes.other');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
            <CheckCircle2 className="w-3 h-3" /> {t('status.approved')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
            <XCircle className="w-3 h-3" /> {t('status.rejected')}
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
            <Clock className="w-3 h-3" /> {t('status.pending')}
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            {t('status.deleted')}
          </span>
        );
      default:
        return null;
    }
  };

  const handleApprove = async (upload: IdDocumentUpload) => {
    setActionLoading(upload.id);
    try {
      await api.post(`/users/id_documents/${upload.id}/review/`, {
        action: 'approve'
      });
      success(t('toast.approved'));
      await fetchHistory();
      setTimeout(() => onReviewComplete(), 1500);
    } catch (err: any) {
      error(err.response?.data?.error || t('toast.approveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUpload || !rejectionReason.trim()) {
      error(t('toast.rejectionReasonRequired'));
      return;
    }

    setActionLoading(selectedUpload.id);
    try {
      await api.post(`/users/id_documents/${selectedUpload.id}/review/`, {
        action: 'reject',
        rejection_reason: rejectionReason
      });
      success(t('toast.rejected'));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedUpload(null);
      await fetchHistory();
      setTimeout(() => onReviewComplete(), 1500);
    } catch (err: any) {
      error(err.response?.data?.error || t('toast.rejectFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUpload) return;

    setActionLoading(selectedUpload.id);
    try {
      await api.post(`/users/id_documents/${selectedUpload.id}/review/`, {
        action: 'delete',
        admin_notes: 'Deleted by admin'
      });
      success(t('toast.deleted'));
      setShowDeleteModal(false);
      setSelectedUpload(null);
      await fetchHistory();
      setTimeout(() => onReviewComplete(), 1500);
    } catch (err: any) {
      error(err.response?.data?.error || t('toast.deleteFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter out deleted uploads for display (or show them differently)
  const visibleUploads = uploads.filter(u => u.status !== 'DELETED');
  const pendingUploads = visibleUploads.filter(u => u.status === 'PENDING');

  if (loading) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('title')}</h2>
        </div>
        <div className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
        </div>
      </div>
    );
  }

  if (visibleUploads.length === 0) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand-blue)]" />
            {t('title')}
          </h2>
        </div>
        <div className="p-6 text-center">
          <FileText className="w-10 h-10 mx-auto mb-2 text-[var(--brand-light)]/30" />
          <p className="text-sm text-[var(--brand-light)]/50">{t('noDocuments')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--brand-blue)]" />
              {t('title')}
            </h2>
            {pendingUploads.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                <Clock className="w-3 h-3" />
                {pendingUploads.length} {t('pending')}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {visibleUploads.map((upload) => (
            <div 
              key={upload.id}
              className={`p-4 rounded-xl border ${
                upload.status === 'PENDING'
                  ? 'bg-[var(--brand-peach)]/5 border-[var(--brand-peach)]/30'
                  : 'bg-[var(--dark-700)]/50 border-[var(--dark-500)]'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Document Preview */}
                <div 
                  onClick={() => upload.document_url && setShowImageModal(upload)}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--dark-500)] bg-[var(--dark-700)] cursor-pointer group flex-shrink-0"
                >
                  {upload.document_url && (
                    <>
                      {upload.document_url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-[var(--brand-light)]/40" />
                        </div>
                      ) : (
                        <img 
                          src={getMediaUrl(upload.document_url) || ''} 
                          alt="ID Document" 
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </>
                  )}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-[var(--brand-light)] text-sm">
                      {getDocTypeLabel(upload.document_type)}
                    </span>
                    {getStatusBadge(upload.status)}
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/50">
                    {t('uploaded')} {formatDate(upload.uploaded_at)}
                  </p>
                  {upload.reviewed_at && (
                    <p className="text-xs text-[var(--brand-light)]/50">
                      {t('reviewed')} {formatDate(upload.reviewed_at)}
                      {upload.reviewed_by_name && ` by ${upload.reviewed_by_name}`}
                    </p>
                  )}
                  {upload.status === 'REJECTED' && upload.rejection_reason && (
                    <p className="text-xs text-[var(--brand-red)] mt-1">
                      {t('reason')} {upload.rejection_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions for pending uploads */}
              {upload.status === 'PENDING' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--dark-500)]">
                  <button
                    onClick={() => handleApprove(upload)}
                    disabled={actionLoading === upload.id}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {actionLoading === upload.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    {t('approve')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUpload(upload);
                      setShowRejectModal(true);
                    }}
                    disabled={actionLoading === upload.id}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/90 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    {t('reject')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUpload(upload);
                      setShowDeleteModal(true);
                    }}
                    disabled={actionLoading === upload.id}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-red)] transition-colors disabled:opacity-50"
                    title={t('deleteDocument')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Delete option for already reviewed uploads */}
              {(upload.status === 'APPROVED' || upload.status === 'REJECTED') && (
                <div className="flex justify-end mt-3 pt-3 border-t border-[var(--dark-500)]">
                  <button
                    onClick={() => {
                      setSelectedUpload(upload);
                      setShowDeleteModal(true);
                    }}
                    disabled={actionLoading === upload.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-colors disabled:opacity-50"
                  >
                    {t('deleteDocument')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      <ConfirmationModal
        isVisible={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedUpload(null);
        }}
        onConfirm={handleReject}
        title={t('rejectTitle')}
        message={
          <div className="space-y-3">
            <p>{t('rejectMessage')}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('rejectPlaceholder')}
              className="w-full h-24 px-3 py-2 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 resize-none focus:border-[var(--brand-primary)] outline-none"
            />
          </div>
        }
        confirmButtonText={t('rejectConfirm')}
        cancelButtonText={t('cancel')}
        isLoading={actionLoading !== null}
        variant="danger"
        darkMode={true}
      />

      {/* Delete Modal */}
      <ConfirmationModal
        isVisible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUpload(null);
        }}
        onConfirm={handleDelete}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        confirmButtonText={t('delete')}
        cancelButtonText={t('cancel')}
        isLoading={actionLoading !== null}
        variant="danger"
        darkMode={true}
      />

      {/* Image Preview Modal */}
      {showImageModal && showImageModal.document_url && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowImageModal(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            {showImageModal.document_url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={getMediaUrl(showImageModal.document_url) || ''}
                className="w-full h-[80vh] rounded-xl"
                title="ID Document"
              />
            ) : (
              <img
                src={getMediaUrl(showImageModal.document_url) || ''}
                alt="ID Document"
                className="w-full h-auto max-h-[90vh] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}

      </>
  );
}
