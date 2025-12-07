'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api'; // Import
import { getMediaUrl } from '../../app/utils';
import CustomFieldsDisplay from './CustomFieldsDisplay';
import IndividualHistory from './questionnaires/IndividualHistory';

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

  // Helper
  const getInboxPath = () => {
    if (pathname.includes('/admin/super')) return '/admin/super/inbox';
    if (pathname.includes('/admin/municipality')) return '/admin/municipality/inbox';
    if (pathname.includes('/admin/club')) return '/admin/club/inbox';
    return '/admin/club/inbox'; // Fallback
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
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!user) return <div className="p-12 text-center text-red-500">User not found.</div>;

  // Resolve IDs
  const clubName = clubs.find(c => c.id === user.preferred_club)?.name || 'None';
  const userInterests = user.interests?.map((id: any) => {
      const iId = typeof id === 'object' ? id.id : id;
      return interests.find(x => x.id === iId);
  }).filter(Boolean) || [];
  
  // Guardians: The serializer returns full objects, not just IDs
  const userGuardians = user.guardians?.map((guardian: any) => {
    // If it's already an object with first_name, use it directly
    if (guardian && typeof guardian === 'object' && guardian.first_name) {
      return guardian;
    }
    // Otherwise, try to find it in the guardiansList (fallback)
    const guardianId = typeof guardian === 'object' ? guardian.id : guardian;
    return guardians.find(g => g.id === guardianId);
  }).filter(Boolean) || [];
  
  const age = calculateAge(user.date_of_birth);

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
          <div className="flex gap-3">
            {/* New Message Button */}
            <button 
              onClick={handleSendMessage}
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:text-indigo-600 shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
            {/* View Visits Button */}
            <Link 
              href={`${basePath}/${userId}/visits`} 
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:text-blue-600 shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Visits
            </Link>
            {/* View Attended Events Button */}
            <Link 
              href={`${basePath}/${userId}/attended-events`} 
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:text-green-600 shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Attended Events
            </Link>
            {/* View Questionnaires Button */}
            <Link 
              href={`${basePath}/${userId}/questionnaires`} 
              className="inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:text-purple-600 shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Questionnaires
            </Link>
            {/* Edit Profile Button */}
            <Link 
              href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Cover Section with Background Image or Gradient */}
        <div className="relative mb-32 md:mb-40">
          <div 
            className="h-48 md:h-64 rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            style={{
              backgroundImage: user.background_image ? `url(${getMediaUrl(user.background_image)})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
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
                      <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-xl">
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
                      {user.nickname && (
                        <span className="text-xl md:text-2xl font-normal text-gray-500 ml-2 md:ml-3">
                          (@{user.nickname})
                        </span>
                      )}
                    </h1>
                    <p className="text-base md:text-lg text-gray-600 mb-3 flex items-center gap-2 flex-wrap">
                      <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="break-all">{user.email}</span>
                    </p>
                    {/* Mood Status */}
                    {user.mood_status && (
                      <div className="mb-4 flex items-center gap-2 text-sm md:text-base text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 w-fit">
                        <span className="text-gray-500">💬</span>
                        <span className="font-medium">{user.mood_status}</span>
                      </div>
                    )}
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
                      {user.grade && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-blue-100 text-blue-800">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Grade {user.grade}
                        </span>
                      )}
                      {age && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-purple-100 text-purple-800">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {age} years old
                        </span>
                      )}
                      {clubName !== 'None' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-pink-100 text-pink-800">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {clubName}
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
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Age</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{age || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Grade</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{user.grade || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Gender</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{user.legal_gender || user.preferred_gender || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      {user.date_of_birth ? (
                        <>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {user.date_of_birth}
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
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preferred Gender</label>
                    <p className="text-gray-900 font-medium">{user.preferred_gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preferred Club</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="break-words">{clubName}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <CustomFieldsDisplay userId={user.id} targetRole="YOUTH_MEMBER" context="USER_PROFILE" />

            {/* Questionnaires Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">📋</span>
                <h3 className="text-xl font-bold text-gray-900">Questionnaires</h3>
              </div>
              <IndividualHistory userId={user.id} />
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            
            {/* Interests Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Interests
              </h3>
              {userInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userInterests.map((i: any) => (
                    <span 
                      key={i.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-full text-xs md:text-sm font-semibold hover:from-purple-200 hover:to-pink-200 transition-all"
                    >
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {i.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No interests selected yet.</p>
              )}
            </div>

            {/* Guardians Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Guardians
              </h3>
              {userGuardians.length > 0 ? (
                <div className="space-y-3">
                  {userGuardians.map((g: any) => (
                    <div 
                      key={g.id} 
                      className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-all"
                    >
                      <p className="font-bold text-gray-900 mb-1 break-words">{g.first_name} {g.last_name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="break-all">{g.email}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No guardians assigned.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}