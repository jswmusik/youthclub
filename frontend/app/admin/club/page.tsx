'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useLicense } from '../../../hooks/useLicense';
import api from '../../../lib/api';
import { visits } from '../../../lib/api';
import { messengerApi } from '../../../lib/messenger-api';
import { getMediaUrl } from '../../utils';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  UserCheck,
  Package,
  ClipboardList,
  Loader2,
  RefreshCw,
  Building2,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isTomorrow, parseISO } from 'date-fns';

// Types
interface DashboardStats {
  checkedInCount: number;
  todayBookings: number;
  pendingBookings: number;
  unreadMessages: number;
  pendingEventRegistrations: number;
  upcomingEventsCount: number;
  totalMembers: number;
  weeklyVisits: number;
}

interface ActionItem {
  id: number;
  type: 'booking' | 'event_registration' | 'message';
  title: string;
  subtitle: string;
  timestamp: string;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
  actionUrl: string;
}

interface UpcomingEvent {
  id: number;
  title: string;
  start_date: string;
  confirmed_participants_count: number;
  max_seats: number;
}

interface RecentCheckIn {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  check_in_at: string;
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
          <p className="text-xs text-[var(--brand-light)]/60 truncate">{item.subtitle}</p>
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

export default function ClubAdminDashboard() {
  const { user } = useAuth();
  const { hasFeature, allowedFeatures } = useLicense();
  const t = useTranslations('clubAdmin.dashboard');
  const tCommon = useTranslations('common');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    checkedInCount: 0,
    todayBookings: 0,
    pendingBookings: 0,
    unreadMessages: 0,
    pendingEventRegistrations: 0,
    upcomingEventsCount: 0,
    totalMembers: 0,
    weeklyVisits: 0,
  });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  
  // Track if initial fetch has been done
  const hasFetched = useRef(false);

  // Handle both cases: assigned_club can be an object { id, name } or just an ID number
  const clubId = typeof user?.assigned_club === 'object' 
    ? user?.assigned_club?.id 
    : user?.assigned_club;
  const clubName = typeof user?.assigned_club === 'object' 
    ? user?.assigned_club?.name || t('yourClub')
    : t('yourClub');
  
  // Memoize the features string to use as a stable dependency
  const featuresKey = allowedFeatures.join(',');

  const fetchDashboardData = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    try {
      const actions: ActionItem[] = [];
      
      // Fetch all data in parallel
      const promises: Promise<any>[] = [];
      
      // 1. Active check-ins (visits feature)
      if (hasFeature('visits')) {
        promises.push(
          visits.getActiveSessions(clubId).catch(() => ({ data: [] }))
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      // 2. Pending bookings
      if (hasFeature('bookings')) {
        promises.push(
          api.get('/bookings/bookings/?status=PENDING').catch(() => ({ data: [] }))
        );
        // Today's bookings
        const today = new Date().toISOString().split('T')[0];
        promises.push(
          api.get(`/bookings/bookings/?start_date=${today}&end_date=${today}`).catch(() => ({ data: [] }))
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
      }

      // 3. Unread messages
      if (hasFeature('messenger')) {
        promises.push(
          messengerApi.getUnreadCount().catch(() => ({ data: { count: 0 } }))
        );
        // Recent unread conversations
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
        // Upcoming events
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

      // 6. Weekly visits analytics
      if (hasFeature('visits')) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        promises.push(
          visits.getAnalytics({ 
            start_date: weekAgo.toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }).catch(() => ({ data: { summary: { total_visits: 0 } } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { summary: { total_visits: 0 } } }));
      }

      const [
        activeSessionsRes,
        pendingBookingsRes,
        todayBookingsRes,
        unreadCountRes,
        unreadConversationsRes,
        registrationsRes,
        upcomingEventsRes,
        membersRes,
        weeklyVisitsRes,
      ] = await Promise.all(promises);

      // Process active sessions
      const activeSessions = Array.isArray(activeSessionsRes.data) 
        ? activeSessionsRes.data 
        : (activeSessionsRes.data?.results || []);
      
      // Process recent check-ins (last 5)
      setRecentCheckIns(activeSessions.slice(0, 5).map((s: any) => ({
        id: s.id,
        user: {
          id: s.user?.id || s.user_id,
          first_name: s.user?.first_name || s.user_name?.split(' ')[0] || 'Unknown',
          last_name: s.user?.last_name || s.user_name?.split(' ')[1] || '',
          avatar: s.user?.avatar,
        },
        check_in_at: s.check_in_at,
      })));

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
          user: booking.user ? {
            id: booking.user.id,
            name: `${booking.user.first_name} ${booking.user.last_name}`,
            avatar: booking.user.avatar,
          } : undefined,
          actionUrl: '/admin/club/bookings',
        });
      });

      // Process today's bookings
      const todayBookings = Array.isArray(todayBookingsRes.data) 
        ? todayBookingsRes.data 
        : (todayBookingsRes.data?.results || []);

      // Process unread messages
      const unreadCount = unreadCountRes.data?.count || 0;
      const unreadConversations = unreadConversationsRes.data?.results || [];
      
      // Add unread messages to action items
      unreadConversations.slice(0, 2).forEach((conv: any) => {
        actions.push({
          id: conv.id,
          type: 'message',
          title: conv.subject || t('actions.newMessage'),
          subtitle: conv.last_message?.content?.substring(0, 50) || t('actions.noPreview'),
          timestamp: conv.last_message?.created_at || conv.updated_at,
          user: conv.other_participant ? {
            id: conv.other_participant.id,
            name: `${conv.other_participant.first_name} ${conv.other_participant.last_name}`,
            avatar: conv.other_participant.avatar,
          } : undefined,
          actionUrl: `/admin/club/inbox?conversation=${conv.id}`,
        });
      });

      // Process event registrations
      const registrations = Array.isArray(registrationsRes.data) 
        ? registrationsRes.data 
        : (registrationsRes.data?.results || []);
      const pendingRegistrations = registrations.filter((r: any) => 
        r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN'
      );

      // Add pending registrations to action items
      pendingRegistrations.slice(0, 2).forEach((reg: any) => {
        actions.push({
          id: reg.id,
          type: 'event_registration',
          title: t('actions.eventRegistration', { event: reg.event?.title || 'Event' }),
          subtitle: `${reg.user?.first_name || 'User'} ${reg.user?.last_name || ''}`,
          timestamp: reg.created_at,
          user: reg.user ? {
            id: reg.user.id,
            name: `${reg.user.first_name} ${reg.user.last_name}`,
            avatar: reg.user.avatar,
          } : undefined,
          actionUrl: `/admin/club/events/${reg.event?.id}`,
        });
      });

      // Process upcoming events
      const events = upcomingEventsRes.data?.results || upcomingEventsRes.data || [];
      setUpcomingEvents(events.slice(0, 5).map((e: any) => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        confirmed_participants_count: e.confirmed_participants_count || 0,
        max_seats: e.max_seats || 0,
      })));

      // Process members count
      const totalMembers = membersRes.data?.count || 0;

      // Process weekly visits
      const weeklyVisits = weeklyVisitsRes.data?.summary?.total_visits || 0;

      // Sort action items by timestamp (most recent first)
      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActionItems(actions.slice(0, 5));

      // Update stats
      setStats({
        checkedInCount: activeSessions.length,
        todayBookings: todayBookings.length,
        pendingBookings: pendingBookings.length,
        unreadMessages: unreadCount,
        pendingEventRegistrations: pendingRegistrations.length,
        upcomingEventsCount: events.length,
        totalMembers,
        weeklyVisits,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, featuresKey]);

  useEffect(() => {
    if (clubId && !hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
      
      // Refresh every 60 seconds
      const interval = setInterval(fetchDashboardData, 60000);
      return () => clearInterval(interval);
    } else if (!clubId) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Format event date
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return t('today');
    if (isTomorrow(date)) return t('tomorrow');
    return format(date, 'MMM d');
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
              <Building2 className="h-4 w-4" />
              {clubName}
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
              {hasFeature('visits') && (
                <StatCard
                  icon={UserCheck}
                  label={t('stats.checkedIn')}
                  value={stats.checkedInCount}
                  color="green"
                  href="/admin/club/visits"
                />
              )}
              {hasFeature('bookings') && (
                <StatCard
                  icon={Package}
                  label={t('stats.pendingBookings')}
                  value={stats.pendingBookings}
                  color="orange"
                  href="/admin/club/bookings"
                />
              )}
              {hasFeature('messenger') && (
                <StatCard
                  icon={MessageSquare}
                  label={t('stats.unreadMessages')}
                  value={stats.unreadMessages}
                  color="blue"
                  href="/admin/club/inbox"
                />
              )}
              {hasFeature('events') && (
                <StatCard
                  icon={CalendarDays}
                  label={t('stats.pendingRegistrations')}
                  value={stats.pendingEventRegistrations}
                  color="purple"
                  href="/admin/club/events"
                />
              )}
              {!hasFeature('visits') && (
                <StatCard
                  icon={Users}
                  label={t('stats.totalMembers')}
                  value={stats.totalMembers}
                  color="primary"
                  href="/admin/club/youth"
                />
              )}
              {!hasFeature('bookings') && !hasFeature('messenger') && (
                <StatCard
                  icon={BarChart3}
                  label={t('stats.weeklyVisits')}
                  value={stats.weeklyVisits}
                  color="blue"
                />
              )}
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Items */}
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
            <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('actionItems.title')}</h2>
                {actionItems.length > 0 && (
                  <Badge variant="secondary" className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
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
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-[var(--brand-green)] mb-3" />
                  <p className="text-[var(--brand-light)]/70">{t('actionItems.allCaughtUp')}</p>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('actionItems.noPendingItems')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            {hasFeature('events') && (
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
                <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[var(--brand-purple)]" />
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('upcomingEvents.title')}</h2>
                  </div>
                  <Link href="/admin/club/events">
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
                        <Link key={event.id} href={`/admin/club/events/${event.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--dark-700)] transition-colors cursor-pointer">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex flex-col items-center justify-center text-white">
                              <span className="text-xs font-medium">{format(parseISO(event.start_date), 'MMM')}</span>
                              <span className="text-lg font-bold leading-none">{format(parseISO(event.start_date), 'd')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--brand-light)] truncate">{event.title}</p>
                              <p className="text-xs text-[var(--brand-light)]/60">
                                {format(parseISO(event.start_date), 'HH:mm')} • {event.confirmed_participants_count}{event.max_seats > 0 ? `/${event.max_seats}` : ''} {t('upcomingEvents.registered')}
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
                      <Link href="/admin/club/events/create">
                        <Button variant="link" size="sm" className="text-[var(--brand-primary)] mt-2">
                          {t('upcomingEvents.createEvent')}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Currently Checked In */}
            {hasFeature('visits') && (
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
                <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-[var(--brand-green)]" />
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('checkedIn.title')}</h2>
                    <Badge variant="secondary" className="bg-[var(--brand-green)]/20 text-[var(--brand-green)]">
                      {stats.checkedInCount}
                    </Badge>
                  </div>
                  <Link href="/admin/club/visits">
                    <Button variant="ghost" size="sm" className="text-[var(--brand-primary)]">
                      {tCommon('viewAll')}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="w-10 h-10 rounded-full border-2 border-[var(--dark-800)] bg-[var(--dark-600)]" />
                      ))}
                    </div>
                  ) : recentCheckIns.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {recentCheckIns.slice(0, 5).map((checkIn) => (
                          <Avatar key={checkIn.id} className="w-10 h-10 border-2 border-[var(--dark-800)]">
                            <AvatarImage src={checkIn.user.avatar ? getMediaUrl(checkIn.user.avatar) : undefined} />
                            <AvatarFallback className="bg-[var(--dark-600)] text-[var(--brand-light)] text-xs">
                              {checkIn.user.first_name?.[0]}{checkIn.user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {stats.checkedInCount > 5 && (
                          <div className="w-10 h-10 rounded-full bg-[var(--dark-600)] border-2 border-[var(--dark-800)] flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--brand-light)]">+{stats.checkedInCount - 5}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-[var(--brand-light)]/60">
                        {t('checkedIn.currentlyInClub', { count: stats.checkedInCount })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-[var(--brand-light)]/50">{t('checkedIn.noOneCheckedIn')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">{t('quickActions.title')}</h2>
              <div className="grid grid-cols-2 gap-3">
                {hasFeature('visits') && (
                  <Link href="/admin/club/visits">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 hover:bg-[var(--brand-green)]/10 text-[var(--brand-light)] hover:text-[var(--brand-green)] transition-all group"
                    >
                      <UserCheck className="h-5 w-5 text-[var(--brand-green)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">{t('quickActions.openKiosk')}</span>
                    </Button>
                  </Link>
                )}
                {hasFeature('events') && (
                  <Link href="/admin/club/events/create">
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
                  <Link href="/admin/club/inbox?compose=true">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 hover:bg-[var(--brand-blue)]/10 text-[var(--brand-light)] hover:text-[var(--brand-blue)] transition-all group"
                    >
                      <MessageSquare className="h-5 w-5 text-[var(--brand-blue)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">{t('quickActions.sendMessage')}</span>
                    </Button>
                  </Link>
                )}
                {hasFeature('posts') && (
                  <Link href="/admin/club/posts?create=true">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3.5 px-4 bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-all group"
                    >
                      <ClipboardList className="h-5 w-5 text-[var(--brand-primary)] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium">{t('quickActions.createPost')}</span>
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
