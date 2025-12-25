'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Globe, CreditCard, Clock, Flag, MapPin, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface CountryDetailProps {
  countryId: string;
  basePath: string;
}

export default function CountryDetailView({ countryId, basePath }: CountryDetailProps) {
  const [country, setCountry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/countries/${countryId}/`).then(res => {
      setCountry(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [countryId]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          <span className="text-[var(--brand-light)]/60">Loading details...</span>
        </div>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center">
            <Globe className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-red)]">Country not found.</p>
          <Link 
            href={basePath}
            className="text-sm text-[var(--brand-primary)] hover:underline"
          >
            ← Back to countries list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
        <Link 
          href={basePath}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Link>
        <Link 
          href={`${basePath}/edit/${country.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
        >
          <Edit className="h-4 w-4" /> Edit Country
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-32 sm:h-40 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
          
          {/* Country Code Badge - Top Right */}
          <div className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-[var(--dark-800)]/80 backdrop-blur-sm border border-[var(--dark-500)]">
            <span className="text-lg font-mono font-bold text-[var(--brand-primary)]">{country.country_code}</span>
          </div>
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar / Flag */}
            <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {country.avatar ? (
                <img 
                  src={getMediaUrl(country.avatar)} 
                  alt={country.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{country.country_code}</span>
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{country.name}</h1>
              <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                <Globe className="h-4 w-4" />
                <span>International Region</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--dark-600)] mx-4 sm:mx-6" />

        {/* Content Section */}
        <div className="p-4 sm:p-6 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Currency Card */}
            <div className="p-5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--brand-light)]/60">Currency</span>
              </div>
              <p className="text-2xl font-bold text-[var(--brand-light)]">
                {country.currency_code || <span className="text-[var(--brand-light)]/30">—</span>}
              </p>
            </div>

            {/* Language Card */}
            <div className="p-5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-blue)] flex items-center justify-center shadow-lg shadow-[var(--brand-purple)]/20">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--brand-light)]/60">Language</span>
              </div>
              <p className="text-2xl font-bold text-[var(--brand-light)]">
                {country.default_language || <span className="text-[var(--brand-light)]/30">—</span>}
              </p>
            </div>

            {/* Timezone Card */}
            <div className="p-5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center shadow-lg shadow-[var(--brand-third)]/20">
                  <Clock className="h-5 w-5 text-[var(--dark-900)]" />
                </div>
                <span className="text-sm font-medium text-[var(--brand-light)]/60">Timezone</span>
              </div>
              <p className="text-2xl font-bold text-[var(--brand-light)]">
                {country.timezone || 'UTC'}
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Description</h3>
            <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
              {country.description ? (
                <p className="text-sm leading-relaxed text-[var(--brand-light)]/80">{country.description}</p>
              ) : (
                <p className="text-sm italic text-[var(--brand-light)]/30">No description provided.</p>
              )}
            </div>
          </div>

          {/* Metadata Footer */}
          {(country.created_at || country.updated_at) && (
            <div className="pt-4 border-t border-[var(--dark-600)]">
              <div className="flex flex-wrap gap-4 text-xs text-[var(--brand-light)]/40">
                {country.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created: {new Date(country.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {country.updated_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated: {new Date(country.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
