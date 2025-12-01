'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { visits } from '@/lib/api';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal'; // Import the modal

interface CheckInScannerProps {
  onSuccess?: () => void;
}

export default function CheckInScanner({ onSuccess }: CheckInScannerProps) {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Modal State
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInvalidQRModal, setShowInvalidQRModal] = useState(false);
  const [nextOpeningTime, setNextOpeningTime] = useState<string>('');
  const [clubName, setClubName] = useState<string>('');
  const [invalidQRMessage, setInvalidQRMessage] = useState<string>('');

  useEffect(() => {
    // Initialize Scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText: string) {
      // 1. Stop scanning immediately to prevent double-calls
      scanner.clear(); 
      setScanning(false);
      handleCheckIn(decodedText);
    }

    function onScanFailure(error: any) {
      // Keeps scanning, just ignores noise
    }

    return () => {
      try { scanner.clear(); } catch (e) { /* ignore cleanup errors */ }
    };
  }, []);

  const handleCheckIn = async (token: string) => {
    setProcessing(true);
    try {
      const response = await visits.scan(token);
      // Extract club name from response if available
      const clubNameFromResponse = response.data?.club_name || "the club";
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
        let displayMessage = "This QR code is invalid or expired.";
        if (typeof errorMsg === 'string') {
          if (errorMsg.toLowerCase().includes('expired')) {
            displayMessage = "This QR code has expired. Please scan a fresh code from the kiosk screen.";
          } else if (errorMsg.toLowerCase().includes('invalid')) {
            displayMessage = "This QR code is invalid. Please make sure you're scanning the correct code from the club's kiosk screen.";
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
        setInvalidQRMessage("The club associated with this QR code could not be found. Please scan a valid code from the club's kiosk screen.");
        setShowInvalidQRModal(true);
        // Don't reload - let the modal handle it
      }
      // Handle club closed errors (403 status)
      else if (status === 403) {
        // Check if we have the CLUB_CLOSED code in the data
        if (data.code === 'CLUB_CLOSED' || data.error === 'CLOSED' || 
            (typeof data.error === 'string' && data.error.toLowerCase().includes('closed'))) {
          console.log('Club is closed, showing modal with next opening:', data.next_opening);
          setNextOpeningTime(data.next_opening || "Unknown");
          setShowClosedModal(true);
          // Don't reload - let the modal handle it
        } else if (isEmpty) {
          // Empty response but 403 - likely a club closed scenario or permission issue
          // Show a generic closed message since we can't determine the exact reason
          console.log('Empty 403 response - showing generic closed message');
          setNextOpeningTime("Please check club hours");
          setShowClosedModal(true);
        } else {
          // Standard 403 error (e.g., restricted age, invalid token)
          const msg = data.error || data.detail || data.message || "Check-in failed. Please try again.";
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
        const msg = data.error || data.detail || data.message || error.message || "Check-in failed";
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
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-800 text-white text-center">
          <h3 className="font-bold text-lg">Scan Kiosk Code</h3>
        </div>
        
        <div className="p-4">
          {processing ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              <p className="text-slate-600">Verifying check-in...</p>
            </div>
          ) : (
            <div id="reader" className="w-full"></div>
          )}
        </div>
      </div>

      {/* Pop-up for Closed Club */}
      {showClosedModal && (
        <ConfirmationModal
          isVisible={showClosedModal}
          onClose={handleCloseModal}
          onConfirm={handleCloseModal}
          title="Club is Closed"
          message={`We are currently closed. We open again: ${nextOpeningTime}`}
          confirmButtonText="OK, Got it"
          cancelButtonText="Close"
          variant="warning"
        />
      )}

      {/* Pop-up for Successful Check-in */}
      {showSuccessModal && (
        <ConfirmationModal
          isVisible={showSuccessModal}
          onClose={handleSuccessModalClose}
          onConfirm={handleSuccessModalClose}
          title="Welcome!"
          message={`You have successfully checked in to ${clubName}. Enjoy your visit!`}
          confirmButtonText="Great!"
          cancelButtonText="Close"
          variant="info"
        />
      )}

      {/* Pop-up for Invalid QR Code */}
      {showInvalidQRModal && (
        <ConfirmationModal
          isVisible={showInvalidQRModal}
          onClose={handleInvalidQRModalClose}
          onConfirm={handleInvalidQRModalClose}
          title="Invalid QR Code"
          message={invalidQRMessage}
          confirmButtonText="OK, Try Again"
          cancelButtonText="Close"
          variant="danger"
        />
      )}
    </>
  );
}