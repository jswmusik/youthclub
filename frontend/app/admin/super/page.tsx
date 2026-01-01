'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { messengerApi } from '../../../lib/messenger-api';
import { getMediaUrl } from '../../utils';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  ArrowRight,
  AlertCircle,
  CalendarDays,
  Package,
  RefreshCw,
  Building2,
  MapPin,
  Activity,
  CheckCircle2,
  Crown,
  Globe,
  Shield,
  BarChart3,
  Newspaper,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, parseISO, subDays } from 'date-fns';

// Types
interface PlatformStats {
  totalMunicipalities: number;
  totalClubs: number;
  totalMembers: number;
  totalGuardians: number;
  totalAdmins: number;
  pendingBookings: number;
  unreadMessages: number;
  pendingEventRegistrations: number;
  upcomingEventsCount: number;
  newMembersThisWeek: number;
  activeLicenses: number;
}

interface MunicipalityOverview {
  id: number;
  name: string;
  logo?: string;
  clubCount: number;
  memberCount: number;
  isActive: boolean;
}

interface ActionItem {
  id: number;
  type: 'booking' | 'event_registration' | 'message' | 'license' | 'user';
  title: string;
  subtitle: string;
  timestamp: string;
  municipalityName?: string;
  actionUrl: string;
}

interface RecentActivity {
  id: number;
  type: 'new_member' | 'new_event' | 'new_club' | 'license_update';
  title: string;
  subtitle: string;
  timestamp: string;
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendLabel,
  color = 'primary',
  href,
  loading = false 
}: { 
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple' | 'gold';
  href?: string;
  loading?: boolean;
}) {
  const colorClasses = {
    primary: 'from-[var(--brand-primary)] to-[var(--brand-purple)] hover:border-[var(--brand-primary)]/50',
    green: 'from-emerald-600 to-teal-600 hover:border-[var(--brand-green)]/50',
    blue: 'from-[var(--brand-blue)] to-[#38BDF8] hover:border-[var(--brand-blue)]/50',
    orange: 'from-orange-500 to-amber-500 hover:border-orange-500/50',
    purple: 'from-purple-500 to-pink-500 hover:border-purple-500/50',
    gold: 'from-amber-500 to-yellow-600 hover:border-amber-400/50',
  };

  const valueColorClasses = {
    primary: 'text-[var(--brand-primary)]',
    green: 'text-[var(--brand-green)]',
    blue: 'text-[var(--brand-blue)]',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    gold: 'text-amber-400',
  };

  const content = (
    <div className={cn(
      "bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] transition-all",
      colorClasses[color].split(' ').pop(),
      href && "cursor-pointer"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
          colorClasses[color].split(' ').slice(0, 2).join(' ')
        )}>
          <Icon className="h-5 w-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
        </div>
        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16 bg-[var(--dark-600)]" />
      ) : (
        <div className="flex items-end justify-between">
          <div className={cn("text-2xl sm:text-3xl font-bold", valueColorClasses[color])}>
            {value}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              trend >= 0 ? "text-[var(--brand-green)]" : "text-red-400"
            )}>
              <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
              <span>{trend >= 0 ? '+' : ''}{trend}%</span>
              {trendLabel && <span className="text-[var(--brand-light)]/50">{trendLabel}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Municipality Card Component
function MunicipalityCard({ municipality, t }: { municipality: MunicipalityOverview; t: any }) {
  return (
    <Link href={`/admin/super/municipalities/${municipality.id}`}>
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer group">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-12 h-12 border border-[var(--dark-500)]">
            <AvatarImage src={municipality.logo ? getMediaUrl(municipality.logo) : undefined} />
            <AvatarFallback className="bg-[var(--dark-600)] text-[var(--brand-light)]">
              {municipality.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--brand-light)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {municipality.name}
            </p>
            <p className="text-xs text-[var(--brand-light)]/50">
              {municipality.clubCount} {t('municipalities.clubs')} • {municipality.memberCount} {t('municipalities.members')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {municipality.isActive ? (
              <Badge variant="secondary" className="bg-[var(--brand-green)]/20 text-[var(--brand-green)] text-xs">
                {t('municipalities.active')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 text-xs">
                {t('municipalities.inactive')}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Action Item Component
function ActionItemCard({ item, t }: { item: ActionItem; t: any }) {
  const getIcon = () => {
    switch (item.type) {
      case 'booking': return <Package className="h-4 w-4" />;
      case 'event_registration': return <CalendarDays className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'license': return <Crown className="h-4 w-4" />;
      case 'user': return <UserPlus className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'booking': return 'bg-orange-500/20 text-orange-400';
      case 'event_registration': return 'bg-purple-500/20 text-purple-400';
      case 'message': return 'bg-blue-500/20 text-blue-400';
      case 'license': return 'bg-amber-500/20 text-amber-400';
      case 'user': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Link href={item.actionUrl}>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--dark-600)] transition-all cursor-pointer group">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", getTypeColor())}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--brand-light)] truncate group-hover:text-[var(--brand-primary)] transition-colors">{item.title}</p>
          <p className="text-xs text-[var(--brand-light)]/60 truncate">
            {item.municipalityName && <span className="text-[var(--brand-primary)]">{item.municipalityName}</span>}
            {item.municipalityName && ' • '}
            {item.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--brand-light)]/50">
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-xl bg-[var(--dark-600)]" />
        <Skeleton className="h-4 w-20 bg-[var(--dark-600)]" />
      </div>
      <Skeleton className="h-8 w-16 bg-[var(--dark-600)]" />
    </div>
  );
}

function MunicipalityCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full bg-[var(--dark-600)]" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-1 bg-[var(--dark-600)]" />
          <Skeleton className="h-3 w-24 bg-[var(--dark-600)]" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full bg-[var(--dark-600)]" />
      </div>
    </div>
  );
}

function ActionItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dark-600)]/50">
      <Skeleton className="w-8 h-8 rounded-lg bg-[var(--dark-600)]" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1 bg-[var(--dark-600)]" />
        <Skeleton className="h-3 w-24 bg-[var(--dark-600)]" />
      </div>
      <Skeleton className="h-3 w-16 bg-[var(--dark-600)]" />
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const t = useTranslations('superAdmin.dashboard');
  const tCommon = useTranslations('common');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalMunicipalities: 0,
    totalClubs: 0,
    totalMembers: 0,
    totalGuardians: 0,
    totalAdmins: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    pendingEventRegistrations: 0,
    upcomingEventsCount: 0,
    newMembersThisWeek: 0,
    activeLicenses: 0,
  });
  const [municipalities, setMunicipalities] = useState<MunicipalityOverview[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const actions: ActionItem[] = [];
      
      // Fetch all data in parallel
      const promises: Promise<any>[] = [];
      
      // 1. Municipalities
      promises.push(
        api.get('/municipalities/').catch(() => ({ data: [] }))
      );

      // 2. Clubs count
      promises.push(
        api.get('/clubs/?page_size=1').catch(() => ({ data: { count: 0 } }))
      );

      // 3. Users counts
      promises.push(
        api.get('/users/?role=YOUTH_MEMBER&page_size=1').catch(() => ({ data: { count: 0 } }))
      );
      promises.push(
        api.get('/users/?role=GUARDIAN&page_size=1').catch(() => ({ data: { count: 0 } }))
      );
      promises.push(
        api.get('/users/?role=SUPER_ADMIN,MUNICIPALITY_ADMIN,CLUB_ADMIN&page_size=1').catch(() => ({ data: { count: 0 } }))
      );

      // 4. New members this week
      const weekAgo = subDays(new Date(), 7).toISOString().split('T')[0];
      promises.push(
        api.get(`/users/?role=YOUTH_MEMBER&created_after=${weekAgo}&page_size=1`).catch(() => ({ data: { count: 0 } }))
      );

      // 5. Pending bookings
      promises.push(
        api.get('/bookings/bookings/?status=PENDING').catch(() => ({ data: [] }))
      );

      // 6. Unread messages
      promises.push(
        messengerApi.getUnreadCount().catch(() => ({ data: { count: 0 } }))
      );
      promises.push(
        messengerApi.getConversations(1, 'UNREAD').catch(() => ({ data: { results: [] } }))
      );

      // 7. Pending event registrations
      promises.push(
        api.get('/registrations/?ordering=-created_at').catch(() => ({ data: [] }))
      );

      // 8. Upcoming events
      promises.push(
        api.get('/events/?status=PUBLISHED&upcoming=true&page_size=5').catch(() => ({ data: { results: [] } }))
      );

      // 9. Licenses
      promises.push(
        api.get('/licenses/').catch(() => ({ data: [] }))
      );

      const [
        municipalitiesRes,
        clubsRes,
        membersRes,
        guardiansRes,
        adminsRes,
        newMembersRes,
        pendingBookingsRes,
        unreadCountRes,
        unreadConversationsRes,
        registrationsRes,
        upcomingEventsRes,
        licensesRes,
      ] = await Promise.all(promises);

      // Process municipalities
      const municipalitiesData = Array.isArray(municipalitiesRes.data) 
        ? municipalitiesRes.data 
        : (municipalitiesRes.data?.results || []);
      
      const municipalityOverviews: MunicipalityOverview[] = municipalitiesData.map((m: any) => ({
        id: m.id,
        name: m.name,
        logo: m.logo,
        clubCount: m.club_count || 0,
        memberCount: m.member_count || 0,
        isActive: m.is_active !== false,
      }));
      setMunicipalities(municipalityOverviews);

      // Process clubs count
      const totalClubs = clubsRes.data?.count || (Array.isArray(clubsRes.data) ? clubsRes.data.length : 0);

      // Process user counts
      const totalMembers = membersRes.data?.count || 0;
      const totalGuardians = guardiansRes.data?.count || 0;
      const totalAdmins = adminsRes.data?.count || 0;
      const newMembersThisWeek = newMembersRes.data?.count || 0;

      // Process pending bookings
      const pendingBookings = Array.isArray(pendingBookingsRes.data) 
        ? pendingBookingsRes.data 
        : (pendingBookingsRes.data?.results || []);
      
      pendingBookings.slice(0, 2).forEach((booking: any) => {
        actions.push({
          id: booking.id,
          type: 'booking',
          title: t('actions.bookingRequest', { resource: booking.resource?.name || 'Resource' }),
          subtitle: `${booking.user?.first_name || 'User'} - ${format(new Date(booking.start_time), 'MMM d, HH:mm')}`,
          timestamp: booking.created_at,
          municipalityName: booking.resource?.club?.municipality?.name,
          actionUrl: '/admin/super/bookings',
        });
      });

      // Process unread messages
      const unreadCount = unreadCountRes.data?.count || 0;
      const unreadConversations = unreadConversationsRes.data?.results || [];
      
      unreadConversations.slice(0, 2).forEach((conv: any) => {
        actions.push({
          id: conv.id,
          type: 'message',
          title: conv.subject || t('actions.newMessage'),
          subtitle: conv.last_message?.content?.substring(0, 50) || t('actions.noPreview'),
          timestamp: conv.last_message?.created_at || conv.updated_at,
          actionUrl: `/admin/super/inbox?conversation=${conv.id}`,
        });
      });

      // Process event registrations
      const registrations = Array.isArray(registrationsRes.data) 
        ? registrationsRes.data 
        : (registrationsRes.data?.results || []);
      const pendingRegistrations = registrations.filter((r: any) => 
        r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN'
      );

      pendingRegistrations.slice(0, 2).forEach((reg: any) => {
        actions.push({
          id: reg.id,
          type: 'event_registration',
          title: t('actions.eventRegistration', { event: reg.event?.title || 'Event' }),
          subtitle: `${reg.user?.first_name || 'User'} ${reg.user?.last_name || ''}`,
          timestamp: reg.created_at,
          municipalityName: reg.event?.club?.municipality?.name,
          actionUrl: `/admin/super/events`,
        });
      });

      // Process upcoming events
      const events = upcomingEventsRes.data?.results || upcomingEventsRes.data || [];

      // Process licenses
      const licenses = Array.isArray(licensesRes.data) 
        ? licensesRes.data 
        : (licensesRes.data?.results || []);
      const activeLicenses = licenses.filter((l: any) => l.is_active).length;

      // Sort action items by timestamp
      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActionItems(actions.slice(0, 5));

      // Update stats
      setStats({
        totalMunicipalities: municipalitiesData.length,
        totalClubs,
        totalMembers,
        totalGuardians,
        totalAdmins,
        pendingBookings: pendingBookings.length,
        unreadMessages: unreadCount,
        pendingEventRegistrations: pendingRegistrations.length,
        upcomingEventsCount: events.length,
        newMembersThisWeek,
        activeLicenses,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
      
      // Refresh every 60 seconds
      const interval = setInterval(fetchDashboardData, 60000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <div className="px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)] mb-1">
              {t('welcome', { name: user?.first_name || 'Admin' })}
            </h1>
            <p className="text-[var(--brand-light)]/60 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('platformOverview')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-fit bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-all"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            {t('refresh')}
          </Button>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                icon={MapPin}
                label={t('stats.municipalities')}
                value={stats.totalMunicipalities}
                color="primary"
                href="/admin/super/municipalities"
              />
              <StatCard
                icon={Building2}
                label={t('stats.clubs')}
                value={stats.totalClubs}
                color="blue"
                href="/admin/super/clubs"
              />
              <StatCard
                icon={Users}
                label={t('stats.members')}
                value={stats.totalMembers}
                color="green"
                href="/admin/super/youth"
              />
              <StatCard
                icon={Crown}
                label={t('stats.activeLicenses')}
                value={stats.activeLicenses}
                color="gold"
                href="/admin/super/licenses"
              />
            </>
          )}
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                icon={UserPlus}
                label={t('stats.newThisWeek')}
                value={stats.newMembersThisWeek}
                color="green"
              />
              <StatCard
                icon={Shield}
                label={t('stats.admins')}
                value={stats.totalAdmins}
                color="purple"
                href="/admin/super/admins"
              />
              <StatCard
                icon={Package}
                label={t('stats.pendingBookings')}
                value={stats.pendingBookings}
                color="orange"
                href="/admin/super/bookings"
              />
              <StatCard
                icon={CalendarDays}
                label={t('stats.pendingRegistrations')}
                value={stats.pendingEventRegistrations}
                color="purple"
                href="/admin/super/events"
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Municipalities Overview */}
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
            <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[var(--brand-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('municipalities.title')}</h2>
                <Badge variant="secondary" className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                  {stats.totalMunicipalities}
                </Badge>
              </div>
              <Link href="/admin/super/municipalities">
                <Button variant="ghost" size="sm" className="text-[var(--brand-primary)]">
                  {tCommon('viewAll')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                <>
                  <MunicipalityCardSkeleton />
                  <MunicipalityCardSkeleton />
                  <MunicipalityCardSkeleton />
                </>
              ) : municipalities.length > 0 ? (
                municipalities.slice(0, 5).map((municipality) => (
                  <MunicipalityCard key={municipality.id} municipality={municipality} t={t} />
                ))
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-[var(--brand-light)]/30 mb-3" />
                  <p className="text-[var(--brand-light)]/70">{t('municipalities.noMunicipalities')}</p>
                  <Link href="/admin/super/municipalities/create">
                    <Button variant="link" size="sm" className="text-[var(--brand-primary)] mt-2">
                      {t('municipalities.addMunicipality')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Action Items */}
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('actionItems.title')}</h2>
                  {actionItems.length > 0 && (
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
                      {actionItems.length}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {loading ? (
                  <>
                    <ActionItemSkeleton />
                    <ActionItemSkeleton />
                    <ActionItemSkeleton />
                  </>
                ) : actionItems.length > 0 ? (
                  actionItems.map((item) => (
                    <ActionItemCard key={`${item.type}-${item.id}`} item={item} t={t} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--brand-green)] mb-2" />
                    <p className="text-[var(--brand-light)]/70">{t('actionItems.allCaughtUp')}</p>
                    <p className="text-sm text-[var(--brand-light)]/50">{t('actionItems.noPendingItems')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">{t('quickActions.title')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/super/municipalities">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-all group"
                  >
                    <MapPin className="h-5 w-5 text-[var(--brand-primary)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.manageMunicipalities')}</span>
                  </Button>
                </Link>
                <Link href="/admin/super/clubs">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 hover:bg-[var(--brand-blue)]/10 text-[var(--brand-light)] hover:text-[var(--brand-blue)] transition-all group"
                  >
                    <Building2 className="h-5 w-5 text-[var(--brand-blue)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.manageClubs')}</span>
                  </Button>
                </Link>
                <Link href="/admin/super/licenses">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-amber-400/50 hover:bg-amber-400/10 text-[var(--brand-light)] hover:text-amber-400 transition-all group"
                  >
                    <Crown className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.manageLicenses')}</span>
                  </Button>
                </Link>
                <Link href="/admin/super/analytics">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 hover:bg-[var(--brand-purple)]/10 text-[var(--brand-light)] hover:text-[var(--brand-purple)] transition-all group"
                  >
                    <BarChart3 className="h-5 w-5 text-[var(--brand-purple)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.viewAnalytics')}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-[var(--brand-green)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('systemHealth.title')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--brand-green)] animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-[var(--brand-light)]">{t('systemHealth.apiStatus')}</p>
                    <p className="text-xs text-[var(--brand-green)]">{t('systemHealth.operational')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--brand-green)] animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-[var(--brand-light)]">{t('systemHealth.database')}</p>
                    <p className="text-xs text-[var(--brand-green)]">{t('systemHealth.operational')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
