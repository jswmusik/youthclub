'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, FileText, Tag, Users, Building, ShieldCheck, CheckCircle2, XCircle, AlertCircle, List, ToggleLeft } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CustomFieldDetailProps {
  fieldId: string;
  basePath: string;
}

export default function CustomFieldDetailView({ fieldId, basePath }: CustomFieldDetailProps) {
  const searchParams = useSearchParams();
  const [field, setField] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (fieldId) {
        try {
          const [fieldRes, clubsRes] = await Promise.all([
            api.get(`/custom-fields/${fieldId}/`),
            api.get('/clubs/?page_size=1000').catch(() => ({ data: [] }))
          ]);
          setField(fieldRes.data);
          setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : clubsRes.data.results || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [fieldId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const fieldType = searchParams.get('field_type');
    const context = searchParams.get('context');
    const targetRole = searchParams.get('target_role');
    const status = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (fieldType) params.set('field_type', fieldType);
    if (context) params.set('context', context);
    if (targetRole) params.set('target_role', targetRole);
    if (status) params.set('status', status);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getFieldTypeLabel = (type: string) => {
    return type.replace('_', ' ');
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'TEXT':
        return <FileText className="h-5 w-5" />;
      case 'SINGLE_SELECT':
      case 'MULTI_SELECT':
        return <List className="h-5 w-5" />;
      case 'BOOLEAN':
        return <ToggleLeft className="h-5 w-5" />;
      default:
        return <Tag className="h-5 w-5" />;
    }
  };

  // Resolve club names
  const getClubNames = () => {
    if (!field?.specific_clubs || field.specific_clubs.length === 0) return [];
    return field.specific_clubs.map((club: any) => {
      const clubId = typeof club === 'object' ? club.id : club;
      const clubData = clubs.find(c => c.id === clubId);
      return clubData?.name || (typeof club === 'object' ? club.name : club);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
  
  if (!field) return (
    <div className="p-12 text-center text-red-500">Field not found.</div>
  );

  const clubNames = getClubNames();

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        </Link>
        
        {/* Edit Button */}
        <Link href={buildUrlWithParams(`${basePath}/edit/${field.id}`)}>
          <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white w-full sm:w-auto">
            <Edit className="h-4 w-4" />
            Edit Field
          </Button>
        </Link>
      </div>

      {/* Profile Header Card */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white">
        <CardContent className="p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Icon */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#4D4DA4] flex items-center justify-center flex-shrink-0 shadow-lg">
              <div className="text-white">
                {getFieldTypeIcon(field.field_type)}
              </div>
            </div>
            
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121213] break-words">
                  {field.name}
                </h1>
                {field.help_text && (
                  <p className="text-gray-600 mt-2 break-words">{field.help_text}</p>
                )}
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={field.is_published 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-gray-50 text-gray-600 border-gray-200"
                  }
                >
                  {field.is_published ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
                {field.required && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Required
                  </Badge>
                )}
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {getFieldTypeLabel(field.field_type)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <Tag className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Field Type</p>
                    <p className="text-lg font-bold text-[#4D4DA4] break-words">{getFieldTypeLabel(field.field_type)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-100 shadow-sm bg-[#EBEBFE]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-[#4D4DA4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-semibold">Context</p>
                    <p className="text-lg font-bold text-[#4D4DA4] break-words">
                      {field.context === 'EVENT' ? 'Event Booking' : 'User Profile'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Field Details */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#121213]">Field Details</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Field Type</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {getFieldTypeLabel(field.field_type)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Context</label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {field.context === 'EVENT' ? 'Event Booking' : 'User Profile'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                    <p className="text-gray-900 font-medium">
                      <Badge 
                        variant="outline" 
                        className={field.is_published 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-gray-50 text-gray-600 border-gray-200"
                        }
                      >
                        {field.is_published ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Required</label>
                    <p className="text-gray-900 font-medium">
                      <Badge 
                        variant="outline" 
                        className={field.required 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : "bg-gray-50 text-gray-600 border-gray-200"
                        }
                      >
                        {field.required ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options Section */}
          {(field.field_type === 'SINGLE_SELECT' || field.field_type === 'MULTI_SELECT') && field.options && field.options.length > 0 && (
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                  <List className="h-5 w-5 text-[#4D4DA4]" />
                  Available Options ({field.options.length})
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {field.options.map((opt: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20 px-3 py-1.5"
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Limited to Clubs Section */}
          {clubNames.length > 0 && (
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#4D4DA4]" />
                  Limited to Clubs ({clubNames.length})
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {clubNames.map((name: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="bg-pink-50 text-pink-700 border-pink-200 px-3 py-1.5"
                    >
                      <Building className="h-3 w-3 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Target Roles Card */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#4D4DA4]" />
                Target Roles
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              {field.target_roles && field.target_roles.length > 0 ? (
                <div className="space-y-2">
                  {field.target_roles.map((role: string) => (
                    <Badge 
                      key={role} 
                      variant="outline" 
                      className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20 px-3 py-1.5 w-full justify-start"
                    >
                      <Users className="h-3 w-3 mr-2" />
                      {role === 'YOUTH_MEMBER' ? 'Youth Members' : 'Guardians'}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No target roles specified.</p>
              )}
            </CardContent>
          </Card>

          {/* Owner Info Card */}
          {field.owner_role && (
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#121213] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#4D4DA4]" />
                  Owner
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="p-4 rounded-lg bg-[#EBEBFE]/30 border border-[#4D4DA4]/20">
                  <p className="font-semibold text-[#121213]">
                    {field.owner_role === 'SUPER_ADMIN' ? 'Super Admin' : 
                     field.owner_role === 'MUNICIPALITY_ADMIN' ? 'Municipality Admin' : 
                     'Club Admin'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
