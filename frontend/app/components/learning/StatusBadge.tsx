import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    switch (status) {
        case 'PUBLISHED':
            return <Badge className="bg-emerald-600 hover:bg-emerald-700">Published</Badge>;
        case 'DRAFT':
            return <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">Draft</Badge>;
        case 'SCHEDULED':
            return <Badge className="bg-blue-600 hover:bg-blue-700">Scheduled</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}