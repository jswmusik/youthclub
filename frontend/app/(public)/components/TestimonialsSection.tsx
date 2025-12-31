// frontend/app/(public)/components/TestimonialsSection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

interface Testimonial {
  id: number;
  author_name: string;
  author_role: string;
  quote: string;
  rating: number;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch(`${API_URL}/marketing/public/testimonials/`);
        if (res.ok) {
          const data = await res.json();
          setTestimonials(data);
        } else {
          // Fallback testimonials for demo
          setTestimonials([
            {
              id: 1,
              author_name: 'Emma Andersson',
              author_role: 'Ungdom, 16 år',
              quote: 'Ungdomsappen har hjälpt mig hitta nya vänner och aktiviteter som jag aldrig hade hittat annars. Bästa appen!',
              rating: 5,
            },
            {
              id: 2,
              author_name: 'Marcus Lindqvist',
              author_role: 'Ungdom, 14 år',
              quote: 'Jag älskar att kunna se alla evenemang på ett ställe. Har börjat spela basket tack vare appen!',
              rating: 5,
            },
            {
              id: 3,
              author_name: 'Sofia Bergström',
              author_role: 'Förälder',
              quote: 'Som förälder uppskattar jag verkligen att kunna följa mina barns aktiviteter. Tryggt och enkelt.',
              rating: 5,
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
        // Use fallback data
        setTestimonials([
          {
            id: 1,
            author_name: 'Emma Andersson',
            author_role: 'Ungdom, 16 år',
            quote: 'Ungdomsappen har hjälpt mig hitta nya vänner och aktiviteter som jag aldrig hade hittat annars. Bästa appen!',
            rating: 5,
          },
          {
            id: 2,
            author_name: 'Marcus Lindqvist',
            author_role: 'Ungdom, 14 år',
            quote: 'Jag älskar att kunna se alla evenemang på ett ställe. Har börjat spela basket tack vare appen!',
            rating: 5,
          },
          {
            id: 3,
            author_name: 'Sofia Bergström',
            author_role: 'Förälder',
            quote: 'Som förälder uppskattar jag verkligen att kunna följa mina barns aktiviteter. Tryggt och enkelt.',
            rating: 5,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (testimonials.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }, 5000);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    // Reset autoplay timer
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }, 5000);
    }
  };

  const goToPrev = () => {
    goToSlide(currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % testimonials.length);
  };

  if (loading) {
    return (
      <section className="py-20 px-4 bg-[var(--dark-900)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-6 w-40 mx-auto mb-4 bg-[var(--dark-700)] rounded" />
            <div className="h-10 w-64 mx-auto mb-8 bg-[var(--dark-700)] rounded" />
            <div className="h-32 w-full bg-[var(--dark-700)] rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-[var(--dark-900)] overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-wider mb-2">
            Röster från communityt
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] font-heading">
            Vad våra användare säger
          </h2>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative">
          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-800)] rounded-3xl p-8 sm:p-12 border border-[var(--dark-600)] overflow-hidden">
            {/* Background Quote Icon */}
            <Quote className="absolute top-6 right-6 w-24 h-24 text-[var(--brand-primary)]/5 rotate-180" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < testimonials[currentIndex].rating
                        ? 'text-[var(--brand-peach)] fill-[var(--brand-peach)]'
                        : 'text-[var(--dark-500)]'
                    }`}
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl sm:text-2xl text-[var(--brand-light)] leading-relaxed mb-8 font-medium">
                "{testimonials[currentIndex].quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <span className="text-xl font-bold text-[var(--dark-900)]">
                    {testimonials[currentIndex].author_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-[var(--brand-light)] font-semibold">
                    {testimonials[currentIndex].author_name}
                  </div>
                  <div className="text-[var(--brand-light)]/50 text-sm">
                    {testimonials[currentIndex].author_role}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          {testimonials.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 w-12 h-12 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors shadow-xl"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 w-12 h-12 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors shadow-xl"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {testimonials.length > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-[var(--brand-primary)]'
                    : 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

