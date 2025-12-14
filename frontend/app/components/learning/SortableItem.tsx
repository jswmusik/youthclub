'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentItem } from '@/types/learning';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

    return (
        <div ref={setNodeRef} style={style}>
            <Card 
                className={`border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow ${
                    isDragging ? 'ring-2 ring-[#4D4DA4]' : ''
                }`}
            >
                <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                        {/* Drag Handle */}
                        <div 
                            className="flex flex-col items-center gap-1 pt-1 cursor-grab active:cursor-grabbing"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                            <span className="text-xs font-medium text-gray-400">{index + 1}</span>
                        </div>
                        
                        {/* Type Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.type === 'VIDEO' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'TEXT' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                            {item.type === 'VIDEO' && <Video className="w-6 h-6" />}
                            {item.type === 'TEXT' && <FileText className="w-6 h-6" />}
                            {item.type === 'FILE' && <Download className="w-6 h-6" />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="text-base font-semibold text-[#121213] mb-1">
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {item.estimated_duration} min
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={onEdit}
                                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    >
                                        <Edit2 className="w-4 h-4 mr-1.5" /> 
                                        <span className="hidden sm:inline">Edit</span>
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={onDelete}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1.5" /> 
                                        <span className="hidden sm:inline">Delete</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

