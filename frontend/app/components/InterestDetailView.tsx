'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Heart, Hash, Image, Smile, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface InterestDetailProps {
  interestId: string;
  basePath: string;
}

export default function InterestDetailView({ interestId, basePath }: InterestDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interest, setInterest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    api.get(`/interests/${interestId}/`).then(res => {
      setInterest(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [interestId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/interests/${interestId}/`);
      setToast({ message: 'Interest deleted successfully.', type: 'success', isVisible: true });
      setTimeout(() => router.push(buildUrlWithParams(basePath)), 1000);
    } catch (err) {
      setToast({ message: 'Failed to delete. It might be in use.', type: 'error', isVisible: true });
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading interest...</div>
    </div>
  );

  if (!interest) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/20 flex items-center justify-center">
        <Heart className="w-8 h-8 text-[var(--brand-red)]" />
      </div>
      <div className="text-[var(--brand-red)]">Interest not found.</div>
      <Link href={buildUrlWithParams(basePath)}>
        <button className="mt-4 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] transition-all">
          Back to List
        </button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-0 mb-6">
          <Link href={buildUrlWithParams(basePath)}>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to List</span>
            </button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link href={buildUrlWithParams(`${basePath}/edit/${interest.id}`)}>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </Link>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] font-medium hover:bg-[var(--brand-red)]/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative mb-6">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/10 via-[var(--brand-purple)]/10 to-[var(--brand-primary)]/10 blur-3xl"></div>
          
          <div className="relative bg-[var(--dark-800)] rounded-none sm:rounded-3xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Cover Image or Gradient */}
            <div 
              className="h-40 sm:h-56 relative"
              style={{
                backgroundImage: interest.avatar 
                  ? `url(${getMediaUrl(interest.avatar)})` 
                  : 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-purple) 50%, var(--brand-primary) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-transparent to-transparent"></div>
            </div>

            {/* Interest Info */}
            <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-16 sm:-mt-20 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                {/* Avatar/Icon */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-[var(--dark-800)] bg-[var(--dark-700)] shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
                  {interest.avatar ? (
                    <img 
                      src={getMediaUrl(interest.avatar) || ''} 
                      alt={interest.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl sm:text-7xl">
                      {interest.icon || '❤️'}
                    </span>
                  )}
                </div>
                
                {/* Name and Badge */}
                <div className="text-center sm:text-left flex-1 pb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] mb-2">
                    {interest.icon && <span className="mr-2">{interest.icon}</span>}
                    {interest.name}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] text-sm text-[var(--brand-light)]/70">
                      <Hash className="w-3.5 h-3.5" />
                      ID: {interest.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Card Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--brand-light)]">Interest Details</h2>
                <p className="text-sm text-[var(--brand-light)]/50">Information about this interest</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Name */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider">Name</span>
                </div>
                <p className="text-lg font-semibold text-[var(--brand-light)]">{interest.name}</p>
              </div>

              {/* Icon */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
                <div className="flex items-center gap-2 mb-2">
                  <Smile className="w-4 h-4 text-[var(--brand-yellow)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider">Icon</span>
                </div>
                {interest.icon ? (
                  <p className="text-4xl">{interest.icon}</p>
                ) : (
                  <p className="text-sm text-[var(--brand-light)]/40 italic">No icon set</p>
                )}
              </div>

              {/* Interest ID */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-[var(--brand-blue)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider">Interest ID</span>
                </div>
                <p className="text-lg font-semibold text-[var(--brand-light)]">{interest.id}</p>
              </div>

              {/* Cover Image Status */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4 text-[var(--brand-peach)]" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider">Cover Image</span>
                </div>
                {interest.avatar ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--brand-green)] animate-pulse"></span>
                    <p className="text-sm text-[var(--brand-green)]">Uploaded</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--brand-light)]/40 italic">No image uploaded</p>
                )}
              </div>
            </div>

            {/* Image Preview (if exists) */}
            {interest.avatar && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-[var(--brand-light)]/50" />
                  <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider">Image Preview</span>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-[var(--dark-500)] bg-[var(--dark-700)]">
                  <img 
                    src={getMediaUrl(interest.avatar) || ''} 
                    alt={interest.name}
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 px-4 sm:px-0 pb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={buildUrlWithParams(`${basePath}/edit/${interest.id}`)} className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all">
                <Edit className="w-4 h-4" />
                Edit Interest
              </button>
            </Link>
            <Link href={buildUrlWithParams(basePath)} className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all">
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            </Link>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal 
        isVisible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={interest?.name}
        message={`Are you sure you want to delete "${interest?.name}"? It will be removed from all users and groups using it.`}
        darkMode={true}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode={true} />
    </div>
  );
}
