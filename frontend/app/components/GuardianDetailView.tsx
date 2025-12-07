'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api'; // Import messengerApi
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
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

  const handleSendMessage = async () => {
    try {
      await messengerApi.startConversation(parseInt(userId));
      router.push(getInboxPath());
    } catch (err) {
      console.error("Failed to start conversation", err);
      alert("Could not start conversation.");
    }
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

  if (loading) return <div className="p-12 text-center">Loading...</div>;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center py-6 mb-6">
          <Link 
            href={buildUrlWithParams(basePath)} 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={handleSendMessage}
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:text-indigo-600 shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
            <Link 
              href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Guardian
            </Link>
          </div>
        </div>

        {/* Cover Section with Gradient */}
        <div className="relative mb-32 md:mb-40">
          <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Profile Card - Centered */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-full max-w-5xl px-4 sm:px-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar */}
                  <div className="relative -mt-16 md:-mt-20 flex-shrink-0">
                    {user.avatar ? (
                      <img 
                        src={getMediaUrl(user.avatar) || ''} 
                        className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-4 border-white shadow-xl" 
                        alt={`${user.first_name} ${user.last_name}`}
                      />
                    ) : (
                      <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-xl">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}
                    {/* Verification Badge */}
                    {user.verification_status === 'VERIFIED' && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-white shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 w-full min-w-0 pt-2 md:pt-0">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words">
                      {user.first_name} {user.last_name}
                    </h1>
                    <p className="text-base md:text-lg text-gray-600 mb-4 flex items-center gap-2 flex-wrap">
                      <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="break-all">{user.email}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold ${
                        user.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        user.verification_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.verification_status === 'VERIFIED' && (
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {user.verification_status}
                      </span>
                      {user.phone_number && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-blue-100 text-blue-800">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {user.phone_number}
                        </span>
                      )}
                      {user.legal_gender && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-purple-100 text-purple-800">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {user.legal_gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Connected Youth</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{connectedYouth.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Last Login</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Joined</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                About
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2 flex-wrap">
                      {user.phone_number ? (
                        <>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="break-all">{user.phone_number}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Not provided</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Legal Gender</label>
                    <p className="text-gray-900 font-medium">{user.legal_gender || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Login</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      {user.last_login ? (
                        <>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(user.last_login).toLocaleString()}
                        </>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date Joined</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(user.date_joined).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <CustomFieldsDisplay userId={user.id} targetRole="GUARDIAN" context="USER_PROFILE" />
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            
            {/* Connected Youth Card with Relationship Management */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Connected Youth
                <span className="ml-auto text-sm font-normal text-gray-500">({connectedYouth.length})</span>
              </h3>
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
                        className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 mb-1 break-words">{y.first_name} {y.last_name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="break-all">{y.email}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full text-xs font-semibold text-purple-800 border border-purple-200">
                                {relationshipType.toLowerCase()}
                              </span>
                              {isPrimary && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 rounded-full text-xs font-semibold text-yellow-800 border border-yellow-200">
                                  Primary
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' :
                                status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}>
                                {status}
                              </span>
                            </div>
                            {y.grade && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full text-xs font-semibold text-blue-800 border border-blue-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Grade {y.grade}
                              </span>
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
            </div>
          </div>
        </div>
      </div>
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
      <div className="flex gap-2 mt-3 pt-3 border-t border-indigo-200">
        {currentStatus === 'PENDING' && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Verify'}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Reject'}
            </button>
          </>
        )}
        {currentStatus === 'ACTIVE' && (
          <button
            onClick={handleResetClick}
            disabled={loading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Reset to Pending'}
          </button>
        )}
        {currentStatus === 'REJECTED' && (
          <>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={handleResetClick}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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