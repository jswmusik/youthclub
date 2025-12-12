'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Copy, Building, MapPin, Globe, Users } from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Helper function to get initials from first and last name
const getInitials = (first?: string | null, last?: string | null): string => {
  const firstInitial = first?.charAt(0)?.toUpperCase() || '';
  const lastInitial = last?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}` || '?';
};

interface GroupDetailProps {
  groupId: string;
  basePath: string; // e.g. "/admin/super/groups"
}

export default function GroupDetailView({ groupId, basePath }: GroupDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MEMBERS' | 'SETTINGS'>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  
  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('club');
    const type = searchParams.get('type');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    if (club) params.set('club', club);
    if (type) params.set('type', type);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupRes, analyticsRes, membersRes, customFieldsRes] = await Promise.all([
        api.get(`/groups/${groupId}/`),
        api.get(`/groups/${groupId}/analytics/`),
        api.get(`/groups/${groupId}/members/`),
        api.get('/custom-fields/').catch(() => ({ data: [] })) // Fetch custom fields, but don't fail if it errors
      ]);
      setGroup(groupRes.data);
      setAnalytics(analyticsRes.data);
      setMembers(membersRes.data.results || membersRes.data);
      const fieldsData = Array.isArray(customFieldsRes.data) ? customFieldsRes.data : customFieldsRes.data.results;
      setCustomFields(fieldsData || []);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load group details.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  const handleDuplicate = async () => {
    try {
      await api.post(`/groups/${groupId}/duplicate/`);
      setToast({ message: 'Group duplicated! Check the list.', type: 'success', isVisible: true });
      setShowDuplicateConfirm(false);
      setTimeout(() => router.push(buildUrlWithParams(basePath)), 1000);
    } catch (err) {
      setToast({ message: 'Failed to duplicate.', type: 'error', isVisible: true });
      setShowDuplicateConfirm(false);
    }
  };

  const handleApproveMember = async (membershipId: number) => {
    try {
      await api.post(`/groups/${groupId}/approve_member/`, { membership_id: membershipId });
      setToast({ message: 'Member approved.', type: 'success', isVisible: true });
      fetchData(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to approve.', type: 'error', isVisible: true });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.post(`/groups/${groupId}/remove_member/`, { membership_id: memberToRemove });
      setToast({ message: 'Member removed.', type: 'success', isVisible: true });
      setMemberToRemove(null);
      fetchData();
    } catch (err) {
      setToast({ message: 'Failed to remove member.', type: 'error', isVisible: true });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
  if (!group) return <div className="p-12 text-center text-red-500">Group not found.</div>;

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'OPEN': return 'bg-green-50 text-green-700 border-green-200';
      case 'APPLICATION': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

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
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!group.is_system_group && (
            <>
              <Link href={buildUrlWithParams(`${basePath}/edit/${group.id}`)}>
                <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDuplicateConfirm(true)}
                className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Group Info Card */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24 rounded-lg border-2 border-gray-200">
                <AvatarImage src={group.avatar ? getMediaUrl(group.avatar) : undefined} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-[#EBEBFE] text-[#4D4DA4] text-2xl font-bold">
                  {group.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#121213]">{group.name}</h1>
                <Badge variant="outline" className={getBadgeStyle(group.group_type)}>
                  {group.group_type}
                </Badge>
              </div>

              {/* Context Info */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {group.club_name && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 gap-1">
                    <Building className="h-3 w-3" />
                    {group.club_name}
                  </Badge>
                )}
                {group.municipality_name && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 gap-1">
                    <MapPin className="h-3 w-3" />
                    {group.municipality_name}
                  </Badge>
                )}
                {!group.club_name && !group.municipality_name && !group.is_system_group && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 gap-1">
                    <Globe className="h-3 w-3" />
                    Global Group
                  </Badge>
                )}
              </div>

              <p className="text-gray-500">{group.description || 'No description provided.'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {['DASHBOARD', 'MEMBERS', 'SETTINGS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "pb-4 px-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab 
                  ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'DASHBOARD' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_members}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">New This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{analytics.new_this_week}</div>
            </CardContent>
          </Card>
          
          {/* Gender Dist */}
          <Card className="md:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {Object.entries(analytics.gender_distribution || {}).map(([key, val]: any) => (
                  <div key={key} className="text-center bg-gray-50 p-3 rounded-lg min-w-[80px]">
                    <span className="block text-xl font-bold text-gray-800">{val}</span>
                    <span className="text-xs text-gray-500 uppercase">{key || 'Unset'}</span>
                  </div>
                ))}
                {Object.keys(analytics.gender_distribution || {}).length === 0 && (
                  <p className="text-sm text-gray-400">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade Dist */}
          <Card className="col-span-1 md:col-span-4 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.grade_distribution || {}).map(([grade, count]: any) => (
                  <Badge key={grade} variant="outline" className="bg-[#4D4DA4] text-white border-[#4D4DA4] px-3 py-1">
                    Grade {grade}: {count}
                  </Badge>
                ))}
                {Object.keys(analytics.grade_distribution || {}).length === 0 && (
                  <p className="text-sm text-gray-400">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#121213]">Group Members</h2>
              <p className="text-sm text-gray-500 mt-1">
                {members.length} {members.length === 1 ? 'member' : 'members'} total
              </p>
            </div>
          </div>

          {/* Members Table */}
          <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
            {members.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No members in this group yet</p>
                <p className="text-sm text-gray-400 mt-1">Members will appear here once they join</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="h-12 text-gray-600 font-semibold">Member</TableHead>
                    <TableHead className="h-12 text-gray-600 font-semibold">Email</TableHead>
                    <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                    <TableHead className="h-12 text-gray-600 font-semibold">Joined</TableHead>
                    <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => (
                    <TableRow key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50">
                            <AvatarImage src={m.user_avatar ? getMediaUrl(m.user_avatar) : undefined} className="object-cover" />
                            <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                              {getInitials(m.user_first_name, m.user_last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[#121213]">{m.user_name}</div>
                            {m.user_first_name && m.user_last_name && (
                              <div className="text-xs text-gray-400">
                                {m.user_first_name} {m.user_last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">{m.user_email}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={
                          m.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 
                          m.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(m.joined_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {m.status === 'PENDING' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleApproveMember(m.id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve member"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setMemberToRemove(m.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remove member"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'SETTINGS' && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Group Settings</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Target Audience</span>
                <p className="text-sm text-[#121213] font-medium">{group.target_member_type === 'YOUTH' ? 'Youth Members' : 'Guardians'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Age Range</span>
                <p className="text-sm text-[#121213] font-medium">
                  {group.min_age || 0} - {group.max_age || 'Any'} years
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Allowed Grades</span>
                <p className="text-sm text-[#121213] font-medium">
                  {group.grades?.length > 0 ? group.grades.join(', ') : 'All Grades'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Allowed Genders</span>
                <p className="text-sm text-[#121213] font-medium">
                  {group.genders?.length > 0 ? group.genders.join(', ') : 'All Genders'}
                </p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase block">Required Interests</span>
                <div className="flex flex-wrap gap-2">
                  {group.interests_details?.map((i: any) => (
                    <Badge key={i.id} variant="outline" className="bg-[#4D4DA4] text-white border-[#4D4DA4]">
                      {i.name}
                    </Badge>
                  ))}
                  {(!group.interests_details || group.interests_details.length === 0) && (
                    <span className="text-sm text-gray-400 italic">None</span>
                  )}
                </div>
              </div>
              {group.custom_field_rules && Object.keys(group.custom_field_rules).length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase block">Custom Field Rules</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(group.custom_field_rules).map(([fieldId, value]: [string, any]) => {
                      const field = customFields.find((f: any) => f.id.toString() === fieldId);
                      const fieldName = field?.name || `Field #${fieldId}`;
                      let displayValue = value;
                      if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                      }
                      return (
                        <Badge key={fieldId} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <b>{fieldName}</b>: {displayValue}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODALS */}
      <ConfirmationModal
        isVisible={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message="Are you sure you want to remove this member from the group?"
        confirmButtonText="Remove"
        variant="warning"
      />

      <ConfirmationModal
        isVisible={showDuplicateConfirm}
        onClose={() => setShowDuplicateConfirm(false)}
        onConfirm={handleDuplicate}
        title="Duplicate Group"
        message="Create a copy of this group?"
        confirmButtonText="Duplicate"
        cancelButtonText="Cancel"
        variant="info"
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}