'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Clock, Calendar, FileText, Edit, MoreVertical, Mail, Phone, Calendar as CalendarIcon, User, Building, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api';
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import IndividualHistory from './questionnaires/IndividualHistory';
import QuickMessageModal from './messenger/QuickMessageModal';

// Shadcn
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
  if (!user) return <div className="p-12 text-center text-red-500">User not found.</div>;

  // Resolve IDs
  const clubName = clubs.find(c => c.id === user.preferred_club)?.name || 'None';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'UNVERIFIED': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        </Link>
        
        {/* Action Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSendMessage}
            className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]"
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
          <Link href={`${basePath}/${userId}/visits`}>
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <Clock className="h-4 w-4" />
              View Visits
            </Button>
          </Link>
          <Link href={`${basePath}/${userId}/attended-events`}>
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <Calendar className="h-4 w-4" />
              Attended Events
            </Button>
          </Link>
          <Link href={`${basePath}/${userId}/questionnaires`}>
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <FileText className="h-4 w-4" />
              Questionnaires
            </Button>
          </Link>
          <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}>
            <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        </div>

        {/* Action Menu - Mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden bg-[#4D4DA4] hover:bg-[#4D4DA4]/80 border-[#4D4DA4] text-white hover:text-white/80 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
            <DropdownMenuItem onClick={handleSendMessage} className="cursor-pointer text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] transition-colors rounded-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/${userId}/visits`} className="flex items-center cursor-pointer text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] transition-colors rounded-sm">
                <Clock className="h-4 w-4 mr-2" />
                View Visits
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/${userId}/attended-events`} className="flex items-center cursor-pointer text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] transition-colors rounded-sm">
                <Calendar className="h-4 w-4 mr-2" />
                Attended Events
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/${userId}/questionnaires`} className="flex items-center cursor-pointer text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] transition-colors rounded-sm">
                <FileText className="h-4 w-4 mr-2" />
                View Questionnaires
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} className="flex items-center cursor-pointer text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white transition-colors rounded-sm font-medium">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Header Card */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white !py-0 !gap-0">
        {/* Cover Image */}
        <div 
          className="h-48 md:h-64 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485] relative w-full"
          style={{
            backgroundImage: user.background_image ? `url(${getMediaUrl(user.background_image)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <CardContent className="p-6 sm:p-10 pt-6 sm:pt-10 bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-20 sm:-mt-24">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-white shadow-lg bg-white flex-shrink-0">
              <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold text-[#4D4DA4] bg-white rounded-2xl">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1 space-y-3 pt-4 sm:pt-0">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#121213]">
                  {user.first_name} {user.last_name}
                  {user.nickname && (
                    <span className="text-xl sm:text-2xl font-normal text-gray-500 ml-2 sm:ml-3">
                      (@{user.nickname})
                    </span>
                  )}
                </h1>
                <p className="text-gray-700 mt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap font-medium">
                  <Mail className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span className="break-all">{user.email}</span>
                </p>
              </div>
              
              {/* Mood Status */}
              {user.mood_status && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-700 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/50 shadow-sm w-fit mx-auto sm:mx-0">
                  <span>💬</span>
                  <span className="font-medium">{user.mood_status}</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="outline" className={getStatusBadge(user.verification_status)}>
                  {user.verification_status === 'VERIFIED' && (
                    <ShieldCheck className="h-3 w-3 mr-1" />
                  )}
                  {user.verification_status}
                </Badge>
                {user.grade && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <User className="h-3 w-3 mr-1" />
                    Grade {user.grade}
                  </Badge>
                )}
                {age && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {age} years old
                  </Badge>
                )}
                {clubName !== 'None' && (
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                    <Building className="h-3 w-3 mr-1" />
                    {clubName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Age</p>
                    <p className="text-2xl font-bold text-[#4D4DA4]">{age || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Grade</p>
                    <p className="text-2xl font-bold text-[#4D4DA4]">{user.grade || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Gender</p>
                    <p className="text-lg font-bold text-[#4D4DA4]">{user.legal_gender || user.preferred_gender || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* About Section */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#121213]">About</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2 flex-wrap">
                      {user.phone_number ? (
                        <>
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="break-all">{user.phone_number}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date of Birth</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      {user.date_of_birth ? (
                        <>
                          <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          {user.date_of_birth}
                        </>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Legal Gender</label>
                    <p className="text-gray-900 font-medium">{user.legal_gender || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Preferred Gender</label>
                    <p className="text-gray-900 font-medium">{user.preferred_gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Preferred Club</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="break-words">{clubName}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <CustomFieldsDisplay userId={user.id} targetRole="YOUTH_MEMBER" context="USER_PROFILE" />

          {/* Questionnaires Section */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#4D4DA4]" />
                Questionnaires
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <IndividualHistory userId={user.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Interests Card */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                <span className="text-[#FF5485]">⭐</span>
                Interests
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {userInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((i: any) => (
                    <Badge 
                      key={i.id} 
                      variant="outline" 
                      className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20 px-3 py-1"
                    >
                      {i.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No interests selected yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Guardians Card */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#4D4DA4]" />
                Guardians
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {userGuardians.length > 0 ? (
                <div className="space-y-3">
                  {userGuardians.map((g: any) => (
                    <div 
                      key={g.id} 
                      className="p-4 rounded-lg bg-[#EBEBFE]/30 border border-[#4D4DA4]/20 hover:bg-[#EBEBFE]/50 transition-colors"
                    >
                      <p className="font-semibold text-[#121213] mb-1 break-words">{g.first_name} {g.last_name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{g.email}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No guardians assigned.</p>
              )}
            </CardContent>
          </Card>
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
