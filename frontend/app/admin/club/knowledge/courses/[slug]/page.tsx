'use client';

import { useParams } from 'next/navigation';
import CoursePlayerLayout from '@/app/components/learning/CoursePlayerLayout';

export default function ClubCoursePlayerPage() {
    const params = useParams();
    
    return (
        <div className="absolute inset-0 bg-white z-50">
            {/* We use absolute inset-0 to overlay the default admin layout if needed, 
               or better yet, this page should ideally be in a layout that doesn't 
               have the sidebar if you want a "Full Screen" mode. 
               For now, we render it within the content area.
            */}
            <CoursePlayerLayout 
                courseSlug={params.slug as string} 
                backUrl="/admin/club/knowledge/courses" 
            />
        </div>
    );
}

