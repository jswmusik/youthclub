'use client';

import Link from 'next/link';
import { Course } from '@/types/learning';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, CheckCircle } from 'lucide-react';

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
            <Card className="h-full overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Cover Image */}
                <div className="relative h-40 bg-slate-100">
                    {course.cover_image ? (
                        <img 
                            src={course.cover_image} 
                            alt={course.title} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <PlayCircle className="w-12 h-12" />
                        </div>
                    )}
                    
                    {/* Status Badge overlay */}
                    {isCompleted && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Completed
                        </div>
                    )}
                </div>

                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                            {course.category_name || 'General'}
                        </Badge>
                    </div>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-blue-600 transition-colors">
                        {course.title}
                    </h3>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-grow">
                    <p className="text-sm text-slate-500 line-clamp-2">
                        {course.description}
                    </p>
                </CardContent>

                <CardFooter className="p-4 pt-0 block">
                    {isStarted ? (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                                <span>{progress}% complete</span>
                            </div>
                            {/* Simple Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center text-xs text-slate-500 gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Start Course</span>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}