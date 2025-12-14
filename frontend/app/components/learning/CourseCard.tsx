'use client';

import Link from 'next/link';
import { Course } from '@/types/learning';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
            <Card className="h-full overflow-hidden border-2 border-transparent hover:border-[#4D4DA4]/30 hover:shadow-xl transition-all duration-300 flex flex-col bg-white hover:-translate-y-1 p-0">
                {/* Cover Image - Reduced height */}
                <div className="relative h-28 bg-gradient-to-br from-[#4D4DA4] via-[#6B6BC4] to-[#FF5485] overflow-hidden">
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
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                            <CheckCircle className="w-3 h-3" /> Completed
                        </div>
                    )}
                    
                    {/* Category Badge */}
                    {course.category_name && (
                        <div className="absolute top-2 left-2">
                            <Badge className="bg-white/90 backdrop-blur-sm text-[#4D4DA4] text-[10px] font-semibold px-2 py-0.5 border-0 shadow-sm">
                                {course.category_name}
                            </Badge>
                        </div>
                    )}
                </div>

                <CardHeader className="p-4 pb-2">
                    <h3 className="font-bold text-base leading-tight group-hover:text-[#4D4DA4] transition-colors line-clamp-2 mb-2">
                        {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {course.description}
                    </p>
                </CardHeader>

                <CardFooter className="p-4 pt-0 mt-auto">
                    {isStarted ? (
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-700">{progress}% complete</span>
                                <span className="text-gray-400">Continue</span>
                            </div>
                            {/* Animated Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] h-full rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center text-xs text-gray-500 gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium">Start learning</span>
                            </div>
                            <div className="p-1.5 bg-[#EBEBFE] rounded-full group-hover:bg-[#4D4DA4] transition-colors duration-300">
                                <ArrowRight className="w-3.5 h-3.5 text-[#4D4DA4] group-hover:text-white transition-colors duration-300" />
                            </div>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}
