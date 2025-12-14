import CourseLibrary from '@/app/components/learning/CourseLibrary';

export default function MunicipalityCourseLibraryPage() {
    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#EBEBFE] rounded-lg">
                        <svg className="w-6 h-6 text-[#4D4DA4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[#121213]">All Courses</h1>
                        <p className="text-gray-500 mt-1">Browse and discover all available learning resources</p>
                    </div>
                </div>
            </div>
            <CourseLibrary basePath="/admin/municipality/knowledge/courses" />
        </div>
    );
}