'use client';

import { ContentItem } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, FileText, ChevronRight } from 'lucide-react';

interface Props {
    item: ContentItem;
    isCompleted: boolean;
    onMarkComplete: () => void;
    onNext: () => void;
    hasNext: boolean;
}

export default function ContentRenderer({ item, isCompleted, onMarkComplete, onNext, hasNext }: Props) {
    
    // Helper to extract YouTube ID
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div className="max-w-4xl mx-auto p-8 w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{item.type}</span>
                    <span>• {item.estimated_duration} min read/watch</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] mb-8">
                {/* --- VIDEO PLAYER --- */}
                {item.type === 'VIDEO' && item.video_url && (
                    <div className="relative pt-[56.25%] bg-black">
                        <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${getYoutubeId(item.video_url)}`}
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}

                {/* --- TEXT ARTICLE --- */}
                {item.type === 'TEXT' && item.text_content && (
                    <div className="p-8 prose prose-blue max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: item.text_content }} />
                    </div>
                )}

                {/* --- FILE DOWNLOAD --- */}
                {item.type === 'FILE' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Download className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Downloadable Resource</h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            This lesson contains a downloadable file. Click the button below to access the material.
                        </p>
                        {item.file_upload ? (
                            <Button asChild size="lg">
                                <a href={item.file_upload} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2" /> Download File
                                </a>
                            </Button>
                        ) : (
                            <p className="text-red-500">File not found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* --- ACTION BAR --- */}
            <div className="flex justify-end gap-4">
                {!isCompleted ? (
                    <Button size="lg" onClick={onMarkComplete} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as Complete
                    </Button>
                ) : (
                    <Button size="lg" variant="outline" className="cursor-default border-green-200 bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> Completed
                    </Button>
                )}

                {hasNext && (
                    <Button size="lg" variant="secondary" onClick={onNext}>
                        Next Lesson <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}