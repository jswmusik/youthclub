'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, MessageSquare, Clock, Calendar, FileText, Edit, 
  Mail, Phone, User, Building, Building2, ShieldCheck, ChevronRight,
  Heart, Users, Sparkles
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import IndividualHistory from './questionnaires/IndividualHistory';
import QuickMessageModal from './messenger/QuickMessageModal';

interface YouthDetailProps {
  userId: string;
  basePath: string;
}

export default function YouthDetailView({ userId, basePath }: YouthDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [uRes, cRes, iRes, gRes] = await Promise.all([
            api.get(`/users/${userId}/`),
            api.get('/clubs/?page_size=1000'),
            api.get('/interests/'),
            api.get('/users/list_guardians/')
        ]);
        setUser(uRes.data);
        setClubs(Array.isArray(cRes.data) ? cRes.data : cRes.data.results || []);
        setInterests(Array.isArray(iRes.data) ? iRes.data : iRes.data.results || []);
        setGuardians(gRes.data || []);
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

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading youth details...</p>
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

  // Resolve IDs
  const clubName = clubs.find(c => c.id === user.preferred_club)?.name || null;
  const userInterests = user.interests?.map((id: any) => {
      const iId = typeof id === 'object' ? id.id : id;
      return interests.find(x => x.id === iId);
  }).filter(Boolean) || [];
  
  const userGuardians = user.guardians?.map((guardian: any) => {
    if (guardian && typeof guardian === 'object' && guardian.first_name) {
      return guardian;
    }
    const guardianId = typeof guardian === 'object' ? guardian.id : guardian;
    return guardians.find(g => g.id === guardianId);
  }).filter(Boolean) || [];
  
  const age = calculateAge(user.date_of_birth);

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
            href={`${basePath}/${userId}/visits`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Visits</span>
          </Link>
          <Link 
            href={`${basePath}/${userId}/questionnaires`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Questionnaires</span>
          </Link>
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

          {/* Mood Status - Top Left */}
          {user.mood_status && (
            <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--dark-800)]/80 border border-[var(--dark-500)]">
              <span className="text-sm text-[var(--brand-light)]">💬 {user.mood_status}</span>
            </div>
          )}
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
                {user.nickname && (
                  <span className="text-lg sm:text-xl font-normal text-[var(--brand-light)]/50 ml-2">
                    @{user.nickname}
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {age && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                    <Calendar className="w-3 h-3" /> {age} years old
                  </span>
                )}
                {user.grade && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                    <User className="w-3 h-3" /> Grade {user.grade}
                  </span>
                )}
                {clubName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-third)]/20 text-[var(--brand-third)]">
                    <Building2 className="w-3 h-3" /> {clubName}
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
                    <Calendar className="w-5 h-5 text-[var(--brand-purple)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{age || '-'}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Age</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center mx-auto mb-2">
                    <User className="w-5 h-5 text-[var(--brand-blue)]" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{user.grade || '-'}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Grade</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-2">
                    <User className="w-5 h-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="text-lg font-bold text-[var(--brand-light)]">{user.legal_gender || '-'}</div>
                  <div className="text-xs text-[var(--brand-light)]/50 font-medium">Gender</div>
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
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group cursor-pointer"
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
                  href={`tel:${user.phone_number.replace(/[\s\-\(\)]/g, '')}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group cursor-pointer"
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
                {/* Date of Birth */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Date of Birth</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.date_of_birth || <span className="text-[var(--brand-light)]/40 italic">Not provided</span>}
                  </div>
                </div>

                {/* Legal Gender */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Legal Gender</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.legal_gender === 'MALE' ? 'Male' : user.legal_gender === 'FEMALE' ? 'Female' : user.legal_gender || '-'}
                  </div>
                </div>

                {/* Preferred Gender */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Preferred Gender</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {user.preferred_gender || <span className="text-[var(--brand-light)]/40 italic">Not set</span>}
                  </div>
                </div>

                {/* Preferred Club */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Preferred Club
                  </div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {clubName || <span className="text-[var(--brand-light)]/40 italic">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Custom Fields</h2>
            </div>
            <div className="p-6">
              <CustomFieldsDisplay userId={user.id} targetRole="YOUTH_MEMBER" context="USER_PROFILE" />
            </div>
          </div>

          {/* Questionnaires Section */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--brand-purple)]" />
                Questionnaires
              </h2>
            </div>
            <div className="p-6">
              <IndividualHistory userId={user.id} />
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Interests Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <Heart className="h-5 w-5 text-[var(--brand-peach)]" />
                Interests
              </h2>
            </div>
            <div className="p-6">
              {userInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((i: any) => (
                    <span 
                      key={i.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30"
                    >
                      <Sparkles className="w-3 h-3" />
                      {i.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">No interests selected yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Guardians Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" />
                Guardians
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {userGuardians.length > 0 ? (
                userGuardians.map((g: any) => {
                  // Determine guardian base path based on current basePath
                  const guardianBasePath = basePath.includes('/super/') 
                    ? '/admin/super/guardians'
                    : basePath.includes('/municipality/')
                    ? '/admin/municipality/guardians'
                    : '/admin/club/guardians';
                  
                  return (
                    <Link
                      key={g.id}
                      href={`${guardianBasePath}/${g.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[var(--brand-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--brand-light)] font-medium truncate group-hover:text-[var(--brand-primary)] transition-colors">{g.first_name} {g.last_name}</div>
                        <div className="text-xs text-[var(--brand-light)]/50 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {g.email}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">No guardians assigned</p>
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
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getStatusBadgeClasses(user.verification_status)}`}>
                {user.verification_status === 'VERIFIED' && <ShieldCheck className="w-4 h-4" />}
                {user.verification_status}
              </div>
              <p className="text-xs text-[var(--brand-light)]/50 mt-3">
                {user.verification_status === 'VERIFIED' && 'This youth member has been verified.'}
                {user.verification_status === 'PENDING' && 'Verification is pending review.'}
                {user.verification_status === 'UNVERIFIED' && 'This youth member has not been verified yet.'}
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
