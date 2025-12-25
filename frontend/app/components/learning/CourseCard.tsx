'use client';

import Link from 'next/link';
import { Course } from '@/types/learning';
import { Clock, PlayCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface Props {
    course: Course;
    href: string; // URL to the player (e.g. /admin/club/knowledge/courses/slug)
}

export default function CourseCard({ course, href }: Props) {
    const progress = course.user_progress?.percent_completed || 0;
    const isStarted = course.user_progress?.status && course.user_progress.status !== 'NOT_STARTED';
    const isCompleted = course.user_progress?.status === 'COMPLETED';

    return (
        <Link href={href} className="block h-full group">
            <div className="h-full overflow-hidden border-2 border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30 hover:shadow-xl transition-all duration-300 flex flex-col bg-[var(--dark-800)] hover:-translate-y-1 rounded-none sm:rounded-2xl">
                {/* Cover Image - Reduced height */}
                <div className="relative h-28 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-peach)] overflow-hidden">
                    {course.cover_image ? (
                        <img 
                            src={course.cover_image} 
                            alt={course.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/80">
                            <PlayCircle className="w-10 h-10" />
                        </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Status Badge overlay */}
                    {isCompleted && (
                        <div className="absolute top-2 right-2 bg-[var(--brand-green)] text-[var(--dark-900)] text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                            <CheckCircle className="w-3 h-3" /> Completed
                        </div>
                    )}
                    
                    {/* Category Badge */}
                    {course.category_name && (
                        <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 bg-[var(--dark-800)]/90 backdrop-blur-sm text-[var(--brand-light)] text-[10px] font-semibold rounded-full border-0 shadow-sm">
                                {course.category_name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 pb-2">
                    <h3 className="font-bold text-base leading-tight group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2 mb-2 text-[var(--brand-light)]">
                        {course.title}
                    </h3>
                    <p className="text-xs text-[var(--brand-light)]/50 line-clamp-2 leading-relaxed">
                        {course.description}
                    </p>
                </div>

                <div className="p-4 pt-0 mt-auto">
                    {isStarted ? (
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[var(--brand-light)]">{progress}% complete</span>
                                <span className="text-[var(--brand-light)]/40">Continue</span>
                            </div>
                            {/* Animated Progress Bar */}
                            <div className="w-full bg-[var(--dark-600)] rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] h-full rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center text-xs text-[var(--brand-light)]/50 gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium">Start learning</span>
                            </div>
                            <div className="p-1.5 bg-[var(--brand-primary)]/20 rounded-full group-hover:bg-[var(--brand-primary)] transition-colors duration-300">
                                <ArrowRight className="w-3.5 h-3.5 text-[var(--brand-primary)] group-hover:text-white transition-colors duration-300" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
