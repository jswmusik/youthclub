'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, Save, Building2, Crown, BarChart3, AlertTriangle, 
  Clock, CheckCircle, XCircle, Inbox, Loader2, Bell, History,
  Search, Filter, Calendar, DollarSign
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast, differenceInMonths } from 'date-fns';
import Skeleton from '@/app/components/ui/Skeleton';
import { useToast } from '../../../../hooks/useToast';

interface Plan {
  id: number;
  name: string;
  monthly_price_sek: number;
  features_details?: Feature[];
}

interface Feature {
  id: number;
  name: string;
  slug: string;
  monthly_price_sek: number;
}

interface License {
  id: number;
  municipality: number;
  municipality_name: string;
  plan: number;
  plan_name: string;
  plan_features: number[];
  max_clubs: number;
  has_analytics: boolean;
  extra_features: number[];
  is_active: boolean;
  end_date: string;
}

interface LicenseRequest {
  id: number;
  municipality: number;
  municipality_name: string;
  request_type: string;
  status: string;
  requested_plan: number | null;
  requested_plan_name: string | null;
  requested_feature: number | null;
  requested_feature_name: string | null;
  requested_club_count: number | null;
  renewal_years: number | null;
  admin_notes: string;
  created_at: string;
}

interface GlobalPricing {
  price_per_extra_club_sek: number;
  analytics_package_price_sek: number;
  yearly_renewal_discount_percent: number;
}

