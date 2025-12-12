'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Globe, Phone, Mail, Facebook, Instagram, Building2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MunicipalityDetailViewProps {
  municipalityId: string;
  basePath: string;
}

export default function MunicipalityDetailView({ municipalityId, basePath }: MunicipalityDetailViewProps) {
  const router = useRouter();
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
      <div className="py-20 text-center text-gray-400 animate-pulse">Loading details...</div>
    );
  }

  if (!municipality) {
    return (
      <div className="py-20 text-center text-red-600">Municipality not found.</div>
    );
  }

  const socialMedia = typeof municipality.social_media === 'string' 
    ? JSON.parse(municipality.social_media) 
    : municipality.social_media || {};

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href={basePath}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </Link>
        <Link href={`${basePath}/edit/${municipality.id}`}>
          <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white shadow-sm">
            <Edit className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>

      {/* Hero Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#121213] text-white shadow-md">
        {/* Background Image Layer */}
        <div className="absolute inset-0 opacity-40">
          {municipality.hero_image && (
            <img src={getMediaUrl(municipality.hero_image)} className="w-full h-full object-cover" alt="Hero" />
          )}
        </div>
        <div className="relative p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-[#121213] shadow-xl bg-white flex-shrink-0">
            <AvatarImage src={getMediaUrl(municipality.avatar)} className="object-cover" />
            <AvatarFallback className="text-4xl font-bold text-[#4D4DA4]">M</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left flex-1 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{municipality.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                {municipality.country_name}
              </Badge>
              {municipality.municipality_code && (
                <Badge variant="outline" className="text-gray-300 border-white/20">
                  Code: {municipality.municipality_code}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                {municipality.description || <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </CardContent>
          </Card>

          {/* Clubs List (Preview) */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">Clubs ({clubs.length})</CardTitle>
              <Link href={`/admin/super/clubs?municipality=${municipality.id}`}>
                <Button variant="link" size="sm" className="text-[#4D4DA4]">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {clubs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No clubs registered yet.</p>
              ) : (
                <div className="grid gap-3">
                  {clubs.slice(0, 5).map(club => (
                    <div key={club.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                      <Avatar className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200">
                        <AvatarImage src={getMediaUrl(club.avatar)} />
                        <AvatarFallback className="text-gray-700 font-semibold">C</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{club.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{club.email || 'No email'}</p>
                      </div>
                      <Link href={`/admin/super/clubs/${club.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {municipality.email && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="truncate text-gray-700">{municipality.email}</span>
                </div>
              )}
              {municipality.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-gray-700">{municipality.phone}</span>
                </div>
              )}
              {municipality.website_link && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] flex-shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <a href={municipality.website_link} target="_blank" rel="noreferrer" className="text-[#4D4DA4] hover:underline truncate">
                    Website
                  </a>
                </div>
              )}
              
              <Separator className="my-4" />
              
              {/* Socials */}
              <div className="flex gap-2">
                {socialMedia.facebook && (
                  <a href={socialMedia.facebook} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Facebook className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {socialMedia.instagram && (
                  <a href={socialMedia.instagram} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="icon" className="text-pink-600 border-pink-200 hover:bg-pink-50">
                      <Instagram className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="border border-gray-100 shadow-sm bg-[#121213] text-white">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Self Registration</span>
                <Badge variant={municipality.allow_self_registration ? "default" : "destructive"} className={municipality.allow_self_registration ? "bg-green-500 hover:bg-green-500" : ""}>
                  {municipality.allow_self_registration ? "Allowed" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Guardian Required</span>
                <span className="font-semibold text-white">{municipality.require_guardian_at_registration ? "Yes" : "No"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
