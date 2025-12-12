'use client';

import { useEffect, useState } from 'react';
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
  GraduationCap
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { getMediaUrl } from '../../utils';
import RoleGuard from '../../components/RoleGuard';
import api from '../../../lib/api';

// UI Components
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Helper to get initials
const getInitials = (first?: string | null, last?: string | null) => {
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || 'SA';
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user, messageCount, refreshMessageCount } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
    settings: false,
  });
  
  // Keep your existing state logic
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [pendingEventApplicationsCount, setPendingEventApplicationsCount] = useState(0);

  // Keep your existing useEffects logic exactly as it was
  useEffect(() => {
    refreshMessageCount();
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

  // Navigation structure with groups
  const navigationGroups = [
    {
      id: 'main',
      items: [
        { name: 'Overview', href: '/admin/super', icon: LayoutDashboard },
        { name: 'Inbox', href: '/admin/super/inbox', showBadge: true, icon: MessageSquare },
      ]
    },
    {
      id: 'organization',
      title: 'Organization',
      icon: BuildingIcon,
      items: [
        { name: 'Manage Countries', href: '/admin/super/countries', icon: Flag },
        { name: 'Manage Municipalities', href: '/admin/super/municipalities', icon: MapPinned },
        { name: 'Manage Clubs', href: '/admin/super/clubs', icon: Building },
      ]
    },
    {
      id: 'users',
      title: 'Users & Access',
      icon: Users,
      items: [
        { name: 'Manage Admins', href: '/admin/super/admins', icon: UserCog },
        { name: 'Manage Youth', href: '/admin/super/youth', icon: Users },
        { name: 'Manage Guardians', href: '/admin/super/guardians', icon: Shield },
      ]
    },
    {
      id: 'content',
      title: 'Content',
      icon: Newspaper,
      items: [
        { name: 'News Management', href: '/admin/super/news', icon: Newspaper },
        { name: 'News Tags', href: '/admin/super/news/tags', icon: Tag },
        { name: 'News Feed', href: '/admin/super/news-feed', icon: Rss },
        { name: 'Manage Posts', href: '/admin/super/posts', icon: FileEdit },
      ]
    },
    {
      id: 'events',
      title: 'Events',
      icon: Calendar,
      items: [
        { name: 'Events', href: '/admin/super/events', icon: Calendar },
        { name: 'Event Calendar', href: '/admin/super/events/calendar', icon: CalendarDays },
        { name: 'Event Applications', href: '/admin/super/events/applications', icon: ClipboardList },
      ]
    },
    {
      id: 'groups',
      title: 'Groups & Social',
      icon: UsersRound,
      items: [
        { name: 'Manage Groups', href: '/admin/super/groups', icon: UsersRound },
        { name: 'Applications', href: '/admin/super/groups/requests', showBadge: true, icon: FileText },
      ]
    },
    {
      id: 'rewards',
      title: 'Rewards and Loyalty',
      icon: Gift,
      items: [
        { name: 'Manage Rewards', href: '/admin/super/rewards', icon: Gift },
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: Box,
      items: [
        { name: 'Inventory', href: '/admin/super/inventory', icon: Box },
        { name: 'Inventory History', href: '/admin/super/inventory/history', icon: Clock },
      ]
    },
    {
      id: 'bookings',
      title: 'Bookings',
      icon: BookOpen,
      items: [
        { name: 'Bookings', href: '/admin/super/bookings', icon: BookOpen },
        { name: 'Booking Calendar', href: '/admin/super/bookings/calendar', icon: CalendarDays },
        { name: 'Booking Resources', href: '/admin/super/bookings/resources', icon: Package },
      ]
    },
    {
      id: 'learning',
      title: 'Learning Center',
      icon: GraduationCap,
      items: [
        { name: 'Courses', href: '/admin/super/knowledge/courses', icon: GraduationCap },
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      icon: Wrench,
      items: [
        { name: 'Custom Fields', href: '/admin/super/custom-fields', icon: Wrench },
        { name: 'Questionnaires', href: '/admin/super/questionnaires', icon: FileText },
        { name: 'Manage Interests', href: '/admin/super/interests', icon: HelpCircle },
        { name: 'System Messages', href: '/admin/super/messages', icon: MessageCircle },
      ]
    },
  ];

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-full">
      {/* Brand Header */}
      <div className={cn(
        "p-4 border-b border-gray-800 flex items-center gap-3 transition-all duration-500 ease-in-out flex-shrink-0",
        isCollapsed && "justify-center px-2"
      )}>
        <Link href="/admin/super/profile" className="inline-block transition-opacity duration-300 flex-shrink-0">
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
          <h2 className="text-sm font-semibold truncate text-gray-100">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-xs text-gray-400 truncate">Super Admin</p>
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
                    const hasBadge = 
                      ((item as any).showBadge && item.href.includes('/requests') && pendingRequestsCount > 0) ||
                      ((item as any).showBadge && !item.href.includes('/requests') && messageCount > 0) ||
                      (item.href.includes('/bookings') && !item.href.includes('/calendar') && !item.href.includes('/resources') && pendingBookingsCount > 0) ||
                      (item.href.includes('/events/applications') && pendingEventApplicationsCount > 0);

                    const navItem = (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                          isActive 
                            ? "bg-[#4D4DA4]/10 text-white shadow-sm" 
                            : "text-gray-400 hover:bg-[#4D4DA4] hover:text-white",
                          isCollapsed && "justify-center px-2"
                        )}
                      >
                        {item.icon && (
                          <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors duration-300", isActive ? "text-[#FF5485]" : "text-gray-400 group-hover:text-white")} />
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
                              "ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5485] text-[10px] font-bold text-white flex-shrink-0 transition-all duration-500 ease-in-out overflow-hidden",
                              isCollapsed 
                                ? "opacity-0 max-w-0 w-0 ml-0" 
                                : "opacity-100 max-w-full"
                            )}>
                              {messageCount || pendingRequestsCount || pendingBookingsCount || pendingEventApplicationsCount}
                            </span>
                            {isCollapsed && (
                              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF5485] ring-2 ring-gray-900 transition-opacity duration-500 ease-in-out"></span>
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
                          <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
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
                            "w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-gray-400 hover:bg-[#4D4DA4] hover:text-white transition-all duration-300 ease-in-out",
                            hasActiveItem && "bg-[#4D4DA4]/10"
                          )}
                        >
                          {group.icon && (
                            <group.icon className={cn(
                              "h-5 w-5 transition-colors duration-300",
                              hasActiveItem ? "text-[#FF5485]" : "text-gray-400"
                            )} />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        side="right" 
                        align="start"
                        className="w-64 p-2 bg-gray-800 border-gray-700"
                      >
                        <div className="px-2 py-1.5 mb-2">
                          <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            const hasBadge = 
                              ((item as any).showBadge && item.href.includes('/requests') && pendingRequestsCount > 0) ||
                              ((item as any).showBadge && !item.href.includes('/requests') && messageCount > 0) ||
                              (item.href.includes('/bookings') && !item.href.includes('/calendar') && !item.href.includes('/resources') && pendingBookingsCount > 0) ||
                              (item.href.includes('/events/applications') && pendingEventApplicationsCount > 0);

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                                  isActive 
                                    ? "bg-[#4D4DA4]/10 text-white shadow-sm" 
                                    : "text-gray-400 hover:bg-[#4D4DA4] hover:text-white"
                                )}
                              >
                                {item.icon && (
                                  <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors duration-300", isActive ? "text-[#FF5485]" : "text-gray-400 group-hover:text-white")} />
                                )}
                                <span className="flex-1 truncate">{item.name}</span>
                                {hasBadge && (
                                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5485] text-[10px] font-bold text-white flex-shrink-0">
                                    {messageCount || pendingRequestsCount || pendingBookingsCount || pendingEventApplicationsCount}
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
                          ? "text-white bg-[#4D4DA4]/10" 
                          : "text-gray-400 hover:bg-[#4D4DA4] hover:text-white"
                      )}
                    >
                      {group.icon && (
                        <group.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors duration-300", hasActiveItem ? "text-[#FF5485]" : "text-gray-400")} />
                      )}
                      <span className="flex-1 text-left truncate">{group.title}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-all duration-300 ease-in-out flex-shrink-0",
                          hasActiveItem ? "text-[#FF5485]" : "text-gray-500",
                          isGroupOpen && "transform rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1 pl-4">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        const hasBadge = 
                          ((item as any).showBadge && item.href.includes('/requests') && pendingRequestsCount > 0) ||
                          ((item as any).showBadge && !item.href.includes('/requests') && messageCount > 0) ||
                          (item.href.includes('/bookings') && !item.href.includes('/calendar') && !item.href.includes('/resources') && pendingBookingsCount > 0) ||
                          (item.href.includes('/events/applications') && pendingEventApplicationsCount > 0);

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative group",
                              isActive 
                                ? "bg-[#4D4DA4]/10 text-white shadow-sm" 
                                : "text-gray-400 hover:bg-[#4D4DA4] hover:text-white"
                            )}
                          >
                            {item.icon && (
                              <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors duration-300", isActive ? "text-[#FF5485]" : "text-gray-400 group-hover:text-white")} />
                            )}
                            <span className="flex-1 truncate">{item.name}</span>
                            {hasBadge && (
                              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5485] text-[10px] font-bold text-white flex-shrink-0">
                                {messageCount || pendingRequestsCount || pendingBookingsCount || pendingEventApplicationsCount}
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
      <div className={cn("p-4 border-t border-gray-800 transition-all duration-500 ease-in-out flex-shrink-0", isCollapsed && "px-2")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full text-gray-400 hover:text-white hover:bg-[#4D4DA4] transition-all duration-300 ease-in-out",
                isCollapsed ? "justify-center" : "justify-start gap-2"
              )}
              onClick={logout}
            >
              <LogOut className="h-4 w-4 text-[#FF5485] transition-transform duration-300 flex-shrink-0" />
              <span className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden",
                isCollapsed 
                  ? "opacity-0 max-w-0 w-0" 
                  : "opacity-100 max-w-full"
              )}>Sign Out</span>
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
              <p>Sign Out</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      <div className="flex min-h-screen bg-gray-50">
        
        {/* DESKTOP SIDEBAR */}
        <aside 
          className={cn(
            "hidden md:block fixed inset-y-0 z-50",
            isSidebarCollapsed ? "w-16" : "w-72"
          )}
          style={{
            transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="relative h-full w-full">
            <SidebarContent isCollapsed={isSidebarCollapsed} />
            
            {/* Toggle Button - Positioned outside sidebar bounds */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-gray-800 border border-gray-700 shadow-md flex items-center justify-center hover:bg-[#4D4DA4] transition-all duration-300 ease-in-out z-50 hover:scale-110"
              style={{ right: '-12px' }}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 transition-transform duration-300" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5 text-gray-300 transition-transform duration-300" />
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
            transition: 'margin-left 500ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-50">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-gray-900 border-r-gray-800">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <span className="font-semibold text-lg text-gray-900">Ungdomsappen</span>
            </div>
            {messageCount > 0 && (
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF5485] ring-2 ring-white"></span>
              </div>
            )}
          </header>

          {/* MAIN CONTENT */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-gray-50">
            <div className="mx-auto max-w-7xl w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
