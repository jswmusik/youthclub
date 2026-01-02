'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useToast } from '../../../../../hooks/useToast';
import { 
  Trash2, 
  Settings, 
  Clock, 
  Bell, 
  AlertTriangle, 
  Users, 
  BarChart3, 
  Shield,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DataRetentionSettings {
  default_retention_months: number;
  min_allowed_retention_months: number;
  max_allowed_retention_months: number;
  warning_notification_days: number;
  second_warning_notification_days: number;
  is_auto_deletion_enabled: boolean;
  updated_at: string;
}

interface RetentionStatistics {
  total_deletable_users: number;
  active_last_30_days: number;
  active_last_90_days: number;
  inactive_over_90_days: number;
  pending_deletion: number;
  global_retention_months: number;
  auto_deletion_enabled: boolean;
}

interface PendingUser {
  id: number;
  email: string;
  role: string;
  role_display: string;
  last_activity: string;
  days_inactive: number;
  retention_months: number;
  municipality: string | null;
}

export default function DataRetentionSettingsPage() {
  const t = useTranslations('dataRetention');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<DataRetentionSettings | null>(null);
  const [statistics, setStatistics] = useState<RetentionStatistics | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [showPendingUsers, setShowPendingUsers] = useState(false);
  
  const { success, error, info, warning } = useToast();

  const inputClasses = `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 border-[var(--dark-500)]
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  // Form state
  const [formData, setFormData] = useState({
    default_retention_months: 12,
    min_allowed_retention_months: 6,
    max_allowed_retention_months: 36,
    warning_notification_days: 30,
    second_warning_notification_days: 7,
    is_auto_deletion_enabled: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.get('/licensing/data-retention/'),
        api.get('/licensing/data-retention/statistics/')
      ]);
      
      setSettings(settingsRes.data);
      setStatistics(statsRes.data);
      setFormData({
        default_retention_months: settingsRes.data.default_retention_months,
        min_allowed_retention_months: settingsRes.data.min_allowed_retention_months,
        max_allowed_retention_months: settingsRes.data.max_allowed_retention_months,
        warning_notification_days: settingsRes.data.warning_notification_days,
        second_warning_notification_days: settingsRes.data.second_warning_notification_days,
        is_auto_deletion_enabled: settingsRes.data.is_auto_deletion_enabled,
      });
    } catch (err) {
      console.error('Failed to load data retention settings', err);
      } finally{
      setIsLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/licensing/data-retention/pending_deletions/');
      setPendingUsers(res.data.users);
      setShowPendingUsers(true);
    } catch (err) {
      console.error('Failed to load pending users', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await api.post('/licensing/data-retention/', formData);
      
      fetchData(); // Refresh data
    } catch (err: any) {
      } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
          <div className="flex items-center justify-center py-20">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
              <p className="text-[var(--brand-light)]/50 text-sm">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-4 sm:px-0">
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider">{t('stats.totalUsers')}</p>
                  <p className="text-2xl font-bold text-[var(--brand-light)]">{statistics.total_deletable_users}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider">{t('stats.active30d')}</p>
                  <p className="text-2xl font-bold text-[var(--brand-light)]">{statistics.active_last_30_days}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider">{t('stats.inactive90d')}</p>
                  <p className="text-2xl font-bold text-[var(--brand-light)]">{statistics.inactive_over_90_days}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider">{t('stats.pendingDeletion')}</p>
                  <p className="text-2xl font-bold text-[var(--brand-light)]">{statistics.pending_deletion}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner if Auto-Deletion is OFF */}
        {!formData.is_auto_deletion_enabled && (
          <div className="mb-6 px-4 sm:px-0 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-semibold">{t('warningBanner.title')}</p>
              <p className="text-[var(--brand-light)]/60 text-sm">
                {t('warningBanner.message')}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Retention Period */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('retentionPeriod.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('retentionPeriod.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="default" className={labelClasses}>
                    {t('retentionPeriod.defaultPeriod')}
                  </Label>
                  <Input
                    id="default"
                    type="number"
                    min={1}
                    max={120}
                    className={inputClasses}
                    value={formData.default_retention_months}
                    onChange={e => setFormData({...formData, default_retention_months: parseInt(e.target.value) || 12})}
                  />
                  <p className="text-xs text-[var(--brand-light)]/40">{t('retentionPeriod.defaultHelp')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min" className={labelClasses}>
                    {t('retentionPeriod.minAllowed')}
                  </Label>
                  <Input
                    id="min"
                    type="number"
                    min={1}
                    max={formData.max_allowed_retention_months}
                    className={inputClasses}
                    value={formData.min_allowed_retention_months}
                    onChange={e => setFormData({...formData, min_allowed_retention_months: parseInt(e.target.value) || 6})}
                  />
                  <p className="text-xs text-[var(--brand-light)]/40">{t('retentionPeriod.minHelp')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max" className={labelClasses}>
                    {t('retentionPeriod.maxAllowed')}
                  </Label>
                  <Input
                    id="max"
                    type="number"
                    min={formData.min_allowed_retention_months}
                    max={120}
                    className={inputClasses}
                    value={formData.max_allowed_retention_months}
                    onChange={e => setFormData({...formData, max_allowed_retention_months: parseInt(e.target.value) || 36})}
                  />
                  <p className="text-xs text-[var(--brand-light)]/40">{t('retentionPeriod.maxHelp')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Notifications */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('warningNotifications.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('warningNotifications.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="warning1" className={labelClasses}>
                    {t('warningNotifications.firstWarning')}
                  </Label>
                  <Input
                    id="warning1"
                    type="number"
                    min={1}
                    max={90}
                    className={inputClasses}
                    value={formData.warning_notification_days}
                    onChange={e => setFormData({...formData, warning_notification_days: parseInt(e.target.value) || 30})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warning2" className={labelClasses}>
                    {t('warningNotifications.finalWarning')}
                  </Label>
                  <Input
                    id="warning2"
                    type="number"
                    min={1}
                    max={formData.warning_notification_days}
                    className={inputClasses}
                    value={formData.second_warning_notification_days}
                    onChange={e => setFormData({...formData, second_warning_notification_days: parseInt(e.target.value) || 7})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Deletion Toggle */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('systemControl.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('systemControl.subtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Toggle Row */}
              <div className="flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                <div className="space-y-1 flex-1">
                  <Label className="text-[var(--brand-light)] font-semibold">{t('systemControl.enableAutoDelete')}</Label>
                  <p className="text-sm text-[var(--brand-light)]/50">
                    {t('systemControl.enableHelp')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Visual Toggle Button */}
                  <Button
                    type="button"
                    onClick={() => setFormData({...formData, is_auto_deletion_enabled: !formData.is_auto_deletion_enabled})}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      formData.is_auto_deletion_enabled 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]'
                    }`}
                  >
                    {formData.is_auto_deletion_enabled ? t('systemControl.enabled') : t('systemControl.disabled')}
                  </Button>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className={`p-4 rounded-xl border ${
                formData.is_auto_deletion_enabled 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-green-500/10 border-green-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {formData.is_auto_deletion_enabled ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-semibold">{t('systemControl.activeTitle')}</p>
                        <p className="text-[var(--brand-light)]/60 text-sm">
                          {t('systemControl.activeMessage')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-green-400 font-semibold">{t('systemControl.disabledTitle')}</p>
                        <p className="text-[var(--brand-light)]/60 text-sm">
                          {t('systemControl.disabledMessage')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Deletions */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('pendingDeletions.title')}</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">{t('pendingDeletions.subtitle')}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchPendingUsers}
                  className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('pendingDeletions.loadUsers')}
                </Button>
              </div>
            </div>
            
            {showPendingUsers && (
              <div className="p-6">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8 text-[var(--brand-light)]/50">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                    <p>{t('pendingDeletions.noPending')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-500)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-[var(--brand-light)] font-medium">{user.email}</p>
                            <p className="text-xs text-[var(--brand-light)]/50">
                              {user.role_display} • {user.municipality || t('pendingDeletions.noMunicipality')} • {user.days_inactive} {t('pendingDeletions.daysInactive')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                          {t('pendingDeletions.retention')}: {user.retention_months}mo
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-5 flex justify-end">
              <Button
                type="submit"
                className="px-8 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    {t('buttons.saving')}
                  </>
                ) : (
                  t('buttons.saveSettings')
                )}
              </Button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

