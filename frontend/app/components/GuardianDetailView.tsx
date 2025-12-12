'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Edit, MoreVertical, Mail, Phone, Calendar as CalendarIcon, User, Users } from 'lucide-react';
import api from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api';
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import QuickMessageModal from './messenger/QuickMessageModal';
import { verifyGuardianRelationship, rejectGuardianRelationship, resetGuardianRelationship } from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

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
            api.get('/users/list_youth/') // Fetches youth visible to this admin
        ]);
        setUser(uRes.data);
        setYouthList(Array.isArray(yRes.data) ? yRes.data : []);
        
        // If user is a guardian and youth_members is empty or only IDs, fetch relationships
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

  const getInboxPath = () => {
    if (pathname.includes('/admin/super')) return '/admin/super/inbox';
    if (pathname.includes('/admin/municipality')) return '/admin/municipality/inbox';
    if (pathname.includes('/admin/club')) return '/admin/club/inbox';
    return '/admin/club/inbox';
  };

  const handleSendMessage = () => {
    // Open modal instead of redirecting
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
  if (!user) return <div className="p-12 text-center text-red-500">User not found.</div>;

  // Build connected youth list from multiple sources
  let connectedYouth: any[] = [];
  
  // First, try to use youth_members from user object (new serializer format with full details)
  if (Array.isArray(user.youth_members) && user.youth_members.length > 0) {
    // Check if first item is an object with relationship details (new format)
    if (typeof user.youth_members[0] === 'object' && user.youth_members[0] !== null && 'first_name' in user.youth_members[0]) {
      // Already full objects with relationship details - use directly
      connectedYouth = user.youth_members;
    } else {
      // Legacy format: array of IDs - map to youth objects and merge with relationships
      const youthFromIds = user.youth_members
        .map((id: number) => {
          const youth = youthList.find((y: any) => y.id === id);
          if (youth) {
            // Try to find relationship data for this youth
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
  
  // If we have relationships from the API but no youth_members, use relationships
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
      // If youth not in list, use data from relationship serializer
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
  
  // Debug logging
  console.log('Guardian user:', user);
  console.log('youth_members:', user.youth_members);
  console.log('relationships:', relationships);
  console.log('connectedYouth:', connectedYouth);

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
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white shadow-lg bg-[#4D4DA4] flex-shrink-0">
              <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
              <AvatarFallback className="text-4xl font-bold text-white bg-[#4D4DA4] rounded-full">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1 space-y-3 pt-4 sm:pt-0">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#121213]">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-gray-700 mt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap font-medium">
                  <Mail className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span className="break-all">{user.email}</span>
                </p>
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="outline" className={getStatusBadge(user.verification_status)}>
                  {user.verification_status}
                </Badge>
                {user.phone_number && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Phone className="h-3 w-3 mr-1" />
                    {user.phone_number}
                  </Badge>
                )}
                {user.legal_gender && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <User className="h-3 w-3 mr-1" />
                    {user.legal_gender}
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
                    <Users className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Connected Youth</p>
                    <p className="text-2xl font-bold text-[#4D4DA4]">{connectedYouth.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Last Login</p>
                    <p className="text-lg font-bold text-[#4D4DA4]">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Date Joined</p>
                    <p className="text-lg font-bold text-[#4D4DA4]">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </p>
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
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Legal Gender</label>
                    <p className="text-gray-900 font-medium">{user.legal_gender || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last Login</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      {user.last_login ? (
                        <>
                          <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          {new Date(user.last_login).toLocaleString()}
                        </>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date Joined</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {new Date(user.date_joined).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <CustomFieldsDisplay userId={user.id} targetRole="GUARDIAN" context="USER_PROFILE" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Connected Youth Card with Relationship Management */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#4D4DA4]" />
                Connected Youth
                <span className="ml-auto text-sm font-normal text-gray-500">({connectedYouth.length})</span>
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {connectedYouth.length > 0 ? (
                <div className="space-y-3">
                  {connectedYouth.map((y: any) => {
                    const relationshipId = y.relationship_id;
                    const status = y.status || 'PENDING';
                    const relationshipType = y.relationship_type || 'GUARDIAN';
                    const isPrimary = y.is_primary_guardian || false;
                    
                    return (
                      <div 
                        key={y.id} 
                        className="p-4 rounded-lg bg-[#EBEBFE]/30 border border-[#4D4DA4]/20 hover:bg-[#EBEBFE]/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-[#121213] mb-1 break-words">{y.first_name} {y.last_name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-2">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span className="break-all">{y.email}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                {relationshipType.toLowerCase()}
                              </Badge>
                              {isPrimary && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                  Primary
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${
                                status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}>
                                {status}
                              </Badge>
                            </div>
                            {y.grade && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                <User className="h-3 w-3 mr-1" />
                                Grade {y.grade}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {relationshipId && (
                          <RelationshipActions relationshipId={relationshipId} currentStatus={status} onUpdate={() => window.location.reload()} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No youth connected.</p>
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
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#4D4DA4]/20">
        {currentStatus === 'PENDING' && (
          <>
            <Button
              onClick={handleVerify}
              disabled={loading}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              {loading ? 'Processing...' : 'Verify'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading}
              size="sm"
              variant="destructive"
              className="flex-1 text-xs"
            >
              {loading ? 'Processing...' : 'Reject'}
            </Button>
          </>
        )}
        {currentStatus === 'ACTIVE' && (
          <Button
            onClick={handleResetClick}
            disabled={loading}
            size="sm"
            variant="outline"
            className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300 text-xs"
          >
            {loading ? 'Processing...' : 'Reset to Pending'}
          </Button>
        )}
        {currentStatus === 'REJECTED' && (
          <>
            <Button
              onClick={handleVerify}
              disabled={loading}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              {loading ? 'Processing...' : 'Approve'}
            </Button>
            <Button
              onClick={handleResetClick}
              disabled={loading}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              {loading ? 'Processing...' : 'Reset'}
            </Button>
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