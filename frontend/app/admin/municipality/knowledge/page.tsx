import KnowledgeDashboard from '@/app/components/learning/KnowledgeDashboard';

export default function MunicipalityKnowledgePage() {
    return (
        <div className="max-w-7xl mx-auto py-6">
            <KnowledgeDashboard basePath="/admin/municipality/knowledge/courses" />
        </div>
    );
}