export default function LicenseManagementPage() {
  const t = useTranslations('licenses');
  const tRequestTypes = useTranslations('licenses.requestTypes');
  const tPlans = useTranslations('plans');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LicenseRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const { success: showToastSuccess, error: showToastError } = useToast();

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [licRes, planRes, featRes, reqRes, pricingRes] = await Promise.all([
        api.get('/licensing/licenses/'),
        api.get('/licensing/plans/'),
        api.get('/licensing/features/'),
        api.get('/licensing/requests/'),
        api.get('/licensing/pricing/')
      ]);
      
      setLicenses(licRes.data.results || licRes.data);
      setPlans(planRes.data.results || planRes.data);
      setFeatures(featRes.data.results || featRes.data || []);
      setRequests(reqRes.data.results || reqRes.data || []);
      setGlobalPricing(pricingRes.data);

    } catch (error) {
      console.error("Failed to fetch licensing data", error);
      showToastError(t('toast.failedToLoadLicensingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingLicense) return;
    try {
      await api.patch(`/licensing/licenses/${editingLicense.id}/`, {
        plan: editingLicense.plan,
        max_clubs: editingLicense.max_clubs,
        has_analytics: editingLicense.has_analytics,
        extra_features: editingLicense.extra_features
      });
      showToastSuccess(t('toast.licenseUpdatedSuccessfully'));
      setEditingLicense(null);
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      showToastError(t('toast.failedToUpdateLicense'));
    }
  };

  const openEditDialog = (license: License) => {
    setEditingLicense({ ...license });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingLicense(null);
    setDialogOpen(false);
  };

  const openRequestDialog = (request: LicenseRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setRequestDialogOpen(true);
  };

      const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    setProcessingRequest(true);
    try {
      await api.post(`/licensing/requests/${selectedRequest.id}/approve/`, {
        notes: adminNotes
      });
      showToastSuccess(t('toast.requestApprovedSuccessfully'));
      setRequestDialogOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      showToastError(error?.response?.data?.error || t('toast.failedToApproveRequest'));
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    setProcessingRequest(true);
    try {
      await api.post(`/licensing/requests/${selectedRequest.id}/reject/`, {
        notes: adminNotes
      });
      showToastSuccess(t('toast.requestRejected'));
      setRequestDialogOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      showToastError(error?.response?.data?.error || t('toast.failedToRejectRequest'));
    } finally {
      setProcessingRequest(false);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'NEW_CLUB': return tRequestTypes('extraClubSlot');
      case 'UPGRADE_PLAN': return tRequestTypes('planUpgrade');
      case 'ADD_FEATURE': return tRequestTypes('addonFeature');
      case 'ADD_ANALYTICS': return tRequestTypes('analyticsPackage');
      case 'RENEWAL': return tRequestTypes('licenseRenewal');
      default: return type;
    }
  };

  // Function to get translated feature name
  const getFeatureDisplayName = (featureId: number | null, featureName: string | null): string => {
    if (!featureId || !featureName) return featureName || '';
    
    // Find the feature by ID
    const feature = features.find(f => f.id === featureId);
    if (!feature) return featureName;
    
    // Translate based on slug (same mapping as in plans page)
    const slugToKey: Record<string, string> = {
      'posts': 'features.newsAndPosts',
      'groups': 'features.interestGroups',
      'learning': 'features.learningPlatform',
      'custom_fields': 'features.customDataFields',
      'visits': 'features.checkInSystem',
      'events': 'features.eventsSystem',
      'messenger': 'features.messengerAndChat',
      'inventory': 'features.inventoryAndLending',
      'bookings': 'features.facilityBookings',
      'questionnaires': 'features.questionnairesAndVoting',
      'rewards': 'features.rewardsAndGamification',
      'analytics': 'features.analyticsDashboard',
    };
    
    const translationKey = slugToKey[feature.slug];
    if (translationKey) {
      return tPlans(translationKey);
    }
    // Fallback to original name if slug not found
    return featureName;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400">{t('status.pending')}</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-400">{t('status.approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{t('status.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate price for a request
  const calculateRequestPrice = (request: LicenseRequest) => {
    if (!globalPricing) return null;
    
    // Find the license for this municipality to get remaining months
    const license = licenses.find(l => l.municipality === request.municipality);
    if (!license) return null;
    
    const endDate = license.end_date ? parseISO(license.end_date) : null;
    const remainingMonths = endDate ? Math.max(1, differenceInMonths(endDate, new Date())) : 12;
    
    switch (request.request_type) {
      case 'NEW_CLUB': {
        const currentClubs = license.max_clubs;
        const newClubs = request.requested_club_count || (currentClubs + 1);
        const additionalClubs = newClubs - currentClubs;
        const price = additionalClubs * Number(globalPricing.price_per_extra_club_sek) * remainingMonths;
        return { price, description: t('priceCalculation.clubs', { count: additionalClubs, price: globalPricing.price_per_extra_club_sek, months: remainingMonths }) };
      }
      case 'ADD_ANALYTICS': {
        const price = Number(globalPricing.analytics_package_price_sek) * remainingMonths;
        return { price, description: t('priceCalculation.analytics', { price: globalPricing.analytics_package_price_sek, months: remainingMonths }) };
      }
      case 'ADD_FEATURE': {
        const feature = features.find(f => f.id === request.requested_feature);
        if (!feature) return null;
        const price = Number(feature.monthly_price_sek) * remainingMonths;
        return { price, description: t('priceCalculation.feature', { price: feature.monthly_price_sek, months: remainingMonths }) };
      }
      case 'UPGRADE_PLAN': {
        const newPlan = plans.find(p => p.id === request.requested_plan);
        const currentPlan = plans.find(p => p.id === license.plan);
        if (!newPlan || !currentPlan) return null;
        const priceDiff = Number(newPlan.monthly_price_sek) - Number(currentPlan.monthly_price_sek);
        const price = priceDiff * remainingMonths;
        return { price, description: t('priceCalculation.planUpgrade', { newPrice: newPlan.monthly_price_sek, oldPrice: currentPlan.monthly_price_sek, months: remainingMonths }) };
      }
      case 'RENEWAL': {
        const currentPlan = plans.find(p => p.id === license.plan);
        if (!currentPlan) return null;
        const years = request.renewal_years || 1;
        const months = years * 12;
        let price = Number(currentPlan.monthly_price_sek) * months;
        
        // Apply discount for multi-year renewals
        let discountPercent = 0;
        if (years > 1 && globalPricing) {
          discountPercent = Number(globalPricing.yearly_renewal_discount_percent);
          price = Math.round(price * (1 - discountPercent / 100));
        }
        
        const description = discountPercent > 0 
          ? t('priceCalculation.renewalWithDiscount', { price: currentPlan.monthly_price_sek, months, discount: discountPercent })
          : t('priceCalculation.renewal', { price: currentPlan.monthly_price_sek, months });
        return { price, description };
      }
      default:
        return null;
    }
  };

  // Filter features to exclude analytics (since it has its own toggle)
  const editableFeatures = features.filter(f => f.slug !== 'analytics');

  // Check if a feature is included in the plan (not editable) or extra (editable)
  const isFeatureInPlan = (featureId: number) => {
    if (!editingLicense) return false;
    return editingLicense.plan_features?.includes(featureId) || false;
  };

  const isFeatureEnabled = (featureId: number) => {
    if (!editingLicense) return false;
    return isFeatureInPlan(featureId) || editingLicense.extra_features?.includes(featureId) || false;
  };

  // Filtered history (processed requests)
  const filteredHistory = useMemo(() => {
    return requests.filter(r => {
      // Status filter
      if (historyStatusFilter !== 'all' && r.status !== historyStatusFilter) return false;
      
      // Type filter
      if (historyTypeFilter !== 'all' && r.request_type !== historyTypeFilter) return false;
      
      // Search filter
      if (historySearch) {
        const search = historySearch.toLowerCase();
        const matchesMunicipality = r.municipality_name.toLowerCase().includes(search);
        const matchesFeature = r.requested_feature_name?.toLowerCase().includes(search);
        const matchesPlan = r.requested_plan_name?.toLowerCase().includes(search);
        if (!matchesMunicipality && !matchesFeature && !matchesPlan) return false;
      }
      
      return true;
    });
  }, [requests, historySearch, historyStatusFilter, historyTypeFilter]);

  // Stats
  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter(l => l.is_active).length;
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
  const processedRequests = requests.filter(r => r.status !== 'PENDING').length;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-light)]">{t('title')}</h1>
          <p className="text-[var(--brand-light)]/60 mt-1">{t('description')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalLicenses')}</CardTitle>
            <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-light)]">{totalLicenses}</div>
            <p className="text-xs text-[var(--brand-light)]/50">{t('stats.municipalitiesRegistered')}</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.activeLicenses')}</CardTitle>
            <Crown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeLicenses}</div>
            <p className="text-xs text-[var(--brand-light)]/50">{t('stats.percentOfTotal', { percent: Math.round((activeLicenses / totalLicenses) * 100) || 0 })}</p>
          </CardContent>
        </Card>

        <Card className={`border-[var(--dark-600)] ${pendingRequests > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-[var(--dark-700)]'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.pendingRequests')}</CardTitle>
            {pendingRequests > 0 ? (
              <Bell className="h-4 w-4 text-yellow-500 animate-pulse" />
            ) : (
              <Inbox className="h-4 w-4 text-[var(--brand-light)]/50" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingRequests > 0 ? 'text-yellow-500' : 'text-[var(--brand-light)]/50'}`}>
              {pendingRequests}
            </div>
            <p className="text-xs text-[var(--brand-light)]/50">
              {pendingRequests > 0 ? t('stats.awaitingReview') : t('stats.noPendingRequests')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.processed')}</CardTitle>
            <History className="h-4 w-4 text-[var(--brand-sky)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-sky)]">{processedRequests}</div>
            <p className="text-xs text-[var(--brand-light)]/50">{t('stats.totalProcessedRequests')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Licenses, Requests, and History */}
      <Tabs defaultValue="licenses" className="space-y-4 licenses-tabs">
        <style>{`
          .licenses-tabs [data-slot="tabs-trigger"][data-state="active"] {
            background-color: var(--brand-primary) !important;
            color: #111 !important;
            font-weight: 600 !important;
          }
        `}</style>
        <TabsList className="bg-[var(--dark-700)] border border-[var(--dark-600)]">
          <TabsTrigger 
            value="licenses" 
            className="text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-colors"
          >
            {t('tabs.licenses')}
          </TabsTrigger>
          <TabsTrigger 
            value="requests" 
            className="text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-colors relative"
          >
            {t('tabs.pending')}
            {pendingRequests > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                {pendingRequests}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-colors"
          >
            {t('tabs.history')}
          </TabsTrigger>
        </TabsList>

        {/* Licenses Tab */}
        <TabsContent value="licenses">
          <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
            <CardHeader>
              <CardTitle className="text-[var(--brand-light)]">{t('licensesTab.title')}</CardTitle>
              <CardDescription className="text-[var(--brand-light)]/60">
                {t('licensesTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--dark-600)] hover:bg-transparent">
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.municipality')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.plan')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.clubs')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.analytics')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.expires')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.status')}</TableHead>
                    <TableHead className="text-right text-[var(--brand-light)]/70">{t('licensesTab.tableHeaders.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-[var(--brand-light)]/50 py-8">
                        {t('licensesTab.emptyState')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    licenses.map((license) => {
                      const endDate = license.end_date ? parseISO(license.end_date) : null;
                      const daysUntilExpiry = endDate ? differenceInDays(endDate, new Date()) : null;
                      const isExpired = endDate ? isPast(endDate) : false;
                      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                      
                      return (
                        <TableRow key={license.id} className="border-[var(--dark-600)] hover:bg-[var(--dark-600)]/50">
                          <TableCell className="font-medium text-[var(--brand-light)]">{license.municipality_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[var(--brand-primary)] text-[var(--brand-primary)]">
                              {license.plan_name}
                            </Badge>
                            {license.extra_features && license.extra_features.length > 0 && (
                              <span className="ml-2 text-xs text-[var(--brand-light)]/50">
                                + {license.extra_features.length} {t('licensesTab.extras')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[var(--brand-light)]">{license.max_clubs}</TableCell>
                          <TableCell>
                            {license.has_analytics ? (
                              <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">{t('licensesTab.active')}</Badge>
                            ) : (
                              <span className="text-[var(--brand-light)]/30">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {endDate ? (
                              <div className="flex items-center gap-2">
                                {isExpired ? (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('licensesTab.expired')}
                                  </Badge>
                                ) : isExpiringSoon ? (
                                  <div className="flex flex-col">
                                    <span className="text-amber-400 text-sm font-medium flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {format(endDate, 'MMM d, yyyy')}
                                    </span>
                                    <span className="text-xs text-amber-400/70">{t('licensesTab.daysLeft', { days: daysUntilExpiry })}</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-[var(--brand-light)] text-sm">{format(endDate, 'MMM d, yyyy')}</span>
                                    <span className="text-xs text-[var(--brand-light)]/50">{t('licensesTab.daysLeft', { days: daysUntilExpiry })}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--brand-light)]/30">{t('licensesTab.noDateSet')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {license.is_active ? (
                              <span className="inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold bg-[var(--brand-primary)] text-[#111]">
                                {t('licensesTab.active')}
                              </span>
                            ) : (
                              <Badge variant="destructive">
                                {t('licensesTab.inactive')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditDialog(license)}
                              className="text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                            >
                              <Edit className="w-4 h-4 mr-2" /> {t('licensesTab.manage')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="requests">
          <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
            <CardHeader>
              <CardTitle className="text-[var(--brand-light)]">{t('pendingTab.title')}</CardTitle>
              <CardDescription className="text-[var(--brand-light)]/60">
                {t('pendingTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--dark-600)] hover:bg-transparent">
                    <TableHead className="text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.municipality')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.requestType')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.details')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.estPrice')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.date')}</TableHead>
                    <TableHead className="text-right text-[var(--brand-light)]/70">{t('pendingTab.tableHeaders.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-[var(--brand-light)]/50 py-8">
                        <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        {t('pendingTab.emptyState')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.filter(r => r.status === 'PENDING').map((request) => {
                      const priceInfo = calculateRequestPrice(request);
                      return (
                        <TableRow 
                          key={request.id} 
                          className="border-[var(--dark-600)] hover:bg-[var(--dark-600)]/50 bg-yellow-500/5"
                        >
                          <TableCell className="font-medium text-[var(--brand-light)]">
                            {request.municipality_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[var(--brand-light)]/30 text-[var(--brand-light)]">
                              {getRequestTypeLabel(request.request_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[var(--brand-light)]/70 text-sm">
                            {request.requested_plan_name && t('pendingTab.plan', { planName: request.requested_plan_name })}
                            {request.requested_feature_name && ` ${t('pendingTab.feature', { featureName: getFeatureDisplayName(request.requested_feature, request.requested_feature_name) })}`}
                            {request.requested_club_count && ` ${t('pendingTab.clubs', { count: request.requested_club_count })}`}
                            {request.request_type === 'ADD_ANALYTICS' && ` ${t('pendingTab.analyticsPackage')}`}
                            {request.request_type === 'RENEWAL' && ` ${t('pendingTab.renewal', { years: request.renewal_years || 1 })}`}
                          </TableCell>
                          <TableCell>
                            {priceInfo ? (
                              <span className="text-[var(--brand-primary)] font-semibold">
                                {priceInfo.price.toLocaleString()} kr
                              </span>
                            ) : (
                              <span className="text-[var(--brand-light)]/30">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[var(--brand-light)]/60 text-sm">
                            {format(parseISO(request.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => openRequestDialog(request)}
                              className="bg-[var(--brand-primary)] text-black hover:bg-[var(--brand-primary)]/90 hover:text-black"
                            >
                              <Clock className="w-4 h-4 mr-2" /> {t('pendingTab.review')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
            <CardHeader>
              <CardTitle className="text-[var(--brand-light)]">{t('historyTab.title')}</CardTitle>
              <CardDescription className="text-[var(--brand-light)]/60">
                {t('historyTab.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 p-4 bg-[var(--dark-600)] rounded-lg">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-[var(--brand-light)]/70 text-xs mb-1 block">{t('historyTab.filters.search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/50" />
                    <Input 
                      placeholder={t('historyTab.filters.searchPlaceholder')}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-9 bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
                    />
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label className="text-[var(--brand-light)]/70 text-xs mb-1 block">{t('historyTab.filters.status')}</Label>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                      <SelectItem value="all" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{t('historyTab.status.allStatus')}</SelectItem>
                      <SelectItem value="PENDING" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{t('historyTab.status.pending')}</SelectItem>
                      <SelectItem value="APPROVED" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{t('historyTab.status.approved')}</SelectItem>
                      <SelectItem value="REJECTED" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{t('historyTab.status.rejected')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Label className="text-[var(--brand-light)]/70 text-xs mb-1 block">{t('historyTab.filters.requestType')}</Label>
                  <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                    <SelectTrigger className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                      <SelectItem value="all" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('allTypes')}</SelectItem>
                      <SelectItem value="NEW_CLUB" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('extraClub')}</SelectItem>
                      <SelectItem value="UPGRADE_PLAN" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('upgradePlan')}</SelectItem>
                      <SelectItem value="ADD_FEATURE" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('addFeature')}</SelectItem>
                      <SelectItem value="ADD_ANALYTICS" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('analytics')}</SelectItem>
                      <SelectItem value="RENEWAL" className="text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] focus:bg-[var(--dark-500)] focus:text-[var(--brand-light)] cursor-pointer">{tRequestTypes('renewal')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* History Table */}
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--dark-600)] hover:bg-transparent">
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.municipality')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.requestType')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.details')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.date')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.status')}</TableHead>
                    <TableHead className="text-[var(--brand-light)]/70">{t('historyTab.tableHeaders.notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-[var(--brand-light)]/50 py-8">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        {t('historyTab.emptyState')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((request) => (
                      <TableRow 
                        key={request.id} 
                        className="border-[var(--dark-600)] hover:bg-[var(--dark-600)]/50"
                      >
                        <TableCell className="font-medium text-[var(--brand-light)]">
                          {request.municipality_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[var(--brand-light)]/30 text-[var(--brand-light)]">
                            {getRequestTypeLabel(request.request_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--brand-light)]/70 text-sm">
                          {request.requested_plan_name && t('historyTab.plan', { planName: request.requested_plan_name })}
                          {request.requested_feature_name && ` ${t('historyTab.feature', { featureName: getFeatureDisplayName(request.requested_feature, request.requested_feature_name) })}`}
                          {request.requested_club_count && ` ${t('historyTab.clubs', { count: request.requested_club_count })}`}
                          {request.request_type === 'ADD_ANALYTICS' && ` ${t('historyTab.analyticsPackage')}`}
                          {request.request_type === 'RENEWAL' && ` ${t('historyTab.renewal', { years: request.renewal_years || 1 })}`}
                        </TableCell>
                        <TableCell className="text-[var(--brand-light)]/60 text-sm">
                          {format(parseISO(request.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="text-[var(--brand-light)]/50 text-sm max-w-[200px] truncate">
                          {request.admin_notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit License Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[var(--dark-700)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">
              {t('editDialog.title', { municipalityName: editingLicense?.municipality_name || '' })}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          
          {editingLicense && (
            <div className="grid gap-6 py-4">
              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)]">{t('editDialog.subscriptionPlan')}</Label>
                <Select 
                  value={String(editingLicense.plan)} 
                  onValueChange={(val) => {
                    const newPlanId = parseInt(val);
                    const newPlan = plans.find(p => p.id === newPlanId);
                    const newPlanFeatures = newPlan?.features_details?.map(f => f.id) || [];
                    setEditingLicense({
                      ...editingLicense, 
                      plan: newPlanId,
                      plan_features: newPlanFeatures
                    });
                  }}
                >
                  <SelectTrigger className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]">
                    <SelectValue placeholder={t('editDialog.selectPlan')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                    {plans.map(p => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-[var(--brand-light)]">
                        {p.name} ({p.monthly_price_sek} kr/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Club Limits */}
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)]">{t('editDialog.maxClubsAllowed')}</Label>
                <Input 
                  type="number" 
                  value={editingLicense.max_clubs}
                  onChange={(e) => setEditingLicense({...editingLicense, max_clubs: parseInt(e.target.value) || 1})} 
                  className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                />
              </div>

              {/* Analytics Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dark-600)] border border-[var(--dark-500)]">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-[var(--brand-peach)]" />
                  <div>
                    <Label className="text-[var(--brand-light)]">{t('editDialog.analyticsPackage')}</Label>
                    <p className="text-xs text-[var(--brand-light)]/50">{t('editDialog.analyticsDescription')}</p>
                  </div>
                </div>
                <Checkbox 
                  id="analytics" 
                  checked={editingLicense.has_analytics}
                  onCheckedChange={(checked) => setEditingLicense({...editingLicense, has_analytics: checked as boolean})}
                  className="border-[var(--dark-400)] data-[state=checked]:bg-[var(--brand-primary)]"
                />
              </div>

              {/* Features */}
              <div className="space-y-2 border-t border-[var(--dark-600)] pt-4">
                <Label className="text-[var(--brand-light)]">{t('editDialog.features')}</Label>
                <p className="text-xs text-[var(--brand-light)]/50 mb-3">
                  {t('editDialog.featuresDescription')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {editableFeatures.map(feat => {
                    const inPlan = isFeatureInPlan(feat.id);
                    const enabled = isFeatureEnabled(feat.id);
                    
                    return (
                      <div 
                        key={feat.id} 
                        className={`flex items-center space-x-2 p-2 rounded ${
                          inPlan ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20' : ''
                        }`}
                      >
                        <Checkbox 
                          id={`feat-${feat.id}`}
                          checked={enabled}
                          disabled={inPlan}
                          onCheckedChange={(checked) => {
                            if (inPlan) return;
                            const current = editingLicense.extra_features || [];
                            const newFeatures = checked 
                              ? [...current, feat.id]
                              : current.filter(id => id !== feat.id);
                            setEditingLicense({...editingLicense, extra_features: newFeatures});
                          }}
                          className="border-[var(--dark-500)] data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                        <Label 
                          htmlFor={`feat-${feat.id}`} 
                          className={`text-sm font-normal ${
                            inPlan 
                              ? 'text-[var(--brand-primary)]' 
                              : enabled 
                                ? 'text-[var(--brand-light)]' 
                                : 'text-[var(--brand-light)]/50'
                          }`}
                        >
                          {feat.name}
                          {inPlan && (
                            <span className="ml-1 text-xs text-[var(--brand-primary)]/70">{t('editDialog.inPlan')}</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeDialog}
              className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
            >
              {t('editDialog.cancel')}
            </Button>
            <button 
              onClick={handleSave} 
              className="inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[#111] font-semibold rounded-md px-4 py-2 transition-colors"
            >
              <Save className="w-4 h-4" /> {t('editDialog.saveChanges')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Review Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[var(--dark-700)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">
              {selectedRequest?.status === 'PENDING' ? t('requestDialog.reviewRequest') : t('requestDialog.requestDetails')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {selectedRequest?.municipality_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.requestType')}</Label>
                  <p className="text-[var(--brand-light)] font-medium">
                    {getRequestTypeLabel(selectedRequest.request_type)}
                  </p>
                </div>
                <div>
                  <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.status')}</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.details')}</Label>
                <p className="text-[var(--brand-light)]">
                  {selectedRequest.requested_plan_name && t('requestDialog.upgradeTo', { planName: selectedRequest.requested_plan_name })}
                  {selectedRequest.requested_feature_name && ` ${t('requestDialog.addFeature', { featureName: getFeatureDisplayName(selectedRequest.requested_feature, selectedRequest.requested_feature_name) })}`}
                  {selectedRequest.requested_club_count && ` ${t('requestDialog.increaseClubsTo', { count: selectedRequest.requested_club_count })}`}
                  {selectedRequest.request_type === 'ADD_ANALYTICS' && ` ${t('requestDialog.addAnalyticsPackage')}`}
                  {selectedRequest.request_type === 'RENEWAL' && ` ${t('requestDialog.renewLicenseFor', { years: selectedRequest.renewal_years || 1 })}`}
                </p>
              </div>

              {/* Price Calculation */}
              {(() => {
                const priceInfo = calculateRequestPrice(selectedRequest);
                if (priceInfo) {
                  return (
                    <div className="p-3 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
                      <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.estimatedPrice')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="w-5 h-5 text-[var(--brand-primary)]" />
                        <span className="text-2xl font-bold text-[var(--brand-primary)]">
                          {priceInfo.price.toLocaleString()} kr
                        </span>
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/50 mt-1">
                        {priceInfo.description}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.submitted')}</Label>
                <p className="text-[var(--brand-light)]">
                  {format(parseISO(selectedRequest.created_at), 'MMMM d, yyyy \'at\' HH:mm')}
                </p>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]">{t('requestDialog.adminNotes')}</Label>
                  <Textarea 
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t('requestDialog.adminNotesPlaceholder')}
                    className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                  />
                </div>
              )}

              {selectedRequest.admin_notes && selectedRequest.status !== 'PENDING' && (
                <div>
                  <Label className="text-[var(--brand-light)]/60 text-xs">{t('requestDialog.adminNotesLabel')}</Label>
                  <p className="text-[var(--brand-light)]">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'PENDING' ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRejectRequest}
                  disabled={processingRequest}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/70"
                >
                  {processingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  {t('requestDialog.reject')}
                </Button>
                <Button 
                  onClick={handleApproveRequest}
                  disabled={processingRequest}
                  className="bg-green-600 hover:bg-green-700 text-white hover:text-white"
                >
                  {processingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {t('requestDialog.approve')}
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setRequestDialogOpen(false)}
                className="border-[var(--dark-500)] text-[var(--brand-light)]"
              >
                {t('requestDialog.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
