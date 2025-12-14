'use client';

import { ContentItem } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/app/utils';

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

    // Process HTML content to fix image URLs
    const processImageUrls = (html: string): string => {
        if (!html) return html;
        
        // Replace image src attributes that are relative paths or media URLs
        return html.replace(
            /<img([^>]*src=["'])([^"']+)(["'][^>]*)>/gi,
            (match, prefix, src, suffix) => {
                // If it's already a full URL (http/https), keep it
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    return match;
                }
                
                // If it's a media path (starts with /media/), convert to full URL
                if (src.startsWith('/media/')) {
                    const fullUrl = getMediaUrl(src) || src;
                    return `<img${prefix}${fullUrl}${suffix}>`;
                }
                
                // If it's a relative path without /media/, add /media/ prefix
                if (src.startsWith('/')) {
                    const mediaPath = `/media${src}`;
                    const fullUrl = getMediaUrl(mediaPath) || mediaPath;
                    return `<img${prefix}${fullUrl}${suffix}>`;
                }
                
                // If it's a relative path without leading slash, treat as media file
                const mediaPath = `/media/${src}`;
                const fullUrl = getMediaUrl(mediaPath) || mediaPath;
                return `<img${prefix}${fullUrl}${suffix}>`;
            }
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-6 md:py-8 w-full">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#121213] mb-3">{item.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold",
                        item.type === 'VIDEO' && "bg-[#FF5485]/10 text-[#FF5485]",
                        item.type === 'TEXT' && "bg-[#4D4DA4]/10 text-[#4D4DA4]",
                        item.type === 'FILE' && "bg-[#10B981]/10 text-[#10B981]"
                    )}>
                        {item.type}
                    </span>
                    <span className="text-gray-500">• {item.estimated_duration} min read/watch</span>
                </div>
            </div>

            {/* --- TEXT ARTICLE --- (No card wrapper) */}
            {item.type === 'TEXT' && item.text_content && (
                <div className="mb-6 sm:mb-8">
                    <div 
                        className="rich-text-content text-sm sm:text-base md:text-lg max-w-none
                          [&_h1]:text-3xl [&_h1]:sm:text-4xl [&_h1]:md:text-5xl [&_h1]:font-bold [&_h1]:text-[#121213] [&_h1]:mt-6 [&_h1]:mb-4
                          [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:md:text-4xl [&_h2]:font-bold [&_h2]:text-[#121213] [&_h2]:mt-6 [&_h2]:mb-4
                          [&_h3]:text-xl [&_h3]:sm:text-2xl [&_h3]:md:text-3xl [&_h3]:font-bold [&_h3]:text-[#121213] [&_h3]:mt-5 [&_h3]:mb-3
                          [&_h4]:text-lg [&_h4]:sm:text-xl [&_h4]:md:text-2xl [&_h4]:font-bold [&_h4]:text-[#121213] [&_h4]:mt-4 [&_h4]:mb-2
                          [&_h5]:text-base [&_h5]:sm:text-lg [&_h5]:md:text-xl [&_h5]:font-bold [&_h5]:text-[#121213] [&_h5]:mt-3 [&_h5]:mb-2
                          [&_h6]:text-sm [&_h6]:sm:text-base [&_h6]:md:text-lg [&_h6]:font-bold [&_h6]:text-[#121213] [&_h6]:mt-3 [&_h6]:mb-2
                          [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:sm:mb-5
                          [&_a]:text-[#4D4DA4] [&_a]:no-underline [&_a]:hover:text-[#FF5485] [&_a]:hover:underline [&_a]:transition-colors
                          [&_strong]:text-[#121213] [&_strong]:font-bold
                          [&_em]:italic [&_em]:text-gray-700
                          [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-gray-700 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-4
                          [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:text-gray-700 [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-4
                          [&_li]:text-gray-700 [&_li]:mb-1
                          [&_blockquote]:border-l-4 [&_blockquote]:border-[#4D4DA4] [&_blockquote]:bg-[#EBEBFE]/30 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-700
                          [&_code]:text-[#4D4DA4] [&_code]:bg-[#EBEBFE] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                          [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm
                          [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0
                          [&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-4 [&_img]:w-full [&_img]:h-auto [&_img]:max-w-full [&_img]:object-contain
                          [&_hr]:border-gray-200 [&_hr]:my-6 [&_hr]:border-t
                          [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                          [&_th]:bg-[#EBEBFE] [&_th]:text-[#4D4DA4] [&_th]:font-semibold [&_th]:p-2 [&_th]:sm:p-3 [&_th]:border [&_th]:border-gray-200 [&_th]:text-left
                          [&_td]:p-2 [&_td]:sm:p-3 [&_td]:border [&_td]:border-gray-200 [&_td]:text-gray-700
                          [&_figure]:my-4
                          [&_figcaption]:text-sm [&_figcaption]:text-gray-500 [&_figcaption]:mt-2 [&_figcaption]:text-center
                          [&_video]:rounded-lg [&_video]:shadow-md [&_video]:my-4 [&_video]:w-full [&_video]:h-auto
                          [&_iframe]:rounded-lg [&_iframe]:shadow-md [&_iframe]:my-4 [&_iframe]:w-full [&_iframe]:h-auto"
                        dangerouslySetInnerHTML={{ __html: processImageUrls(item.text_content) }} 
                    />
                </div>
            )}

            {/* --- VIDEO PLAYER --- (Keep card wrapper) */}
            {item.type === 'VIDEO' && item.video_url && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px] sm:min-h-[400px] mb-6 sm:mb-8">
                    <div className="relative pt-[56.25%] bg-black w-full">
                        <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${getYoutubeId(item.video_url)}`}
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            {/* --- FILE DOWNLOAD --- (Keep card wrapper) */}
            {item.type === 'FILE' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px] sm:min-h-[400px] mb-6 sm:mb-8">
                    <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/10 text-[#10B981] rounded-full flex items-center justify-center mb-4">
                            <Download className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#121213] mb-2">Downloadable Resource</h3>
                        <p className="text-gray-600 mb-6 max-w-md text-sm sm:text-base">
                            This lesson contains a downloadable file. Click the button below to access the material.
                        </p>
                        {item.file_upload ? (
                            <Button asChild size="lg" className="bg-[#10B981] hover:bg-[#059669] text-white">
                                <a href={item.file_upload} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2" /> Download File
                                </a>
                            </Button>
                        ) : (
                            <p className="text-red-500">File not found.</p>
                        )}
                    </div>
                </div>
            )}

            {/* --- ACTION BAR --- */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                {!isCompleted ? (
                    <Button 
                        size="lg" 
                        onClick={onMarkComplete} 
                        className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-md transition-all"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as Complete
                    </Button>
                ) : (
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="cursor-default border-[#10B981]/30 bg-[#10B981]/10 text-[#059669] hover:bg-[#10B981]/10 hover:text-[#059669]"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" /> Completed
                    </Button>
                )}

                {hasNext && (
                    <Button 
                        size="lg" 
                        onClick={onNext}
                        className="bg-[#4D4DA4] hover:bg-[#3D3D94] text-white shadow-md transition-all"
                    >
                        Next Lesson <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}