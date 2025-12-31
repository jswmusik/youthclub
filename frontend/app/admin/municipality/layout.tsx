'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  LogOut, 
  Bell, 
  LayoutDashboard, 
  Users, 
  Newspaper, 
  Calendar, 
  Settings, 
  FileText, 
  Gift, 
  Box, 
  MessageSquare,
  UserCog,
  Shield,
  MessageCircle,
  UsersRound,
  CalendarDays,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Clock,
  GraduationCap,
  MapPin,
  Package,
  ClipboardList,
  FileEdit,
  Rss,
  LogIn,
  BookOpen,
  History,
  BarChart3,
  TrendingUp,
  Crown
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { getMediaUrl } from '../../utils';
import RoleGuard from '../../components/RoleGuard';
import { ToastProvider } from '../../components/ToastProvider';
import api from '../../../lib/api';
import { messengerApi } from '../../../lib/messenger-api';
import { Toaster } from '../../components/Toaster';
// License hook for feature gating
import { useLicense } from '../../../hooks/useLicense';
import { useAdminInactivityTimeout } from '../../../hooks/useAdminInactivityTimeout';

// UI Components
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BackgroundGlow } from '@/components/BackgroundGlow';

// Helper to get initials
const getInitials = (first?: string | null, last?: string | null) => {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || 'MA';
};

