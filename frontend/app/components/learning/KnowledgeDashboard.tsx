'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { learningApi } from '@/lib/learning-api';
import { Course } from '@/types/learning';
import CourseCard from './CourseCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';

interface Props {
    basePath: string; // e.g. "/admin/club/knowledge/courses"
}

export default function KnowledgeDashboard({ basePath }: Props) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5ea757be-4060-4c96-aba0-b394c471feb2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KnowledgeDashboard.tsx:load:before_api','message':'About to call getAllCourses','data':{},'timestamp':Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                const res = await learningApi.getAllCourses();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5ea757be-4060-4c96-aba0-b394c471feb2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KnowledgeDashboard.tsx:load:after_api','message':'API call successful','data':{status:res.status,dataType:typeof res.data,isArray:Array.isArray(res.data),hasResults:!!(res.data as any)?.results,keys:res.data?Object.keys(res.data as any):null},'timestamp':Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                // Handle paginated response (DRF returns {results: [...]}) or direct array
                const data = res.data as any;
                const coursesData = Array.isArray(data) ? data : (data?.results || []);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5ea757be-4060-4c96-aba0-b394c471feb2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KnowledgeDashboard.tsx:load:after_processing','message':'Courses data after processing','data':{isArray:Array.isArray(coursesData),length:coursesData?.length,coursesDataType:typeof coursesData},'timestamp':Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                setCourses(coursesData);
            } catch (e: any) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5ea757be-4060-4c96-aba0-b394c471feb2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KnowledgeDashboard.tsx:load:error','message':'API call failed','data':{error:e?.toString(),errorMessage:e?.message,status:e?.response?.status,statusText:e?.response?.statusText,responseData:e?.response?.data},'timestamp':Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Logic for sections
    // Ensure courses is always an array before filtering
    const inProgress = Array.isArray(courses) ? courses.filter(c => c.user_progress && c.user_progress.status === 'IN_PROGRESS') : [];
    // Simple logic for "New/Recommended": Show latest 4 that are NOT completed
    const recommended = Array.isArray(courses) ? courses
        .filter(c => !c.user_progress || c.user_progress.status !== 'COMPLETED')
        .slice(0, 4) : [];

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-10">
            {/* Hero / Welcome */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">Knowledge Center</h1>
                <p className="text-blue-100 max-w-2xl mb-6">
                    Welcome to your learning hub. Master the platform with our guided courses and documentation.
                </p>
                <Button variant="secondary" asChild>
                    <Link href={`${basePath}`}>
                        Browse All Courses
                    </Link>
                </Button>
            </div>

            {/* Continue Learning */}
            {inProgress.length > 0 && (
                <section>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            Continue Learning
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {inProgress.map(course => (
                            <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recommended */}
            <section>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold">Recommended for You</h2>
                    <Link href={`${basePath}`} className="text-sm text-blue-600 hover:underline flex items-center">
                        View all <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {recommended.map(course => (
                        <CourseCard key={course.id} course={course} href={`${basePath}/${course.slug}`} />
                    ))}
                </div>
            </section>
        </div>
    );
}