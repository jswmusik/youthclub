'use client';

import { useParams } from 'next/navigation';
import CoursePlayerLayout from '@/app/components/learning/CoursePlayerLayout';

export default function MuniCoursePlayerPage() {
    const params = useParams();
    
    return (
        <CoursePlayerLayout 
            courseSlug={params.slug as string} 
            backUrl="/admin/municipality/knowledge/courses" 
        />
    );
}

