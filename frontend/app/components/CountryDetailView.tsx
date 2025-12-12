'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Calendar, Globe, CreditCard, Clock, MapPin } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    return <div className="py-20 text-center text-gray-400 animate-pulse">Loading details...</div>;
  }

  if (!country) {
    return <div className="py-20 text-center text-red-600">Country not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href={basePath}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </Link>
        <Link href={`${basePath}/edit/${country.id}`}>
          <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white shadow-sm">
            <Edit className="h-4 w-4" /> Edit Country
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden border border-gray-100 shadow-sm">
        {/* Header Section */}
        <div className="relative h-32 bg-[#EBEBFE]/30 border-b border-gray-100">
          {/* Background pattern or color can go here */}
        </div>
        
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Avatar / Flag */}
            <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-md bg-white flex-shrink-0">
              <AvatarImage src={getMediaUrl(country.avatar)} className="object-cover" />
              <AvatarFallback className="rounded-2xl text-2xl font-bold bg-[#EBEBFE] text-[#4D4DA4]">
                {country.country_code}
              </AvatarFallback>
            </Avatar>

            {/* Title & Badges */}
            <div className="flex-1 space-y-2 pt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{country.name}</h1>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <Globe className="h-3 w-3" />
                    <span>International Region</span>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit text-base font-mono border-[#4D4DA4]/20 text-[#4D4DA4] bg-[#EBEBFE]/30 px-3 py-1">
                  {country.country_code}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content Section */}
        <CardContent className="p-6 grid gap-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <CreditCard className="h-4 w-4 text-[#FF5485]" /> Currency
              </div>
              <p className="text-lg font-bold text-gray-900">{country.currency_code || '-'}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Globe className="h-4 w-4 text-[#FF5485]" /> Language
              </div>
              <p className="text-lg font-bold text-gray-900">{country.default_language || '-'}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Clock className="h-4 w-4 text-[#FF5485]" /> Timezone
              </div>
              <p className="text-lg font-bold text-gray-900">{country.timezone || 'UTC'}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Description</h3>
            <div className="text-sm leading-relaxed text-gray-600 bg-gray-50/50 p-4 rounded-lg border border-gray-100">
              {country.description || <span className="italic text-gray-400">No description provided.</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
