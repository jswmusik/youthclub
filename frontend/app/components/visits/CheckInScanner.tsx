'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { visits } from '@/lib/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal'; // Import the modal

interface CheckInScannerProps {
  onSuccess?: () => void;
  darkMode?: boolean;
}

export default function CheckInScanner({ onSuccess, darkMode = false }: CheckInScannerProps) {
  const t = useTranslations('visits');
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<Html5QrcodeScanner | null>(null);
  
  // Modal State
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInvalidQRModal, setShowInvalidQRModal] = useState(false);
  const [nextOpeningTime, setNextOpeningTime] = useState<string>('');
  const [clubName, setClubName] = useState<string>('');
  const [invalidQRMessage, setInvalidQRMessage] = useState<string>('');

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    let observer: MutationObserver | null = null;
    
    // Initialize Scanner with mobile-friendly configuration
    const config = {
      fps: 10,
      qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
        // Responsive QR box size
        const minEdgePercentage = 0.7; // 70% of the smaller edge
        const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return {
          width: qrboxSize,
          height: qrboxSize
        };
      },
      aspectRatio: 1.0,
      // Mobile-specific settings - enable both camera and file upload
      supportedScanTypes: [0, 1], // 0 = camera, 1 = file upload
      // Better mobile camera configuration
      videoConstraints: {
        facingMode: "environment", // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      scanner = new Html5QrcodeScanner(
        "reader",
        config,
        /* verbose= */ false
      );

      setScannerInstance(scanner);

      scanner.render(
        onScanSuccess,
        onScanFailure,
        (errorMessage: string, error: any) => {
          // Handle camera permission errors
          console.error('Scanner error:', errorMessage, error);
          
          // Check for specific error types
          const errorStr = errorMessage?.toLowerCase() || '';
          const errorObj = error?.name || error?.message || '';
          const errorObjStr = errorObj?.toLowerCase() || '';
          
          if (errorStr.includes('permission') || errorStr.includes('notallowed') || 
              errorObjStr.includes('notallowederror') || errorStr.includes('camera access denied')) {
            setCameraError(t('cameraAccessDenied'));
          } else if (errorStr.includes('notfound') || errorStr.includes('no camera') || 
                     errorObjStr.includes('notfounderror') || errorStr.includes('no devices found')) {
            setCameraError(t('noCameraFound'));
          } else if (errorStr.includes('notreadable') || errorObjStr.includes('notreadableerror')) {
            setCameraError(t('cameraInUse'));
          } else {
            setCameraError(t('cameraErrorGeneric', { error: errorMessage || t('unknownError') }));
          }
          setScanning(false);
        }
      );

      // Update button texts after scanner renders
      const updateButtonTexts = () => {
        const cameraPermissionBtn = document.getElementById('html5-qrcode-button-camera-permission');
        const fileSelectionBtn = document.getElementById('html5-qrcode-button-file-selection');
        
        if (cameraPermissionBtn) {
          cameraPermissionBtn.textContent = t('requestCameraPermissions');
        }
        if (fileSelectionBtn) {
          fileSelectionBtn.textContent = t('scanImageFile');
        }
      };

      // Try immediately and also set up observer for when buttons are added
      setTimeout(updateButtonTexts, 100);
      
      // Watch for when buttons are added to DOM
      observer = new MutationObserver(() => {
        updateButtonTexts();
      });
      
      const readerElement = document.getElementById('reader');
      if (readerElement) {
        observer.observe(readerElement, {
          childList: true,
          subtree: true
        });
      }

      function onScanSuccess(decodedText: string) {
        // 1. Stop scanning immediately to prevent double-calls
        if (scanner) {
          try {
            scanner.clear(); 
          } catch (e) {
            console.error('Error clearing scanner:', e);
          }
        }
        setScanning(false);
        handleCheckIn(decodedText);
      }

      function onScanFailure(error: any) {
        // Keeps scanning, just ignores noise
        // Only log actual errors, not scanning failures (NotFoundException is normal)
        if (error && typeof error === 'string' && !error.includes('NotFoundException')) {
          console.log('Scan failure (normal):', error);
        }
      }
    } catch (error: any) {
      console.error('Error initializing scanner:', error);
      setCameraError(t('scannerInitFailed'));
      setScanning(false);
    }

    return () => {
      try { 
        if (scanner) {
          scanner.clear(); 
        }
        if (observer) {
          observer.disconnect();
        }
      } catch (e) { 
        console.error('Error cleaning up scanner:', e);
      }
    };
  }, [t]);

  const handleCheckIn = async (token: string) => {
    setProcessing(true);
    try {
      const response = await visits.scan(token);
      // Extract club name from response if available
      const clubNameFromResponse = response.data?.club_name || t('theClub');
      setClubName(clubNameFromResponse);
      setShowSuccessModal(true);
      // Don't call onSuccess immediately - let modal handle it
    } catch (error: any) {
      console.error('Check-in error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);
      console.error('Error message:', error.message);
      
      // Try to get data from different possible locations
      const data = error.response?.data || error.response || {};
      const status = error.response?.status;
      
      // Check if data is actually empty or if it's an object with no keys
      const isEmpty = Object.keys(data).length === 0 && data.constructor === Object;
      
      // Handle invalid QR code errors (400 status - invalid/expired QR code)
      if (status === 400) {
        const errorMsg = data.error || data.detail || data.message || "Invalid QR code";
        console.log('Invalid QR code error, showing modal:', errorMsg);
        
        // Determine the specific error message
        let displayMessage = t('invalidQRGeneric');
        if (typeof errorMsg === 'string') {
          if (errorMsg.toLowerCase().includes('expired')) {
            displayMessage = t('invalidQRExpired');
          } else if (errorMsg.toLowerCase().includes('invalid')) {
            displayMessage = t('invalidQRInvalid');
          } else {
            displayMessage = errorMsg;
          }
        }
        
        setInvalidQRMessage(displayMessage);
        setShowInvalidQRModal(true);
        // Don't reload - let the modal handle it
      }
      // Handle club not found errors (404 status)
      else if (status === 404) {
        console.log('Club not found error, showing modal');
        setInvalidQRMessage(t('clubNotFound'));
        setShowInvalidQRModal(true);
        // Don't reload - let the modal handle it
      }
      // Handle club closed errors (403 status)
      else if (status === 403) {
        // Check if we have the CLUB_CLOSED code in the data
        if (data.code === 'CLUB_CLOSED' || data.error === 'CLOSED' || 
            (typeof data.error === 'string' && data.error.toLowerCase().includes('closed'))) {
          console.log('Club is closed, showing modal with next opening:', data.next_opening);
          setNextOpeningTime(data.next_opening || t('unknown'));
          setShowClosedModal(true);
          // Don't reload - let the modal handle it
        } else if (isEmpty) {
          // Empty response but 403 - likely a club closed scenario or permission issue
          // Show a generic closed message since we can't determine the exact reason
          console.log('Empty 403 response - showing generic closed message');
          setNextOpeningTime(t('pleaseCheckClubHours'));
          setShowClosedModal(true);
        } else {
          // Standard 403 error (e.g., restricted age, invalid token)
          const msg = data.error || data.detail || data.message || t('checkInFailed');
          console.log('Standard 403 error, showing toast:', msg);
          toast.error(msg);
          // Restart scanner for standard errors after a delay
          setTimeout(() => {
            setProcessing(false);
            window.location.reload();
          }, 2000); 
          return; // Exit early to prevent setting processing to false
        }
      } else {
        // Other error statuses - show toast and restart scanner
        const msg = data.error || data.detail || data.message || error.message || t('checkInFailed');
        console.log('Other error, showing toast:', msg);
        toast.error(msg);
        // Restart scanner for standard errors after a delay
        setTimeout(() => {
          setProcessing(false);
          window.location.reload();
        }, 2000); 
        return; // Exit early to prevent setting processing to false
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowClosedModal(false);
    // Reload to restart scanner after closing modal
    window.location.reload();
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (onSuccess) onSuccess();
    // Navigate to youth dashboard after successful check-in
    router.push('/dashboard/youth');
  };

  const handleInvalidQRModalClose = () => {
    setShowInvalidQRModal(false);
    // Reload to restart scanner after closing modal
    window.location.reload();
  };

  return (
    <>
      <div className={`w-full max-w-md mx-auto overflow-hidden border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)] rounded-none sm:rounded-2xl' 
          : 'bg-white border-gray-200 rounded-xl shadow-lg'
      }`}>
        <div className={`p-4 text-center ${
          darkMode 
            ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
            : 'bg-[#4D4DA4] text-white'
        }`}>
          <h3 className="font-bold text-lg font-heading">{t('scanKioskCode')}</h3>
        </div>
        
        <div className="p-4">
          {processing ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
              }`}></div>
              <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}>{t('verifyingCheckIn')}</p>
            </div>
          ) : cameraError ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 p-4 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${
                darkMode ? 'bg-[var(--brand-red)]/20' : 'bg-red-100'
              }`}>
                <svg className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className={`font-medium text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{cameraError}</p>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => {
                    setCameraError(null);
                    setScanning(true);
                    window.location.reload();
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    darkMode 
                      ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]' 
                      : 'bg-[#4D4DA4] hover:bg-[#6D6DD4] text-white'
                  }`}
                >
                  {t('tryAgain')}
                </button>
                <p className={`text-xs mt-2 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                  {t('cameraTip')}
                </p>
              </div>
            </div>
          ) : (
            <div id="reader" className={`w-full ${darkMode ? 'qr-scanner-dark' : ''}`}></div>
          )}
        </div>
      </div>

      {/* Pop-up for Closed Club */}
      {showClosedModal && (
        <ConfirmationModal
          isVisible={showClosedModal}
          onClose={handleCloseModal}
          onConfirm={handleCloseModal}
          title={t('clubClosed')}
          message={t('clubClosedMessage', { nextOpeningTime })}
          confirmButtonText={t('okGotIt')}
          cancelButtonText={t('close')}
          variant="warning"
          darkMode={darkMode}
        />
      )}

      {/* Pop-up for Successful Check-in */}
      {showSuccessModal && (
        <ConfirmationModal
          isVisible={showSuccessModal}
          onClose={handleSuccessModalClose}
          onConfirm={handleSuccessModalClose}
          title={t('welcome')}
          message={t('checkInSuccess', { clubName })}
          confirmButtonText={t('great')}
          cancelButtonText={t('close')}
          variant="success"
          darkMode={darkMode}
        />
      )}

      {/* Pop-up for Invalid QR Code */}
      {showInvalidQRModal && (
        <ConfirmationModal
          isVisible={showInvalidQRModal}
          onClose={handleInvalidQRModalClose}
          onConfirm={handleInvalidQRModalClose}
          title={t('invalidQRCode')}
          message={invalidQRMessage}
          confirmButtonText={t('okTryAgain')}
          cancelButtonText={t('close')}
          variant="danger"
          darkMode={darkMode}
        />
      )}
    </>
  );
}