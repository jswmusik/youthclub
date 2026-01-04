'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { fetchMyChildren, approveChildConnection, rejectChildConnection, removeChildConnection, setPrimaryChild } from '@/lib/api';
import { ChildLink } from '@/types/user';
import ChildCard from './ChildCard';
import ChildDetailModal from './ChildDetailModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../hooks/useToast';
import { Users, Clock, CheckCircle } from 'lucide-react';

interface GuardianChildrenManagerProps {
  darkMode?: boolean;
  onChildrenChange?: () => void;
}

export default function GuardianChildrenManager({ darkMode = false, onChildrenChange }: GuardianChildrenManagerProps) {
  const t = useTranslations('children');
  const [links, setLinks] = useState<ChildLink[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedLink, setSelectedLink] = useState<ChildLink | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Delete States
  const [linkToDelete, setLinkToDelete] = useState<ChildLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Approve/Reject States
  const [linkToApprove, setLinkToApprove] = useState<ChildLink | null>(null);
  const [linkToReject, setLinkToReject] = useState<ChildLink | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Toast
  const { success, error, info, warning } = useToast();

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const res = await fetchMyChildren();
      
      // Handle different response structures
      let rawData = res.data;
      if (res.data?.results) {
        rawData = res.data.results;
      } else if (Array.isArray(res.data)) {
        rawData = res.data;
      } else {
        rawData = [];
      }
      
      // Transform to ChildLink type
      const transformedLinks: ChildLink[] = Array.isArray(rawData) ? rawData.map((item: any) => ({
        id: item.id,
        youth: {
          id: item.youth_id || item.youth,
          email: item.youth_email || '',
          first_name: item.youth_first_name || '',
          last_name: item.youth_last_name || '',
          avatar: item.youth?.avatar || null,
        },
        youth_id: item.youth_id || item.youth,
        youth_email: item.youth_email || '',
        youth_first_name: item.youth_first_name || '',
        youth_last_name: item.youth_last_name || '',
        youth_grade: item.youth_grade || null,
        relationship_type: item.relationship_type || 'GUARDIAN',
        is_primary_guardian: item.is_primary_guardian || false,
        status: item.status || 'PENDING',
        created_at: item.created_at || new Date().toISOString(),
        verified_at: item.verified_at || null,
      })) : [];
      
      setLinks(transformedLinks);
    } catch (err: any) {
      console.error('Error loading children:', err);
      error(err.response?.data?.detail || err.response?.data?.error || t('failedToLoadChildren'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!linkToApprove) return;
    setIsApproving(true);
    try {
      await approveChildConnection(linkToApprove.id);
      setLinks(prev => prev.map(l => 
        l.id === linkToApprove.id 
          ? { ...l, status: 'ACTIVE' as const, verified_at: new Date().toISOString() } 
          : l
      ));
      success(t('connectionApproved'));
      setLinkToApprove(null);
      onChildrenChange?.();
    } catch (err) {
      error(t('failedToApprove'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!linkToReject) return;
    setIsRejecting(true);
    try {
      await rejectChildConnection(linkToReject.id);
      setLinks(prev => prev.map(l => 
        l.id === linkToReject.id 
          ? { ...l, status: 'REJECTED' as const } 
          : l
      ));
      success(t('connectionRejected'));
      setLinkToReject(null);
      onChildrenChange?.();
    } catch (err) {
      error(t('failedToReject'));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;
    setIsDeleting(true);
    try {
      await removeChildConnection(linkToDelete.id);
      setLinks(prev => prev.filter(l => l.id !== linkToDelete.id));
      success(t('childRemoved'));
      setLinkToDelete(null);
      onChildrenChange?.();
    } catch (err) {
      error(t('failedToRemoveChild'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (link: ChildLink) => {
    try {
      const newPrimaryValue = !link.is_primary_guardian;
      await setPrimaryChild(link.id, newPrimaryValue);
      
      // Update local state
      setLinks(prev => prev.map(l => ({
        ...l,
        is_primary_guardian: l.id === link.id ? newPrimaryValue : (newPrimaryValue ? false : l.is_primary_guardian)
      })));
      
      success(t('primaryChildUpdated'));
    } catch (err) {
      error(t('failedToUpdatePrimary'));
    }
  };

  // Separate pending and active children
  const pendingLinks = links.filter(l => l.status === 'PENDING');
  const activeLinks = links.filter(l => l.status === 'ACTIVE');
  const rejectedLinks = links.filter(l => l.status === 'REJECTED');

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 mb-2 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            <Users className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
            {t('myChildren')}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('manageConnections')}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4 ${
            darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
          }`}></div>
          <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}>{t('loadingChildren')}</p>
        </div>
      ) : links.length === 0 ? (
        <div className={`text-center py-16 rounded-none sm:rounded-2xl border-2 border-dashed ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-400)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 border-[#4D4DA4]/30'
        }`}>
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
            darkMode 
              ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
              : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[var(--brand-primary)]/10'
          }`}>
            <Users className={`w-10 h-10 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
          </div>
          <h3 className={`text-xl font-bold mb-2 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>{t('noChildrenYet')}</h3>
          <p className={`mb-6 max-w-md mx-auto ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('waitingForConnection')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Requests Section */}
          {pendingLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-peach)]' : 'text-amber-500'}`} />
                <h2 className={`text-lg font-bold font-heading ${
                  darkMode ? 'text-[var(--brand-peach)]' : 'text-amber-600'
                }`}>
                  {t('pendingRequests')} ({pendingLinks.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingLinks.map(link => (
                  <ChildCard 
                    key={link.id} 
                    link={link} 
                    onView={(l) => { setSelectedLink(l); setIsDetailOpen(true); }}
                    onRemove={(l) => setLinkToDelete(l)}
                    onApprove={(l) => setLinkToApprove(l)}
                    onReject={(l) => setLinkToReject(l)}
                    onSetPrimary={handleSetPrimary}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Connections Section */}
          {activeLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-500'}`} />
                <h2 className={`text-lg font-bold font-heading ${
                  darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-600'
                }`}>
                  {t('activeConnections')} ({activeLinks.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeLinks.map(link => (
                  <ChildCard 
                    key={link.id} 
                    link={link} 
                    onView={(l) => { setSelectedLink(l); setIsDetailOpen(true); }}
                    onRemove={(l) => setLinkToDelete(l)}
                    onSetPrimary={handleSetPrimary}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Connections (collapsed/minimal) */}
          {rejectedLinks.length > 0 && (
            <div className="opacity-60">
              <div className="flex items-center gap-2 mb-4">
                <h2 className={`text-lg font-bold font-heading ${
                  darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                }`}>
                  {t('rejected')} ({rejectedLinks.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedLinks.map(link => (
                  <ChildCard 
                    key={link.id} 
                    link={link} 
                    onView={(l) => { setSelectedLink(l); setIsDetailOpen(true); }}
                    onRemove={(l) => setLinkToDelete(l)}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ChildDetailModal 
        link={selectedLink} 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        darkMode={darkMode}
      />

      {/* Approve Confirmation */}
      <ConfirmationModal
        isVisible={!!linkToApprove}
        onClose={() => {
          if (!isApproving) {
            setLinkToApprove(null);
          }
        }}
        onConfirm={handleApprove}
        title={t('approveConnection')}
        message={linkToApprove ? `${t('approveConnection')} ${linkToApprove.youth_first_name} ${linkToApprove.youth_last_name}?` : ''}
        confirmButtonText={t('approve')}
        cancelButtonText={t('cancel')}
        isLoading={isApproving}
        variant="success"
        darkMode={darkMode}
      />

      {/* Reject Confirmation */}
      <ConfirmationModal
        isVisible={!!linkToReject}
        onClose={() => {
          if (!isRejecting) {
            setLinkToReject(null);
          }
        }}
        onConfirm={handleReject}
        title={t('rejectConnection')}
        message={linkToReject ? `${t('rejectConnection')} ${linkToReject.youth_first_name} ${linkToReject.youth_last_name}?` : ''}
        confirmButtonText={t('reject')}
        cancelButtonText={t('cancel')}
        isLoading={isRejecting}
        variant="danger"
        darkMode={darkMode}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isVisible={!!linkToDelete}
        onClose={() => {
          if (!isDeleting) {
            setLinkToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title={t('removeChild')}
        message={linkToDelete ? `${t('removeChildConfirm')} ${linkToDelete.youth_first_name} ${linkToDelete.youth_last_name} ${t('removeChildConfirmSuffix')}` : t('removeChildConfirmGeneric')}
        confirmButtonText={t('remove')}
        cancelButtonText={t('cancel')}
        isLoading={isDeleting}
        variant="danger"
        darkMode={darkMode}
      />

      </div>
  );
}

