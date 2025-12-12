'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface InterestDetailProps {
  interestId: string;
  basePath: string;
}

export default function InterestDetailView({ interestId, basePath }: InterestDetailProps) {
  const searchParams = useSearchParams();
  const [interest, setInterest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/interests/${interestId}/`).then(res => {
      setInterest(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [interestId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
  if (!interest) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-red-500">Interest not found.</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        </Link>
        
        <Link href={buildUrlWithParams(`${basePath}/edit/${interest.id}`)}>
          <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Edit className="h-4 w-4" />
            Edit Interest
          </Button>
        </Link>
      </div>

      {/* Interest Header Card */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white">
        {/* Cover Section */}
        <div 
          className="h-32 md:h-48 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485] relative w-full"
          style={{
            backgroundImage: interest.avatar ? `url(${getMediaUrl(interest.avatar)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <CardContent className="p-6 sm:p-10 pt-6 sm:pt-10 bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-20">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-white shadow-lg bg-white flex-shrink-0">
              {interest.avatar ? (
                <AvatarImage src={getMediaUrl(interest.avatar) || undefined} className="object-cover" />
              ) : (
                <AvatarFallback className="text-4xl sm:text-5xl font-bold text-[#4D4DA4] bg-white rounded-2xl flex items-center justify-center">
                  {interest.icon || interest.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="text-center sm:text-left flex-1 space-y-3 pt-4 sm:pt-0">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#121213]">
                  {interest.icon && <span className="mr-2">{interest.icon}</span>}
                  {interest.name}
                </h1>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-600">
                  ID: {interest.id}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Card */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#121213] mb-4">Interest Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="text-base font-semibold text-[#121213]">{interest.name}</p>
                </div>
                {interest.icon && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Icon</p>
                    <p className="text-3xl">{interest.icon}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Interest ID</p>
                  <p className="text-base font-semibold text-[#121213]">{interest.id}</p>
                </div>
                {interest.avatar && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cover Image</p>
                    <p className="text-sm text-gray-600">Uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
