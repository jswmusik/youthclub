'use client';

import { ContentItem } from '@/types/learning';
import { CheckCircle, Download, FileText, ChevronRight, PlayCircle } from 'lucide-react';
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

    // Process HTML content to fix image URLs, wrap iframes, and strip color styles
    const processHtmlContent = (html: string): string => {
        if (!html) return html;
        
        let processed = html;
        
        // Remove inline color styles (color: ...; and background-color: ...;)
        processed = processed.replace(/\s*color\s*:\s*[^;]+;?/gi, '');
        processed = processed.replace(/\s*background-color\s*:\s*[^;]+;?/gi, '');
        processed = processed.replace(/\s*background\s*:\s*[^;]+;?/gi, '');
        
        // Remove empty style attributes
        processed = processed.replace(/\s*style\s*=\s*["']\s*["']/gi, '');
        
        // Fix image URLs
        processed = processed.replace(
            /<img([^>]*src=["'])([^"']+)(["'][^>]*)>/gi,
            (match, prefix, src, suffix) => {
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    return match;
                }
                
                if (src.startsWith('/media/')) {
                    const fullUrl = getMediaUrl(src) || src;
                    return `<img${prefix}${fullUrl}${suffix}>`;
                }
                
                if (src.startsWith('/')) {
                    const mediaPath = `/media${src}`;
                    const fullUrl = getMediaUrl(mediaPath) || mediaPath;
                    return `<img${prefix}${fullUrl}${suffix}>`;
                }
                
                const mediaPath = `/media/${src}`;
                const fullUrl = getMediaUrl(mediaPath) || mediaPath;
                return `<img${prefix}${fullUrl}${suffix}>`;
            }
        );
        
        // Wrap YouTube iframes in responsive containers with inline styles
        processed = processed.replace(
            /<iframe([^>]*src=["'][^"']*(?:youtube\.com|youtu\.be)[^"']*["'][^>]*)><\/iframe>/gi,
            (match, attrs) => {
                return `<div style="position:relative;width:100%;padding-bottom:56.25%;margin:1.5rem 0;background:#1a1a2e;border-radius:1rem;overflow:hidden;border:1px solid #2d2d4a;"><iframe${attrs} style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`;
            }
        );
        
        // Also handle iframes that might not have closing tags properly
        processed = processed.replace(
            /<iframe([^>]*src=["'][^"']*(?:youtube\.com|youtu\.be)[^"']*["'][^>]*)\/>/gi,
            (match, attrs) => {
                return `<div style="position:relative;width:100%;padding-bottom:56.25%;margin:1.5rem 0;background:#1a1a2e;border-radius:1rem;overflow:hidden;border:1px solid #2d2d4a;"><iframe${attrs} style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`;
            }
        );
        
        return processed;
    };

    const typeConfig = {
        VIDEO: { 
            icon: PlayCircle, 
            bg: 'bg-[var(--brand-red)]/20', 
            text: 'text-[var(--brand-red)]',
            label: 'Video'
        },
        TEXT: { 
            icon: FileText, 
            bg: 'bg-[var(--brand-purple)]/20', 
            text: 'text-[var(--brand-purple)]',
            label: 'Article'
        },
        FILE: { 
            icon: Download, 
            bg: 'bg-[var(--brand-green)]/20', 
            text: 'text-[var(--brand-green)]',
            label: 'Download'
        },
    };

    const config = typeConfig[item.type] || typeConfig.TEXT;
    const TypeIcon = config.icon;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 w-full">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-3">{item.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${config.bg} ${config.text}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        {config.label}
                    </span>
                    <span className="text-[var(--brand-light)]/50">• {item.estimated_duration} min</span>
                    {isCompleted && (
                        <span className="flex items-center gap-1 text-[var(--brand-green)] text-xs font-medium">
                            <CheckCircle className="w-4 h-4" /> Completed
                        </span>
                    )}
                </div>
            </div>

            {/* --- TEXT ARTICLE --- */}
            {item.type === 'TEXT' && item.text_content && (
                <div className="mb-6 sm:mb-8">
                    <div 
                        className="rich-text-content text-sm sm:text-base md:text-lg max-w-none text-[var(--brand-light)]/90
                          [&_*]:!text-[var(--brand-light)]/90 [&_*]:!bg-transparent
                          [&_h1]:!text-2xl [&_h1]:sm:!text-3xl [&_h1]:md:!text-4xl [&_h1]:!font-bold [&_h1]:!text-[var(--brand-light)] [&_h1]:!mt-6 [&_h1]:!mb-4
                          [&_h2]:!text-xl [&_h2]:sm:!text-2xl [&_h2]:md:!text-3xl [&_h2]:!font-bold [&_h2]:!text-[var(--brand-light)] [&_h2]:!mt-6 [&_h2]:!mb-4
                          [&_h3]:!text-lg [&_h3]:sm:!text-xl [&_h3]:md:!text-2xl [&_h3]:!font-bold [&_h3]:!text-[var(--brand-light)] [&_h3]:!mt-5 [&_h3]:!mb-3
                          [&_h4]:!text-base [&_h4]:sm:!text-lg [&_h4]:md:!text-xl [&_h4]:!font-bold [&_h4]:!text-[var(--brand-light)] [&_h4]:!mt-4 [&_h4]:!mb-2
                          [&_h5]:!text-sm [&_h5]:sm:!text-base [&_h5]:md:!text-lg [&_h5]:!font-bold [&_h5]:!text-[var(--brand-light)] [&_h5]:!mt-3 [&_h5]:!mb-2
                          [&_h6]:!text-xs [&_h6]:sm:!text-sm [&_h6]:md:!text-base [&_h6]:!font-bold [&_h6]:!text-[var(--brand-light)] [&_h6]:!mt-3 [&_h6]:!mb-2
                          [&_p]:!text-[var(--brand-light)]/90 [&_p]:!leading-relaxed [&_p]:!mb-4 [&_p]:sm:!mb-5 [&_p]:!bg-transparent
                          [&_span]:!text-[var(--brand-light)]/90 [&_span]:!bg-transparent
                          [&_a]:!text-[var(--brand-primary)] [&_a]:!no-underline [&_a]:hover:!text-[var(--brand-purple)] [&_a]:hover:!underline [&_a]:!transition-colors
                          [&_strong]:!text-[var(--brand-light)] [&_strong]:!font-bold
                          [&_b]:!text-[var(--brand-light)] [&_b]:!font-bold
                          [&_em]:!italic [&_em]:!text-[var(--brand-light)]/90
                          [&_i]:!italic [&_i]:!text-[var(--brand-light)]/90
                          [&_u]:!text-[var(--brand-light)]/90
                          [&_s]:!text-[var(--brand-light)]/90
                          [&_ul]:!list-disc [&_ul]:!list-inside [&_ul]:!text-[var(--brand-light)]/90 [&_ul]:!mb-4 [&_ul]:!space-y-2 [&_ul]:!pl-4
                          [&_ol]:!list-decimal [&_ol]:!list-inside [&_ol]:!text-[var(--brand-light)]/90 [&_ol]:!mb-4 [&_ol]:!space-y-2 [&_ol]:!pl-4
                          [&_li]:!text-[var(--brand-light)]/90 [&_li]:!mb-1
                          [&_blockquote]:!border-l-4 [&_blockquote]:!border-[var(--brand-primary)] [&_blockquote]:!bg-[var(--dark-700)] [&_blockquote]:!py-3 [&_blockquote]:!px-4 [&_blockquote]:!rounded-r-xl [&_blockquote]:!my-4 [&_blockquote]:!italic [&_blockquote]:!text-[var(--brand-light)]/90
                          [&_code]:!text-[var(--brand-primary)] [&_code]:!bg-[var(--dark-700)] [&_code]:!px-1.5 [&_code]:!py-0.5 [&_code]:!rounded [&_code]:!text-sm [&_code]:!font-mono
                          [&_pre]:!bg-[var(--dark-900)] [&_pre]:!text-[var(--brand-light)]/90 [&_pre]:!p-4 [&_pre]:!rounded-xl [&_pre]:!overflow-x-auto [&_pre]:!my-4 [&_pre]:!text-sm [&_pre]:!border [&_pre]:!border-[var(--dark-600)]
                          [&_pre_code]:!bg-transparent [&_pre_code]:!text-[var(--brand-light)]/90 [&_pre_code]:!p-0
                          [&_img]:!rounded-xl [&_img]:!my-4 [&_img]:!max-w-full [&_img]:!h-auto [&_img]:!border [&_img]:!border-[var(--dark-600)] [&_img]:!bg-[var(--dark-700)]
                          [&_hr]:!border-[var(--dark-600)] [&_hr]:!my-6 [&_hr]:!border-t
                          [&_table]:!w-full [&_table]:!border-collapse [&_table]:!my-4 [&_table]:!text-sm
                          [&_th]:!bg-[var(--dark-700)] [&_th]:!text-[var(--brand-light)] [&_th]:!font-semibold [&_th]:!p-2 [&_th]:sm:!p-3 [&_th]:!border [&_th]:!border-[var(--dark-600)] [&_th]:!text-left
                          [&_td]:!p-2 [&_td]:sm:!p-3 [&_td]:!border [&_td]:!border-[var(--dark-600)] [&_td]:!text-[var(--brand-light)]/90
                          [&_figure]:!my-4
                          [&_figcaption]:!text-sm [&_figcaption]:!text-[var(--brand-light)]/50 [&_figcaption]:!mt-2 [&_figcaption]:!text-center
                          [&_video]:!rounded-xl [&_video]:!my-4 [&_video]:!w-full [&_video]:!h-auto [&_video]:!border [&_video]:!border-[var(--dark-600)]
                          [&_iframe]:!rounded-xl [&_iframe]:!my-4 [&_iframe]:!w-full [&_iframe]:!aspect-video [&_iframe]:!border [&_iframe]:!border-[var(--dark-600)]"
                        dangerouslySetInnerHTML={{ __html: processHtmlContent(item.text_content) }} 
                    />
                </div>
            )}

            {/* --- VIDEO PLAYER --- */}
            {item.type === 'VIDEO' && item.video_url && (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6 sm:mb-8">
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

            {/* --- FILE DOWNLOAD --- */}
            {item.type === 'FILE' && (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6 sm:mb-8">
                    <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center mb-6">
                            <Download className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] mb-3">Downloadable Resource</h3>
                        <p className="text-[var(--brand-light)]/60 mb-8 max-w-md text-sm sm:text-base">
                            This lesson contains a downloadable file. Click the button below to access the material.
                        </p>
                        {item.file_upload ? (
                            <a 
                                href={item.file_upload} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-6 py-3 rounded-xl bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-white font-bold transition-all flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" /> Download File
                            </a>
                        ) : (
                            <p className="text-[var(--brand-red)]">File not found.</p>
                        )}
                    </div>
                </div>
            )}

            {/* --- ACTION BAR --- */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-[var(--dark-600)]">
                {!isCompleted ? (
                    <button 
                        onClick={onMarkComplete} 
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90 text-[var(--dark-900)] font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" /> Mark as Complete
                    </button>
                ) : (
                    <button 
                        className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-[var(--brand-green)]/30 bg-[var(--brand-green)]/10 text-[var(--brand-green)] font-medium cursor-default flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" /> Completed
                    </button>
                )}

                {hasNext && (
                    <button 
                        onClick={onNext}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        Next Lesson <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
