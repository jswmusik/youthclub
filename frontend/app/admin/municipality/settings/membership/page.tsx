'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { 
  Check, X, AlertTriangle, Crown, Building2, BarChart3, 
  ShoppingCart, Loader2, Package, Sparkles, ArrowUpRight,
  Calendar, Clock, History, Plus, Minus, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Skeleton from '@/app/components/ui/Skeleton';
import { useToast } from '@/app/components/ToastProvider';
import { format, parseISO, differenceInDays, differenceInMonths, addYears } from 'date-fns';
import { sv, enUS, type Locale } from 'date-fns/locale';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: enUS,
  nb: enUS,
  fi: enUS,
  ar: enUS,
  so: enUS,
  prs: enUS,
};

interface LicenseStatus {
  plan_id: number;
  plan_name: string;
  plan_monthly_price: number;
  max_clubs: number;
  clubs_used: number;
  has_analytics: boolean;
  expires_at: string;
  is_active: boolean;
}

interface Feature {
  id: number;
  name: string;
  slug: string;
  description: string;
  monthly_price_sek: number;
}

interface GlobalPricing {
  price_per_extra_club_sek: number;
  analytics_package_price_sek: number;
  yearly_renewal_discount_percent: number;
}

interface LicenseRequest {
  id: number;
  request_type: string;
  status: string;
  requested_plan_name: string | null;
  requested_feature_name: string | null;
  requested_club_count: number | null;
  admin_notes: string;
  created_at: string;
}

interface Plan {
  id: number;
  name: string;
  monthly_price_sek: number;
}

