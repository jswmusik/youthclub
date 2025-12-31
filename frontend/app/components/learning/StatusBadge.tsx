'use client';

import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const t = useTranslations('knowledgeAdmin.courses.statusBadge');
    
    switch (status) {
        case 'PUBLISHED':
            return <Badge variant="outline" className="bg-green-50 text-[#10B981] border-[#10B981]/30">{t('published')}</Badge>;
        case 'DRAFT':
            return <Badge variant="outline" className="bg-blue-50 text-[#0EA5E9] border-[#0EA5E9]/30">{t('draft')}</Badge>;
        case 'SCHEDULED':
            return <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30">{t('scheduled')}</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}