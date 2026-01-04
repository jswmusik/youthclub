'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  LogOut, 
  Bell, 
  Flag, 
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
  MapPin,
  Building2,
  MessageCircle,
  UsersRound,
  Tag,
  Rss,
  FileEdit,
  ClipboardList,
  HelpCircle,
  Globe,
  MapPinned,
  Building,
  Mail,
  FolderTree,
  Award,
  Package,
  BookOpen,
  CalendarDays,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2 as BuildingIcon,
  Clock,
  GraduationCap,
  Megaphone,
  Layers,
  Navigation,
  Sparkles,
  Cookie,
  Crown,
  Trash2,
  CreditCard,
  Phone,
  Search,
  Target,
  Map,
  FileSearch,
  Link2,
  TrendingUp
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { getMediaUrl } from '../../utils';
import { ToastProvider } from '../../components/ToastProvider';
import RoleGuard from '../../components/RoleGuard';
import api from '../../../lib/api';
import { messengerApi } from '../../../lib/messenger-api';
import { Toaster } from '../../components/Toaster';
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
import { ThemeToggle } from '@/components/ThemeToggle';

// Helper to get initials
const getInitials = (first?: string | null, last?: string | null) => {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || 'SA';
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('adminSidebar');
  const pathname = usePathname();
  const { logout, user, messageCount, refreshMessageCount } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Admin inactivity timeout - logs out after 20 minutes of inactivity
  useAdminInactivityTimeout();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  // Collapsible groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    organization: true,
    users: true,
    content: false,
    events: false,
    groups: false,
    rewards: false,
    inventory: false,
    bookings: false,
    learning: false,
    marketing: false,
    seo: false,
    cms: false,
    settings: false,
  });
  
  // Keep your existing state logic
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [pendingEventApplicationsCount, setPendingEventApplicationsCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  // Keep your existing useEffects logic exactly as it was
  useEffect(() => {
    refreshMessageCount();
    refreshInboxUnreadCount();
    refreshPendingRequestsCount();
    refreshPendingBookingsCount();
    refreshPendingEventApplicationsCount();
  }, [refreshMessageCount]);

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
      // Handle 401 (unauthorized) and 403 (forbidden/license) errors silently
      if (err?.response?.status === 401 || err?.response?.status === 403) {
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
      // Handle 401 (unauthorized) and 403 (forbidden/license) errors silently
      if (err?.response?.status === 401 || err?.response?.status === 403) {
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
      // Handle 401 (unauthorized) and 403 (forbidden/license) errors silently
      if (err?.response?.status === 401 || err?.response?.status === 403) {
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

  // Navigation structure with groups
  const navigationGroups = [
    {
      id: 'main',
      items: [
        { name: t('main.overview'), href: '/admin/super', icon: LayoutDashboard },
        { name: t('main.inbox'), href: '/admin/super/inbox', showBadge: true, icon: MessageSquare },
      ]
    },
    {
      id: 'organization',
      title: t('groups.organization'),
      icon: BuildingIcon,
      items: [
        { name: t('items.manageCountries'), href: '/admin/super/countries', icon: Flag },
        { name: t('items.manageMunicipalities'), href: '/admin/super/municipalities', icon: MapPinned },
        { name: t('items.manageClubs'), href: '/admin/super/clubs', icon: Building },
        { name: t('items.planBuilder'), href: '/admin/super/plans', icon: Package },
        { name: t('items.licenseManagement'), href: '/admin/super/licenses', icon: Crown },
        { name: t('items.featurePricing'), href: '/admin/super/licensing/features', icon: Tag },
      ]
    },
    {
      id: 'users',
      title: t('groups.usersAndAccess'),
      icon: Users,
      items: [
        { name: t('items.manageAdmins'), href: '/admin/super/admins', icon: UserCog },
        { name: t('items.manageYouth'), href: '/admin/super/youth', icon: Users },
        { name: t('items.manageGuardians'), href: '/admin/super/guardians', icon: Shield },
      ]
    },
    {
      id: 'content',
      title: t('groups.content'),
      icon: Newspaper,
      items: [
        { name: t('items.newsManagement'), href: '/admin/super/news', icon: Newspaper },
        { name: t('items.newsTags'), href: '/admin/super/news/tags', icon: Tag },
        { name: t('items.newsFeed'), href: '/admin/super/news-feed', icon: Rss },
        { name: t('items.managePosts'), href: '/admin/super/posts', icon: FileEdit },
      ]
    },
    {
      id: 'events',
      title: t('groups.events'),
      icon: Calendar,
      items: [
        { name: t('items.events'), href: '/admin/super/events', icon: Calendar },
        { name: t('items.eventCalendar'), href: '/admin/super/events/calendar', icon: CalendarDays },
        { name: t('items.eventApplications'), href: '/admin/super/events/applications', icon: ClipboardList },
      ]
    },
    {
      id: 'groups',
      title: t('groups.groupsAndSocial'),
      icon: UsersRound,
      items: [
        { name: t('items.manageGroups'), href: '/admin/super/groups', icon: UsersRound },
        { name: t('items.applications'), href: '/admin/super/groups/requests', showBadge: true, icon: FileText },
      ]
    },
    {
      id: 'rewards',
      title: t('groups.rewardsAndLoyalty'),
      icon: Gift,
      items: [
        { name: t('items.manageRewards'), href: '/admin/super/rewards', icon: Gift },
      ]
    },
    {
      id: 'inventory',
      title: t('groups.inventory'),
      icon: Box,
      items: [
        { name: t('items.inventory'), href: '/admin/super/inventory', icon: Box },
        { name: t('items.inventoryHistory'), href: '/admin/super/inventory/history', icon: Clock },
      ]
    },
    {
      id: 'bookings',
      title: t('groups.bookings'),
      icon: BookOpen,
      items: [
        { name: t('items.bookings'), href: '/admin/super/bookings', icon: BookOpen },
        { name: t('items.bookingCalendar'), href: '/admin/super/bookings/calendar', icon: CalendarDays },
        { name: t('items.bookingResources'), href: '/admin/super/bookings/resources', icon: Package },
      ]
    },
    {
      id: 'learning',
      title: t('groups.learningCenter'),
      icon: GraduationCap,
      items: [
        { name: t('items.courses'), href: '/admin/super/knowledge/courses', icon: GraduationCap },
      ]
    },
    {
      id: 'marketing',
      title: t('groups.marketing'),
      icon: Megaphone,
      items: [
        { name: t('items.homepageAndSeo'), href: '/admin/super/marketing', icon: Globe },
        { name: t('items.customers'), href: '/admin/super/marketing/customers', icon: Building2 },
        { name: t('items.newsletter'), href: '/admin/super/marketing/newsletter', icon: Mail },
      ]
    },
    {
      id: 'seo',
      title: t('groups.seoTool'),
      icon: Search,
      items: [
        { name: t('items.seoDashboard'), href: '/admin/super/seo', icon: TrendingUp },
        { name: t('items.keywords'), href: '/admin/super/seo/keywords', icon: Target },
        { name: t('items.locations'), href: '/admin/super/seo/locations', icon: Map },
        { name: t('items.localPages'), href: '/admin/super/seo/local-pages', icon: MapPinned },
        { name: t('items.seoArticles'), href: '/admin/super/seo/articles', icon: FileSearch },
        { name: t('items.internalLinks'), href: '/admin/super/seo/links', icon: Link2 },
      ]
    },
    {
      id: 'cms',
      title: t('groups.cms'),
      icon: Layers,
      items: [
        { name: t('items.pages'), href: '/admin/super/cms/pages', icon: FileText },
        { name: t('items.navigation'), href: '/admin/super/cms/navigation', icon: Navigation },
        { name: t('items.features'), href: '/admin/super/cms/features', icon: Sparkles },
        { name: t('items.cookieConsent'), href: '/admin/super/cms/cookies', icon: Cookie },
        { name: t('items.pricingPage'), href: '/admin/super/cms/pricing', icon: CreditCard },
        { name: t('items.contactPage'), href: '/admin/super/cms/contact', icon: Phone },
      ]
    },
    {
      id: 'settings',
      title: t('groups.settingsAndConfiguration'),
      icon: Wrench,
      items: [
        { name: t('items.dataRetention'), href: '/admin/super/settings/data-retention', icon: Trash2 },
        { name: t('items.emailTemplates'), href: '/admin/super/settings/email-templates', icon: Mail },
        { name: t('items.notificationTemplates'), href: '/admin/super/settings/notification-templates', icon: Bell },
        { name: t('items.boilerplates'), href: '/admin/super/settings/boilerplates', icon: FileText },
        { name: t('items.customFields'), href: '/admin/super/custom-fields', icon: Wrench },
        { name: t('items.questionnaires'), href: '/admin/super/questionnaires', icon: FileText },
        { name: t('items.manageInterests'), href: '/admin/super/interests', icon: HelpCircle },
        { name: t('items.systemMessages'), href: '/admin/super/messages', icon: MessageCircle },
      ]
    },
  ];

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-[var(--dark-800)] border-r border-[var(--dark-600)] w-full">
      {/* Brand Header */}
      <div className={cn(
        "p-4 border-b border-[var(--dark-600)] flex items-center gap-3 transition-all duration-500 ease-in-out flex-shrink-0",
        isCollapsed && "justify-center px-2"
      )}>
        <Link href="/admin/super/profile" className="inline-block transition-opacity duration-300 flex-shrink-0">
          {user?.avatar ? (
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarImage src={getMediaUrl(user.avatar) || ''} alt="Profile avatar" />
              <AvatarFallback className="bg-[var(--brand-purple)] text-white text-sm font-semibold rounded-full">
                {getInitials(user?.first_name, user?.last_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-full bg-[var(--brand-purple)] flex items-center justify-center font-semibold text-white">
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
          <p className="text-xs text-[var(--brand-light)]/50 truncate">{t('role')}</p>
        </div>
      </div>

      {/* Navigation - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
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
                    
                    if (item.href === '/admin/super/inbox') {
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
                    } else if (item.href === '/admin/super/bookings') {
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
                            ? "bg-[var(--brand-purple)]/20 text-[var(--brand-light)]" 
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
                              "ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--dark-900)] flex-shrink-0 transition-all duration-500 ease-in-out overflow-hidden",
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
                            
                            if (item.href === '/admin/super/inbox') {
                              badgeCount = inboxUnreadCount;
                              hasBadge = inboxUnreadCount > 0;
                            } else if (item.href.includes('/msgboard')) {
                              badgeCount = messageCount;
                              hasBadge = messageCount > 0;
                            } else if (item.href.includes('/requests')) {
                              badgeCount = pendingRequestsCount;
                              hasBadge = pendingRequestsCount > 0;
                            } else if (item.href === '/admin/super/bookings') {
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
                                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--dark-900)] flex-shrink-0">
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
                    onOpenChange={(open) => setOpenGroups(prev => ({ ...prev, [group.id]: open }))}
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
                          hasActiveItem ? "text-[var(--brand-primary)]" : "text-[var(--brand-light)]/40",
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
                        
                        if (item.href === '/admin/super/inbox') {
                          badgeCount = inboxUnreadCount;
                          hasBadge = inboxUnreadCount > 0;
                        } else if (item.href.includes('/msgboard')) {
                          badgeCount = messageCount;
                          hasBadge = messageCount > 0;
                        } else if (item.href.includes('/requests')) {
                          badgeCount = pendingRequestsCount;
                          hasBadge = pendingRequestsCount > 0;
                        } else if (item.href === '/admin/super/bookings') {
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
                              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-[var(--dark-900)] flex-shrink-0">
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
        {/* Theme Toggle */}
        <div className={cn("mb-3", isCollapsed && "flex justify-center")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[var(--dark-700)] text-[var(--brand-light)] border-[var(--dark-600)]">
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <ThemeToggle showLabel className="w-full justify-center" />
          )}
        </div>
        
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
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      <div className="flex min-h-screen bg-[var(--dark-900)]" data-admin="true">
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
            <div className="mx-auto max-w-7xl w-full min-w-0 px-0 sm:px-0">
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
