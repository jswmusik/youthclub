'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  CreditCard, 
  Car, 
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Smartphone,
  Loader2,
  History,
  XCircle,
  Trash2,
  Eye
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '../../../hooks/useToast';

interface GuardianVerifyTabProps {
  user: any;
  darkMode?: boolean;
  onVerificationUpdate?: () => void;
}

interface IdDocumentUpload {
  id: number;
  document: string;
  document_url: string;
  document_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  rejection_reason: string;
  admin_notes: string;
}

interface UploadHistoryResponse {
  uploads: IdDocumentUpload[];
  pending_count: number;
  can_upload: boolean;
  max_pending: number;
}

const ID_DOCUMENT_TYPES = [
  { value: 'PASSPORT', labelKey: 'passport', icon: FileText },
  { value: 'ID_CARD', labelKey: 'id_card', icon: CreditCard },
  { value: 'DRIVERS_LICENSE', labelKey: 'drivers_license', icon: Car },
  { value: 'OTHER', labelKey: 'other', icon: FileText },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
    case 'PENDING':
      return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
    case 'REJECTED':
      return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
    case 'DELETED':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'PENDING':
      return <Clock className="w-4 h-4" />;
    case 'REJECTED':
      return <XCircle className="w-4 h-4" />;
    case 'DELETED':
      return <Trash2 className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function GuardianVerifyTab({ user, darkMode = false, onVerificationUpdate }: GuardianVerifyTabProps) {
  const t = useTranslations('verification');
  
  const getDocumentTypeLabel = (type: string) => {
    const docType = ID_DOCUMENT_TYPES.find(d => d.value === type);
    return docType ? t(docType.labelKey) : type;
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return t('approved');
      case 'PENDING': return t('pending');
      case 'REJECTED': return t('rejected');
      case 'DELETED': return t('deleted');
      default: return status;
    }
  };
  const { refreshUser } = useAuth();
  
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { success, error, info, warning } = useToast();
  
  // History state
  const [uploadHistory, setUploadHistory] = useState<IdDocumentUpload[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [canUpload, setCanUpload] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<IdDocumentUpload | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verificationStatus = user?.verification_status || 'UNVERIFIED';
  const idDocumentReviewStatus = user?.id_document_review_status || 'NOT_SUBMITTED';
  const rejectionReason = user?.id_document_rejection_reason || '';

  // Fetch upload history
  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get<UploadHistoryResponse>('/users/id_document_history/');
      setUploadHistory(response.data.uploads);
      setPendingCount(response.data.pending_count);
      setCanUpload(response.data.can_upload);
    } catch (err) {
      console.error('Failed to fetch upload history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        error(t('fileTooLarge') || 'File size must be less than 10MB.');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      error(t('selectFileAndType') || 'Please select a document type and upload a file.');
      return;
    }

    if (!canUpload) {
      error(t('maxPendingReached') || 'You already have 3 pending requests. Please wait for them to be reviewed.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('document_type', selectedDocType);

      await api.post('/users/upload_id_document_v2/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      success(t('uploadSuccess') || 'ID document uploaded successfully! It is now pending review.');

      // Refresh user data and history
      await refreshUser();
      await fetchUploadHistory();
      onVerificationUpdate?.();

      // Clear form
      handleRemoveFile();
      setSelectedDocType('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('uploadError') || 'Failed to upload document. Please try again.';
      error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'VERIFIED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{t('verified') || 'Verified'}</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">{t('pending') || 'Pending Review'}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{t('unverified') || 'Unverified'}</span>
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-2xl border overflow-hidden ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white border-gray-200'
      }`}>
        <div className={`px-6 py-5 border-b ${
          darkMode 
            ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' 
            : 'border-gray-100 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                {t('verificationStatus') || 'Verification Status'}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                {t('verifyIdentity') || 'Verify your identity to access all features'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {getStatusBadge()}
            
            {verificationStatus === 'VERIFIED' && (
              <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                {t('verifiedMessage') || 'Your identity has been verified. You have full access to all features.'}
              </p>
            )}
          </div>

          {/* Show rejection reason if document was rejected */}
          {idDocumentReviewStatus === 'REJECTED' && rejectionReason && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--brand-red)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {t('documentRejected') || 'Your document was rejected'}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                    {t('reason') || 'Reason'}: {rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show pending message */}
          {idDocumentReviewStatus === 'PENDING_REVIEW' && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/20">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {t('documentPendingReview') || 'Your document is being reviewed'}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                    {t('pendingReviewMessage') || 'An administrator will review your document shortly. You will be notified once the review is complete.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload History */}
      <div className={`rounded-2xl border overflow-hidden ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white border-gray-200'
      }`}>
        <div className={`px-6 py-5 border-b ${
          darkMode 
            ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' 
            : 'border-gray-100 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                  {t('uploadHistory') || 'Upload History'}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                  {t('uploadHistoryDescription') || 'Track the status of your verification requests'}
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{pendingCount}/3 {t('pendingRequests') || 'pending'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : uploadHistory.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('noUploadsYet') || 'No documents uploaded yet'}</p>
              <p className="text-sm mt-1">{t('uploadFirstDocument') || 'Upload your first document below to start the verification process'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadHistory.map((upload) => (
                <div 
                  key={upload.id}
                  className={`p-4 rounded-xl border ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'
                      }`}>
                        <FileText className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                            {getDocumentTypeLabel(upload.document_type)}
                          </p>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(upload.status)}`}>
                            {getStatusIcon(upload.status)}
                            {getStatusLabel(upload.status)}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                          {t('uploadedOn') || 'Uploaded'}: {formatDate(upload.uploaded_at)}
                        </p>
                        {upload.reviewed_at && (
                          <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                            {t('reviewedOn') || 'Reviewed'}: {formatDate(upload.reviewed_at)}
                            {upload.reviewed_by_name && ` ${t('by') || 'by'} ${upload.reviewed_by_name}`}
                          </p>
                        )}
                        {upload.status === 'REJECTED' && upload.rejection_reason && (
                          <div className="mt-2 p-2 rounded-lg bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/20">
                            <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                              <span className="font-medium text-[var(--brand-red)]">{t('rejectionReason') || 'Reason'}:</span> {upload.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {upload.document_url && upload.status !== 'DELETED' && (
                      <button
                        onClick={() => setPreviewDocument(upload)}
                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                          darkMode
                            ? 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)]'
                            : 'hover:bg-gray-200 text-gray-500 hover:text-[var(--brand-primary)]'
                        }`}
                        title={t('viewDocument') || 'View document'}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verification Methods - Only show if not verified */}
      {verificationStatus !== 'VERIFIED' && (
        <>
          {/* BankID Option (Template/Placeholder) */}
          <div className={`rounded-2xl border overflow-hidden ${
            darkMode 
              ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
              : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-5 border-b ${
              darkMode 
                ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' 
                : 'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#235971] to-[#1a4357] flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                    {t('bankIdVerification') || 'BankID Verification'}
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                    {t('bankIdDescription') || 'Instant verification using BankID'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className={`p-4 rounded-xl border-2 border-dashed ${
                darkMode 
                  ? 'border-[var(--dark-500)] bg-[var(--dark-700)]/30' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'
                    }`}>
                      <Smartphone className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                        {t('bankIdComingSoon') || 'Coming Soon'}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                        {t('bankIdComingSoonDescription') || 'BankID verification will be available soon'}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled
                    className={`px-4 py-2 rounded-xl font-medium text-sm cursor-not-allowed ${
                      darkMode 
                        ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/30' 
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {t('verifyWithBankId') || 'Verify with BankID'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ID Document Upload */}
          <div className={`rounded-2xl border overflow-hidden ${
            darkMode 
              ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
              : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-5 border-b ${
              darkMode 
                ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' 
                : 'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                      {t('uploadIdDocument') || 'Upload ID Document'}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                      {t('uploadIdDescription') || 'Upload a scanned copy of your ID for manual verification'}
                    </p>
                  </div>
                </div>
                {!canUpload && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('maxPendingReached') || 'Max 3 pending'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!canUpload ? (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                        {t('maxPendingTitle') || 'Maximum pending requests reached'}
                      </p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                        {t('maxPendingMessage') || 'You already have 3 pending verification requests. Please wait for them to be reviewed before uploading more documents.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Document Type Selection */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${
                      darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
                    }`}>
                      {t('selectDocumentType') || 'Select Document Type'} <span className="text-[var(--brand-red)]">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {ID_DOCUMENT_TYPES.map((docType) => {
                        const Icon = docType.icon;
                        const isSelected = selectedDocType === docType.value;
                        return (
                          <button
                            key={docType.value}
                            type="button"
                            onClick={() => setSelectedDocType(docType.value)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                : darkMode
                                  ? 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--brand-primary)]/50'
                                  : 'border-gray-200 bg-gray-50 hover:border-[var(--brand-primary)]/50'
                            }`}
                          >
                            <Icon className={`w-6 h-6 mx-auto mb-2 ${
                              isSelected 
                                ? 'text-[var(--brand-primary)]' 
                                : darkMode 
                                  ? 'text-[var(--brand-light)]/60' 
                                  : 'text-gray-500'
                            }`} />
                            <p className={`text-xs font-medium text-center ${
                              isSelected 
                                ? 'text-[var(--brand-primary)]' 
                                : darkMode 
                                  ? 'text-[var(--brand-light)]/80' 
                                  : 'text-gray-700'
                            }`}>
                              {t(docType.labelKey)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* File Upload Area */}
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${
                      darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
                    }`}>
                      {t('uploadFile') || 'Upload File'} <span className="text-[var(--brand-red)]">*</span>
                    </label>
                    
                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                          darkMode
                            ? 'border-[var(--dark-500)] bg-[var(--dark-700)]/50 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--dark-700)]'
                            : 'border-gray-300 bg-gray-50 hover:border-[var(--brand-primary)]/50 hover:bg-gray-100'
                        }`}
                      >
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${
                          darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                        }`} />
                        <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>
                          {t('clickToUpload') || 'Click to upload or drag and drop'}
                        </p>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                          {t('supportedFormats') || 'JPG, PNG or PDF (max 10MB)'}
                        </p>
                      </div>
                    ) : (
                      <div className={`relative border-2 rounded-xl p-4 ${
                        darkMode
                          ? 'border-[var(--brand-primary)]/30 bg-[var(--dark-700)]'
                          : 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5'
                      }`}>
                        <div className="flex items-center gap-4">
                          {filePreview ? (
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-[var(--dark-500)]">
                              <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'
                            }`}>
                              <FileText className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                              {selectedFile.name}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)]'
                                : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Upload Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || !selectedDocType || uploading}
                      className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                        !selectedFile || !selectedDocType || uploading
                          ? darkMode
                            ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/30 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90'
                      }`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t('uploading') || 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {t('submitForReview') || 'Submit for Review'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Info Note */}
              <div className={`p-4 rounded-xl ${
                darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                  }`} />
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                      {t('uploadNote') || 'Your document will be reviewed by an administrator. Make sure the image is clear and all information is readable. The review process typically takes 1-2 business days.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className={`relative max-w-3xl w-full max-h-[90vh] rounded-2xl overflow-hidden ${
            darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'
            }`}>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                  {getDocumentTypeLabel(previewDocument.document_type)}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                  {formatDate(previewDocument.uploaded_at)}
                </p>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]/60'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {previewDocument.document_url.toLowerCase().endsWith('.pdf') ? (
                <div className="text-center py-8">
                  <FileText className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                  <p className={`mb-4 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>
                    {t('pdfPreviewNotAvailable') || 'PDF preview not available'}
                  </p>
                  <a
                    href={previewDocument.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-medium hover:bg-[var(--brand-primary)]/90 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {t('openPdf') || 'Open PDF'}
                  </a>
                </div>
              ) : (
                <img 
                  src={previewDocument.document_url} 
                  alt="Document preview" 
                  className="w-full h-auto rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
    </div>
  );
}
