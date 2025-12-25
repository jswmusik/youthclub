// frontend/app/(public)/components/OrganizerInfoModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { X, Mail, Phone, MapPin, ExternalLink, Building2 } from 'lucide-react';

interface OrganizerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizer: {
    name: string;
    avatar?: string | null;
    heroImage?: string | null;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
}

export default function OrganizerInfoModal({ 
  isOpen, 
  onClose, 
  organizer 
}: OrganizerInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dark-900)]/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="w-full max-w-lg bg-[var(--dark-700)] rounded-3xl border border-[var(--dark-600)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="organizer-modal-title"
      >
        {/* Hero Image */}
        {organizer.heroImage ? (
          <div className="relative h-40 sm:h-48 bg-[var(--dark-600)]">
            <img 
              src={organizer.heroImage} 
              alt={organizer.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-700)] via-transparent to-transparent" />
            
            {/* Close button over hero */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--dark-900)]/60 backdrop-blur-sm flex items-center justify-center text-[var(--brand-light)] hover:bg-[var(--dark-900)]/80 transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Avatar positioned at bottom of hero */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              {organizer.avatar ? (
                <img 
                  src={organizer.avatar} 
                  alt={organizer.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-[var(--dark-700)] shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center ring-4 ring-[var(--dark-700)] shadow-xl">
                  <span className="text-3xl font-bold text-[var(--dark-900)]">
                    {organizer.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative pt-6">
            {/* Close button without hero */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--dark-600)] flex items-center justify-center text-[var(--brand-light)]/60 hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Avatar without hero */}
            <div className="flex justify-center">
              {organizer.avatar ? (
                <img 
                  src={organizer.avatar} 
                  alt={organizer.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-[var(--dark-600)]"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center ring-4 ring-[var(--dark-600)]">
                  <span className="text-3xl font-bold text-[var(--dark-900)]">
                    {organizer.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`p-6 ${organizer.heroImage ? 'pt-16' : 'pt-4'}`}>
          {/* Name & Title */}
          <div className="text-center mb-6">
            <h2 
              id="organizer-modal-title"
              className="text-xl font-bold text-[var(--brand-light)] font-heading"
            >
              {organizer.name}
            </h2>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1 flex items-center justify-center gap-1">
              <Building2 className="w-4 h-4" />
              Arrangör
            </p>
          </div>

          {/* Description */}
          {organizer.description && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--dark-600)]/30 border border-[var(--dark-600)]">
              <p className="text-[var(--brand-light)]/80 text-sm leading-relaxed">
                {organizer.description}
              </p>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            {/* Email */}
            {organizer.email && (
              <a
                href={`mailto:${organizer.email}`}
                className="flex items-center gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50 hover:bg-[var(--dark-600)] transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--brand-light)]/50 text-xs mb-0.5">E-post</p>
                  <p className="text-[var(--brand-light)] font-medium truncate group-hover:text-[var(--brand-primary)] transition-colors">
                    {organizer.email}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
              </a>
            )}

            {/* Phone */}
            {organizer.phone && (
              <a
                href={`tel:${organizer.phone}`}
                className="flex items-center gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50 hover:bg-[var(--dark-600)] transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--brand-purple)]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[var(--brand-purple)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--brand-light)]/50 text-xs mb-0.5">Telefon</p>
                  <p className="text-[var(--brand-light)] font-medium truncate group-hover:text-[var(--brand-purple)] transition-colors">
                    {organizer.phone}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-purple)] transition-colors flex-shrink-0" />
              </a>
            )}

            {/* Address */}
            {organizer.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(organizer.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50 hover:bg-[var(--dark-600)] transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--brand-sky)]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[var(--brand-sky)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--brand-light)]/50 text-xs mb-0.5">Adress</p>
                  <p className="text-[var(--brand-light)] font-medium truncate group-hover:text-[var(--brand-sky)] transition-colors">
                    {organizer.address}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-sky)] transition-colors flex-shrink-0" />
              </a>
            )}

            {/* No contact info fallback */}
            {!organizer.email && !organizer.phone && !organizer.address && !organizer.description && (
              <div className="text-center py-6">
                <Building2 className="w-10 h-10 mx-auto text-[var(--brand-light)]/20 mb-3" />
                <p className="text-[var(--brand-light)]/50 text-sm">
                  Ingen kontaktinformation tillgänglig.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)] font-medium hover:bg-[var(--dark-500)] transition-colors"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
