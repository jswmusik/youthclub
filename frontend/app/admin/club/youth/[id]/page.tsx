'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { getMediaUrl } from '../../../../utils';

interface Option { id: number; name: string; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }

function YouthViewPageContent() {
  const router = useRouter();
  const params = useParams();
  const youthId = params?.id as string;

  const [youth, setYouth] = useState<any>(null);
  const [clubs, setClubs] = useState<Option[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  const [guardiansList, setGuardiansList] = useState<GuardianOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (youthId) {
      fetchData();
    }
  }, [youthId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await api.get(`/users/${youthId}/`);
      setYouth(userRes.data);

      const clubRes = await api.get('/clubs/?page_size=1000');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : (clubRes.data?.results || []));

      const interestRes = await api.get('/interests/');
      setInterests(Array.isArray(interestRes.data) ? interestRes.data : (interestRes.data?.results || []));

      const guardianRes = await api.get('/users/list_guardians/');
      setGuardiansList(guardianRes.data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Youth member not found or access denied.' : 'Failed to load youth member');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading youth member...</p>
      </div>
    );
  }

  if (error || !youth) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || 'Youth member not found.'}</p>
        </div>
        <Link href="/admin/club/youth" className="text-green-600 hover:text-green-800 font-semibold">
          ← Back to Youth Members
        </Link>
      </div>
    );
  }

  const interestIds = youth.interests?.map((i: any) => (typeof i === 'object' ? i.id : i)) || [];
  const guardianIds = youth.guardians || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/club/youth" className="text-green-600 hover:text-green-800 font-semibold">
          ← Back to Youth Members
        </Link>
        <button
          onClick={() => router.push(`/admin/club/youth?edit=${youth.id}`)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow"
        >
          Edit Youth
        </button>
      </div>

      <section className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6 border-b pb-6">
          {youth.avatar && (
            <img
              src={getMediaUrl(youth.avatar) || ''}
              alt={`${youth.first_name} ${youth.last_name}`}
              className="w-32 h-32 rounded-full object-cover border-4 border-green-100"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <div>
            <p className="text-sm text-green-500 uppercase font-semibold">Youth Profile</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {youth.first_name} {youth.last_name}
              {youth.nickname && <span className="text-xl text-gray-500 ml-2">({youth.nickname})</span>}
            </h1>
            <p className="text-gray-600 mt-2">{youth.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                youth.verification_status === 'VERIFIED'
                  ? 'bg-green-100 text-green-700'
                  : youth.verification_status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {youth.verification_status || 'UNVERIFIED'}
              </span>
              {youth.phone_number && <span className="text-sm text-gray-600">📞 {youth.phone_number}</span>}
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
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Date of Birth</p>
                <p className="text-gray-900">{youth.date_of_birth || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Age</p>
                <p className="text-gray-900">{calculateAge(youth.date_of_birth) || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Grade</p>
                <p className="text-gray-900">{youth.grade || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Legal Gender</p>
                <p className="text-gray-900">{youth.legal_gender || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Preferred Gender</p>
                <p className="text-gray-900">{youth.preferred_gender || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Preferred Club</p>
                <p className="text-gray-900">{clubs.find((c) => c.id === youth.preferred_club)?.name || '-'}</p>
              </div>
            </div>
          </section>

          {guardianIds.length > 0 && (
            <section className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Assigned Guardians</h2>
              <div className="space-y-3">
                {guardianIds.map((guardianId: number) => {
                  const guardian = guardiansList.find((g) => g.id === guardianId);
                  if (!guardian) return null;
                  return (
                    <div key={guardianId} className="p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">
                        {guardian.first_name} {guardian.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{guardian.email}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {interestIds.length > 0 && (
            <section className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interestIds.map((interestId: number) => {
                  const interest = interests.find((i) => i.id === interestId);
                  if (!interest) return null;
                  return (
                    <span
                      key={interestId}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                    >
                      {interest.name}
                    </span>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Account Information</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Date Joined</p>
                <p>{youth.date_joined ? new Date(youth.date_joined).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Last Login</p>
                <p>{youth.last_login ? new Date(youth.last_login).toLocaleDateString() : 'Never'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Preferred Language</p>
                <p>{youth.preferred_language || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Account Status</p>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    youth.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {youth.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 space-y-2">
            <button
              onClick={() => router.push(`/admin/club/youth?edit=${youth.id}`)}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Edit Youth
            </button>
            <Link
              href="/admin/club/youth"
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

export default function YouthViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <YouthViewPageContent />
    </Suspense>
  );
}