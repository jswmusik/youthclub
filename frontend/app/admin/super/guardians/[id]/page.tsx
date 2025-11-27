'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { getMediaUrl } from '../../../../utils';
import CustomFieldsDisplay from '../../../../components/CustomFieldsDisplay';

interface YouthOption { id: number; first_name: string; last_name: string; email: string; grade: number; }

function GuardianViewPageContent() {
  const router = useRouter();
  const params = useParams();
  const guardianId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [youthList, setYouthList] = useState<YouthOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guardianId) {
      fetchData();
    }
  }, [guardianId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch user data
      const userRes = await api.get(`/users/${guardianId}/`);
      setUser(userRes.data);

      // Fetch youth list for display
      const youthRes = await api.get('/users/list_youth/');
      setYouthList(youthRes.data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Guardian not found' : 'Failed to load guardian');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading guardian details...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || 'Guardian not found'}</p>
        </div>
        <Link href="/admin/super/guardians" className="text-blue-600 hover:text-blue-800">
          ← Back to Guardians
        </Link>
      </div>
    );
  }

  // Normalize youth_members (handle API variations)
  const youthIds = user.youth_members || [];

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/super/guardians" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Guardians
        </Link>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/admin/super/guardians?edit=${user.id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* PROFILE HEADER */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-8">
          <div className="flex items-center gap-6 pb-6 border-b">
            {user.avatar && (
              <img 
                src={getMediaUrl(user.avatar) || ''} 
                alt={`${user.first_name} ${user.last_name}`}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                onError={(e) => (e.target as HTMLImageElement).style.display='none'} 
              />
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-lg text-gray-600 mb-3">{user.email}</p>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  user.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                  user.verification_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {user.verification_status || 'UNVERIFIED'}
                </span>
                {user.phone_number && (
                  <span className="text-sm text-gray-600">📞 {user.phone_number}</span>
                )}
                {user.is_active !== undefined && (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* BASIC INFORMATION */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">First Name</p>
                <p className="text-gray-900 font-medium">{user.first_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Last Name</p>
                <p className="text-gray-900 font-medium">{user.last_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Email</p>
                <p className="text-gray-900 font-medium">{user.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Phone Number</p>
                <p className="text-gray-900 font-medium">{user.phone_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">Legal Gender</p>
                <p className="text-gray-900 font-medium">{user.legal_gender || '-'}</p>
              </div>
            </div>
          </div>

          {/* CONNECTED YOUTH MEMBERS */}
          {youthIds.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Connected Youth Members</h2>
              <div className="space-y-3">
                {youthIds.map((youthId: number) => {
                  const youth = youthList.find(y => y.id === youthId);
                  return youth ? (
                    <div key={youthId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {youth.first_name} {youth.last_name} (Grade {youth.grade})
                        </p>
                        <p className="text-xs text-gray-500">{youth.email}</p>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {youthIds.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Connected Youth Members</h2>
              <p className="text-gray-500">No youth members connected to this guardian.</p>
            </div>
          )}

          {/* CUSTOM FIELDS */}
          <CustomFieldsDisplay
            userId={user.id}
            targetRole="GUARDIAN"
            context="USER_PROFILE"
          />
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* ACCOUNT INFO */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Date Joined</p>
                <p className="text-sm font-medium">
                  {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Last Login</p>
                <p className="text-sm font-medium">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Account Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Preferred Language</p>
                <p className="text-sm font-medium">{user.preferred_language || '-'}</p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/admin/super/guardians?edit=${user.id}`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
              >
                Edit Profile
              </button>
              <Link
                href="/admin/super/guardians"
                className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-center"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuardianViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <GuardianViewPageContent />
    </Suspense>
  );
}

