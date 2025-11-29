'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';

interface CustomFieldDetailProps {
  fieldId: string;
  basePath: string;
}

export default function CustomFieldDetailView({ fieldId, basePath }: CustomFieldDetailProps) {
  const searchParams = useSearchParams();
  const [field, setField] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fieldId) {
      api.get(`/custom-fields/${fieldId}/`)
        .then(res => {
          setField(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [fieldId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>;
  if (!field) return <div className="p-12 text-center text-red-500">Field not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Field Details</h1>
          <p className="text-gray-500 mt-1">View and manage field configuration</p>
        </div>
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{field.name}</h2>
              {field.help_text && (
                <p className="text-gray-600 text-sm">{field.help_text}</p>
              )}
            </div>
            <div className="flex gap-2">
              {field.required && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Required
                </span>
              )}
              {field.is_published ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field Type */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Field Type
              </label>
              <p className="text-gray-900 font-semibold text-lg">{field.field_type.replace('_', ' ')}</p>
            </div>

            {/* Context */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Context
              </label>
              <p className="text-gray-900 font-semibold text-lg">{field.context === 'EVENT' ? 'Event Booking' : 'User Profile'}</p>
            </div>

            {/* Target Roles */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Target Roles
              </label>
              <div className="flex gap-2 flex-wrap mt-1">
                {field.target_roles?.map((role: string) => (
                  <span key={role} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                    {role === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                  </span>
                ))}
              </div>
            </div>

            {/* Owner Info */}
            {field.owner_role && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Owner
                </label>
                <p className="text-gray-900 font-semibold text-lg">
                  {field.owner_role === 'SUPER_ADMIN' ? 'Super Admin' : 
                   field.owner_role === 'MUNICIPALITY_ADMIN' ? 'Municipality Admin' : 
                   'Club Admin'}
                </p>
              </div>
            )}
          </div>

          {/* Options Section */}
          {(field.field_type === 'SINGLE_SELECT' || field.field_type === 'MULTI_SELECT') && field.options && field.options.length > 0 && (
            <div className="mt-6 bg-blue-50 rounded-lg p-5 border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Available Options ({field.options.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {field.options.map((opt: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-blue-200 text-blue-900 rounded-lg text-sm font-medium shadow-sm">
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Limited to Clubs Section */}
          {field.specific_clubs && field.specific_clubs.length > 0 && (
            <div className="mt-6 bg-purple-50 rounded-lg p-5 border border-purple-100">
              <label className="block text-xs font-bold text-purple-800 uppercase mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Limited to Clubs ({field.specific_clubs.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {field.specific_clubs.map((club: any) => (
                  <span key={club.id || club} className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-purple-200 text-purple-900 rounded-lg text-sm font-medium shadow-sm">
                    {club.name || club}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Link 
            href={buildUrlWithParams(`${basePath}/edit/${field.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-900 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Field
          </Link>
        </div>
      </div>
    </div>
  );
}

