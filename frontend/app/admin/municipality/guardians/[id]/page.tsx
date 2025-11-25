'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { getMediaUrl } from '../../../../utils';

interface YouthOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  grade: number | null;
}

function MunicipalityGuardianViewContent() {
  const router = useRouter();
  const params = useParams();
  const guardianId = params?.id as string;

  const [guardian, setGuardian] = useState<any>(null);
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
      const userRes = await api.get(`/users/${guardianId}/`);
      setGuardian(userRes.data);

      const youthRes = await api.get('/users/list_youth/');
      setYouthList(Array.isArray(youthRes.data) ? youthRes.data : []);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Guardian not found or access denied.' : 'Failed to load guardian');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading guardian...</p>
      </div>
    );
  }

  if (error || !guardian) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || 'Guardian not found.'}</p>
        </div>
        <Link href="/admin/municipality/guardians" className="text-purple-600 hover:text-purple-800 font-semibold">
          ← Back to Guardians
        </Link>
      </div>
    );
  }

  const youthIds = guardian.youth_members || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/municipality/guardians" className="text-purple-600 hover:text-purple-800 font-semibold">
          ← Back to Guardians
        </Link>
        <button
          onClick={() => router.push(`/admin/municipality/guardians?edit=${guardian.id}`)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow"
        >
          Edit Guardian
        </button>
      </div>

      <section className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6 border-b pb-6">
          {guardian.avatar && (
            <img
              src={getMediaUrl(guardian.avatar) || ''}
              alt={`${guardian.first_name} ${guardian.last_name}`}
              className="w-32 h-32 rounded-full object-cover border-4 border-purple-100"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <div>
            <p className="text-sm text-purple-500 uppercase font-semibold">Guardian Profile</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {guardian.first_name} {guardian.last_name}
            </h1>
            <p className="text-gray-600 mt-2">{guardian.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                guardian.verification_status === 'VERIFIED'
                  ? 'bg-green-100 text-green-700'
                  : guardian.verification_status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {guardian.verification_status || 'UNVERIFIED'}
              </span>
              {guardian.phone_number && <span className="text-sm text-gray-600">📞 {guardian.phone_number}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">First Name</p>
                <p className="text-gray-900">{guardian.first_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Last Name</p>
                <p className="text-gray-900">{guardian.last_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Email</p>
                <p className="text-gray-900">{guardian.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Phone Number</p>
                <p className="text-gray-900">{guardian.phone_number || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Legal Gender</p>
                <p className="text-gray-900">{guardian.legal_gender || '-'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Connected Youth Members</h2>
            {youthIds.length === 0 ? (
              <p className="text-gray-500">No youth members connected to this guardian.</p>
            ) : (
              <div className="space-y-3">
                {youthIds.map((yid: number) => {
                  const youth = youthList.find((y) => y.id === yid);
                  if (!youth) return null;
                  return (
                    <div key={yid} className="p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">
                        {youth.first_name} {youth.last_name} {youth.grade ? `(Grade ${youth.grade})` : ''}
                      </p>
                      <p className="text-xs text-gray-500">{youth.email}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Account Information</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Date Joined</p>
                <p>{guardian.date_joined ? new Date(guardian.date_joined).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Last Login</p>
                <p>{guardian.last_login ? new Date(guardian.last_login).toLocaleDateString() : 'Never'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Preferred Language</p>
                <p>{guardian.preferred_language || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Account Status</p>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    guardian.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {guardian.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 space-y-2">
            <button
              onClick={() => router.push(`/admin/municipality/guardians?edit=${guardian.id}`)}
              className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
            >
              Edit Guardian
            </button>
            <Link
              href="/admin/municipality/guardians"
              className="block w-full text-center bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200"
            >
              Back to List
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function MunicipalityGuardianViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <MunicipalityGuardianViewContent />
    </Suspense>
  );
}
