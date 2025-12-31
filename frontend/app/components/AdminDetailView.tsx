'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, Mail, Phone, MessageSquare, User, Briefcase, 
  Building2, Building, Users, ShieldCheck, ChevronRight
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import QuickMessageModal from './messenger/QuickMessageModal';

interface AdminDetailProps {
  userId: string;
  basePath: string;
}

interface Option { id: number; name: string; }

export default function AdminDetailView({ userId, basePath }: AdminDetailProps) {
  const t = useTranslations('adminDetail');
  const tRoles = useTranslations('adminManager.roles');
  const tGenders = useTranslations('adminForm.basicInformation.genders');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adminRes, muniRes, clubRes] = await Promise.all([
          api.get(`/users/${userId}/`),
          api.get('/municipalities/'),
          api.get('/clubs/?page_size=1000')
        ]);
        
        setAdmin(adminRes.data);
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
        setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const getInboxPath = () => {
    if (pathname.includes('/admin/super')) return '/admin/super/inbox';
    if (pathname.includes('/admin/municipality')) return '/admin/municipality/inbox';
    if (pathname.includes('/admin/club')) return '/admin/club/inbox';
    return '/admin/super/inbox';
  };

  const handleSendMessage = () => {
    setShowMessageModal(true);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const municipality = searchParams.get('assigned_municipality');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (municipality) params.set('assigned_municipality', municipality);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      case 'MUNICIPALITY_ADMIN': return 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30';
      case 'CLUB_ADMIN': return 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border-[var(--brand-third)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return <ShieldCheck className="w-4 h-4" />;
      case 'MUNICIPALITY_ADMIN': return <Building className="w-4 h-4" />;
      case 'CLUB_ADMIN': return <Building2 className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': tRoles('SUPER_ADMIN'),
      'MUNICIPALITY_ADMIN': tRoles('MUNICIPALITY_ADMIN'),
      'CLUB_ADMIN': tRoles('CLUB_ADMIN'),
    };
    return roleMap[role] || role.replace(/_/g, ' ');
  };

  const getGenderDisplay = (gender: string) => {
    if (gender === 'MALE') return tGenders('MALE');
    if (gender === 'FEMALE') return tGenders('FEMALE');
    if (gender === 'OTHER') return tGenders('OTHER');
    return gender || '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">{t('loading.loadingAdminDetails')}</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">{t('error.adminNotFound')}</p>
          <Link href={buildUrlWithParams(basePath)} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            {t('error.returnToList')}
          </Link>
        </div>
      </div>
    );
  }

  const municipalityName = admin.assigned_municipality ? (() => {
    const muniId = typeof admin.assigned_municipality === 'object' 
      ? admin.assigned_municipality.id 
      : admin.assigned_municipality;
    const municipality = municipalities.find(m => m.id === muniId);
    return municipality?.name || null;
  })() : null;

  const clubName = admin.assigned_club ? (() => {
    const clubId = typeof admin.assigned_club === 'object' 
      ? admin.assigned_club.id 
      : admin.assigned_club;
    const club = clubs.find(c => c.id === clubId);
    return club?.name || null;
  })() : null;

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> {t('navigation.backToList')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleSendMessage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t('navigation.sendMessage')}</span>
            <span className="sm:hidden">{t('navigation.message')}</span>
          </button>
          <Link 
            href={buildUrlWithParams(`${basePath}/edit/${admin.id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
          >
            <Edit className="h-4 w-4" /> {t('navigation.editAdmin')}
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-36 sm:h-48 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
          
          {/* Role Badge - Top Right */}
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${
            admin.role === 'SUPER_ADMIN' ? 'bg-[var(--brand-red)]/20 border-[var(--brand-red)]/30' :
            admin.role === 'MUNICIPALITY_ADMIN' ? 'bg-[var(--brand-primary)]/20 border-[var(--brand-primary)]/30' :
            'bg-[var(--brand-third)]/20 border-[var(--brand-third)]/30'
          }`}>
            {getRoleIcon(admin.role)}
            <span className={`text-sm font-semibold ${
              admin.role === 'SUPER_ADMIN' ? 'text-[var(--brand-red)]' :
              admin.role === 'MUNICIPALITY_ADMIN' ? 'text-[var(--brand-primary)]' :
              'text-[var(--brand-third)]'
            }`}>{getRoleDisplay(admin.role)}</span>
          </div>
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {admin.avatar ? (
                <img 
                  src={getMediaUrl(admin.avatar) || ''} 
                  alt={`${admin.first_name} ${admin.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {getInitials(admin.first_name, admin.last_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {admin.first_name} {admin.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{admin.email}</span>
                </div>
                {municipalityName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                    <Building className="w-3 h-3" /> {municipalityName}
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
          
          {/* Contact Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.contactInformation')}</h2>
            </div>
            <div className="p-6 space-y-3">
              {/* Email */}
              <a 
                href={`mailto:${admin.email}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[var(--brand-blue)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.email')}</div>
                  <div className="text-sm text-[var(--brand-light)] truncate">{admin.email}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
              </a>

              {/* Phone */}
              {admin.phone_number ? (
                <a 
                  href={`tel:${admin.phone_number}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.phone')}</div>
                    <div className="text-sm text-[var(--brand-light)]">{admin.phone_number}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[var(--brand-light)]/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.phone')}</div>
                    <div className="text-sm text-[var(--brand-light)]/40 italic">{t('status.notProvided')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.personalDetails')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('fields.gender')}</div>
                  <div className="text-sm text-[var(--brand-light)] font-medium">
                    {getGenderDisplay(admin.legal_gender)}
                  </div>
                </div>

                {/* Nickname (for Club Admin) */}
                {admin.role === 'CLUB_ADMIN' && (
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">{t('fields.nickname')}</div>
                    <div className="text-sm text-[var(--brand-light)] font-medium">
                      {admin.nickname || <span className="text-[var(--brand-light)]/40 italic">{t('status.notSet')}</span>}
                    </div>
                  </div>
                )}

                {/* Profession (for Club Admin) */}
                {admin.role === 'CLUB_ADMIN' && (
                  <div className={`p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] ${admin.nickname ? '' : 'sm:col-span-1'}`}>
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {t('fields.profession')}
                    </div>
                    <div className="text-sm text-[var(--brand-light)] font-medium">
                      {admin.profession || <span className="text-[var(--brand-light)]/40 italic">{t('status.notSet')}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Assignments Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.assignments')}</h2>
            </div>
            <div className="p-6 space-y-3">
              {/* Municipality Assignment */}
              {municipalityName ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Building className="w-4 h-4 text-[var(--brand-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.municipality')}</div>
                    <div className="text-sm text-[var(--brand-light)] font-medium truncate">{municipalityName}</div>
                  </div>
                </div>
              ) : admin.role === 'MUNICIPALITY_ADMIN' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0">
                    <Building className="w-4 h-4 text-[var(--brand-light)]/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.municipality')}</div>
                    <div className="text-sm text-[var(--brand-light)]/40 italic">{t('status.notAssigned')}</div>
                  </div>
                </div>
              )}

              {/* Club Assignment */}
              {clubName ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.club')}</div>
                    <div className="text-sm text-[var(--brand-light)] font-medium truncate">{clubName}</div>
                  </div>
                </div>
              ) : admin.role === 'CLUB_ADMIN' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-[var(--brand-light)]/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('fields.club')}</div>
                    <div className="text-sm text-[var(--brand-light)]/40 italic">{t('status.notAssigned')}</div>
                  </div>
                </div>
              )}

              {/* Super Admin - Global Access */}
              {admin.role === 'SUPER_ADMIN' && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--brand-red)]/20 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-7 h-7 text-[var(--brand-red)]" />
                  </div>
                  <p className="text-sm text-[var(--brand-light)] font-medium">{t('status.globalAccess')}</p>
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('status.fullPlatformPermissions')}</p>
                </div>
              )}

              {/* No assignments message */}
              {!municipalityName && !clubName && admin.role !== 'SUPER_ADMIN' && (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic">{t('status.noAssignments')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Role Info Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('sections.rolePermissions')}</h2>
            </div>
            <div className="p-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getRoleBadgeClasses(admin.role)}`}>
                {getRoleIcon(admin.role)}
                {getRoleDisplay(admin.role)}
              </div>
              <p className="text-xs text-[var(--brand-light)]/50 mt-3">
                {admin.role === 'SUPER_ADMIN' && t('roleDescriptions.superAdmin')}
                {admin.role === 'MUNICIPALITY_ADMIN' && t('roleDescriptions.municipalityAdmin')}
                {admin.role === 'CLUB_ADMIN' && t('roleDescriptions.clubAdmin')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Message Modal */}
      {admin && (
        <QuickMessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          recipientId={parseInt(userId)}
          recipientName={`${admin.first_name} ${admin.last_name}`}
        />
      )}
    </div>
  );
}
