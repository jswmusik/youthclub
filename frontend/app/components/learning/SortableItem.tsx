'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentItem } from '@/types/learning';
import { GripVertical, Edit2, Trash2, FileText, Video, Download, Clock } from 'lucide-react';

interface SortableItemProps {
    item: ContentItem;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}

export default function SortableItem({ item, index, onEdit, onDelete }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const typeConfig = {
        VIDEO: { 
            icon: Video, 
            bg: 'bg-[var(--brand-blue)]/20', 
            text: 'text-[var(--brand-blue)]',
            badge: 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30'
        },
        TEXT: { 
            icon: FileText, 
            bg: 'bg-[var(--brand-purple)]/20', 
            text: 'text-[var(--brand-purple)]',
            badge: 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border-[var(--brand-purple)]/30'
        },
        FILE: { 
            icon: Download, 
            bg: 'bg-[var(--brand-green)]/20', 
            text: 'text-[var(--brand-green)]',
            badge: 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
        },
    };

    const config = typeConfig[item.type] || typeConfig.TEXT;
    const Icon = config.icon;

    return (
        <div ref={setNodeRef} style={style}>
            <div 
                className={`bg-[var(--dark-700)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] hover:border-[var(--dark-400)] transition-all ${
                    isDragging ? 'ring-2 ring-[var(--brand-primary)]' : ''
                }`}
            >
                <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* Drag Handle */}
                        <div 
                            className="flex flex-col items-center gap-1 pt-1 cursor-grab active:cursor-grabbing"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="w-5 h-5 text-[var(--brand-light)]/30 hover:text-[var(--brand-light)]/60 transition-colors" />
                            <span className="text-xs font-medium text-[var(--brand-light)]/30">{index + 1}</span>
                        </div>
                        
                        {/* Type Icon */}
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${config.text}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-[var(--brand-light)] mb-1 truncate">
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="flex items-center gap-1 text-sm text-[var(--brand-light)]/50">
                                            <Clock className="w-4 h-4" />
                                            {item.estimated_duration} min
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <button 
                                        onClick={onEdit}
                                        className="px-3 py-1.5 rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-all text-sm font-medium flex items-center gap-1.5"
                                    >
                                        <Edit2 className="w-4 h-4" /> 
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button 
                                        onClick={onDelete}
                                        className="px-3 py-1.5 rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all text-sm font-medium flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-4 h-4" /> 
                                        <span className="hidden sm:inline">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
