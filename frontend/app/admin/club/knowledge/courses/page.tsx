import CourseLibrary from '@/app/components/learning/CourseLibrary';
import { BookOpen } from 'lucide-react';

export default function ClubCourseLibraryPage() {
    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#EBEBFE] rounded-lg">
                        <BookOpen className="w-6 h-6 text-[#4D4DA4]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[#121213]">All Courses</h1>
                        <p className="text-gray-500 mt-1">Browse and discover all available learning resources</p>
                    </div>
                </div>
            </div>
            <CourseLibrary basePath="/admin/club/knowledge/courses" />
        </div>
    );
}