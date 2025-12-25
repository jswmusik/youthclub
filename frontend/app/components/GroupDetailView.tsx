'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Edit, Copy, Building, MapPin, Globe, Users, BarChart3, 
  LayoutDashboard, UserCog, ChevronUp, Settings, Target, Heart, Layers,
  CheckCircle, X, Mail, Calendar, Shield, UserPlus, Trash2
} from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { getMediaUrl } from '../utils';

const getInitials = (first?: string | null, last?: string | null): string => {
  const firstInitial = first?.charAt(0)?.toUpperCase() || '';
  const lastInitial = last?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}` || '?';
};

interface GroupDetailProps {
  groupId: string;
  basePath: string;
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
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

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
        api.get('/custom-fields/').catch(() => ({ data: [] }))
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
      fetchData();
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

  const getTypeBadgeClasses = (type: string) => {
    switch (type) {
      case 'OPEN': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'APPLICATION': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'CLOSED': return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'PENDING': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-16 h-16 text-[var(--brand-light)]/20 mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-medium mb-1">Group not found</p>
          <p className="text-sm text-[var(--brand-light)]/50">The group you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="space-y-4 sm:space-y-6 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 pb-2">
          <Link 
            href={buildUrlWithParams(basePath)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Groups
          </Link>
          
          {!group.is_system_group && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDuplicateConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-purple)] hover:border-[var(--brand-purple)]/30 transition-all text-sm font-medium"
              >
                <Copy className="h-4 w-4" /> Duplicate
              </button>
              <Link 
                href={buildUrlWithParams(`${basePath}/edit/${group.id}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
              >
                <Edit className="h-4 w-4" /> Edit Group
              </Link>
            </div>
          )}
        </div>

        {/* Hero Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header Banner */}
          <div 
            className="relative h-32 sm:h-48 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20"
            style={{
              backgroundImage: group.cover_image ? `url(${getMediaUrl(group.cover_image)})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {group.cover_image && <div className="absolute inset-0 bg-[var(--dark-900)]/50" />}
            
            {!group.cover_image && (
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
                <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
              </div>
            )}
            
            {/* Type Badge - Top Right */}
            <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${getTypeBadgeClasses(group.group_type)}`}>
              <span className="text-sm font-semibold">{group.group_type}</span>
            </div>

            {/* System Group Badge - Top Left */}
            {group.is_system_group && (
              <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--brand-purple)]/20 border border-[var(--brand-purple)]/30">
                <span className="text-sm text-[var(--brand-purple)] font-medium flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> System Group
                </span>
              </div>
            )}
          </div>
          
          {/* Title Section */}
          <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-12 sm:-mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative z-20 w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl overflow-hidden flex-shrink-0">
                {group.avatar ? (
                  <img src={getMediaUrl(group.avatar)} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Layers className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex-1 space-y-2 pt-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                  {group.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  {group.club_name && (
                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                      <Building className="h-4 w-4" />
                      <span>{group.club_name}</span>
                    </div>
                  )}
                  {group.municipality_name && (
                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{group.municipality_name}</span>
                    </div>
                  )}
                  {!group.club_name && !group.municipality_name && !group.is_system_group && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                      <Globe className="w-3 h-3" /> Global
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2">{group.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analytics && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <button 
              onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
              className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-[var(--dark-700)]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">Analytics Dashboard</h2>
              </div>
              <ChevronUp className={`w-5 h-5 text-[var(--brand-light)]/50 transition-transform ${analyticsExpanded ? '' : 'rotate-180'}`} />
            </button>
            
            {analyticsExpanded && (
              <div className="px-4 sm:px-6 pb-6 pt-2">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Total Members */}
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-[var(--brand-primary)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--brand-light)]/70">Total</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--brand-light)]">{analytics.total_members || 0}</div>
                    <p className="text-xs text-[var(--brand-light)]/50 mt-1">members</p>
                  </div>

                  {/* New This Week */}
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-blue)]/30 hover:border-[var(--brand-blue)]/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-[var(--brand-blue)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--brand-light)]/70">New</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--brand-light)]">+{analytics.new_this_week || 0}</div>
                    <p className="text-xs text-[var(--brand-light)]/50 mt-1">this week</p>
                  </div>

                  {/* Gender Distribution */}
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-pink)]/30 hover:border-[var(--brand-pink)]/50 transition-all col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-pink)]/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-[var(--brand-pink)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--brand-light)]/70">Gender Distribution</span>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(analytics.gender_distribution || {}).map(([key, val]: any) => (
                        <div key={key} className="text-center bg-[var(--dark-600)]/50 px-4 py-2 rounded-lg border border-[var(--dark-500)]">
                          <span className="block text-lg font-bold text-[var(--brand-light)]">{val}</span>
                          <span className="text-xs text-[var(--brand-light)]/50 uppercase">{key || 'Unset'}</span>
                        </div>
                      ))}
                      {Object.keys(analytics.gender_distribution || {}).length === 0 && (
                        <p className="text-sm text-[var(--brand-light)]/50">No data available</p>
                      )}
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-green)]/30 hover:border-[var(--brand-green)]/50 transition-all col-span-2 lg:col-span-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-[var(--brand-green)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--brand-light)]/70">Grade Distribution</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analytics.grade_distribution || {}).map(([grade, count]: any) => (
                        <span key={grade} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--dark-600)]/50 text-[var(--brand-light)] border border-[var(--dark-500)]">
                          Grade {grade}: <span className="font-bold">{count}</span>
                        </span>
                      ))}
                      {Object.keys(analytics.grade_distribution || {}).length === 0 && (
                        <p className="text-sm text-[var(--brand-light)]/50">No data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="flex border-b border-[var(--dark-600)] overflow-x-auto">
            {[
              { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'MEMBERS', label: 'Members', icon: Users },
              { key: 'SETTINGS', label: 'Settings', icon: UserCog }
            ].map(({ key, label, icon: Icon }) => (
              <button 
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === key 
                    ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] bg-[var(--dark-700)]/30' 
                    : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]/20'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {/* DASHBOARD TAB */}
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                    <LayoutDashboard className="w-8 h-8 text-[var(--brand-light)]/30" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">Group Dashboard</h3>
                  <p className="text-sm text-[var(--brand-light)]/50 max-w-md mx-auto">
                    View analytics above or switch to Members tab to manage group members.
                  </p>
                </div>
              </div>
            )}

            {/* MEMBERS TAB */}
            {activeTab === 'MEMBERS' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--brand-light)]">Group Members</h3>
                    <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                      {members.length} {members.length === 1 ? 'member' : 'members'} total
                    </p>
                  </div>
                </div>

                {members.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                    <p className="font-medium text-[var(--brand-light)] mb-1">No members yet</p>
                    <p className="text-sm text-[var(--brand-light)]/50">Members will appear here once they join</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--dark-500)]">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[var(--dark-700)]/50">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Member</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--dark-600)]">
                          {members.map((m: any) => (
                            <tr key={m.id} className="hover:bg-[var(--dark-700)]/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                                    {m.user_avatar ? (
                                      <img src={getMediaUrl(m.user_avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {getInitials(m.user_first_name, m.user_last_name)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-[var(--brand-light)]">{m.user_name || `${m.user_first_name} ${m.user_last_name}`}</div>
                                    {m.user_first_name && m.user_last_name && m.user_name && (
                                      <div className="text-xs text-[var(--brand-light)]/40">
                                        {m.user_first_name} {m.user_last_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-[var(--brand-light)]/70">{m.user_email}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeClasses(m.status)}`}>
                                  {m.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-[var(--brand-light)]/70">
                                  {new Date(m.joined_at).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {m.status === 'PENDING' && (
                                    <button 
                                      onClick={() => handleApproveMember(m.id)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-green)] hover:bg-[var(--brand-green)]/20 transition-colors"
                                      title="Approve member"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setMemberToRemove(m.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-colors"
                                    title="Remove member"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {members.map((m: any) => (
                        <div 
                          key={m.id} 
                          className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              {m.user_avatar ? (
                                <img src={getMediaUrl(m.user_avatar)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {getInitials(m.user_first_name, m.user_last_name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-[var(--brand-light)]">{m.user_name || `${m.user_first_name} ${m.user_last_name}`}</div>
                                  <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3" />
                                    {m.user_email}
                                  </div>
                                </div>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClasses(m.status)}`}>
                                  {m.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-xs text-[var(--brand-light)]/40 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1">
                                  {m.status === 'PENDING' && (
                                    <button 
                                      onClick={() => handleApproveMember(m.id)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--brand-green)]/20 text-[var(--brand-green)]"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setMemberToRemove(m.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--brand-red)]/20 text-[var(--brand-red)]"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'SETTINGS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Membership Rules */}
                  <div className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
                    <div className="px-4 sm:px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-[var(--brand-primary)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--brand-light)]">Membership Rules</h3>
                    </div>
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Target Audience</div>
                          <div className="text-sm text-[var(--brand-light)] font-medium">
                            {group.target_member_type === 'YOUTH' ? 'Youth Members' : 'Guardians'}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Age Range</div>
                          <div className="text-sm text-[var(--brand-light)] font-medium">
                            {group.min_age || 0} - {group.max_age || 'Any'} years
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                        <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">Allowed Grades</div>
                        <div className="flex flex-wrap gap-2">
                          {group.grades?.length > 0 ? (
                            group.grades.map((grade: number) => (
                              <span key={grade} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                                Grade {grade}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[var(--brand-light)]/50">All Grades</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                        <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">Allowed Genders</div>
                        <div className="flex flex-wrap gap-2">
                          {group.genders?.length > 0 ? (
                            group.genders.map((gender: string) => (
                              <span key={gender} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-pink)]/20 text-[var(--brand-pink)]">
                                {gender}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[var(--brand-light)]/50">All Genders</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
                    <div className="px-4 sm:px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-[var(--brand-purple)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--brand-light)]">Required Interests</h3>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap gap-2">
                        {group.interests_details?.length > 0 ? (
                          group.interests_details.map((i: any) => (
                            <span key={i.id} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                              {i.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[var(--brand-light)]/50">No required interests</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custom Field Rules */}
                  {group.custom_field_rules && Object.keys(group.custom_field_rules).length > 0 && (
                    <div className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
                      <div className="px-4 sm:px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-[var(--brand-third)]" />
                        </div>
                        <h3 className="font-semibold text-[var(--brand-light)]">Custom Field Rules</h3>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(group.custom_field_rules).map(([fieldId, value]: [string, any]) => {
                            const field = customFields.find((f: any) => f.id.toString() === fieldId);
                            const fieldName = field?.name || `Field #${fieldId}`;
                            let displayValue = value;
                            if (typeof value === 'boolean') {
                              displayValue = value ? 'Yes' : 'No';
                            }
                            return (
                              <span key={fieldId} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                                <span className="font-semibold">{fieldName}</span>: {displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  
                  {/* Organization */}
                  <div className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
                    <div className="px-4 sm:px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                        <Building className="w-4 h-4 text-[var(--brand-peach)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--brand-light)]">Organization</h3>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3">
                      {group.municipality_name && (
                        <div className="p-3 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Municipality</div>
                          <div className="text-sm text-[var(--brand-light)] font-medium">{group.municipality_name}</div>
                        </div>
                      )}
                      {group.club_name && (
                        <div className="p-3 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                          <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Club</div>
                          <div className="text-sm text-[var(--brand-light)] font-medium">{group.club_name}</div>
                        </div>
                      )}
                      {!group.municipality_name && !group.club_name && (
                        <div className="p-3 rounded-xl bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/30">
                          <div className="flex items-center gap-2 text-[var(--brand-blue)]">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm font-medium">Global Group</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group Info */}
                  <div className="bg-[var(--dark-700)]/50 rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
                    <div className="px-4 sm:px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-[var(--brand-green)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--brand-light)]">Group Info</h3>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--brand-light)]/70">Type</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getTypeBadgeClasses(group.group_type)}`}>
                          {group.group_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--brand-light)]/70">Members</span>
                        <span className="text-sm text-[var(--brand-light)] font-semibold">{members.length}</span>
                      </div>
                      {group.is_system_group && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--brand-light)]/70">System Group</span>
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                            Yes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODALS */}
        <ConfirmationModal
          isVisible={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          onConfirm={handleRemoveMember}
          title="Remove Member"
          message="Are you sure you want to remove this member from the group?"
          confirmButtonText="Remove"
          variant="warning"
          darkMode={true}
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
          darkMode={true}
        />

        <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} darkMode={true} />
      </div>
    </div>
  );
}
