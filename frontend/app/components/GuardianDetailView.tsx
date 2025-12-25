'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, MessageSquare, Edit, Mail, Phone, Calendar as CalendarIcon, 
  User, Users, ShieldCheck, ChevronRight, Clock
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import QuickMessageModal from './messenger/QuickMessageModal';
import { verifyGuardianRelationship, rejectGuardianRelationship, resetGuardianRelationship } from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';

interface GuardianDetailProps {
  userId: string;
  basePath: string;
}

export default function GuardianDetailView({ userId, basePath }: GuardianDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
          <p className="text-[var(--brand-light)]/60">Loading guardian details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">User not found</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            Return to list
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
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Link>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleSendMessage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Message</span>
          </button>
          <Link 
            href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Edit className="h-4 w-4" /> Edit
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
            <span className="text-sm font-semibold">{user.verification_status}</span>
          </div>

          {/* Role Badge - Top Left */}
          <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--dark-800)]/80 border border-[var(--dark-500)]">
            <span className="text-sm text-[var(--brand-light)] font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              Guardian
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
                    <User className="w-3 h-3" /> {user.legal_gender}
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
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Quick Stats</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-[var(--brand-purple)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{connectedYouth.length}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Youth</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-[var(--brand-blue)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--brand-light)]">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Last Login</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-2">
                    <CalendarIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="text-sm font-bold text-[var(--brand-light)]">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Joined</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Contact Information</h2>
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
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Email</div>
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
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Phone</div>
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
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Phone</div>
                    <div className="text-sm text-[var(--brand-light)]/40 italic">Not provided</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Personal Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legal Gender */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Legal Gender</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.legal_gender === 'MALE' ? 'Male' : user.legal_gender === 'FEMALE' ? 'Female' : user.legal_gender || <span className="text-[var(--brand-light)]/40 italic">Not set</span>}
                  </div>
                </div>

                {/* Last Login */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Login
                  </div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : <span className="text-[var(--brand-light)]/40 italic">Never</span>}
                  </div>
                </div>

                {/* Date Joined */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> Date Joined
                  </div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verification
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                    {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-3 h-3" />}
                    {user.verification_status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Additional Information</h2>
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
                Connected Youth
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
                            Primary
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getRelationshipStatusClasses(status)}`}>
                          {status}
                        </span>
                        {y.grade && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30">
                            <User className="w-3 h-3" /> Grade {y.grade}
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
                  <p className="text-sm italic">No youth connected</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Verification Status</h2>
            </div>
            <div className="p-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-4 h-4" />}
                {user.verification_status}
              </div>
              <p className="text-xs text-[var(--brand-light)]/50 mt-3">
                {user.verification_status === 'VERIFIED' && 'This guardian has been verified.'}
                {user.verification_status === 'PENDING' && 'Verification is pending review.'}
                {user.verification_status === 'UNVERIFIED' && 'This guardian has not been verified yet.'}
              </p>
            </div>
          </div>
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const [showResetModal, setShowResetModal] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyGuardianRelationship(relationshipId);
      setToast({ message: 'Relationship verified successfully!', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to verify relationship', 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this relationship?')) return;
    setLoading(true);
    try {
      await rejectGuardianRelationship(relationshipId);
      setToast({ message: 'Relationship rejected.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reject relationship', 
        type: 'error', 
        isVisible: true 
      });
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
      setToast({ message: 'Relationship reset to pending.', type: 'success', isVisible: true });
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.detail || err.response?.data?.error || 'Failed to reset relationship', 
        type: 'error', 
        isVisible: true 
      });
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
              {loading ? 'Processing...' : 'Verify'}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/80 text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Reject'}
            </button>
          </>
        )}
        {currentStatus === 'ACTIVE' && (
          <button
            onClick={handleResetClick}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)]/30 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Reset to Pending'}
          </button>
        )}
        {currentStatus === 'REJECTED' && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/80 text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={handleResetClick}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Reset'}
            </button>
          </>
        )}
      </div>
      <ConfirmationModal
        isVisible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
        title="Reset Relationship"
        message="Are you sure you want to reset this relationship back to pending status?"
        confirmButtonText="Reset to Pending"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
      />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </>
  );
}
