import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    switch (status) {
        case 'PUBLISHED':
            return <Badge variant="outline" className="bg-green-50 text-[#10B981] border-[#10B981]/30">Published</Badge>;
        case 'DRAFT':
            return <Badge variant="outline" className="bg-blue-50 text-[#0EA5E9] border-[#0EA5E9]/30">Draft</Badge>;
        case 'SCHEDULED':
            return <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30">Scheduled</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}