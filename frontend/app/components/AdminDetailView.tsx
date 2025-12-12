'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Mail, Phone, MessageSquare, User, Briefcase, Building2, Users } from 'lucide-react';
import api from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api';
import { getMediaUrl } from '../../app/utils';
import QuickMessageModal from './messenger/QuickMessageModal';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface AdminDetailProps {
  userId: string;
  basePath: string;
}

interface Option { id: number; name: string; }

export default function AdminDetailView({ userId, basePath }: AdminDetailProps) {
  const router = useRouter();
  const pathname = usePathname(); // To detect current admin scope
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

  // Helper to determine redirect path based on current URL
  const getInboxPath = () => {
    if (pathname.includes('/admin/super')) return '/admin/super/inbox';
    if (pathname.includes('/admin/municipality')) return '/admin/municipality/inbox';
    if (pathname.includes('/admin/club')) return '/admin/club/inbox';
    return '/admin/super/inbox'; // Fallback
  };

  const handleSendMessage = () => {
    // Open modal instead of redirecting
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-50 text-red-700 border-red-200';
      case 'MUNICIPALITY_ADMIN': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CLUB_ADMIN': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 animate-pulse">Loading details...</div>
    );
  }

  if (!admin) {
    return (
      <div className="py-20 text-center text-red-600">Admin not found.</div>
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
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSendMessage}
            variant="outline"
            size="sm"
            className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4" /> Message
          </Button>
          <Link href={buildUrlWithParams(`${basePath}/edit/${admin.id}`)}>
            <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white shadow-sm">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Hero Card */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white">
        <div className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-white shadow-lg bg-white flex-shrink-0">
              <AvatarImage src={getMediaUrl(admin.avatar) || undefined} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold text-[#4D4DA4] bg-white">
                {getInitials(admin.first_name, admin.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#121213]">
                {admin.first_name} {admin.last_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <Badge variant="outline" className={getRoleBadge(admin.role)}>
                  {admin.role.replace(/_/g, ' ')}
                </Badge>
                {municipalityName && (
                  <Badge variant="outline" className="bg-white/80 text-gray-700 border-gray-200">
                    <Building2 className="h-3 w-3 mr-1" /> {municipalityName}
                  </Badge>
                )}
                {clubName && (
                  <Badge variant="outline" className="bg-white/80 text-gray-700 border-gray-200">
                    <Users className="h-3 w-3 mr-1" /> {clubName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#4D4DA4]" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-medium">Email</div>
                  <div className="text-gray-900 font-medium">{admin.email}</div>
                </div>
              </div>
              {admin.phone_number && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-medium">Phone</div>
                    <div className="text-gray-900 font-medium">{admin.phone_number}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#4D4DA4]" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-medium mb-1">Gender</div>
                  <div className="text-gray-900 font-medium">{admin.legal_gender || '-'}</div>
                </div>
                {admin.role === 'CLUB_ADMIN' && admin.nickname && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">Nickname</div>
                    <div className="text-gray-900 font-medium">{admin.nickname}</div>
                  </div>
                )}
                {admin.role === 'CLUB_ADMIN' && admin.profession && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Profession / Title
                    </div>
                    <div className="text-gray-900 font-medium">{admin.profession}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Assignments */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {municipalityName && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">Municipality</div>
                    <div className="text-gray-900 font-medium truncate">{municipalityName}</div>
                  </div>
                </div>
              )}
              {clubName && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">Club</div>
                    <div className="text-gray-900 font-medium truncate">{clubName}</div>
                  </div>
                </div>
              )}
              {!municipalityName && !clubName && (
                <div className="text-sm text-gray-500 italic">No assignments</div>
              )}
            </CardContent>
          </Card>
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