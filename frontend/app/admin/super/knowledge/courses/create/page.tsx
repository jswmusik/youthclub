import CourseSettingsForm from "@/app/components/learning/CourseSettingsForm";

export default function CreateCoursePage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
                <p className="text-gray-500 mt-1">Start by defining the basic information for your course.</p>
            </div>
            
            <CourseSettingsForm />
        </div>
    );
}