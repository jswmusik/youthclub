'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Customer {
  id: number;
  name: string;
  logo: string;
  website_url: string | null;
  display_order: number;
}

export default function CustomersSection() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API_URL}/marketing/public/customers/`);
        if (res.ok) {
          const data = await res.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Don't render if no customers
  if (loading || customers.length === 0) {
    return null;
  }

  // Duplicate the customers array for seamless infinite scroll
  const duplicatedCustomers = [...customers, ...customers, ...customers];

  return (
    <section className="py-16 sm:py-20 bg-[var(--dark-800)] border-t border-b border-[var(--dark-700)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading mb-3">
            Våra kunder
          </h2>
          <p className="text-[var(--brand-light)]/60 max-w-2xl mx-auto">
            Stolta över att samarbeta med kommuner och organisationer över hela Sverige
          </p>
        </div>

        {/* Scrolling Logo Container */}
        <div 
          className="relative overflow-hidden py-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Gradient Fade Left */}
          <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-[var(--dark-800)] to-transparent z-10 pointer-events-none" />
          
          {/* Gradient Fade Right */}
          <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-[var(--dark-800)] to-transparent z-10 pointer-events-none" />

          {/* Scrolling Track */}
          <div
            ref={scrollRef}
            className={`flex items-center gap-8 sm:gap-12 px-4 ${isPaused ? 'animation-paused' : ''}`}
            style={{
              animation: `scroll ${customers.length * 4}s linear infinite`,
              width: 'max-content',
            }}
          >
            {duplicatedCustomers.map((customer, index) => (
              <CustomerLogo key={`${customer.id}-${index}`} customer={customer} />
            ))}
          </div>
        </div>

        {/* Inline keyframes */}
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-100% / 3));
            }
          }
          
          .animation-paused {
            animation-play-state: paused !important;
          }
        `}</style>
      </div>
    </section>
  );
}

function CustomerLogo({ customer }: { customer: Customer }) {
  const [isHovered, setIsHovered] = useState(false);

  const LogoContent = (
    <div
      className="relative group flex-shrink-0 p-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-16 sm:h-20 w-32 sm:w-40 flex items-center justify-center p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-600)] transition-all duration-300 hover:border-[var(--brand-primary)]/30 hover:bg-[var(--dark-700)]">
        <img
          src={customer.logo}
          alt={customer.name}
          className={`max-h-full max-w-full object-contain transition-all duration-500 ${
            isHovered ? 'filter-none scale-110' : 'grayscale opacity-70'
          }`}
        />
        
        {/* Hover Overlay with Name */}
        <div className={`absolute inset-0 flex items-end justify-center pb-1 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="text-xs font-medium text-[var(--brand-light)] bg-[var(--dark-900)]/80 px-2 py-0.5 rounded-full">
            {customer.name}
          </span>
        </div>

        {/* External Link Indicator - Inside card */}
        {customer.website_url && (
          <div className={`absolute top-2 right-2 p-1.5 bg-[var(--brand-primary)] rounded-full shadow-lg transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <ExternalLink className="w-3 h-3 text-[var(--dark-900)]" />
          </div>
        )}
      </div>
    </div>
  );

  if (customer.website_url) {
    return (
      <a
        href={customer.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] rounded-xl"
      >
        {LogoContent}
      </a>
    );
  }

  return LogoContent;
}

