'use client';

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { visits } from '@/lib/api';
import { toast } from 'react-hot-toast'; // Assuming you have this or use alert()

interface CheckInScannerProps {
  onSuccess?: () => void;
}

export default function CheckInScanner({ onSuccess }: CheckInScannerProps) {
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

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
      // Optional: Get geolocation here if you want to send it
      await visits.scan(token);
      toast.success("Welcome! You are checked in.");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Check-in failed";
      toast.error(msg);
      
      // If failed, restart scanner after 2 seconds
      setTimeout(() => window.location.reload(), 2000); 
    } finally {
      setProcessing(false);
    }
  };

  return (
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
  );
}