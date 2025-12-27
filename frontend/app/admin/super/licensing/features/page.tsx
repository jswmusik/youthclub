'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/app/components/ToastProvider';
import { Save, Loader2, DollarSign, Package, Sparkles, AlertCircle, Building2, BarChart3, Percent } from 'lucide-react';
import Skeleton from '@/app/components/ui/Skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

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

export default function FeaturePricingPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing | null>(null);
  const [editedPricing, setEditedPricing] = useState<GlobalPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [featRes, pricingRes] = await Promise.all([
        api.get('/licensing/features/'),
        api.get('/licensing/pricing/')
      ]);
      
      const featData = Array.isArray(featRes.data) ? featRes.data : (featRes.data.results || featRes.data);
      setFeatures(featData);
      setGlobalPricing(pricingRes.data);
      setEditedPricing(pricingRes.data);
      
      // Initialize edited prices
      const prices: Record<number, number> = {};
      featData.forEach((f: Feature) => {
        prices[f.id] = f.monthly_price_sek;
      });
      setEditedPrices(prices);
    } catch (err) {
      console.error(err);
      showToast('Failed to load pricing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: number, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setEditedPrices(prev => ({ ...prev, [id]: price }));
  };

  const savePrice = async (feature: Feature) => {
    const newPrice = editedPrices[feature.id];
    if (newPrice === feature.monthly_price_sek) {
      showToast('No changes to save', 'info');
      return;
    }

    setSaving(feature.id);
    try {
      await api.patch(`/licensing/features/${feature.id}/`, {
        monthly_price_sek: newPrice
      });
      setFeatures(prev => prev.map(f => 
        f.id === feature.id ? { ...f, monthly_price_sek: newPrice } : f
      ));
      showToast(`${feature.name} price updated to ${newPrice} SEK/mo`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update price', 'error');
    } finally {
      setSaving(null);
    }
  };

  const saveGlobalPricing = async () => {
    if (!editedPricing) return;
    
    setSavingGlobal(true);
    try {
      await api.post('/licensing/pricing/', editedPricing);
      setGlobalPricing(editedPricing);
      showToast('Global pricing updated successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update global pricing', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  const hasChanges = (featureId: number) => {
    const feature = features.find(f => f.id === featureId);
    return feature && editedPrices[featureId] !== feature.monthly_price_sek;
  };

  const hasGlobalChanges = () => {
    if (!globalPricing || !editedPricing) return false;
    return (
      globalPricing.price_per_extra_club_sek !== editedPricing.price_per_extra_club_sek ||
      globalPricing.analytics_package_price_sek !== editedPricing.analytics_package_price_sek ||
      globalPricing.yearly_renewal_discount_percent !== editedPricing.yearly_renewal_discount_percent
    );
  };

  // Calculate totals
  const totalFeatures = features.length;
  const freeFeatures = features.filter(f => f.monthly_price_sek === 0).length;
  const paidFeatures = features.filter(f => f.monthly_price_sek > 0).length;

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--brand-light)]">Pricing Configuration</h1>
        <p className="text-[var(--brand-light)]/60 mt-1">Set prices for features, clubs, and other add-ons</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">Total Features</CardTitle>
            <Package className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-light)]">{totalFeatures}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">Free (Core)</CardTitle>
            <Sparkles className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{freeFeatures}</div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--brand-light)]/70">Paid Add-ons</CardTitle>
            <DollarSign className="h-4 w-4 text-[var(--brand-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-primary)]">{paidFeatures}</div>
          </CardContent>
        </Card>
      </div>

      {/* Global Pricing Settings */}
      <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
        <CardHeader>
          <CardTitle className="text-[var(--brand-light)] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--brand-primary)]" />
            Global Pricing Settings
          </CardTitle>
          <CardDescription className="text-[var(--brand-light)]/60">
            Set prices for clubs, analytics, and renewal discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editedPricing && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Extra Club Price */}
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--brand-sky)]" />
                  Extra Club Slot
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min={0}
                    step={100}
                    value={editedPricing.price_per_extra_club_sek}
                    onChange={(e) => setEditedPricing({
                      ...editedPricing, 
                      price_per_extra_club_sek: parseFloat(e.target.value) || 0
                    })}
                    className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                  />
                  <span className="text-sm text-[var(--brand-light)]/50 whitespace-nowrap">kr/mo</span>
                </div>
                <p className="text-xs text-[var(--brand-light)]/40">
                  Monthly price per additional club slot
                </p>
              </div>

              {/* Analytics Package Price */}
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--brand-peach)]" />
                  Analytics Package
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min={0}
                    step={100}
                    value={editedPricing.analytics_package_price_sek}
                    onChange={(e) => setEditedPricing({
                      ...editedPricing, 
                      analytics_package_price_sek: parseFloat(e.target.value) || 0
                    })}
                    className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                  />
                  <span className="text-sm text-[var(--brand-light)]/50 whitespace-nowrap">kr/mo</span>
                </div>
                <p className="text-xs text-[var(--brand-light)]/40">
                  Monthly price for analytics add-on
                </p>
              </div>

              {/* Yearly Renewal Discount */}
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)] flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-500" />
                  Multi-Year Discount
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min={0}
                    max={100}
                    step={1}
                    value={editedPricing.yearly_renewal_discount_percent}
                    onChange={(e) => setEditedPricing({
                      ...editedPricing, 
                      yearly_renewal_discount_percent: parseFloat(e.target.value) || 0
                    })}
                    className="bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                  />
                  <span className="text-sm text-[var(--brand-light)]/50 whitespace-nowrap">%</span>
                </div>
                <p className="text-xs text-[var(--brand-light)]/40">
                  Discount for 2+ year renewals
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={saveGlobalPricing}
              disabled={savingGlobal || !hasGlobalChanges()}
              className={hasGlobalChanges() 
                ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90" 
                : "bg-[var(--dark-600)] text-[var(--brand-light)]/50"
              }
            >
              {savingGlobal ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Global Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertCircle className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--brand-light)] font-medium">How Feature Pricing Works</p>
            <p className="text-[var(--brand-light)]/70 text-sm mt-1">
              Features with a price of <span className="font-semibold">0 SEK</span> are considered core features and included in all plans by default. 
              Features with a price are add-ons that can be purchased separately or included in higher-tier plans.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Pricing Table */}
      <Card className="bg-[var(--dark-700)] border-[var(--dark-600)]">
        <CardHeader>
          <CardTitle className="text-[var(--brand-light)]">Feature Pricing</CardTitle>
          <CardDescription className="text-[var(--brand-light)]/60">
            Set individual prices for each feature. Changes are saved per feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--dark-600)] hover:bg-transparent">
                <TableHead className="text-[var(--brand-light)]/70">Feature Name</TableHead>
                <TableHead className="text-[var(--brand-light)]/70">Slug</TableHead>
                <TableHead className="text-[var(--brand-light)]/70">Monthly Price (SEK)</TableHead>
                <TableHead className="text-right text-[var(--brand-light)]/70">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow 
                  key={feature.id} 
                  className="border-[var(--dark-600)] hover:bg-[var(--dark-600)]/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--brand-light)]">{feature.name}</span>
                      {feature.monthly_price_sek === 0 && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[10px]">
                          Core
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-[var(--brand-light)]/50 bg-[var(--dark-600)] px-2 py-1 rounded">
                      {feature.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        min={0}
                        step={100}
                        value={editedPrices[feature.id] ?? feature.monthly_price_sek}
                        onChange={(e) => handlePriceChange(feature.id, e.target.value)}
                        className="w-32 bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)]"
                      />
                      <span className="text-sm text-[var(--brand-light)]/50">kr/mo</span>
                      {hasChanges(feature.id) && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant={hasChanges(feature.id) ? "default" : "ghost"}
                      onClick={() => savePrice(feature)}
                      disabled={saving === feature.id || !hasChanges(feature.id)}
                      className={hasChanges(feature.id) 
                        ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white" 
                        : "text-[var(--brand-light)]/50"
                      }
                    >
                      {saving === feature.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
