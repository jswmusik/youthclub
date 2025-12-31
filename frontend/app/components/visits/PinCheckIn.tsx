'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import { Keyboard, ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';

interface Club {
  id: number;
  name: string;
  municipalityId?: number;
  municipalityName?: string;
}

interface PinCheckInProps {
  onSuccess?: () => void;
  darkMode?: boolean;
}

export default function PinCheckIn({ onSuccess, darkMode = false }: PinCheckInProps) {
  const t = useTranslations('visits');
  const router = useRouter();
  
  const [pinCode, setPinCode] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [clubName, setClubName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [nextOpeningTime, setNextOpeningTime] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch clubs - organized by priority: preferred > same municipality > other municipalities
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        // Fetch user data and all clubs in parallel
        const [userResponse, clubsResponse] = await Promise.all([
          api.get('/auth/users/me/'),
          api.get('/clubs/?page_size=500') // Get all clubs
        ]);
        
        const userData = userResponse.data;
        const allClubs = clubsResponse.data.results || clubsResponse.data || [];
        
        // Get user's preferred club and municipality
        const preferredClubId = userData.preferred_club?.id;
        const userMunicipalityId = userData.preferred_club?.municipality?.id || 
                                   userData.preferred_club?.municipality;
        
        // Organize clubs into categories
        const preferredClub: Club | null = userData.preferred_club ? {
          id: userData.preferred_club.id,
          name: userData.preferred_club.name,
          municipalityId: userData.preferred_club.municipality?.id || userData.preferred_club.municipality,
          municipalityName: userData.preferred_club.municipality?.name || ''
        } : null;
        
        const sameMunicipalityClubs: Club[] = [];
        const otherClubsByMunicipality: Map<string, Club[]> = new Map();
        
        allClubs.forEach((club: any) => {
          // Skip the preferred club (already handled)
          if (club.id === preferredClubId) return;
          
          const clubData: Club = {
            id: club.id,
            name: club.name,
            municipalityId: club.municipality?.id || club.municipality,
            municipalityName: club.municipality?.name || club.municipality_name || ''
          };
          
          // Check if same municipality as user's preferred club
          if (userMunicipalityId && clubData.municipalityId === userMunicipalityId) {
            sameMunicipalityClubs.push(clubData);
          } else {
            // Group by municipality
            const munName = clubData.municipalityName || 'Other';
            if (!otherClubsByMunicipality.has(munName)) {
              otherClubsByMunicipality.set(munName, []);
            }
            otherClubsByMunicipality.get(munName)!.push(clubData);
          }
        });
        
        // Sort clubs within each category alphabetically
        sameMunicipalityClubs.sort((a, b) => a.name.localeCompare(b.name));
        
        // Sort municipalities alphabetically and sort clubs within each
        const sortedMunicipalities = Array.from(otherClubsByMunicipality.keys()).sort();
        const otherClubs: Club[] = [];
        sortedMunicipalities.forEach(munName => {
          const clubs = otherClubsByMunicipality.get(munName)!;
          clubs.sort((a, b) => a.name.localeCompare(b.name));
          otherClubs.push(...clubs);
        });
        
        // Build final list: preferred first, then same municipality, then others
        const finalList: Club[] = [];
        if (preferredClub) {
          finalList.push(preferredClub);
        }
        finalList.push(...sameMunicipalityClubs);
        finalList.push(...otherClubs);
        
        setClubs(finalList);
        
        // Auto-select preferred club if exists, or first club if only one
        if (preferredClub) {
          setSelectedClubId(preferredClub.id);
        } else if (finalList.length === 1) {
          setSelectedClubId(finalList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch clubs:', error);
      } finally {
        setIsLoadingClubs(false);
      }
    };

    fetchClubs();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle PIN input change
  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newPin = pinCode.split('');
    newPin[index] = digit;
    setPinCode(newPin.join(''));
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setPinCode(pastedData);
    
    // Focus the appropriate input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Submit PIN
  const handleSubmit = async () => {
    if (pinCode.length !== 6 || !selectedClubId) return;
    
    setIsLoading(true);
    
    try {
      const response = await visits.pinCheckIn(pinCode, selectedClubId);
      
      // Get club name from response or find it in our list
      const responseClubName = response.data?.club_name || clubs.find(c => c.id === selectedClubId)?.name || t('theClub');
      setClubName(responseClubName);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('PIN check-in error:', error);
      
      const data = error.response?.data || {};
      const status = error.response?.status;
      
      if (status === 400) {
        // Invalid PIN
        setErrorMessage(data.error || t('invalidPinCode'));
        setShowErrorModal(true);
      } else if (status === 403) {
        // Club closed or restriction
        if (data.code === 'CLUB_CLOSED') {
          setNextOpeningTime(data.next_opening || t('unknown'));
          setShowClosedModal(true);
        } else {
          setErrorMessage(data.error || t('checkInFailed'));
          setShowErrorModal(true);
        }
      } else {
        setErrorMessage(data.error || t('checkInFailed'));
        setShowErrorModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (onSuccess) onSuccess();
    router.push('/dashboard/youth');
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    setPinCode('');
    inputRefs.current[0]?.focus();
  };

  const handleClosedClose = () => {
    setShowClosedModal(false);
    setPinCode('');
  };

  const selectedClub = clubs.find(c => c.id === selectedClubId);
  const canSubmit = pinCode.length === 6 && selectedClubId && !isLoading;

  return (
    <>
      <div className={`w-full max-w-md mx-auto overflow-hidden border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)] rounded-none sm:rounded-2xl' 
          : 'bg-white border-gray-200 rounded-xl shadow-lg'
      }`}>
        {/* Header */}
        <div className={`p-4 text-center ${
          darkMode 
            ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
            : 'bg-[#4D4DA4] text-white'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <Keyboard className="w-5 h-5" />
            <h3 className="font-bold text-lg font-heading">{t('enterPinCode')}</h3>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {/* Club Selector */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
            }`}>
              {t('selectClub')}
            </label>
            
            {isLoadingClubs ? (
              <div className={`h-12 rounded-xl animate-pulse ${
                darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-100'
              }`} />
            ) : clubs.length === 0 ? (
              <div className={`p-4 rounded-xl text-center ${
                darkMode ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/60' : 'bg-gray-100 text-gray-500'
              }`}>
                <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('noClubsFound')}</p>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] hover:border-[var(--brand-primary)]' 
                      : 'bg-white border-gray-300 text-gray-900 hover:border-[#4D4DA4]'
                  }`}
                >
                  <span className={!selectedClub ? 'opacity-50' : ''}>
                    {selectedClub?.name || t('chooseClub')}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className={`absolute z-50 w-full mt-2 rounded-xl border shadow-lg overflow-hidden max-h-64 overflow-y-auto ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
                      : 'bg-white border-gray-200'
                  }`}>
                    {clubs.map((club, index) => {
                      // Check if this is the first club (preferred) or if municipality changed
                      const isPreferred = index === 0 && selectedClubId === club.id;
                      const prevClub = index > 0 ? clubs[index - 1] : null;
                      const showMunicipalityHeader = club.municipalityName && 
                        (!prevClub || prevClub.municipalityName !== club.municipalityName);
                      
                      return (
                        <div key={club.id}>
                          {showMunicipalityHeader && index > 0 && (
                            <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                              darkMode 
                                ? 'bg-[var(--dark-800)] text-[var(--brand-light)]/40 border-t border-[var(--dark-600)]' 
                                : 'bg-gray-100 text-gray-500 border-t border-gray-200'
                            }`}>
                              {club.municipalityName}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClubId(club.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 transition-colors ${
                              darkMode 
                                ? 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]' 
                                : 'hover:bg-gray-50 text-gray-900'
                            } ${selectedClubId === club.id ? (darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-50') : ''}`}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{club.name}</span>
                              {index === 0 && clubs.length > 1 && (
                                <span className={`text-xs ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}>
                                  {t('yourHomeClub')}
                                </span>
                              )}
                            </div>
                            {selectedClubId === club.id && (
                              <Check className="w-4 h-4 text-[var(--brand-primary)]" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PIN Input */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
            }`}>
              {t('pinCodeLabel')}
            </label>
            
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={pinCode[index] || ''}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border-2 transition-all focus:outline-none ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-[#4D4DA4] focus:ring-2 focus:ring-[#4D4DA4]/20'
                  }`}
                />
              ))}
            </div>
            
            <p className={`text-center text-xs mt-3 ${
              darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
            }`}>
              {t('pinCodeHint')}
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 ${
              canSubmit
                ? darkMode 
                  ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]' 
                  : 'bg-[#4D4DA4] hover:bg-[#6D6DD4] text-white'
                : darkMode
                  ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/30 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('verifyingCheckIn')}
              </>
            ) : (
              t('checkInWithPin')
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <ConfirmationModal
        isVisible={showSuccessModal}
        onClose={handleSuccessClose}
        onConfirm={handleSuccessClose}
        title={t('welcome')}
        message={t('checkInSuccess', { clubName })}
        confirmButtonText={t('great')}
        cancelButtonText={t('close')}
        variant="success"
        darkMode={darkMode}
      />

      {/* Error Modal */}
      <ConfirmationModal
        isVisible={showErrorModal}
        onClose={handleErrorClose}
        onConfirm={handleErrorClose}
        title={t('checkInError')}
        message={errorMessage}
        confirmButtonText={t('okTryAgain')}
        cancelButtonText={t('close')}
        variant="danger"
        darkMode={darkMode}
      />

      {/* Club Closed Modal */}
      <ConfirmationModal
        isVisible={showClosedModal}
        onClose={handleClosedClose}
        onConfirm={handleClosedClose}
        title={t('clubClosed')}
        message={t('clubClosedMessage', { nextOpeningTime })}
        confirmButtonText={t('okGotIt')}
        cancelButtonText={t('close')}
        variant="warning"
        darkMode={darkMode}
      />
    </>
  );
}

