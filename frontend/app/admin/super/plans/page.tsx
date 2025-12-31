'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Edit, Save, Package, Check, Trash2, AlertTriangle, 
  Eye, EyeOff, Zap, Users
} from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';
import Skeleton from '@/app/components/ui/Skeleton';

interface Feature {
  id: number;
  name: string;
  slug: string;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  monthly_price_sek: number;
  features: number[];
  features_details: Feature[];
  is_public: boolean;
  is_active: boolean;
  active_licenses_count?: number;
}

export default function PlanManagementPage() {
  const t = useTranslations('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({
    name: '', description: '', monthly_price_sek: 0, features: [], is_public: true, is_active: true
  });
  const { showToast } = useToast();

  // Function to get translated feature name based on slug
  const getFeatureDisplayName = (feature: Feature): string => {
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
      return t(translationKey);
    }
    // Fallback to original name if slug not found
    return feature.name;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [planRes, licenseRes] = await Promise.all([
        api.get('/licensing/plans/'),
        api.get('/licensing/licenses/')
      ]);
      
      const plansData = planRes.data.results || planRes.data;
      const licensesData = licenseRes.data.results || licenseRes.data;
      
      // Count active licenses per plan
      const licenseCounts: Record<number, number> = {};
      licensesData.forEach((license: any) => {
        if (license.is_active && license.plan) {
          licenseCounts[license.plan] = (licenseCounts[license.plan] || 0) + 1;
        }
      });
      
      // Add license count to plans and translate feature names
      const plansWithCounts = plansData.map((plan: Plan) => ({
        ...plan,
        active_licenses_count: licenseCounts[plan.id] || 0,
        features_details: plan.features_details?.map(f => ({
          ...f,
          name: getFeatureDisplayName(f)
        })) || []
      }));
      
      setPlans(plansWithCounts);

      // Extract features from translated plans or use defaults
      const featureMap = new Map<number, Feature>();
      plansWithCounts.forEach((plan: Plan) => {
        plan.features_details?.forEach((f: Feature) => {
          featureMap.set(f.id, f);
        });
      });

      if (featureMap.size > 0) {
        // Features are already translated in plansWithCounts
        setAllFeatures(Array.from(featureMap.values()));
      } else {
        const commonFeatures = [
          { id: 1, name: t('features.newsAndPosts'), slug: 'posts' },
          { id: 2, name: t('features.interestGroups'), slug: 'groups' },
          { id: 3, name: t('features.learningPlatform'), slug: 'learning' },
          { id: 4, name: t('features.customDataFields'), slug: 'custom_fields' },
          { id: 5, name: t('features.checkInSystem'), slug: 'visits' },
          { id: 6, name: t('features.eventsSystem'), slug: 'events' },
          { id: 7, name: t('features.messengerAndChat'), slug: 'messenger' },
          { id: 8, name: t('features.inventoryAndLending'), slug: 'inventory' },
          { id: 9, name: t('features.facilityBookings'), slug: 'bookings' },
          { id: 10, name: t('features.questionnairesAndVoting'), slug: 'questionnaires' },
          { id: 11, name: t('features.rewardsAndGamification'), slug: 'rewards' },
          { id: 12, name: t('features.analyticsDashboard'), slug: 'analytics' },
        ];
        setAllFeatures(commonFeatures);
      }

    } catch (error) {
      console.error(error);
      showToast(t('toast.failedToLoadPlans'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPlan.name?.trim()) {
      showToast(t('toast.planNameRequired'), 'error');
      return;
    }
    
    try {
      setSaving(true);
      const payload = {
        name: editingPlan.name,
        description: editingPlan.description || '',
        monthly_price_sek: editingPlan.monthly_price_sek || 0,
        features: editingPlan.features || [],
        is_public: editingPlan.is_public ?? true,
        is_active: editingPlan.is_active ?? true
      };

      if (editingPlan.id) {
        await api.patch(`/licensing/plans/${editingPlan.id}/`, payload);
        showToast(t('toast.planUpdatedSuccessfully'), 'success');
      } else {
        await api.post('/licensing/plans/', payload);
        showToast(t('toast.planCreatedSuccessfully'), 'success');
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || error.response?.data?.message || t('toast.failedToSavePlan');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    
    try {
      setDeleting(true);
      await api.delete(`/licensing/plans/${planToDelete.id}/`);
      showToast(t('toast.planDeletedSuccessfully'), 'success');
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || t('toast.failedToDeletePlan');
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openNew = () => {
    setEditingPlan({
      name: '', 
      description: '', 
      monthly_price_sek: 0, 
      features: [], 
      is_public: true, 
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    // Plan features are already translated when loaded, so we can use them directly
    setEditingPlan({
      ...plan,
      features: plan.features_details?.map(f => f.id) || plan.features || []
    });
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const toggleFeature = (featureId: number) => {
    const current = editingPlan.features || [];
    if (current.includes(featureId)) {
      setEditingPlan({ ...editingPlan, features: current.filter(id => id !== featureId) });
    } else {
      setEditingPlan({ ...editingPlan, features: [...current, featureId] });
    }
  };

  const selectAllFeatures = () => {
    setEditingPlan({ ...editingPlan, features: allFeatures.map(f => f.id) });
  };

  const clearAllFeatures = () => {
    setEditingPlan({ ...editingPlan, features: [] });
  };

  // Stats
  const activePlans = plans.filter(p => p.is_active).length;
  const publicPlans = plans.filter(p => p.is_public).length;
  const totalActiveLicenses = plans.reduce((sum, p) => sum + (p.active_licenses_count || 0), 0);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-light)]">{t('title')}</h1>
          <p className="text-[var(--brand-light)]/60 mt-1">{t('description')}</p>
        </div>
        <Button onClick={openNew} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90">
          <Plus className="w-4 h-4 mr-2" /> {t('createNewPlan')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalPlans')}</CardTitle>
            <Package className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-light)]">{plans.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.activePlans')}</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activePlans}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.publicPlans')}</CardTitle>
            <Eye className="h-4 w-4 text-[var(--brand-sky)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-sky)]">{publicPlans}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">{t('stats.activeLicenses')}</CardTitle>
            <Users className="h-4 w-4 text-[var(--brand-peach)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-peach)]">{totalActiveLicenses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 ? (
          <Card className="col-span-full bg-[var(--dark-700)] border-[var(--dark-600)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-[var(--brand-light)]/30 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noPlansCreated')}</h3>
              <p className="text-[var(--brand-light)]/60 text-center mb-4">
                {t('emptyState.createFirstPlan')}
              </p>
              <Button onClick={openNew} className="bg-[var(--brand-primary)]">
                <Plus className="w-4 h-4 mr-2" /> {t('emptyState.createPlan')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`flex flex-col bg-[var(--dark-700)] border-[var(--dark-600)] hover:border-[var(--dark-500)] transition-colors ${!plan.is_active ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={plan.is_public 
                        ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                        : 'border-[var(--dark-500)] text-[var(--brand-light)]/50'
                      }
                    >
                      {plan.is_public ? <><Eye className="w-3 h-3 mr-1" /> {t('planCard.public')}</> : <><EyeOff className="w-3 h-3 mr-1" /> {t('planCard.hidden')}</>}
                    </Badge>
                    {!plan.is_active && (
                      <Badge variant="destructive">{t('planCard.archived')}</Badge>
                    )}
                  </div>
                  {(plan.active_licenses_count || 0) > 0 && (
                    <Badge className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-0">
                      <Users className="w-3 h-3 mr-1" />
                      {plan.active_licenses_count} {t('planCard.active')}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-3 text-[var(--brand-light)]">{plan.name}</CardTitle>
                <div className="text-2xl font-bold text-[var(--brand-primary)]">
                  {plan.monthly_price_sek.toLocaleString()} SEK 
                  <span className="text-sm font-normal text-[var(--brand-light)]/50"> {t('planCard.perMonth')}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-[var(--brand-light)]/60 mb-4 min-h-[40px] line-clamp-2">
                  {plan.description || t('planCard.noDescription')}
                </p>
                
                <div className="space-y-2 mb-4 flex-1">
                  <p className="text-xs font-semibold uppercase text-[var(--brand-light)]/40 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {plan.features_details?.length || 0} {t('planCard.featuresIncluded')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features_details?.slice(0, 5).map(f => (
                      <Badge 
                        key={f.id} 
                        variant="secondary" 
                        className="text-xs bg-[var(--dark-600)] text-[var(--brand-light)]/80 border-0"
                      >
                        {getFeatureDisplayName(f)}
                      </Badge>
                    ))}
                    {(plan.features_details?.length || 0) > 5 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-0"
                      >
                        +{plan.features_details.length - 5} {t('planCard.more')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--dark-600)] flex gap-2">
                  <Button 
                    className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90" 
                    onClick={() => openEdit(plan)}
                  >
                    <Edit className="w-4 h-4 mr-2" /> {t('planCard.edit')}
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    className={`border-[var(--dark-500)] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 ${
                      (plan.active_licenses_count || 0) > 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'text-[var(--brand-light)]/60'
                    }`}
                    onClick={() => (plan.active_licenses_count || 0) === 0 && openDeleteConfirm(plan)}
                    disabled={(plan.active_licenses_count || 0) > 0}
                    title={(plan.active_licenses_count || 0) > 0 ? t('planCard.cannotDelete') : t('planCard.deletePlan')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader className="pb-4 border-b border-[var(--dark-600)]">
            <DialogTitle className="text-xl text-[var(--brand-light)]">
              {editingPlan.id ? t('dialog.editPlan') : t('dialog.createNewPlan')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {editingPlan.id 
                ? t('dialog.editDescription')
                : t('dialog.createDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--brand-light)]/80 uppercase tracking-wide">
                {t('dialog.basicInformation')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]">
                    {t('dialog.planName')} <span className="text-red-400">{t('dialog.required')}</span>
                  </Label>
                  <Input 
                    value={editingPlan.name} 
                    onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                    placeholder={t('dialog.planNamePlaceholder')}
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]">
                    {t('dialog.monthlyPrice')}
                  </Label>
                  <Input 
                    type="number" 
                    value={editingPlan.monthly_price_sek} 
                    onChange={e => setEditingPlan({...editingPlan, monthly_price_sek: parseInt(e.target.value) || 0})}
                    placeholder={t('dialog.monthlyPricePlaceholder')}
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] focus:border-[var(--brand-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--brand-light)]">{t('dialog.description')}</Label>
                <Textarea 
                  value={editingPlan.description}
                  onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                  placeholder={t('dialog.descriptionPlaceholder')}
                  rows={3}
                  className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] focus:border-[var(--brand-primary)] resize-none"
                />
              </div>
            </div>

            {/* Features Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--brand-light)]/80 uppercase tracking-wide">
                  {t('dialog.includedFeatures')}
                </h3>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={selectAllFeatures}
                    className="text-xs text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                  >
                    {t('dialog.selectAll')}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={clearAllFeatures}
                    className="text-xs text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]"
                  >
                    {t('dialog.clearAll')}
                  </Button>
                </div>
              </div>
              
              <div className="bg-[var(--dark-700)] rounded-lg p-4 border border-[var(--dark-600)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allFeatures.map(feat => {
                    const isSelected = editingPlan.features?.includes(feat.id);
                    return (
                      <div 
                        key={feat.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/40'
                            : 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--dark-500)]'
                        }`}
                        onClick={() => toggleFeature(feat.id)}
                      >
                        <Checkbox 
                          id={`p-feat-${feat.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleFeature(feat.id)}
                          className="border-[var(--dark-500)] data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={`p-feat-${feat.id}`} 
                            className={`text-sm font-medium cursor-pointer block ${
                              isSelected ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/80'
                            }`}
                          >
                            {getFeatureDisplayName(feat)}
                          </Label>
                          <span className="text-[10px] text-[var(--brand-light)]/40 font-mono">{feat.slug}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--brand-light)]/50 mt-3 text-center">
                  {t('dialog.featuresSelected', { selected: editingPlan.features?.length || 0, total: allFeatures.length })}
                </p>
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--brand-light)]/80 uppercase tracking-wide">
                {t('dialog.visibilitySettings')}
              </h3>
              <div className="bg-[var(--dark-700)] rounded-lg p-4 border border-[var(--dark-600)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dark-800)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        (editingPlan.is_public ?? true) ? 'bg-green-500/20' : 'bg-[var(--dark-600)]'
                      }`}>
                        {(editingPlan.is_public ?? true) ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-[var(--brand-light)]/40" />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="public-mode" className="text-[var(--brand-light)] cursor-pointer">
                          {t('dialog.publicPlan')}
                        </Label>
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('dialog.visibleToAllUsers')}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      id="public-mode"
                      checked={editingPlan.is_public ?? true}
                      onCheckedChange={c => setEditingPlan({...editingPlan, is_public: c})}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-[var(--dark-500)]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dark-800)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        editingPlan.is_active ? 'bg-[var(--brand-primary)]/20' : 'bg-[var(--dark-600)]'
                      }`}>
                        {editingPlan.is_active ? (
                          <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
                        ) : (
                          <Zap className="w-4 h-4 text-[var(--brand-light)]/40" />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="active-mode" className="text-[var(--brand-light)] cursor-pointer">
                          {t('dialog.activePlan')}
                        </Label>
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('dialog.availableForPurchase')}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      id="active-mode"
                      checked={editingPlan.is_active ?? true}
                      onCheckedChange={c => setEditingPlan({...editingPlan, is_active: c})}
                      className="data-[state=checked]:bg-[var(--brand-primary)] data-[state=unchecked]:bg-[var(--dark-500)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-[var(--dark-600)] gap-2 sm:gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsDialogOpen(false)}
              className="text-[var(--brand-light)] hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]"
              disabled={saving}
            >
              {t('dialog.cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
              disabled={saving}
            >
              {saving ? (
                <>{t('dialog.saving')}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {editingPlan.id ? t('dialog.updatePlan') : t('dialog.createPlan')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle className="text-xl text-[var(--brand-light)]">
                {t('deleteDialog.title')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('deleteDialog.description', { planName: planToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>

          {planToDelete && (planToDelete.active_licenses_count || 0) > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('deleteDialog.hasActiveLicenses', { count: planToDelete.active_licenses_count })}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setPlanToDelete(null);
              }}
              className="text-[var(--brand-light)] hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]"
              disabled={deleting}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || (planToDelete?.active_licenses_count || 0) > 0}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? t('deleteDialog.deleting') : t('deleteDialog.deletePlan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
