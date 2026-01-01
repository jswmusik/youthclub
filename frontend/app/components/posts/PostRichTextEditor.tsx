'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => (
    <div className="h-40 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border-2 border-[var(--dark-500)]">
      <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
        <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  )
});

interface PostRichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function PostRichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Write your post content...",
  minHeight = "150px"
}: PostRichTextEditorProps) {
  const quillRef = useRef<any>(null);

  // Simplified toolbar: only text formatting and links
  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['link']
    ],
  }), []);

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'link'
  ];

  return (
    <div className="post-rich-editor">
      <ReactQuill 
        ref={quillRef}
        theme="snow" 
        value={value} 
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />

      <style jsx global>{`
        /* Post Editor Container */
        .post-rich-editor {
          border-radius: 12px;
          border: 2px solid var(--dark-500);
          transition: border-color 0.2s ease;
          position: relative;
        }
        
        .post-rich-editor:hover {
          border-color: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.3);
        }
        
        .post-rich-editor:focus-within {
          border-color: var(--brand-primary);
        }
        
        /* Toolbar Styling */
        .post-rich-editor .ql-toolbar.ql-snow {
          background: var(--dark-700);
          border: none;
          border-bottom: 1px solid var(--dark-500);
          border-radius: 10px 10px 0 0;
          padding: 10px 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .post-rich-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        /* Toolbar Buttons */
        .post-rich-editor .ql-toolbar button {
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--dark-600);
          border: none;
          transition: all 0.15s ease;
        }
        
        .post-rich-editor .ql-toolbar button:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
        }
        
        .post-rich-editor .ql-toolbar button.ql-active {
          background: var(--brand-primary);
        }
        
        .post-rich-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: var(--dark-900);
        }
        
        .post-rich-editor .ql-toolbar button.ql-active .ql-fill {
          fill: var(--dark-900);
        }
        
        /* Toolbar Icons */
        .post-rich-editor .ql-toolbar .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        .post-rich-editor .ql-toolbar .ql-fill {
          fill: var(--brand-light);
          opacity: 0.7;
        }
        
        .post-rich-editor .ql-toolbar button:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .post-rich-editor .ql-toolbar button:hover .ql-fill {
          fill: var(--brand-primary);
          opacity: 1;
        }
        
        /* Editor Container */
        .post-rich-editor .ql-container.ql-snow {
          background: var(--dark-700);
          border: none;
          border-radius: 0 0 10px 10px;
          font-family: inherit;
          font-size: 15px;
          overflow: visible;
        }
        
        .post-rich-editor .ql-editor {
          min-height: ${minHeight};
          padding: 16px;
          padding-bottom: 40px;
          color: var(--brand-light);
          line-height: 1.6;
          overflow: visible;
        }
        
        .post-rich-editor .ql-editor.ql-blank::before {
          color: var(--brand-light);
          opacity: 0.3;
          font-style: normal;
          left: 16px;
          right: 16px;
        }
        
        /* Content Styling */
        .post-rich-editor .ql-editor p {
          margin-bottom: 0.5rem;
        }
        
        .post-rich-editor .ql-editor a {
          color: var(--brand-primary);
          text-decoration: underline;
        }
        
        .post-rich-editor .ql-editor a:hover {
          color: var(--brand-purple);
        }
        
        .post-rich-editor .ql-editor strong {
          font-weight: 600;
        }
        
        /* Tooltip styling - Link input popup */
        .post-rich-editor .ql-snow .ql-tooltip {
          background: var(--dark-600) !important;
          border: 2px solid var(--dark-400) !important;
          border-radius: 12px !important;
          color: var(--brand-light) !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
          padding: 12px 16px !important;
          z-index: 9999 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          margin-left: 0 !important;
          white-space: nowrap;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip[data-mode=link]::before {
          content: 'Enter URL:' !important;
          color: var(--brand-light) !important;
          opacity: 0.7;
          margin-right: 8px;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip input[type=text] {
          background: var(--dark-700) !important;
          border: 2px solid var(--dark-500) !important;
          color: var(--brand-light) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          outline: none !important;
          width: 200px !important;
          font-size: 14px !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip input[type=text]:focus {
          border-color: var(--brand-primary) !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip input[type=text]::placeholder {
          color: var(--brand-light);
          opacity: 0.4;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a {
          color: var(--brand-primary) !important;
          font-weight: 600;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a.ql-action {
          background: var(--brand-primary) !important;
          color: var(--dark-900) !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          margin-left: 10px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a.ql-action::after {
          content: 'Save' !important;
          margin-left: 0 !important;
          border: none !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: var(--brand-purple) !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a.ql-remove {
          margin-left: 8px !important;
          color: var(--brand-red) !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip a.ql-remove::before {
          content: 'Remove' !important;
          margin-left: 0 !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip::before {
          color: var(--brand-light) !important;
          opacity: 0.7;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip .ql-preview {
          color: var(--brand-primary) !important;
        }
        
        .post-rich-editor .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
          content: 'Save' !important;
        }
        
        /* Selection styling */
        .post-rich-editor .ql-editor ::selection {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
        
        /* Scrollbar styling */
        .post-rich-editor .ql-editor::-webkit-scrollbar {
          width: 8px;
        }
        
        .post-rich-editor .ql-editor::-webkit-scrollbar-track {
          background: var(--dark-600);
          border-radius: 4px;
        }
        
        .post-rich-editor .ql-editor::-webkit-scrollbar-thumb {
          background: var(--dark-400);
          border-radius: 4px;
        }
        
        .post-rich-editor .ql-editor::-webkit-scrollbar-thumb:hover {
          background: var(--dark-300);
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .post-rich-editor .ql-toolbar.ql-snow {
            padding: 8px;
          }
          
          .post-rich-editor .ql-toolbar button {
            width: 36px;
            height: 36px;
          }
          
          .post-rich-editor .ql-editor {
            padding: 12px;
            font-size: 14px;
          }
          
          .post-rich-editor .ql-snow .ql-tooltip {
            padding: 10px 12px !important;
          }
          
          .post-rich-editor .ql-snow .ql-tooltip input[type=text] {
            width: 160px !important;
          }
        }
      `}</style>
    </div>
  );
}







