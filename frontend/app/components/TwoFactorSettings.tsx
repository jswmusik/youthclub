'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  ShieldCheck, 
  ShieldOff, 
  Smartphone, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface TwoFactorStatus {
  is_enabled: boolean;
  requirement: 'mandatory_always' | 'mandatory_periodic' | 'optional' | 'not_available';
  can_toggle: boolean;
  last_verified_at: string | null;
  trusted_devices_count: number;
  is_locked: boolean;
  failed_attempts: number;
}

interface TrustedDevice {
  id: number;
  device_name: string;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}

export default function TwoFactorSettings({ darkMode = true }: { darkMode?: boolean }) {
  const t = useTranslations('settings');
  const { toggle2FA } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingDevice, setRevokingDevice] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchDevices();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/2fa/status/');
      setStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/2fa/devices/');
      setDevices(res.data.devices || []);
    } catch (error) {
      console.error('Failed to fetch trusted devices:', error);
    }
  };

  const handleToggle2FA = async () => {
    if (!status?.can_toggle) return;
    
    setToggling(true);
    setMessage(null);
    
    const result = await toggle2FA(!status.is_enabled);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      await fetchStatus();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setToggling(false);
  };

  const handleRevokeDevice = async (deviceId: number) => {
    setRevokingDevice(deviceId);
    setMessage(null);
    
    try {
      await api.delete(`/2fa/devices/?device_id=${deviceId}`);
      setMessage({ type: 'success', text: t('2fa.deviceRevoked') });
      await fetchDevices();
    } catch (error) {
      setMessage({ type: 'error', text: t('2fa.revokeError') });
    }
    
    setRevokingDevice(null);
  };

  const handleRevokeAllDevices = async () => {
    setRevokingAll(true);
    setMessage(null);
    
    try {
      await api.delete('/2fa/devices/?all=true');
      setMessage({ type: 'success', text: t('2fa.allDevicesRevoked') });
      await fetchDevices();
    } catch (error) {
      setMessage({ type: 'error', text: t('2fa.revokeError') });
    }
    
    setRevokingAll(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseUserAgent = (ua: string) => {
    // Simple parsing to extract browser/device info
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return ua.substring(0, 30) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!status || status.requirement === 'not_available') {
    return null; // 2FA not available for this user role
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          status.is_enabled 
            ? 'bg-green-500/20 text-green-500' 
            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60'
        }`}>
          {status.is_enabled ? (
            <ShieldCheck className="w-5 h-5" />
          ) : (
            <ShieldOff className="w-5 h-5" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-light)]">
            {t('2fa.title')}
          </h3>
          <p className="text-sm text-[var(--brand-light)]/60">
            {status.is_enabled ? t('2fa.enabled') : t('2fa.disabled')}
          </p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/30 text-green-500' 
            : 'bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)]'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* 2FA Description */}
      <div className="bg-[var(--dark-700)] rounded-xl p-4 space-y-3">
        <p className="text-sm text-[var(--brand-light)]/70">
          {t('2fa.description')}
        </p>
        
        {/* Requirement Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status.requirement === 'mandatory_always' 
              ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
              : status.requirement === 'mandatory_periodic'
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
          }`}>
            {status.requirement === 'mandatory_always' && t('2fa.mandatoryAlways')}
            {status.requirement === 'mandatory_periodic' && t('2fa.mandatoryPeriodic')}
            {status.requirement === 'optional' && t('2fa.optional')}
          </span>
        </div>

        {/* Last Verified */}
        {status.last_verified_at && (
          <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60">
            <Clock className="w-4 h-4" />
            <span>{t('2fa.lastVerified')}: {formatDate(status.last_verified_at)}</span>
          </div>
        )}
      </div>

      {/* Toggle Button (for optional roles) */}
      {status.can_toggle && (
        <button
          onClick={handleToggle2FA}
          disabled={toggling}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            status.is_enabled
              ? 'bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20'
              : 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {toggling ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : status.is_enabled ? (
            <>
              <ShieldOff className="w-5 h-5" />
              <span>{t('2fa.disable')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>{t('2fa.enable')}</span>
            </>
          )}
        </button>
      )}

      {/* Trusted Devices */}
      {devices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[var(--brand-light)]">
              {t('2fa.trustedDevices')}
            </h4>
            <button
              onClick={handleRevokeAllDevices}
              disabled={revokingAll}
              className="text-sm text-[var(--brand-red)] hover:text-[var(--brand-red)]/80 flex items-center gap-1 disabled:opacity-50"
            >
              {revokingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{t('2fa.revokeAll')}</span>
            </button>
          </div>

          <div className="space-y-2">
            {devices.map((device) => (
              <div 
                key={device.id}
                className="bg-[var(--dark-700)] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--dark-600)] rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-[var(--brand-light)]/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--brand-light)]">
                      {parseUserAgent(device.device_name)}
                    </p>
                    <p className="text-xs text-[var(--brand-light)]/50">
                      {t('2fa.lastUsed')}: {formatDate(device.last_used_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeDevice(device.id)}
                  disabled={revokingDevice === device.id}
                  className="p-2 text-[var(--brand-light)]/40 hover:text-[var(--brand-red)] transition-colors disabled:opacity-50"
                  title={t('2fa.revoke')}
                >
                  {revokingDevice === device.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Warning */}
      {status.is_locked && (
        <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-[var(--brand-red)] flex-shrink-0" />
          <div>
            <p className="font-medium text-[var(--brand-red)]">{t('2fa.accountLocked')}</p>
            <p className="text-sm text-[var(--brand-light)]/60">{t('2fa.accountLockedDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

