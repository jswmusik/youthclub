import CourseLibrary from '@/app/components/learning/CourseLibrary';

export default function ClubCourseLibraryPage() {
    return (
        <div className="max-w-7xl mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">All Courses</h1>
            </div>
            <CourseLibrary basePath="/admin/club/knowledge/courses" />
        </div>
    );
}