export default function MunicipalityAdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('municipalityAdmin.sidebar');
  const pathname = usePathname();
  const { logout, user, messageCount, refreshMessageCount } = useAuth();
  // License hook for feature gating
  const { hasFeature } = useLicense();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Admin inactivity timeout - logs out after 20 minutes of inactivity
  useAdminInactivityTimeout();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Collapsible groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    municipality: false,
    users: false,
    content: false,
    events: false,
    groups: false,
    rewards: false,
    inventory: false,
    bookings: false,
    learning: false,
    analytics: false,
    settings: false,
  });
  
  // Keep your existing state logic
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [pendingEventApplicationsCount, setPendingEventApplicationsCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  // Keep your existing useEffects logic exactly as it was
  // Only fetch counts if feature is enabled to avoid 403s
  useEffect(() => {
    refreshMessageCount();
    if (hasFeature('messenger')) refreshInboxUnreadCount();
    if (hasFeature('groups')) refreshPendingRequestsCount();
    if (hasFeature('bookings')) refreshPendingBookingsCount();
    if (hasFeature('events')) refreshPendingEventApplicationsCount();
  }, [refreshMessageCount, hasFeature]);

  // Auto-open groups when navigating to a page within that group
  useEffect(() => {
    setOpenGroups(prev => {
      const updated: Record<string, boolean> = { ...prev };
      navigationGroups.forEach((group) => {
        if (group.title) {
          const hasActiveItem = group.items.some(item => pathname === item.href);
          if (hasActiveItem && !prev[group.id]) {
            updated[group.id] = true;
          }
        }
      });
      return updated;
    });
  }, [pathname]);

  const refreshPendingRequestsCount = async () => {
    if (!user) {
      setPendingRequestsCount(0);
      return;
    }
    
    try {
      const res = await api.get('/group-requests/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPendingRequestsCount(data.length);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPendingRequestsCount(0);
        return;
      }
      console.error('Failed to load pending requests count', err);
      setPendingRequestsCount(0);
    }
  };

  const refreshPendingBookingsCount = async () => {
    if (!user) {
      setPendingBookingsCount(0);
      return;
    }
    
    try {
      const res = await api.get('/bookings/bookings/?status=PENDING');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPendingBookingsCount(data.length);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPendingBookingsCount(0);
        return;
      }
      console.error('Failed to load pending bookings count', err);
      setPendingBookingsCount(0);
    }
  };

  const refreshPendingEventApplicationsCount = async () => {
    if (!user) {
      setPendingEventApplicationsCount(0);
      return;
    }
    
    try {
      const res = await api.get('/registrations/?ordering=-created_at');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const pending = data.filter((r: any) => 
        r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN'
      );
      setPendingEventApplicationsCount(pending.length);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPendingEventApplicationsCount(0);
        return;
      }
      console.error('Failed to load pending event applications count', err);
      setPendingEventApplicationsCount(0);
    }
  };

  const refreshInboxUnreadCount = async () => {
    if (!user) {
      setInboxUnreadCount(0);
      return;
    }
    
    try {
      const res = await messengerApi.getUnreadCount();
      setInboxUnreadCount(res.data.count || 0);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setInboxUnreadCount(0);
        return;
      }
      console.error('Failed to load inbox unread count', err);
      setInboxUnreadCount(0);
    }
  };

  // Navigation structure with groups - FILTERED BY LICENSE
  const allNavigationGroups = [
    {
      id: 'main',
      // Always show Overview. Inbox depends on 'messenger'
      items: [
        { name: t('main.overview'), href: '/admin/municipality', icon: LayoutDashboard },
        ...(hasFeature('messenger') ? [{ name: t('main.inbox'), href: '/admin/municipality/inbox', showBadge: true, icon: MessageSquare }] : []),
      ]
    },
    {
      id: 'municipality',
      title: t('groups.municipalityManagement'),
      icon: Building2,
      items: [
        { name: t('items.myMunicipality'), href: '/admin/municipality/settings', icon: Settings },
        { name: t('items.manageClubs'), href: '/admin/municipality/clubs', icon: Building2 },
        { name: t('items.myMembership'), href: '/admin/municipality/settings/membership', icon: Crown },
      ]
    },
    {
      id: 'users',
      title: t('groups.usersAndAccess'),
      icon: Users,
      items: [
        { name: t('items.manageAdmins'), href: '/admin/municipality/admins', icon: UserCog },
        { name: t('items.manageYouth'), href: '/admin/municipality/youth', icon: Users },
        { name: t('items.manageGuardians'), href: '/admin/municipality/guardians', icon: Shield },
      ]
    },
    // --- FEATURE GATED GROUPS ---
    ...(hasFeature('posts') ? [{
      id: 'content',
      title: t('groups.content'),
      icon: Newspaper,
      items: [
        { name: t('items.newsFeed'), href: '/admin/municipality/news-feed', icon: Rss },
        { name: t('items.managePosts'), href: '/admin/municipality/posts', icon: FileEdit },
      ]
    }] : []),

    ...(hasFeature('events') ? [{
      id: 'events',
      title: t('groups.events'),
      icon: Calendar,
      items: [
        { name: t('items.events'), href: '/admin/municipality/events', icon: Calendar },
        { name: t('items.eventCalendar'), href: '/admin/municipality/events/calendar', icon: CalendarDays },
        { name: t('items.eventApplications'), href: '/admin/municipality/events/applications', icon: ClipboardList },
      ]
    }] : []),

    ...(hasFeature('groups') ? [{
      id: 'groups',
      title: t('groups.groupsAndSocial'),
      icon: UsersRound,
      items: [
        { name: t('items.groups'), href: '/admin/municipality/groups', icon: UsersRound },
        { name: t('items.applications'), href: '/admin/municipality/groups/requests', showBadge: true, icon: FileText },
      ]
    }] : []),

    ...(hasFeature('rewards') ? [{
      id: 'rewards',
      title: t('groups.rewardsAndLoyalty'),
      icon: Gift,
      items: [
        { name: t('items.manageRewards'), href: '/admin/municipality/rewards', icon: Gift },
      ]
    }] : []),

    ...(hasFeature('inventory') ? [{
      id: 'inventory',
      title: t('groups.inventory'),
      icon: Box,
      items: [
        { name: t('items.inventory'), href: '/admin/municipality/inventory', icon: Box },
        { name: t('items.inventoryHistory'), href: '/admin/municipality/inventory/history', icon: History },
      ]
    }] : []),

    ...(hasFeature('bookings') ? [{
      id: 'bookings',
      title: t('groups.bookings'),
      icon: FileText,
      items: [
        { name: t('items.bookings'), href: '/admin/municipality/bookings', icon: FileText },
        { name: t('items.bookingCalendar'), href: '/admin/municipality/bookings/calendar', icon: CalendarDays },
        { name: t('items.bookingResources'), href: '/admin/municipality/bookings/resources', icon: Package },
      ]
    }] : []),

    ...(hasFeature('learning') ? [{
      id: 'learning',
      title: t('groups.learningCenter'),
      icon: GraduationCap,
      items: [
        { name: t('items.knowledgeCenter'), href: '/admin/municipality/knowledge', icon: GraduationCap },
        { name: t('items.findCourse'), href: '/admin/municipality/knowledge/courses', icon: BookOpen },
      ]
    }] : []),

    ...(hasFeature('analytics') ? [{
      id: 'analytics',
      title: t('groups.analytics'),
      icon: BarChart3,
      items: [
        { name: t('items.municipalityOverview'), href: '/admin/municipality/analytics', icon: TrendingUp },
      ]
    }] : []),

    {
      id: 'settings',
      title: t('groups.settingsAndConfiguration'),
      icon: Wrench,
      items: [
        // Municipality Settings is always visible
        { name: t('items.municipalitySettings'), href: '/admin/municipality/settings', icon: Settings },
        // Filter individual items inside Settings
        ...(hasFeature('messenger') ? [{ name: t('items.messageBoard'), href: '/admin/municipality/msgboard', showBadge: true, icon: MessageCircle }] : []),
        ...(hasFeature('custom_fields') ? [{ name: t('items.customFields'), href: '/admin/municipality/custom-fields', icon: Wrench }] : []),
        ...(hasFeature('questionnaires') ? [{ name: t('items.questionnaires'), href: '/admin/municipality/questionnaires', icon: FileText }] : []),
      ]
    },
  ];

  // Remove empty groups (e.g. Settings if nothing is enabled)
  const navigationGroups = allNavigationGroups.filter(g => g.items.length > 0);

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-[var(--dark-800)] border-r border-[var(--dark-600)] w-full">
      {/* Brand Header */}
      <div className={cn(
        "p-4 border-b border-[var(--dark-600)] flex items-center gap-3 transition-all duration-500 ease-in-out flex-shrink-0",
        isCollapsed && "justify-center px-2"
      )}>
        <Link href="/admin/municipality/profile" className="inline-block transition-opacity duration-300 flex-shrink-0">
          {user?.avatar ? (
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarImage src={getMediaUrl(user.avatar) || ''} alt="Profile avatar" />
              <AvatarFallback className="bg-[#4D4DA4] text-white text-sm font-semibold rounded-full">
                {getInitials(user?.first_name, user?.last_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-full bg-[#4D4DA4] flex items-center justify-center font-semibold text-white">
              <span className="text-xs">{getInitials(user?.first_name, user?.last_name)}</span>
            </div>
          )}
        </Link>
        <div className={cn(
          "flex-1 overflow-hidden min-w-0 transition-all duration-500 ease-in-out",
          isCollapsed 
            ? "opacity-0 max-w-0 w-0" 
            : "opacity-100 max-w-full"
        )}>
          <h2 className="text-sm font-semibold truncate text-[var(--brand-light)]">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-xs text-[var(--brand-light)]/60 truncate">{t('role')}</p>
        </div>
      </div>

      {/* Navigation - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className={cn("py-4", isCollapsed ? "px-2" : "px-3")}>
            <nav className={cn("space-y-1 transition-all duration-500 ease-in-out")}>
              {navigationGroups.map((group) => {
                // Check if any item in this group is active
                const hasActiveItem = group.items.some(item => pathname === item.href);
                
                // Auto-open group if it has an active item
                const isGroupOpen = isCollapsed ? false : (openGroups[group.id] ?? hasActiveItem);

                // Render main items (no group)
                if (!group.title) {
                  return group.items.map((item) => {
                    const isActive = pathname === item.href;
                    // Determine badge count and visibility for each specific item
                    let badgeCount = 0;
                    let hasBadge = false;
                    
                    if (item.href === '/admin/municipality/inbox') {
                      // Inbox: use inbox unread count
                      badgeCount = inboxUnreadCount;
                      hasBadge = inboxUnreadCount > 0;
                    } else if (item.href.includes('/msgboard')) {
                      // Message board: use system messages count
                      badgeCount = messageCount;
                      hasBadge = messageCount > 0;
                    } else if (item.href.includes('/requests')) {
                      // Group requests: use pending requests count
                      badgeCount = pendingRequestsCount;
                      hasBadge = pendingRequestsCount > 0;
                    } else if (item.href === '/admin/municipality/bookings') {
                      // Bookings main page only: use pending bookings count
                      badgeCount = pendingBookingsCount;
                      hasBadge = pendingBookingsCount > 0;
                    } else if (item.href.includes('/events/applications')) {
                      // Event applications: use pending event applications count
                      badgeCount = pendingEventApplicationsCount;
                      hasBadge = pendingEventApplicationsCount > 0;
                    }

                    const navItem = (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                          isActive 
                            ? "bg-[var(--brand-purple)]/20 text-[var(--brand-light)] shadow-sm" 
                            : "text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]",
                          isCollapsed && "justify-center px-2"
                        )}
                      >
                        {item.icon && (
                          <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors duration-300", isActive ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50 group-hover:text-[var(--brand-light)]")} />
                        )}
                        <span className={cn(
                          "flex-1 truncate transition-all duration-500 ease-in-out overflow-hidden",
                          isCollapsed 
                            ? "opacity-0 max-w-0 w-0" 
                            : "opacity-100 max-w-full"
                        )}>{item.name}</span>
                        {hasBadge && (
                          <>
                            <span className={cn(
                              "ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white flex-shrink-0 transition-all duration-500 ease-in-out overflow-hidden",
                              isCollapsed 
                                ? "opacity-0 max-w-0 w-0 ml-0" 
                                : "opacity-100 max-w-full"
                            )}>
                              {badgeCount}
                            </span>
                            {isCollapsed && (
                              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--dark-800)] transition-opacity duration-500 ease-in-out"></span>
                            )}
                          </>
                        )}
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>
                            {navItem}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-[var(--dark-700)] text-[var(--brand-light)] border-[var(--dark-600)]">
                            <p>{item.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return navItem;
                  });
                }

                // Render grouped items with Collapsible
                if (isCollapsed) {
                  // When collapsed, show group icon with popover flyout
                  return (
                    <Popover key={group.id}>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all duration-300 ease-in-out",
                            hasActiveItem && "bg-[var(--brand-purple)]/20"
                          )}
                        >
                          {group.icon && (
                            <group.icon className={cn(
                              "h-5 w-5 transition-colors duration-300",
                              hasActiveItem ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50"
                            )} />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        side="right" 
                        align="start"
                        className="w-64 p-2 bg-[var(--dark-700)] border-[var(--dark-600)]"
                      >
                        <div className="px-2 py-1.5 mb-2">
                          <h3 className="text-sm font-semibold text-[var(--brand-light)]">{group.title}</h3>
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            // Determine badge count and visibility for each specific item
                            let badgeCount = 0;
                            let hasBadge = false;
                            
                            if (item.href === '/admin/municipality/inbox') {
                              badgeCount = inboxUnreadCount;
                              hasBadge = inboxUnreadCount > 0;
                            } else if (item.href.includes('/msgboard')) {
                              badgeCount = messageCount;
                              hasBadge = messageCount > 0;
                            } else if (item.href.includes('/requests')) {
                              badgeCount = pendingRequestsCount;
                              hasBadge = pendingRequestsCount > 0;
                            } else if (item.href === '/admin/municipality/bookings') {
                              badgeCount = pendingBookingsCount;
                              hasBadge = pendingBookingsCount > 0;
                            } else if (item.href.includes('/events/applications')) {
                              badgeCount = pendingEventApplicationsCount;
                              hasBadge = pendingEventApplicationsCount > 0;
                            }

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                                  isActive 
                                    ? "bg-[var(--brand-purple)]/20 text-[var(--brand-light)]" 
                                    : "text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]"
                                )}
                              >
                                {item.icon && (
                                  <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors duration-300", isActive ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50 group-hover:text-[var(--brand-light)]")} />
                                )}
                                <span className="flex-1 truncate">{item.name}</span>
                                {hasBadge && (
                                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white flex-shrink-0">
                                    {badgeCount}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                }

                return (
                  <Collapsible
                    key={group.id}
                    open={isGroupOpen}
                    onOpenChange={(open) => {
                      // Save scroll position before state change
                      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                      const scrollTop = scrollContainer?.scrollTop || 0;
                      
                      setOpenGroups(prev => ({ ...prev, [group.id]: open }));
                      
                      // Restore scroll position after DOM updates (wait for animation to complete)
                      requestAnimationFrame(() => {
                        setTimeout(() => {
                          const updatedContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                          if (updatedContainer) {
                            updatedContainer.scrollTop = scrollTop;
                          }
                        }, 300); // Wait for transition duration
                      });
                    }}
                  >
                    <CollapsibleTrigger
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ease-in-out",
                        hasActiveItem 
                          ? "text-[var(--brand-light)] bg-[var(--brand-purple)]/20" 
                          : "text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]"
                      )}
                    >
                      {group.icon && (
                        <group.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors duration-300", hasActiveItem ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50")} />
                      )}
                      <span className="flex-1 text-left truncate">{group.title}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-all duration-300 ease-in-out flex-shrink-0",
                          hasActiveItem ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50",
                          isGroupOpen && "transform rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1 pl-4">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        // Determine badge count and visibility for each specific item
                        let badgeCount = 0;
                        let hasBadge = false;
                        
                        if (item.href === '/admin/municipality/inbox') {
                          badgeCount = inboxUnreadCount;
                          hasBadge = inboxUnreadCount > 0;
                        } else if (item.href.includes('/msgboard')) {
                          badgeCount = messageCount;
                          hasBadge = messageCount > 0;
                        } else if (item.href.includes('/requests')) {
                          badgeCount = pendingRequestsCount;
                          hasBadge = pendingRequestsCount > 0;
                        } else if (item.href === '/admin/municipality/bookings') {
                          badgeCount = pendingBookingsCount;
                          hasBadge = pendingBookingsCount > 0;
                        } else if (item.href.includes('/events/applications')) {
                          badgeCount = pendingEventApplicationsCount;
                          hasBadge = pendingEventApplicationsCount > 0;
                        }

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                              isActive 
                                ? "bg-[var(--brand-purple)]/20 text-[var(--brand-light)] shadow-sm" 
                                : "text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]"
                            )}
                          >
                            {item.icon && (
                              <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors duration-300", isActive ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/50 group-hover:text-[var(--brand-light)]")} />
                            )}
                            <span className="flex-1 truncate">{item.name}</span>
                            {hasBadge && (
                              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white flex-shrink-0">
                                {badgeCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>
          </div>
        </ScrollArea>
      </div>

      {/* Footer - Always Visible */}
      <div className={cn("p-4 border-t border-[var(--dark-600)] transition-all duration-500 ease-in-out flex-shrink-0", isCollapsed && "px-2")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all duration-300 ease-in-out",
                isCollapsed ? "justify-center" : "justify-start gap-2"
              )}
              onClick={logout}
            >
              <LogOut className="h-4 w-4 text-[var(--brand-primary)] transition-transform duration-300 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden",
                isCollapsed 
                  ? "opacity-0 max-w-0 w-0" 
                  : "opacity-100 max-w-full"
              )}>{t('signOut')}</span>
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="bg-[var(--dark-700)] text-[var(--brand-light)] border-[var(--dark-600)]">
              <p>{t('signOut')}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={['MUNICIPALITY_ADMIN']}>
      <div className="flex min-h-screen bg-[var(--dark-900)]">
        {/* Background Glow Effect */}
        <BackgroundGlow variant="admin" />
        
        {/* DESKTOP SIDEBAR */}
        <aside 
          className={cn(
            "hidden md:block fixed z-50",
            isSidebarCollapsed ? "w-16" : "w-72"
          )}
          style={{
            transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            top: 'var(--system-alert-height, 0px)',
            bottom: 0
          }}
        >
          <div className="relative h-full w-full">
            <SidebarContent isCollapsed={isSidebarCollapsed} />
            
            {/* Toggle Button - Positioned outside sidebar bounds */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] shadow-md flex items-center justify-center hover:bg-[var(--brand-purple)]/20 hover:border-[var(--brand-primary)]/30 transition-all duration-300 ease-in-out z-50 hover:scale-110"
              style={{ right: '-12px' }}
              aria-label={isSidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--brand-light)]/60 transition-transform duration-300" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5 text-[var(--brand-light)]/60 transition-transform duration-300" />
              )}
            </button>
          </div>
        </aside>

        {/* MOBILE LAYOUT */}
        <div className={cn(
          "flex-1 flex flex-col",
          isSidebarCollapsed ? "md:ml-16" : "md:ml-72"
        )}
          style={{
            transition: 'margin-left 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            paddingTop: 'var(--system-alert-height, 0px)'
          }}
        >
          
          {/* Mobile Header - Fixed at top, positioned below system alert */}
          <header className="md:hidden flex items-center justify-between p-4 bg-[var(--dark-800)] border-b border-[var(--dark-600)] fixed left-0 right-0 z-50" style={{ top: 'var(--system-alert-height, 0px)' }}>
            <div className="flex items-center gap-3">
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-[var(--dark-800)] border-r-[var(--dark-600)]">
                  <SheetTitle className="sr-only">{t('navigationMenu')}</SheetTitle>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <span className="font-semibold text-lg text-[var(--brand-light)]">Ungdomsappen</span>
            </div>
            {(inboxUnreadCount > 0 || messageCount > 0 || pendingRequestsCount > 0 || pendingBookingsCount > 0 || pendingEventApplicationsCount > 0) && (
              <div className="relative">
                <Bell className="h-5 w-5 text-[var(--brand-light)]/60" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--dark-800)]"></span>
              </div>
            )}
          </header>

          {/* MAIN CONTENT - Add padding-top on mobile to account for fixed header */}
          <main className="flex-1 pt-16 md:pt-3 px-0 sm:px-4 md:px-6 lg:px-8 pb-3 sm:pb-4 md:pb-6 lg:pb-8 overflow-y-auto overflow-x-hidden bg-[var(--dark-900)]">
            <div className="mx-auto max-w-7xl w-full min-w-0">
              <ToastProvider>
                {children}
              </ToastProvider>
            </div>
            <Toaster />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
