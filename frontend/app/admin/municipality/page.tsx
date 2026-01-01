'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useLicense } from '../../../hooks/useLicense';
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
  UserCheck,
  Package,
  Loader2,
  RefreshCw,
  Building2,
  BarChart3,
  MapPin,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

// Types
interface DashboardStats {
  totalClubs: number;
  totalMembers: number;
  totalCheckedIn: number;
  pendingBookings: number;
  unreadMessages: number;
  pendingEventRegistrations: number;
  upcomingEventsCount: number;
  weeklyVisits: number;
}

interface ClubOverview {
  id: number;
  name: string;
  logo?: string;
  checkedInCount: number;
  totalMembers: number;
  pendingItems: number;
}

interface ActionItem {
  id: number;
  type: 'booking' | 'event_registration' | 'message';
  title: string;
  subtitle: string;
  timestamp: string;
  clubName?: string;
  actionUrl: string;
}

interface UpcomingEvent {
  id: number;
  title: string;
  start_date: string;
  club_name: string;
  confirmed_participants_count: number;
  max_seats: number;
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
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple';
  href?: string;
  loading?: boolean;
}) {
  const colorClasses = {
    primary: 'from-[var(--brand-primary)] to-[var(--brand-purple)] hover:border-[var(--brand-primary)]/50',
    green: 'from-emerald-600 to-teal-600 hover:border-[var(--brand-green)]/50',
    blue: 'from-[var(--brand-blue)] to-[#38BDF8] hover:border-[var(--brand-blue)]/50',
    orange: 'from-orange-500 to-amber-500 hover:border-orange-500/50',
    purple: 'from-purple-500 to-pink-500 hover:border-purple-500/50',
  };

  const valueColorClasses = {
    primary: 'text-[var(--brand-primary)]',
    green: 'text-[var(--brand-green)]',
    blue: 'text-[var(--brand-blue)]',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
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

// Club Card Component
function ClubCard({ club, t }: { club: ClubOverview; t: any }) {
  return (
    <Link href={`/admin/municipality/clubs/${club.id}`}>
      <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer group">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-12 h-12 border border-[var(--dark-500)]">
            <AvatarImage src={club.logo ? getMediaUrl(club.logo) : undefined} />
            <AvatarFallback className="bg-[var(--dark-600)] text-[var(--brand-light)]">
              {club.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--brand-light)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {club.name}
            </p>
            <p className="text-xs text-[var(--brand-light)]/50">
              {club.totalMembers} {t('clubs.members')}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors" />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              club.checkedInCount > 0 ? "bg-[var(--brand-green)]" : "bg-[var(--dark-500)]"
            )} />
            <span className="text-[var(--brand-light)]/70">
              {club.checkedInCount} {t('clubs.checkedIn')}
            </span>
          </div>
          {club.pendingItems > 0 && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-xs">
              {club.pendingItems} {t('clubs.pending')}
            </Badge>
          )}
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
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'booking': return 'bg-orange-500/20 text-orange-400';
      case 'event_registration': return 'bg-purple-500/20 text-purple-400';
      case 'message': return 'bg-blue-500/20 text-blue-400';
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
            {item.clubName && <span className="text-[var(--brand-primary)]">{item.clubName}</span>}
            {item.clubName && ' • '}
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

function ClubCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-12 h-12 rounded-full bg-[var(--dark-600)]" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-1 bg-[var(--dark-600)]" />
          <Skeleton className="h-3 w-20 bg-[var(--dark-600)]" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-24 bg-[var(--dark-600)]" />
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

export default function MunicipalityDashboard() {
  const { user } = useAuth();
  const { hasFeature, allowedFeatures } = useLicense();
  const t = useTranslations('municipalityAdmin.dashboard');
  const tCommon = useTranslations('common');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClubs: 0,
    totalMembers: 0,
    totalCheckedIn: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    pendingEventRegistrations: 0,
    upcomingEventsCount: 0,
    weeklyVisits: 0,
  });
  const [clubs, setClubs] = useState<ClubOverview[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  // Handle both cases: assigned_municipality can be an object { id, name } or just an ID number
  const municipalityId = typeof user?.assigned_municipality === 'object' 
    ? user?.assigned_municipality?.id 
    : user?.assigned_municipality;
  const municipalityName = typeof user?.assigned_municipality === 'object' 
    ? user?.assigned_municipality?.name || t('yourMunicipality')
    : t('yourMunicipality');
  
  // Memoize the features string to use as a stable dependency
  const featuresKey = allowedFeatures.join(',');

  const fetchDashboardData = useCallback(async () => {
    if (!municipalityId) {
      setLoading(false);
      return;
    }

    try {
      const actions: ActionItem[] = [];
      
      // Fetch all data in parallel
      const promises: Promise<any>[] = [];
      
      // 1. Clubs in municipality
      promises.push(
        api.get(`/clubs/?municipality=${municipalityId}`).catch(() => ({ data: [] }))
      );

      // 2. Pending bookings across all clubs
      if (hasFeature('bookings')) {
        promises.push(
          api.get('/bookings/bookings/?status=PENDING').catch(() => ({ data: [] }))
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // 3. Unread messages
      if (hasFeature('messenger')) {
        promises.push(
          messengerApi.getUnreadCount().catch(() => ({ data: { count: 0 } }))
        );
        promises.push(
          messengerApi.getConversations(1, 'UNREAD').catch(() => ({ data: { results: [] } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { count: 0 } }));
        promises.push(Promise.resolve({ data: { results: [] } }));
      }

      // 4. Pending event registrations
      if (hasFeature('events')) {
        promises.push(
          api.get('/registrations/?ordering=-created_at').catch(() => ({ data: [] }))
        );
        promises.push(
          api.get('/events/?status=PUBLISHED&upcoming=true&page_size=5').catch(() => ({ data: { results: [] } }))
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: { results: [] } }));
      }

      // 5. Total members count
      promises.push(
        api.get(`/users/?role=YOUTH_MEMBER&page_size=1`).catch(() => ({ data: { count: 0 } }))
      );

      const [
        clubsRes,
        pendingBookingsRes,
        unreadCountRes,
        unreadConversationsRes,
        registrationsRes,
        upcomingEventsRes,
        membersRes,
      ] = await Promise.all(promises);

      // Process clubs
      const clubsData = Array.isArray(clubsRes.data) 
        ? clubsRes.data 
        : (clubsRes.data?.results || []);
      
      // Process clubs overview (we'd need active sessions per club - simplified for now)
      const clubOverviews: ClubOverview[] = clubsData.map((club: any) => ({
        id: club.id,
        name: club.name,
        logo: club.logo,
        checkedInCount: 0, // Would need per-club visits data
        totalMembers: club.member_count || 0,
        pendingItems: 0, // Would need per-club pending items
      }));
      setClubs(clubOverviews);

      // Process pending bookings
      const pendingBookings = Array.isArray(pendingBookingsRes.data) 
        ? pendingBookingsRes.data 
        : (pendingBookingsRes.data?.results || []);
      
      // Add pending bookings to action items
      pendingBookings.slice(0, 3).forEach((booking: any) => {
        actions.push({
          id: booking.id,
          type: 'booking',
          title: t('actions.bookingRequest', { resource: booking.resource?.name || 'Resource' }),
          subtitle: `${booking.user?.first_name || 'User'} - ${format(new Date(booking.start_time), 'MMM d, HH:mm')}`,
          timestamp: booking.created_at,
          clubName: booking.resource?.club?.name,
          actionUrl: '/admin/municipality/bookings',
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
          actionUrl: `/admin/municipality/inbox?conversation=${conv.id}`,
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
          clubName: reg.event?.club?.name,
          actionUrl: `/admin/municipality/events`,
        });
      });

      // Process upcoming events
      const events = upcomingEventsRes.data?.results || upcomingEventsRes.data || [];
      setUpcomingEvents(events.slice(0, 5).map((e: any) => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        club_name: e.club?.name || '',
        confirmed_participants_count: e.confirmed_participants_count || 0,
        max_seats: e.max_seats || 0,
      })));

      // Process members count
      const totalMembers = membersRes.data?.count || 0;

      // Sort action items by timestamp
      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActionItems(actions.slice(0, 5));

      // Update stats
      setStats({
        totalClubs: clubsData.length,
        totalMembers,
        totalCheckedIn: 0, // Would need aggregated visits data
        pendingBookings: pendingBookings.length,
        unreadMessages: unreadCount,
        pendingEventRegistrations: pendingRegistrations.length,
        upcomingEventsCount: events.length,
        weeklyVisits: 0, // Would need aggregated visits data
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, featuresKey]);

  useEffect(() => {
    if (municipalityId && !hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
      
      // Refresh every 60 seconds
      const interval = setInterval(fetchDashboardData, 60000);
      return () => clearInterval(interval);
    } else if (!municipalityId) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

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
              <MapPin className="h-4 w-4" />
              {municipalityName}
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

        {/* Stats Grid */}
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
                icon={Building2}
                label={t('stats.totalClubs')}
                value={stats.totalClubs}
                color="primary"
                href="/admin/municipality/clubs"
              />
              <StatCard
                icon={Users}
                label={t('stats.totalMembers')}
                value={stats.totalMembers}
                color="blue"
                href="/admin/municipality/youth"
              />
              {hasFeature('bookings') && (
                <StatCard
                  icon={Package}
                  label={t('stats.pendingBookings')}
                  value={stats.pendingBookings}
                  color="orange"
                  href="/admin/municipality/bookings"
                />
              )}
              {hasFeature('events') && (
                <StatCard
                  icon={CalendarDays}
                  label={t('stats.pendingRegistrations')}
                  value={stats.pendingEventRegistrations}
                  color="purple"
                  href="/admin/municipality/events"
                />
              )}
              {!hasFeature('bookings') && (
                <StatCard
                  icon={MessageSquare}
                  label={t('stats.unreadMessages')}
                  value={stats.unreadMessages}
                  color="green"
                  href="/admin/municipality/inbox"
                />
              )}
              {!hasFeature('events') && (
                <StatCard
                  icon={Activity}
                  label={t('stats.upcomingEvents')}
                  value={stats.upcomingEventsCount}
                  color="purple"
                />
              )}
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clubs Overview */}
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
            <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('clubs.title')}</h2>
                <Badge variant="secondary" className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                  {stats.totalClubs}
                </Badge>
              </div>
              <Link href="/admin/municipality/clubs">
                <Button variant="ghost" size="sm" className="text-[var(--brand-primary)]">
                  {tCommon('viewAll')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                <>
                  <ClubCardSkeleton />
                  <ClubCardSkeleton />
                  <ClubCardSkeleton />
                </>
              ) : clubs.length > 0 ? (
                clubs.slice(0, 5).map((club) => (
                  <ClubCard key={club.id} club={club} t={t} />
                ))
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-[var(--brand-light)]/30 mb-3" />
                  <p className="text-[var(--brand-light)]/70">{t('clubs.noClubs')}</p>
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

            {/* Upcoming Events */}
            {hasFeature('events') && (
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
                <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--brand-purple)]" />
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('upcomingEvents.title')}</h2>
                  </div>
                  <Link href="/admin/municipality/events">
                    <Button variant="ghost" size="sm" className="text-[var(--brand-primary)]">
                      {tCommon('viewAll')}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-12 h-12 rounded-lg bg-[var(--dark-600)]" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1 bg-[var(--dark-600)]" />
                            <Skeleton className="h-3 w-20 bg-[var(--dark-600)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => (
                        <Link key={event.id} href={`/admin/municipality/events`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--dark-700)] transition-colors cursor-pointer">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex flex-col items-center justify-center text-white">
                              <span className="text-xs font-medium">{format(parseISO(event.start_date), 'MMM')}</span>
                              <span className="text-lg font-bold leading-none">{format(parseISO(event.start_date), 'd')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--brand-light)] truncate">{event.title}</p>
                              <p className="text-xs text-[var(--brand-light)]/60">
                                {event.club_name && <span className="text-[var(--brand-primary)]">{event.club_name}</span>}
                                {event.club_name && ' • '}
                                {event.confirmed_participants_count}{event.max_seats > 0 ? `/${event.max_seats}` : ''} {t('upcomingEvents.registered')}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-[var(--brand-light)]/30" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="h-10 w-10 mx-auto text-[var(--brand-light)]/30 mb-2" />
                      <p className="text-sm text-[var(--brand-light)]/50">{t('upcomingEvents.noEvents')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">{t('quickActions.title')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/municipality/clubs">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-all group"
                  >
                    <Building2 className="h-5 w-5 text-[var(--brand-primary)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.manageClubs')}</span>
                  </Button>
                </Link>
                <Link href="/admin/municipality/youth">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 hover:bg-[var(--brand-blue)]/10 text-[var(--brand-light)] hover:text-[var(--brand-blue)] transition-all group"
                  >
                    <Users className="h-5 w-5 text-[var(--brand-blue)] group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{t('quickActions.manageMembers')}</span>
                  </Button>
                </Link>
                {hasFeature('events') && (
                  <Link href="/admin/municipality/events/create">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 hover:bg-[var(--brand-purple)]/10 text-[var(--brand-light)] hover:text-[var(--brand-purple)] transition-all group"
                    >
                      <CalendarDays className="h-5 w-5 text-[var(--brand-purple)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">{t('quickActions.createEvent')}</span>
                    </Button>
                  </Link>
                )}
                {hasFeature('messenger') && (
                  <Link href="/admin/municipality/inbox?compose=true">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 hover:bg-[var(--brand-green)]/10 text-[var(--brand-light)] hover:text-[var(--brand-green)] transition-all group"
                    >
                      <MessageSquare className="h-5 w-5 text-[var(--brand-green)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">{t('quickActions.sendMessage')}</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