export default function MyMembershipPage() {
  const { user } = useAuth();
  const t = useTranslations('adminMembership');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || sv;
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orderHistory, setOrderHistory] = useState<LicenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingFeature, setRequestingFeature] = useState<number | null>(null);
  const { showToast } = useToast();

  // Modal states
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [renewalYears, setRenewalYears] = useState(1);
  const [clubQuantity, setClubQuantity] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.assigned_municipality) {
          const muniId = typeof user.assigned_municipality === 'object' 
            ? (user.assigned_municipality as { id: number }).id 
            : user.assigned_municipality;
          
          // Parallel Fetch
          const [muniRes, featRes, pricingRes, plansRes, historyRes] = await Promise.all([
            api.get(`/municipalities/${muniId}/`),
            api.get('/licensing/features/'),
            api.get('/licensing/pricing/'),
            api.get('/licensing/plans/'),
            api.get('/licensing/requests/')
          ]);
          
          setStatus(muniRes.data.license_status);
          setAllowedFeatures(muniRes.data.allowed_features || []);
          setAvailableFeatures(featRes.data.results || featRes.data || []);
          setGlobalPricing(pricingRes.data);
          setPlans(plansRes.data.results || plansRes.data || []);
          setOrderHistory(historyRes.data.results || historyRes.data || []);
        }
      } catch (err: any) {
        console.error('Error loading membership data:', err);
        if (err?.response?.status === 404) {
          showToast(t('couldNotFindMunicipality'), 'error');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Calculate remaining months on license
  const remainingMonths = useMemo(() => {
    if (!status?.expires_at) return 0;
    const months = differenceInMonths(parseISO(status.expires_at), new Date());
    return Math.max(0, months);
  }, [status?.expires_at]);

  const remainingDays = useMemo(() => {
    if (!status?.expires_at) return 0;
    const days = differenceInDays(parseISO(status.expires_at), new Date());
    return Math.max(0, days);
  }, [status?.expires_at]);

  // Calculate prorated price for add-ons (based on remaining months)
  const calculateProratedPrice = (monthlyPrice: number, quantity: number = 1) => {
    if (remainingMonths <= 0) return monthlyPrice * quantity; // Minimum 1 month
    return Math.round(monthlyPrice * quantity * Math.max(1, remainingMonths));
  };

  // Calculate renewal price using the plan price from license_status
  const calculateRenewalPrice = (years: number) => {
    if (!status || !globalPricing) return 0;
    
    // Use the plan price directly from license status
    const monthlyTotal = status.plan_monthly_price || 0;
    const yearlyPrice = monthlyTotal * 12 * years;
    
    // Apply discount for multi-year
    const discount = years > 1 ? (Number(globalPricing.yearly_renewal_discount_percent) / 100) : 0;
    return Math.round(yearlyPrice * (1 - discount));
  };

  // Calculate new expiry date after renewal
  const calculateNewExpiryDate = (years: number) => {
    if (!status?.expires_at) return null;
    const currentExpiry = parseISO(status.expires_at);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    return addYears(baseDate, years);
  };

  const handleBuyFeature = async () => {
    if (!selectedFeature) return;
    setRequestingFeature(selectedFeature.id);
    try {
      await api.post('/licensing/requests/', {
        request_type: 'ADD_FEATURE',
        requested_feature: selectedFeature.id
      });
      showToast(t('orderSent', { featureName: getFeatureName(selectedFeature.slug, selectedFeature.name) }), 'success');
      setFeatureModalOpen(false);
      // Refresh order history
      const historyRes = await api.get('/licensing/requests/');
      setOrderHistory(historyRes.data.results || historyRes.data || []);
    } catch (e) {
      console.error(e);
      showToast(t('couldNotSendOrder'), 'error');
    } finally {
      setRequestingFeature(null);
    }
  };

  const handleRequestAnalytics = async () => {
    setRequestingFeature(-1);
    try {
      await api.post('/licensing/requests/', {
        request_type: 'ADD_ANALYTICS'
      });
      showToast(t('analyticsOrderSent'), 'success');
      // Refresh order history
      const historyRes = await api.get('/licensing/requests/');
      setOrderHistory(historyRes.data.results || historyRes.data || []);
    } catch (e) {
      console.error(e);
      showToast(t('couldNotSendOrder'), 'error');
    } finally {
      setRequestingFeature(null);
    }
  };

  const handleRequestClubSlot = async () => {
    setRequestingFeature(-2);
    try {
      await api.post('/licensing/requests/', {
        request_type: 'NEW_CLUB',
        requested_club_count: (status?.max_clubs || 3) + clubQuantity
      });
      showToast(t('clubOrderSent', { count: clubQuantity }), 'success');
      setClubModalOpen(false);
      // Refresh order history
      const historyRes = await api.get('/licensing/requests/');
      setOrderHistory(historyRes.data.results || historyRes.data || []);
    } catch (e) {
      console.error(e);
      showToast(t('couldNotSendOrder'), 'error');
    } finally {
      setRequestingFeature(null);
    }
  };

  const handleRequestUpgrade = async () => {
    if (!selectedPlanId) return;
    setRequestingFeature(-3);
    try {
      await api.post('/licensing/requests/', {
        request_type: 'UPGRADE_PLAN',
        requested_plan: parseInt(selectedPlanId)
      });
      showToast(t('upgradeRequestSent'), 'success');
      setUpgradeModalOpen(false);
      // Refresh order history
      const historyRes = await api.get('/licensing/requests/');
      setOrderHistory(historyRes.data.results || historyRes.data || []);
    } catch (e) {
      console.error(e);
      showToast(t('couldNotSendRequest'), 'error');
    } finally {
      setRequestingFeature(null);
    }
  };

  const handleRequestRenewal = async () => {
    setRequestingFeature(-4);
    try {
      await api.post('/licensing/requests/', {
        request_type: 'RENEWAL',
        renewal_years: renewalYears,
        admin_notes: `Requested ${renewalYears} year(s) renewal`
      });
      showToast(t('renewalRequestSent', { years: renewalYears }), 'success');
      setRenewalModalOpen(false);
      // Refresh order history
      const historyRes = await api.get('/licensing/requests/');
      setOrderHistory(historyRes.data.results || historyRes.data || []);
    } catch (e) {
      console.error(e);
      showToast(t('couldNotSendRequest'), 'error');
    } finally {
      setRequestingFeature(null);
    }
  };

  const openFeatureModal = (feature: Feature) => {
    setSelectedFeature(feature);
    setFeatureModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400">{t('pending')}</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-400">{t('approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{t('rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'NEW_CLUB': return t('extraClubSlot');
      case 'UPGRADE_PLAN': return t('upgradePlan');
      case 'ADD_FEATURE': return t('addFeature');
      case 'ADD_ANALYTICS': return t('analyticsSuite');
      case 'RENEWAL': return t('renewal');
      default: return type;
    }
  };

  // Translate feature names based on slug
  const getFeatureName = (slug: string, fallbackName: string) => {
    try {
      const translated = t(`features.${slug}` as any);
      // If translation returns the key path (missing translation), use fallback
      return translated?.startsWith?.('features.') ? fallbackName : translated || fallbackName;
    } catch {
      return fallbackName;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-[var(--brand-light)] mb-2">{t('noLicenseFound')}</h2>
            <p className="text-[var(--brand-light)]/60 text-center mb-4">
              {t('contactSupportMessage')}
            </p>
            <Button variant="outline" className="border-[var(--brand-primary)] text-[var(--brand-primary)]">
              {t('contactSupport')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usagePercent = status.max_clubs > 0 ? (status.clubs_used / status.max_clubs) * 100 : 0;
  const daysLeft = Math.ceil((new Date(status.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const isExpiringSoon = daysLeft < 90 && daysLeft > 0;
  
  // Check if analytics is enabled (either via has_analytics flag OR via 'analytics' feature in allowed features)
  const hasAnalyticsAccess = status.has_analytics || allowedFeatures.includes('analytics');

  // Separate features into owned and available for purchase
  const ownedFeatures = availableFeatures.filter(f => allowedFeatures.includes(f.slug));
  const purchasableFeatures = availableFeatures.filter(
    f => !allowedFeatures.includes(f.slug) && f.monthly_price_sek > 0
  );
  
  // Format expiry date nicely
  const formattedExpiryDate = status.expires_at 
    ? format(parseISO(status.expires_at), 'd MMMM yyyy', { locale: dateLocale })
    : t('notSpecified');

  // Get upgradeable plans (plans that cost more than current)
  const currentPlan = plans.find(p => p.id === status.plan_id);
  const upgradeablePlans = plans.filter(p => 
    p.id !== status.plan_id && 
    Number(p.monthly_price_sek) > Number(currentPlan?.monthly_price_sek || 0)
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-light)]">{t('title')}</h1>
          <p className="text-[var(--brand-light)]/60 mt-1">{t('subtitle')}</p>
        </div>
        <div className="text-right">
          <Badge 
            variant={status.is_active ? "default" : "destructive"}
            className={status.is_active ? "bg-green-500/20 text-green-400" : ""}
          >
            {status.is_active ? t('active') : t('inactive')}
          </Badge>
        </div>
      </div>

      {/* Expiring Warning */}
      {isExpiringSoon && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-400 font-medium">{t('expiringSoon')}</p>
              <p className="text-yellow-400/70 text-sm">{t('daysLeft', { days: daysLeft })}</p>
            </div>
            <Button 
              variant="outline" 
              className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 active:scale-95 transition-all"
              onClick={() => setRenewalModalOpen(true)}
            >
              {t('renewNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Plan Card */}
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)] border-l-4 border-l-[var(--brand-primary)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('currentPlan')}</CardTitle>
              <Crown className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-[var(--brand-primary)]">{status.plan_name}</span>
              <span className="text-sm text-[var(--brand-light)]/60">({t('currencyPerMonth', { amount: status.plan_monthly_price?.toLocaleString() })})</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{t('validUntil')} <span className="font-medium text-[var(--brand-light)]">{formattedExpiryDate}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-4">
              <Clock className="w-4 h-4" />
              <span>{t('monthsLeft', { months: remainingMonths, days: remainingDays })}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] active:scale-[0.98] transition-all"
                onClick={() => setRenewalModalOpen(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('renew')}
              </Button>
              {upgradeablePlans.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)] active:scale-[0.98] transition-all"
                  onClick={() => setUpgradeModalOpen(true)}
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  {t('upgrade')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Club Usage Card */}
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('clubLicenses')}</CardTitle>
              <Building2 className="w-5 h-5 text-[var(--brand-sky)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-light)] mb-2">
              {t('used', { used: status.clubs_used, max: status.max_clubs })}
            </div>
            <div className="space-y-2 mb-4">
              <Progress 
                value={usagePercent} 
                className="h-2 bg-[var(--dark-600)]" 
              />
              <p className="text-xs text-[var(--brand-light)]/50 text-right">
                {t('percentUsed', { percent: Math.round(usagePercent) })}
              </p>
            </div>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 active:scale-[0.98] transition-all"
              onClick={() => {
                setClubQuantity(1);
                setClubModalOpen(true);
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {t('buyMoreSlots')}
            </Button>
          </CardContent>
        </Card>

        {/* Analytics Addon */}
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('analyticsSuite')}</CardTitle>
              <BarChart3 className="w-5 h-5 text-[var(--brand-peach)]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {hasAnalyticsAccess 
                ? <Check className="w-6 h-6 text-green-500" /> 
                : <X className="w-6 h-6 text-[var(--brand-light)]/30" />
              }
              <span className={`text-lg font-semibold ${hasAnalyticsAccess ? 'text-green-400' : 'text-[var(--brand-light)]/50'}`}>
                {hasAnalyticsAccess ? t('activated') : t('notActivated')}
              </span>
            </div>
            <p className="text-xs text-[var(--brand-light)]/50 mb-4">
              {hasAnalyticsAccess 
                ? t('analyticsDescriptionActive')
                : t('analyticsDescriptionInactive')}
            </p>
            {!hasAnalyticsAccess && globalPricing && (
              <div className="space-y-2">
                <div className="text-xs text-[var(--brand-light)]/60 flex justify-between">
                  <span>{t('priceForMonths', { months: remainingMonths })}</span>
                  <span className="font-semibold text-[var(--brand-peach)]">
                    {calculateProratedPrice(Number(globalPricing.analytics_package_price_sek))} kr
                  </span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)] hover:text-[var(--brand-peach)] active:scale-[0.98] transition-all"
                  onClick={handleRequestAnalytics}
                  disabled={requestingFeature === -1}
                >
                  {requestingFeature === -1 ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  {t('addAnalytics')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Included Features */}
      <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
            <CardTitle className="text-[var(--brand-light)]">{t('includedFeatures')}</CardTitle>
          </div>
          <CardDescription className="text-[var(--brand-light)]/60">
            {t('includedFeaturesDescription', { planName: status.plan_name })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ownedFeatures.map((feature) => (
              <div 
                key={feature.slug}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--brand-light)]">
                    {getFeatureName(feature.slug, feature.name)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Add-ons Store */}
      {purchasableFeatures.length > 0 && (
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--brand-sky)]" />
              <CardTitle className="text-[var(--brand-light)]">{t('availableAddons')}</CardTitle>
            </div>
            <CardDescription className="text-[var(--brand-light)]/60">
              {t('availableAddonsDescription', { months: remainingMonths })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {purchasableFeatures.map((feat) => (
                <Card 
                  key={feat.id} 
                  className="bg-[var(--dark-600)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-[var(--brand-light)]">
                        {getFeatureName(feat.slug, feat.name)}
                      </CardTitle>
                      <Badge variant="outline" className="border-[var(--brand-primary)]/50 text-[var(--brand-primary)]">
                        {t('pricePerMonth', { price: feat.monthly_price_sek })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--brand-light)]/60 mb-3 min-h-[40px]">
                      {feat.description || t('unlockFeature', { featureName: getFeatureName(feat.slug, feat.name) })}
                    </p>
                    <div className="text-xs text-[var(--brand-light)]/60 mb-3 flex justify-between">
                      <span>{t('totalMonths', { months: remainingMonths })}</span>
                      <span className="font-semibold text-[var(--brand-primary)]">
                        {calculateProratedPrice(Number(feat.monthly_price_sek))} kr
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 text-white active:scale-[0.98] transition-all" 
                      onClick={() => openFeatureModal(feat)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {t('order')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--brand-purple)]" />
            <CardTitle className="text-[var(--brand-light)]">{t('orderHistory')}</CardTitle>
          </div>
          <CardDescription className="text-[var(--brand-light)]/60">
            {t('orderHistoryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orderHistory.length === 0 ? (
            <div className="text-center py-8 text-[var(--brand-light)]/50">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('noOrdersYet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderHistory.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[var(--dark-600)] border border-[var(--dark-500)]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--brand-light)]">
                        {getRequestTypeLabel(order.request_type)}
                      </span>
                      {order.requested_feature_name && (
                        <span className="text-[var(--brand-light)]/60">- {order.requested_feature_name}</span>
                      )}
                      {order.requested_plan_name && (
                        <span className="text-[var(--brand-light)]/60">- {order.requested_plan_name}</span>
                      )}
                      {order.requested_club_count && (
                        <span className="text-[var(--brand-light)]/60">- {t('slots', { count: order.requested_club_count })}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--brand-light)]/50">
                      {format(parseISO(order.created_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <h3 className="font-semibold text-[var(--brand-light)]">{t('needHelp')}</h3>
            <p className="text-sm text-[var(--brand-light)]/60">
              {t('contactSupportDescription')}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] active:scale-[0.98] transition-all"
          >
            {t('contactSupport')}
          </Button>
        </CardContent>
      </Card>

      {/* Renewal Modal */}
      <Dialog open={renewalModalOpen} onOpenChange={setRenewalModalOpen}>
        <DialogContent className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--brand-primary)]" />
              {t('renewLicense')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('renewLicenseDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('yearsToExtend')}</Label>
              <Select value={String(renewalYears)} onValueChange={(v) => setRenewalYears(parseInt(v))}>
                <SelectTrigger className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                  <SelectItem value="1">{t('year')}</SelectItem>
                  <SelectItem value="2">{t('yearsWithDiscount', { years: 2, discount: globalPricing?.yearly_renewal_discount_percent || 10 })}</SelectItem>
                  <SelectItem value="3">{t('yearsWithDiscount', { years: 3, discount: globalPricing?.yearly_renewal_discount_percent || 10 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-[var(--dark-600)] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('currentPlanLabel')}</span>
                <span className="font-medium">{status.plan_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('monthlyPrice')}</span>
                <span className="font-medium">{t('currencyPerMonth', { amount: status.plan_monthly_price?.toLocaleString() })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('currentExpiryDate')}</span>
                <span className="font-medium">{formattedExpiryDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('newExpiryDate')}</span>
                <span className="font-medium text-green-400">
                  {calculateNewExpiryDate(renewalYears) 
                    ? format(calculateNewExpiryDate(renewalYears)!, 'd MMMM yyyy', { locale: dateLocale })
                    : '-'}
                </span>
              </div>
              <div className="border-t border-[var(--dark-500)] pt-3 mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--brand-light)]/60">{t('calculation')}</span>
                  <span>{t('calculationFormula', { 
                    price: status.plan_monthly_price?.toLocaleString() || '0', 
                    months: t('monthUnitPlural'),
                    years: renewalYears,
                    yearLabel: renewalYears === 1 ? t('yearUnit') : t('yearUnitPlural')
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('totalPrice')}</span>
                  <span className="text-xl font-bold text-[var(--brand-primary)]">
                    {calculateRenewalPrice(renewalYears).toLocaleString()} kr
                  </span>
                </div>
                {renewalYears > 1 && globalPricing && (
                  <p className="text-xs text-green-400 mt-1">
                    {t('youSave', { percent: globalPricing.yearly_renewal_discount_percent })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-[var(--brand-light)]/50">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t('invoiceNote')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRenewalModalOpen(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)]"
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={handleRequestRenewal}
              disabled={requestingFeature === -4}
              className="bg-[var(--brand-primary)]"
            >
              {requestingFeature === -4 ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              {t('sendOrder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Club Purchase Modal */}
      <Dialog open={clubModalOpen} onOpenChange={setClubModalOpen}>
        <DialogContent className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--brand-sky)]" />
              {t('buyExtraClubSlots')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('buyExtraClubSlotsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('slotsToBuy')}</Label>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setClubQuantity(Math.max(1, clubQuantity - 1))}
                  className="border-[var(--dark-500)]"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold w-16 text-center">{clubQuantity}</span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setClubQuantity(clubQuantity + 1)}
                  className="border-[var(--dark-500)]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--dark-600)] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('currentSlots')}</span>
                <span className="font-medium">{status.max_clubs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('newSlots')}</span>
                <span className="font-medium text-green-400">+{clubQuantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('totalAfterPurchase')}</span>
                <span className="font-medium">{status.max_clubs + clubQuantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('remainingLicensePeriod')}</span>
                <span className="font-medium">{t('months', { months: remainingMonths })}</span>
              </div>
              <div className="border-t border-[var(--dark-500)] pt-3 mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--brand-light)]/60">{t('pricePerSlotPerMonth')}</span>
                  <span>{globalPricing?.price_per_extra_club_sek} kr</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('totalPrice')}</span>
                  <span className="text-xl font-bold text-[var(--brand-primary)]">
                    {globalPricing 
                      ? calculateProratedPrice(Number(globalPricing.price_per_extra_club_sek), clubQuantity).toLocaleString()
                      : 0} kr
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-[var(--brand-light)]/50">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t('priceNote', { months: remainingMonths })}</p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setClubModalOpen(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)]"
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={handleRequestClubSlot}
              disabled={requestingFeature === -2}
              className="bg-[var(--brand-primary)]"
            >
              {requestingFeature === -2 ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              {t('sendOrder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Purchase Modal */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--brand-primary)]" />
              {t('buyAddonFeature')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {selectedFeature && t('buyAddonFeatureDescription', { featureName: getFeatureName(selectedFeature.slug, selectedFeature.name) })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeature && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-lg bg-[var(--dark-600)] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-light)]/60">{t('feature')}</span>
                  <span className="font-medium">{getFeatureName(selectedFeature.slug, selectedFeature.name)}</span>
                </div>
                <div className="text-sm text-[var(--brand-light)]/60">
                  {selectedFeature.description}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-light)]/60">{t('monthlyPrice')}</span>
                  <span className="font-medium">{t('currencyPerMonth', { amount: selectedFeature.monthly_price_sek })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-light)]/60">{t('remainingLicensePeriod')}</span>
                  <span className="font-medium">{t('months', { months: remainingMonths })}</span>
                </div>
                <div className="border-t border-[var(--dark-500)] pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{t('totalPrice')}</span>
                    <span className="text-xl font-bold text-[var(--brand-primary)]">
                      {calculateProratedPrice(Number(selectedFeature.monthly_price_sek)).toLocaleString()} kr
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-[var(--brand-light)]/50">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{t('addonFeatureDescription', { months: remainingMonths })}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFeatureModalOpen(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)]"
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={handleBuyFeature}
              disabled={requestingFeature === selectedFeature?.id}
              className="bg-[var(--brand-primary)]"
            >
              {requestingFeature === selectedFeature?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              {t('sendOrder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Modal */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[var(--brand-primary)]" />
              {t('upgradePlanTitle')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('upgradePlanDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('selectNewPlan')}</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                  <SelectValue placeholder={t('selectPlan')} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--dark-600)] border-[var(--dark-500)]">
                  {upgradeablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} ({t('currencyPerMonth', { amount: plan.monthly_price_sek })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-[var(--dark-600)] space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('currentPlanLabel')}</span>
                <span className="font-medium">{status.plan_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--brand-light)]/60">{t('currentPrice')}</span>
                <span className="font-medium">{t('currencyPerMonth', { amount: status.plan_monthly_price?.toLocaleString() })}</span>
              </div>
              {selectedPlanId && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/60">{t('newPlan')}</span>
                    <span className="font-medium text-green-400">
                      {plans.find(p => p.id === parseInt(selectedPlanId))?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/60">{t('newPrice')}</span>
                    <span className="font-medium">
                      {t('currencyPerMonth', { amount: plans.find(p => p.id === parseInt(selectedPlanId))?.monthly_price_sek?.toLocaleString() || '0' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/60">{t('priceDifference')}</span>
                    <span className="font-medium text-[var(--brand-primary)]">
                      +{t('currencyPerMonth', { amount: ((plans.find(p => p.id === parseInt(selectedPlanId))?.monthly_price_sek || 0) - status.plan_monthly_price).toLocaleString() })}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-[var(--brand-light)]/50">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t('upgradeNote')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUpgradeModalOpen(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)]"
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={handleRequestUpgrade}
              disabled={requestingFeature === -3 || !selectedPlanId}
              className="bg-[var(--brand-primary)]"
            >
              {requestingFeature === -3 ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowUpRight className="w-4 h-4 mr-2" />
              )}
              {t('sendRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
