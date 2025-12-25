'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Edit, Globe, Phone, Mail, Facebook, Instagram, 
  Building2, ExternalLink, MapPin, Users, Shield, Calendar, 
  Clock, CheckCircle, XCircle, Link as LinkIcon
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface MunicipalityDetailViewProps {
  municipalityId: string;
  basePath: string;
}

export default function MunicipalityDetailView({ municipalityId, basePath }: MunicipalityDetailViewProps) {
  const searchParams = useSearchParams();
  const [municipality, setMunicipality] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (municipalityId) {
      fetchData();
    }
  }, [municipalityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [munRes, clubRes] = await Promise.all([
        api.get(`/municipalities/${municipalityId}/`),
        api.get(`/clubs/?municipality=${municipalityId}&page_size=10`)
      ]);
      setMunicipality(munRes.data);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) { 
      console.error(err); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading municipality details...</span>
        </div>
      </div>
    );
  }

  if (!municipality) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-red)]">Municipality not found.</p>
          <Link 
            href={basePath}
            className="text-sm text-[var(--brand-primary)] hover:underline"
          >
            ← Back to municipalities list
          </Link>
        </div>
      </div>
    );
  }

  const socialMedia = typeof municipality.social_media === 'string' 
    ? JSON.parse(municipality.social_media) 
    : municipality.social_media || {};

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
          href={`${basePath}/edit/${municipality.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
        >
          <Edit className="h-4 w-4" /> Edit Municipality
        </Link>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner with Hero Image */}
        <div className="relative h-36 sm:h-48 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20">
          {/* Background Image */}
          {municipality.hero_image && (
            <div className="absolute inset-0">
              <img 
                src={getMediaUrl(municipality.hero_image)} 
                className="w-full h-full object-cover opacity-40" 
                alt="Hero" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-transparent to-transparent" />
            </div>
          )}
          
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
          
          {/* Country Badge - Top Right */}
          <div className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-[var(--dark-800)]/80 backdrop-blur-sm border border-[var(--dark-500)]">
            <span className="text-sm font-semibold text-[var(--brand-light)]">{municipality.country_name}</span>
          </div>

          {/* Municipality Code Badge */}
          {municipality.municipality_code && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-[var(--dark-800)]/80 backdrop-blur-sm border border-[var(--dark-500)]">
              <span className="text-xs font-mono font-bold text-[var(--brand-primary)]">{municipality.municipality_code}</span>
            </div>
          )}
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {municipality.avatar ? (
                <img 
                  src={getMediaUrl(municipality.avatar)} 
                  alt={municipality.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">M</span>
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{municipality.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                  <Globe className="h-4 w-4" />
                  <span>{municipality.country_name}</span>
                </div>
                {/* Registration Status */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  municipality.allow_self_registration 
                    ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' 
                    : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                }`}>
                  {municipality.allow_self_registration ? (
                    <><CheckCircle className="w-3 h-3" /> Open Registration</>
                  ) : (
                    <><XCircle className="w-3 h-3" /> Restricted</>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-6 px-0 sm:px-0">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-0 sm:space-y-6">
          
          {/* Description Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">About</h2>
            </div>
            <div className="p-6">
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                {municipality.description ? (
                  <p className="text-sm leading-relaxed text-[var(--brand-light)]/80 whitespace-pre-wrap">{municipality.description}</p>
                ) : (
                  <p className="text-sm italic text-[var(--brand-light)]/30">No description provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Clubs List Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[var(--brand-purple)]" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">
                  Clubs <span className="text-[var(--brand-light)]/50">({clubs.length})</span>
                </h2>
              </div>
              <Link 
                href={`/admin/super/clubs?municipality=${municipality.id}`}
                className="text-sm text-[var(--brand-primary)] hover:underline font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="p-4 sm:p-6">
              {clubs.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-[var(--brand-light)]/30" />
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/50">No clubs registered yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clubs.slice(0, 5).map(club => (
                    <div 
                      key={club.id} 
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {club.avatar ? (
                          <img src={getMediaUrl(club.avatar)} alt={club.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-[var(--brand-primary)]">C</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--brand-light)] truncate">{club.name}</h4>
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">{club.email || 'No email'}</p>
                      </div>
                      <Link href={`/admin/super/clubs/${club.id}`}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Contact Info Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Contact</h2>
            </div>
            <div className="p-6 space-y-4">
              {municipality.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)]/80 truncate">{municipality.email}</span>
                </div>
              )}
              {municipality.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-[var(--brand-third)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)]/80">{municipality.phone}</span>
                </div>
              )}
              {municipality.website_link && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <a 
                    href={municipality.website_link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-[var(--brand-primary)] hover:underline truncate"
                  >
                    Website →
                  </a>
                </div>
              )}
              
              {!municipality.email && !municipality.phone && !municipality.website_link && (
                <p className="text-sm text-[var(--brand-light)]/30 italic text-center py-4">No contact info provided.</p>
              )}
              
              {/* Social Media */}
              {(socialMedia.facebook || socialMedia.instagram) && (
                <>
                  <div className="h-px bg-[var(--dark-600)] my-4" />
                  <div className="flex gap-2">
                    {socialMedia.facebook && (
                      <a href={socialMedia.facebook} target="_blank" rel="noreferrer">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/30 transition-all">
                          <Facebook className="h-5 w-5" />
                        </button>
                      </a>
                    )}
                    {socialMedia.instagram && (
                      <a href={socialMedia.instagram} target="_blank" rel="noreferrer">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#E4405F]/20 text-[#E4405F] hover:bg-[#E4405F]/30 transition-all">
                          <Instagram className="h-5 w-5" />
                        </button>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Settings</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Self Registration */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)]/70">Self Registration</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  municipality.allow_self_registration 
                    ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' 
                    : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                }`}>
                  {municipality.allow_self_registration ? 'Allowed' : 'Disabled'}
                </span>
              </div>

              {/* Guardian Required */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)]/70">Guardian Required</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  municipality.require_guardian_at_registration 
                    ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]' 
                    : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'
                }`}>
                  {municipality.require_guardian_at_registration ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          {(municipality.created_at || municipality.updated_at) && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="p-4 space-y-3">
                {municipality.created_at && (
                  <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/40">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created: {new Date(municipality.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {municipality.updated_at && (
                  <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/40">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated: {new Date(municipality.updated_at).toLocaleDateString()}</span>
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
