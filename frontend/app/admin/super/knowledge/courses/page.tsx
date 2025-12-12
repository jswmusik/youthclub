import CourseManager from "@/app/components/learning/CourseManager";

export default function KnowledgeCoursesPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Center Management</h1>
        <p className="text-gray-500 mt-2">Manage courses, tutorials, and resources for system administrators.</p>
      </div>
      
      <CourseManager />
    </div>
  );
}