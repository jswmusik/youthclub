// frontend/app/(public)/components/EventSearchForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Calendar as CalendarIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MunicipalityOption {
  id: number;
  name: string;
  slug: string;
}

interface EventSearchFormProps {
  municipalities?: MunicipalityOption[];
  initialSearch?: string;
  initialMunicipality?: string;
  initialDate?: string;
  variant?: 'hero' | 'page';
  ctaText?: string;
}

export default function EventSearchForm({ 
  municipalities = [],
  initialSearch = '',
  initialMunicipality = 'all',
  initialDate,
  variant = 'hero',
  ctaText = 'Sök'
}: EventSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [query, setQuery] = useState(initialSearch || searchParams.get('search') || '');
  const [selectedMunicipality, setSelectedMunicipality] = useState(
    initialMunicipality || searchParams.get('municipality_slug') || 'all'
  );
  const [date, setDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate) : undefined
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Handle "Near Me" geolocation
  const handleNearMe = () => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Din webbläsare stödjer inte platsdelning.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams();
        params.set('lat', latitude.toString());
        params.set('lng', longitude.toString());
        if (query) params.set('search', query);
        
        setIsLocating(false);
        router.push(`/events?${params.toString()}`);
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Platsdelning nekades. Aktivera i webbläsarinställningar.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Kunde inte hämta din position.");
            break;
          case error.TIMEOUT:
            setLocationError("Tidsgräns för platsförfrågan överskreds.");
            break;
          default:
            setLocationError("Ett okänt fel uppstod.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (query) params.set('search', query);
    if (selectedMunicipality && selectedMunicipality !== 'all') {
      params.set('municipality_slug', selectedMunicipality);
    }
    if (date) params.set('date', format(date, 'yyyy-MM-dd'));

    router.push(`/events?${params.toString()}`);
  };

  const handleClearDate = () => {
    setDate(undefined);
  };

  const isHero = variant === 'hero';

  return (
    <div className={cn(
      "w-full",
      isHero 
        ? "bg-[var(--dark-700)]/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-[var(--dark-600)] shadow-2xl max-w-4xl mx-auto" 
        : "bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-600)]"
    )}>
      {/* Location Error Message */}
      {locationError && (
        <div className="mb-4 p-3 bg-[var(--brand-coral)]/10 border border-[var(--brand-coral)]/30 rounded-lg text-[var(--brand-coral)] text-sm flex items-center justify-between">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={cn(
        "flex gap-3",
        isHero ? "flex-col md:flex-row" : "flex-col sm:flex-row"
      )}>
        
        {/* Keyword Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--brand-light)]/40" />
          <Input 
            placeholder="Vad vill du göra?" 
            className={cn(
              "pl-10 bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20",
              isHero ? "h-12 text-lg" : "h-10"
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Municipality Selector */}
        <div className={cn(isHero ? "w-full md:w-48" : "w-full sm:w-40")}>
          <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
            <SelectTrigger className={cn(
              "bg-[var(--dark-600)] border-[var(--dark-500)] text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20",
              isHero ? "h-12" : "h-10"
            )}>
              <SelectValue placeholder="Kommun" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dark-700)] border-[var(--dark-600)]">
              <SelectItem value="all" className="text-[var(--brand-light)] focus:bg-[var(--dark-600)] focus:text-[var(--brand-light)]">
                Alla kommuner
              </SelectItem>
              {municipalities.map((m) => (
                <SelectItem 
                  key={m.id} 
                  value={m.slug}
                  className="text-[var(--brand-light)] focus:bg-[var(--dark-600)] focus:text-[var(--brand-light)]"
                >
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Picker */}
        <div className={cn(isHero ? "w-full md:w-48" : "w-full sm:w-40")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-[var(--dark-600)] border-[var(--dark-500)] hover:bg-[var(--dark-500)] hover:border-[var(--dark-400)]",
                  isHero ? "h-12" : "h-10",
                  !date && "text-[var(--brand-light)]/40"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-[var(--brand-light)]/60" />
                {date ? (
                  <span className="text-[var(--brand-light)] flex-1">
                    {format(date, "d MMM", { locale: sv })}
                  </span>
                ) : (
                  <span className="flex-1">Datum</span>
                )}
                {date && (
                  <X 
                    className="h-4 w-4 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearDate();
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[var(--dark-700)] border-[var(--dark-600)]" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="bg-[var(--dark-700)]"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action Buttons */}
        <div className={cn(
          "flex gap-2",
          isHero ? "w-full md:w-auto" : "w-full sm:w-auto"
        )}>
          <Button 
            className={cn(
              "flex-1 md:flex-none bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-opacity",
              isHero ? "h-12 px-8 text-lg" : "h-10 px-6"
            )}
            onClick={handleSearch}
          >
            {ctaText}
          </Button>
          <Button 
            variant="outline"
            className={cn(
              "flex-none bg-[var(--dark-600)] border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]",
              isHero ? "h-12 w-12" : "h-10 w-10"
            )}
            title="Hitta nära mig"
            onClick={handleNearMe}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MapPin className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

